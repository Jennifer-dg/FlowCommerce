import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { leads, quotes } from '../../../db/schema';
import type {
  DashboardMetricsRows,
  LeadStageCountRow,
  LeadsByMonthRow,
  QuoteStatusAggregateRow,
  SalesByMonthRow,
} from '../../domain/dashboard.types';
import type { DashboardRepository } from '../../domain/repositories/dashboard.repository';

// Mes calendario (YYYY-MM) en UTC. Se fija la zona para que el período no
// dependa del TimeZone de la sesión de Postgres.
const monthOf = (column: AnyColumn | SQL) =>
  sql<string>`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM')`;

// Agregaciones del Dashboard sobre las tablas existentes leads y quotes.
//
// - Multi-tenancy: CADA consulta lleva `WHERE project_id = :projectId`. Ningún
//   COUNT/SUM se ejecuta sin ese filtro, así que los GROUP BY solo ven filas
//   del tenant autorizado.
// - Performance: 4 consultas con GROUP BY en paralelo (por stage, por status,
//   por mes de quotes y por mes de leads). Nada se trae a memoria fila a fila;
//   el summary se deriva de los conteos por estado sin consultas extra.
// - Dinero: quotes.total es numeric(14,2). La suma la hace PostgreSQL (exacta)
//   y el driver la devuelve como string; se convierte a number solo para el
//   JSON, sin aritmética en coma flotante.
@Injectable()
export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  async getMetricsRows(projectId: string): Promise<DashboardMetricsRows> {
    const [leadsByStage, quotesByStatus, salesByMonth, leadsByMonth] =
      await Promise.all([
        this.getLeadsByStage(projectId),
        this.getQuotesByStatus(projectId),
        this.getSalesByMonth(projectId),
        this.getLeadsByMonth(projectId),
      ]);

    return { leadsByStage, quotesByStatus, salesByMonth, leadsByMonth };
  }

  // SELECT stage, COUNT(*), COALESCE(SUM(estimated_value), 0) FROM leads
  // WHERE project_id = $1 GROUP BY stage
  private async getLeadsByStage(
    projectId: string,
  ): Promise<LeadStageCountRow[]> {
    const rows = await this.db
      .select({
        stage: leads.stage,
        count: count(),
        estimatedValue: sql<string>`coalesce(sum(${leads.estimatedValue}), 0)`,
      })
      .from(leads)
      .where(eq(leads.projectId, projectId))
      .groupBy(leads.stage);

    return rows.map((row) => ({
      stage: row.stage,
      count: row.count,
      estimatedValue: Number(row.estimatedValue),
    }));
  }

  // SELECT status, COUNT(*), COALESCE(SUM(total), 0) FROM quotes
  // WHERE project_id = $1 GROUP BY status
  private async getQuotesByStatus(
    projectId: string,
  ): Promise<QuoteStatusAggregateRow[]> {
    const rows = await this.db
      .select({
        status: quotes.status,
        count: count(),
        total: sql<string>`coalesce(sum(${quotes.total}), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.projectId, projectId))
      .groupBy(quotes.status);

    return rows.map((row) => ({
      status: row.status,
      count: row.count,
      total: Number(row.total),
    }));
  }

  // SELECT to_char(creado_en AT TIME ZONE 'UTC', 'YYYY-MM') AS periodo,
  //        COALESCE(SUM(total), 0)
  // FROM quotes WHERE project_id = $1 GROUP BY periodo ORDER BY periodo
  private async getSalesByMonth(projectId: string): Promise<SalesByMonthRow[]> {
    // Venta = cotización PAID, en el mes en que se pagó (paid_at). El coalesce
    // cubre solo cotizaciones PAID antiguas sin paid_at: nunca se pierde dinero.
    const periodo = monthOf(
      sql`coalesce(${quotes.paidAt}, ${quotes.createdAt})`,
    );

    const rows = await this.db
      .select({
        periodo,
        total: sql<string>`coalesce(sum(${quotes.total}), 0)`,
      })
      .from(quotes)
      .where(and(eq(quotes.projectId, projectId), eq(quotes.status, 'PAID')))
      .groupBy(periodo)
      .orderBy(asc(periodo));

    return rows.map((row) => ({
      periodo: row.periodo,
      total: Number(row.total),
    }));
  }

  // SELECT to_char(creado_en AT TIME ZONE 'UTC', 'YYYY-MM') AS periodo,
  //        COUNT(*) AS creados,
  //        COUNT(*) FILTER (WHERE stage = 'WON') AS ganados
  // FROM leads WHERE project_id = $1 GROUP BY periodo ORDER BY periodo
  private async getLeadsByMonth(projectId: string): Promise<LeadsByMonthRow[]> {
    const periodo = monthOf(leads.createdAt);

    const rows = await this.db
      .select({
        periodo,
        creados: count(),
        ganados:
          sql<number>`count(*) filter (where ${leads.stage} = 'WON')`.mapWith(
            Number,
          ),
      })
      .from(leads)
      .where(eq(leads.projectId, projectId))
      .groupBy(periodo)
      .orderBy(asc(periodo));

    return rows;
  }
}
