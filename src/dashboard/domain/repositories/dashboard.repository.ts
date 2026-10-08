import type { DashboardMetricsRows } from '../dashboard.types';

// Fuente de agregados del Dashboard, SIEMPRE acotada por projectId. Devuelve
// conteos y sumas ya agrupados por PostgreSQL (GROUP BY), nunca filas
// individuales de leads o quotes.
export interface DashboardRepository {
  getMetricsRows(projectId: string): Promise<DashboardMetricsRows>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
