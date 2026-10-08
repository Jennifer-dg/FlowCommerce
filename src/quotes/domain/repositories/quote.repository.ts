import type { QuoteId, QuoteStatus } from '@flowcommerce/types';
import type { QuoteEntity } from '../entities/quote.entity';

// Partida ya calculada por el use-case: el repositorio solo la persiste.
export interface QuoteItemDraft {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  position: number;
}

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface CreateQuoteInput {
  // El projectId lo inyecta el use-case desde la ruta autorizada. El folio NO
  // se recibe: lo genera el repositorio dentro de la misma transacción.
  projectId: string;
  leadId: string;
  clientId: string | null;
  createdByUserId: string;
  // Prefijo del folio según los ajustes del proyecto (p. ej. COT).
  folioPrefix: string;
  validUntil: Date | null;
  notes: string | null;
  terms: string | null;
  totals: QuoteTotals;
  items: QuoteItemDraft[];
}

// Edición de un borrador. Si llegan `items`, REEMPLAZAN a todas las partidas y
// `totals` debe venir recalculado con ellas.
export interface UpdateDraftQuoteInput {
  clientId?: string | null;
  validUntil?: Date | null;
  notes?: string | null;
  terms?: string | null;
  totals?: QuoteTotals;
  items?: QuoteItemDraft[];
}

export const QUOTE_SORT_FIELDS = ['createdAt', 'total', 'folio'] as const;
export type QuoteSortField = (typeof QUOTE_SORT_FIELDS)[number];

// Filtros del listado. Todos opcionales y siempre ADITIVOS al projectId.
export interface ListQuotesFilter {
  status?: QuoteStatus;
  clientId?: string;
  leadId?: string;
  // Coincidencia parcial sobre el folio.
  search?: string;
  // Rango sobre la fecha de creación: from inclusive, to exclusivo.
  from?: Date;
  to?: Date;
  sortBy?: QuoteSortField;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TransitionQuoteInput {
  from: QuoteStatus;
  to: QuoteStatus;
  at: Date;
}

export interface PaginatedQuotes {
  quotes: QuoteEntity[];
  total: number;
}

// Almacén de cotizaciones con ámbito de tenant: el projectId forma parte del
// nombre del método y llega hasta el WHERE.
export interface QuoteRepository {
  // Con partidas, lead y cliente.
  findByIdInProject(
    id: QuoteId,
    projectId: string,
  ): Promise<QuoteEntity | null>;
  listByProject(
    projectId: string,
    filter?: ListQuotesFilter,
  ): Promise<PaginatedQuotes>;
  // Genera el folio correlativo e inserta cotización y partidas en una sola
  // transacción.
  create(input: CreateQuoteInput): Promise<QuoteEntity>;
  // Solo actúa si la cotización sigue en DRAFT. null = no existe en el proyecto
  // o ya no es borrador (el use-case relee para distinguirlo).
  updateDraftInProject(
    id: QuoteId,
    projectId: string,
    input: UpdateDraftQuoteInput,
  ): Promise<QuoteEntity | null>;
  // Igual que updateDraftInProject: solo borra borradores.
  deleteDraftInProject(id: QuoteId, projectId: string): Promise<boolean>;
  // Transición ATÓMICA: UPDATE ... WHERE id AND project_id AND status = from.
  // null = no existe o el estado ya cambió; nada se modifica.
  transitionStatusInProject(
    id: QuoteId,
    projectId: string,
    input: TransitionQuoteInput,
  ): Promise<QuoteEntity | null>;
}

export const QUOTES_REPOSITORY = Symbol('QUOTES_REPOSITORY');
