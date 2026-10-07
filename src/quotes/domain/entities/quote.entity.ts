import type { Quote, QuoteId, QuoteStatus } from '@flowcommerce/types';

// Entidad de dominio de una cotización, siempre atada a su proyecto (tenant) y
// a un lead de ese mismo proyecto. La unicidad del folio es por proyecto, no
// global: dos tenants pueden usar el mismo folio sin colisionar.
export class QuoteEntity implements Quote {
  constructor(
    public readonly id: QuoteId,
    public readonly projectId: string,
    public readonly leadId: string,
    public readonly folio: string,
    public readonly subtotal: number,
    public readonly tax: number,
    public readonly total: number,
    public readonly status: QuoteStatus,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
  ) {}

  // Los importes son inmutables durante la vida de la cotización: solo cambia el
  // status. toQuote() no necesita Date porque el contrato compartido ya los
  // declara como Date y la capa HTTP los serializa.
  toQuote(): Quote {
    return {
      id: this.id,
      projectId: this.projectId,
      leadId: this.leadId,
      folio: this.folio,
      subtotal: this.subtotal,
      tax: this.tax,
      total: this.total,
      status: this.status,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
