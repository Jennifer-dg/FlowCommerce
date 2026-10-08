import type {
  Quote,
  QuoteId,
  QuoteItem,
  QuoteStatus,
} from '@flowcommerce/types';

export interface QuoteRelationSummary {
  id: string;
  name: string;
}

export interface QuoteEntityProps {
  id: QuoteId;
  projectId: string;
  leadId: string;
  clientId: string | null;
  folio: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  validUntil: Date | null;
  notes: string | null;
  terms: string | null;
  createdByUserId: string | null;
  approvedAt: Date | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
  // Proyecciones de lectura: el listado no obliga a una petición por fila.
  lead?: QuoteRelationSummary | null;
  client?: QuoteRelationSummary | null;
  // Solo se cargan en el detalle.
  items?: QuoteItem[];
}

export type QuoteView = Quote & {
  lead: QuoteRelationSummary | null;
  client: QuoteRelationSummary | null;
};

export type QuoteDetailView = QuoteView & { items: QuoteItem[] };

// Entidad de dominio de una cotización, siempre atada a su proyecto (tenant).
// La unicidad del folio es por proyecto, no global.
export class QuoteEntity implements Quote {
  readonly id: QuoteId;
  readonly projectId: string;
  readonly leadId: string;
  readonly clientId: string | null;
  readonly folio: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
  readonly status: QuoteStatus;
  readonly validUntil: Date | null;
  readonly notes: string | null;
  readonly terms: string | null;
  readonly createdByUserId: string | null;
  readonly approvedAt: Date | null;
  readonly sentAt: Date | null;
  readonly acceptedAt: Date | null;
  readonly rejectedAt: Date | null;
  readonly paidAt: Date | null;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;
  readonly lead: QuoteRelationSummary | null;
  readonly client: QuoteRelationSummary | null;
  readonly items: QuoteItem[];

  constructor(props: QuoteEntityProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.leadId = props.leadId;
    this.clientId = props.clientId;
    this.folio = props.folio;
    this.subtotal = props.subtotal;
    this.discount = props.discount;
    this.tax = props.tax;
    this.total = props.total;
    this.status = props.status;
    this.validUntil = props.validUntil;
    this.notes = props.notes;
    this.terms = props.terms;
    this.createdByUserId = props.createdByUserId;
    this.approvedAt = props.approvedAt;
    this.sentAt = props.sentAt;
    this.acceptedAt = props.acceptedAt;
    this.rejectedAt = props.rejectedAt;
    this.paidAt = props.paidAt;
    this.creadoEn = props.creadoEn;
    this.actualizadoEn = props.actualizadoEn;
    this.lead = props.lead ?? null;
    this.client = props.client ?? null;
    this.items = props.items ?? [];
  }

  toQuote(): QuoteView {
    return {
      id: this.id,
      projectId: this.projectId,
      leadId: this.leadId,
      clientId: this.clientId,
      folio: this.folio,
      subtotal: this.subtotal,
      discount: this.discount,
      tax: this.tax,
      total: this.total,
      status: this.status,
      validUntil: this.validUntil,
      notes: this.notes,
      terms: this.terms,
      createdByUserId: this.createdByUserId,
      approvedAt: this.approvedAt,
      sentAt: this.sentAt,
      acceptedAt: this.acceptedAt,
      rejectedAt: this.rejectedAt,
      paidAt: this.paidAt,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
      lead: this.lead,
      client: this.client,
    };
  }

  toDetail(): QuoteDetailView {
    return { ...this.toQuote(), items: this.items };
  }
}
