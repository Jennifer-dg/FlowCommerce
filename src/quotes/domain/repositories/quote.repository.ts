import type { QuoteId, QuoteStatus } from '@flowcommerce/types';
import type { QuoteEntity } from '../entities/quote.entity';

export interface CreateQuoteInput {
  // El projectId lo inyecta el use-case desde la ruta autorizada, nunca desde el
  // body del cliente. El leadId llega en el body, pero la FK compuesta
  // (lead_id, project_id) impide que se referencie un lead de otro tenant.
  projectId: string;
  leadId: string;
  folio: string;
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
}

// Filtros del listado. Todos opcionales y siempre ADITIVOS al projectId: pueden
// reducir el resultado, nunca ampliarlo fuera del tenant.
export interface ListQuotesFilter {
  status?: QuoteStatus;
  leadId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateQuoteStatusInput {
  status: QuoteStatus;
}

export interface PaginatedQuotes {
  quotes: QuoteEntity[];
  total: number;
}

// Almacén de cotizaciones con ámbito de tenant. Igual que en leads, el projectId
// forma parte del nombre del método para que la restricción sea visible al leer
// la firma y no dependa de que quien llama recuerde filtrar.
export interface QuoteRepository {
  findByIdInProject(
    id: QuoteId,
    projectId: string,
  ): Promise<QuoteEntity | null>;
  listByProject(
    projectId: string,
    filter?: ListQuotesFilter,
  ): Promise<PaginatedQuotes>;
  create(input: CreateQuoteInput): Promise<QuoteEntity>;
  // Devuelve null si la cotización no existe EN ESE proyecto, que el use-case
  // traduce a 404 indistinguible de "no existe".
  updateStatusInProject(
    id: QuoteId,
    projectId: string,
    input: UpdateQuoteStatusInput,
  ): Promise<QuoteEntity | null>;
}

export const QUOTES_REPOSITORY = Symbol('QUOTES_REPOSITORY');
