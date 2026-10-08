import { LeadStage, QuoteStatus } from '@flowcommerce/types';
import type {
  ConversionByPeriodEntry,
  DashboardAggregate,
  DashboardMetricsRows,
  LeadsByStage,
  QuotesByStatus,
  SalesByStatus,
} from './dashboard.types';

// Etapas que cuentan como "lead activo": todas menos WON y LOST.
export const ACTIVE_LEAD_STAGES: readonly LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.QUALIFIED,
  LeadStage.PROPOSAL,
  LeadStage.NEGOTIATION,
];

const zeroLeadsByStage = (): LeadsByStage => ({
  NEW: 0,
  CONTACTED: 0,
  QUALIFIED: 0,
  PROPOSAL: 0,
  NEGOTIATION: 0,
  WON: 0,
  LOST: 0,
});

const zeroByQuoteStatus = (): QuotesByStatus & SalesByStatus => ({
  DRAFT: 0,
  PENDING_APPROVAL: 0,
  APPROVED: 0,
  SENT: 0,
  ACCEPTED: 0,
  PAID: 0,
  REJECTED: 0,
});

// conversion = ganados / creados, sin dividir nunca entre cero.
export const conversionRate = (creados: number, ganados: number): number =>
  creados > 0 ? ganados / creados : 0;

// Arma el contrato del Dashboard a partir de las agregaciones SQL. Es una
// función pura: no consulta nada, solo rellena con 0 los estados sin filas y
// deriva el summary de los conteos por estado (sin consultas extra).
export function buildDashboard(rows: DashboardMetricsRows): DashboardAggregate {
  const leadsPorEstado = zeroLeadsByStage();
  for (const row of rows.leadsByStage) {
    if (row.stage in leadsPorEstado) {
      leadsPorEstado[row.stage] = row.count;
    }
  }

  const quotesPorEstado = zeroByQuoteStatus();
  const salesPorEstado = zeroByQuoteStatus();
  for (const row of rows.quotesByStatus) {
    if (row.status in quotesPorEstado) {
      quotesPorEstado[row.status] = row.count;
      salesPorEstado[row.status] = row.total;
    }
  }

  const leadsActivos = ACTIVE_LEAD_STAGES.reduce(
    (acc, stage) => acc + leadsPorEstado[stage],
    0,
  );

  // Pipeline: valor estimado de los leads activos. Se suma en céntimos
  // enteros para no arrastrar error de coma flotante.
  const pipelineCents = rows.leadsByStage
    .filter((row) => ACTIVE_LEAD_STAGES.includes(row.stage))
    .reduce((acc, row) => acc + Math.round((row.estimatedValue ?? 0) * 100), 0);

  const salesPorPeriodo = [...rows.salesByMonth]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((row) => ({ periodo: row.periodo, total: row.total }));

  const conversionPorPeriodo: ConversionByPeriodEntry[] = [...rows.leadsByMonth]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((row) => ({
      periodo: row.periodo,
      creados: row.creados,
      ganados: row.ganados,
      conversion: conversionRate(row.creados, row.ganados),
    }));

  return {
    summary: {
      leadsActivos,
      cotizacionesEnRevision: quotesPorEstado[QuoteStatus.PENDING_APPROVAL],
      ganado: leadsPorEstado[LeadStage.WON],
      pipeline: pipelineCents / 100,
    },
    leads: { porEstado: leadsPorEstado },
    quotes: { porEstado: quotesPorEstado },
    sales: { porEstado: salesPorEstado, porPeriodo: salesPorPeriodo },
    conversion: { porPeriodo: conversionPorPeriodo },
  };
}
