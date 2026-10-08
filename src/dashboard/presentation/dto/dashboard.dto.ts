import { ApiProperty } from '@nestjs/swagger';

// Contrato de respuesta de GET /api/v1/projects/:projectId/dashboard.
// Los objetos `porEstado` incluyen SIEMPRE todas las claves (con 0 cuando no
// hay registros) para que el frontend no tenga que descubrir qué estados
// existen. No incluye `seguimientosPendientes`: no hay datos para calcularlo.

export class DashboardSummaryDto {
  @ApiProperty({
    example: 12,
    description:
      'Leads en NEW + CONTACTED + QUALIFIED + PROPOSAL + NEGOTIATION (todo menos WON y LOST)',
  })
  leadsActivos!: number;

  @ApiProperty({
    example: 3,
    description: 'Cotizaciones con status PENDING_APPROVAL',
  })
  cotizacionesEnRevision!: number;

  @ApiProperty({
    example: 4,
    description: 'Cantidad de leads con stage WON (conteo, no monto)',
  })
  ganado!: number;

  @ApiProperty({
    example: 125000.5,
    description:
      'Suma del valor estimado (estimatedValue, antes de IVA) de los leads activos: todo menos WON y LOST',
  })
  pipeline!: number;
}

export class LeadsPorEstadoDto {
  @ApiProperty({ example: 5 })
  NEW!: number;

  @ApiProperty({ example: 3 })
  CONTACTED!: number;

  @ApiProperty({ example: 2 })
  QUALIFIED!: number;

  @ApiProperty({ example: 1 })
  PROPOSAL!: number;

  @ApiProperty({ example: 1 })
  NEGOTIATION!: number;

  @ApiProperty({ example: 4 })
  WON!: number;

  @ApiProperty({ example: 2 })
  LOST!: number;
}

export class DashboardLeadsDto {
  @ApiProperty({
    type: LeadsPorEstadoDto,
    description: 'Conteo de leads por stage (las 7 etapas, 0 si no hay)',
  })
  porEstado!: LeadsPorEstadoDto;
}

export class QuotesPorEstadoDto {
  @ApiProperty({ example: 6 })
  DRAFT!: number;

  @ApiProperty({ example: 3 })
  PENDING_APPROVAL!: number;

  @ApiProperty({ example: 2 })
  APPROVED!: number;

  @ApiProperty({ example: 0 })
  SENT!: number;

  @ApiProperty({ example: 0 })
  ACCEPTED!: number;

  @ApiProperty({ example: 1 })
  PAID!: number;

  @ApiProperty({ example: 0 })
  REJECTED!: number;
}

export class DashboardQuotesDto {
  @ApiProperty({
    type: QuotesPorEstadoDto,
    description: 'Conteo de cotizaciones por status (los 7, 0 si no hay)',
  })
  porEstado!: QuotesPorEstadoDto;
}

export class SalesPorEstadoDto {
  @ApiProperty({ example: 0 })
  DRAFT!: number;

  @ApiProperty({ example: 1500 })
  PENDING_APPROVAL!: number;

  @ApiProperty({ example: 2400 })
  APPROVED!: number;

  @ApiProperty({ example: 0 })
  SENT!: number;

  @ApiProperty({ example: 0 })
  ACCEPTED!: number;

  @ApiProperty({ example: 1200 })
  PAID!: number;

  @ApiProperty({ example: 0 })
  REJECTED!: number;
}

export class SalesPorPeriodoDto {
  @ApiProperty({
    example: '2026-09',
    description: 'Mes (YYYY-MM, UTC) en que se pagó la cotización (paidAt)',
  })
  periodo!: string;

  @ApiProperty({
    example: 2400,
    description: 'Suma de quotes.total creadas en el mes',
  })
  total!: number;
}

export class DashboardSalesDto {
  @ApiProperty({
    type: SalesPorEstadoDto,
    description: 'Suma de quotes.total por status (los 7, 0 si no hay)',
  })
  porEstado!: SalesPorEstadoDto;

  @ApiProperty({
    type: [SalesPorPeriodoDto],
    description:
      'Ventas: suma de quotes.total de las cotizaciones PAID agrupada por mes de pago (paidAt), ordenada ascendente. Cuadra con las ventas de GET /clients/:id/stats.',
  })
  porPeriodo!: SalesPorPeriodoDto[];
}

export class ConversionPorPeriodoDto {
  @ApiProperty({
    example: '2026-09',
    description: 'Mes (YYYY-MM, UTC) de creación del lead',
  })
  periodo!: string;

  @ApiProperty({ example: 10, description: 'Leads creados en el mes' })
  creados!: number;

  @ApiProperty({
    example: 2,
    description: 'Leads creados en el mes que hoy están en WON',
  })
  ganados!: number;

  @ApiProperty({
    example: 0.2,
    description: 'ganados / creados (0 cuando creados = 0)',
  })
  conversion!: number;
}

export class DashboardConversionDto {
  @ApiProperty({
    type: [ConversionPorPeriodoDto],
    description: 'Conversión mensual de leads, ordenada ascendente',
  })
  porPeriodo!: ConversionPorPeriodoDto[];
}

export class DashboardDto {
  @ApiProperty({ type: DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({ type: DashboardLeadsDto })
  leads!: DashboardLeadsDto;

  @ApiProperty({ type: DashboardQuotesDto })
  quotes!: DashboardQuotesDto;

  @ApiProperty({ type: DashboardSalesDto })
  sales!: DashboardSalesDto;

  @ApiProperty({ type: DashboardConversionDto })
  conversion!: DashboardConversionDto;
}
