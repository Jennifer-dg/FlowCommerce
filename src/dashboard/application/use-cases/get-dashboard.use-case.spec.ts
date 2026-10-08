import { Test, TestingModule } from '@nestjs/testing';
import { LeadStage, Permission, QuoteStatus } from '@flowcommerce/types';
import { ForbiddenException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import type { DashboardMetricsRows } from '../../domain/dashboard.types';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepository,
} from '../../domain/repositories/dashboard.repository';
import { GetDashboardUseCase } from './get-dashboard.use-case';

describe('GetDashboardUseCase', () => {
  let module: TestingModule;
  const authorizationService = {
    assertCan: jest.fn(),
  };
  const dashboardRepository: Record<keyof DashboardRepository, jest.Mock> = {
    getMetricsRows: jest.fn(),
  };

  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';

  const rows: DashboardMetricsRows = {
    leadsByStage: [
      { stage: LeadStage.NEW, count: 2 },
      { stage: LeadStage.CONTACTED, count: 1 },
      { stage: LeadStage.WON, count: 1 },
      { stage: LeadStage.LOST, count: 1 },
    ],
    quotesByStatus: [
      { status: QuoteStatus.DRAFT, count: 2, total: 300 },
      { status: QuoteStatus.PENDING_APPROVAL, count: 3, total: 1500 },
    ],
    salesByMonth: [{ periodo: '2026-09', total: 1800 }],
    leadsByMonth: [{ periodo: '2026-09', creados: 5, ganados: 1 }],
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        GetDashboardUseCase,
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: DASHBOARD_REPOSITORY, useValue: dashboardRepository },
      ],
    }).compile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks PROJECT_READ and builds the dashboard of that project only', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    dashboardRepository.getMetricsRows.mockResolvedValue(rows);

    const result = await module.get(GetDashboardUseCase).execute({
      actorUserId: actorId,
      projectId,
    });

    expect(authorizationService.assertCan).toHaveBeenCalledWith(
      actorId,
      Permission.PROJECT_READ,
      projectId,
    );
    expect(dashboardRepository.getMetricsRows).toHaveBeenCalledTimes(1);
    expect(dashboardRepository.getMetricsRows).toHaveBeenCalledWith(projectId);
    expect(result).toEqual({
      summary: {
        leadsActivos: 3,
        cotizacionesEnRevision: 3,
        ganado: 1,
        pipeline: 0,
      },
      leads: {
        porEstado: {
          NEW: 2,
          CONTACTED: 1,
          QUALIFIED: 0,
          PROPOSAL: 0,
          NEGOTIATION: 0,
          WON: 1,
          LOST: 1,
        },
      },
      quotes: {
        porEstado: {
          DRAFT: 2,
          PENDING_APPROVAL: 3,
          APPROVED: 0,
          SENT: 0,
          ACCEPTED: 0,
          PAID: 0,
          REJECTED: 0,
        },
      },
      sales: {
        porEstado: {
          DRAFT: 300,
          PENDING_APPROVAL: 1500,
          APPROVED: 0,
          SENT: 0,
          ACCEPTED: 0,
          PAID: 0,
          REJECTED: 0,
        },
        porPeriodo: [{ periodo: '2026-09', total: 1800 }],
      },
      conversion: {
        porPeriodo: [
          { periodo: '2026-09', creados: 5, ganados: 1, conversion: 0.2 },
        ],
      },
    });
  });

  it('propagates authorization denials without querying', async () => {
    authorizationService.assertCan.mockRejectedValue(
      new ForbiddenException('Insufficient permissions for this project'),
    );

    await expect(
      module
        .get(GetDashboardUseCase)
        .execute({ actorUserId: actorId, projectId }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(dashboardRepository.getMetricsRows).not.toHaveBeenCalled();
  });
});
