import type { LeadStage, QuoteStatus } from '@flowcommerce/types';

// Definiciones oficiales del Dashboard (cerradas con negocio). Cada métrica se
// deriva SOLO de columnas que existen hoy en leads y quotes; no hay entidad
// Sales ni tabla de métricas:
//
// - summary.leadsActivos:           leads en NEW + CONTACTED + QUALIFIED + PROPOSAL
//                                   + NEGOTIATION
//                                   (todo lo que no es WON ni LOST).
// - summary.cotizacionesEnRevision: quotes con status = PENDING_APPROVAL.
// - summary.ganado:                 COUNT(leads con stage = WON). Es un conteo,
//                                   NO un monto: el dinero vive solo en `sales`.
// - summary.pipeline:             SUM(leads.estimatedValue) de los leads activos
//                                   (todo menos WON y LOST). Es dinero estimado
//                                   ANTES de IVA; los leads sin valor suman 0.
// - leads.porEstado:                conteo por stage, siempre con las 7 claves.
// - quotes.porEstado:               conteo por status, siempre con las 7 claves.
// - sales.porEstado:                SUM(quotes.total) por status (7 claves).
// - sales.porPeriodo:               SUM(quotes.total) de las cotizaciones PAID
//                                   por mes (YYYY-MM, UTC) de quotes.paidAt.
//                                   Venta = cotización pagada; cuadra con las
//                                   ventas de GET /clients/:id/stats.
// - conversion.porPeriodo:          por mes de creación del lead (YYYY-MM, UTC):
//                                   creados, ganados (stage WON) y
//                                   conversion = ganados / creados (0 si creados = 0).
//
// "Seguimientos pendientes" NO se expone: no hay datos para calcularlo y un 0
// sería una métrica falsa.

export type LeadsByStage = Record<LeadStage, number>;
export type QuotesByStatus = Record<QuoteStatus, number>;
export type SalesByStatus = Record<QuoteStatus, number>;

export interface DashboardSummary {
  leadsActivos: number;
  cotizacionesEnRevision: number;
  ganado: number;
  pipeline: number;
}

export interface SalesByPeriodEntry {
  periodo: string;
  total: number;
}

export interface ConversionByPeriodEntry {
  periodo: string;
  creados: number;
  ganados: number;
  conversion: number;
}

export interface DashboardAggregate {
  summary: DashboardSummary;
  leads: { porEstado: LeadsByStage };
  quotes: { porEstado: QuotesByStatus };
  sales: {
    porEstado: SalesByStatus;
    porPeriodo: SalesByPeriodEntry[];
  };
  conversion: {
    porPeriodo: ConversionByPeriodEntry[];
  };
}

// Filas ya agregadas por PostgreSQL (GROUP BY), acotadas a un solo projectId.
// El repositorio no devuelve filas individuales de leads ni quotes.
export interface LeadStageCountRow {
  stage: LeadStage;
  count: number;
  // SUM(estimated_value) de la etapa. Ausente equivale a 0.
  estimatedValue?: number;
}

export interface QuoteStatusAggregateRow {
  status: QuoteStatus;
  count: number;
  total: number;
}

export interface SalesByMonthRow {
  periodo: string;
  total: number;
}

export interface LeadsByMonthRow {
  periodo: string;
  creados: number;
  ganados: number;
}

export interface DashboardMetricsRows {
  leadsByStage: LeadStageCountRow[];
  quotesByStatus: QuoteStatusAggregateRow[];
  salesByMonth: SalesByMonthRow[];
  leadsByMonth: LeadsByMonthRow[];
}
