import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { buildDashboard } from '../../domain/build-dashboard';
import type { DashboardAggregate } from '../../domain/dashboard.types';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepository,
} from '../../domain/repositories/dashboard.repository';

export interface GetDashboardInput {
  actorUserId: string;
  projectId: string;
}

// Entrega el agregado de métricas del Dashboard para un proyecto.
//
// El guard ya valida PROJECT_READ en el borde HTTP; igual que el resto de
// use-cases se re-verifica aquí con assertCan (defensa en profundidad). Si la
// autorización falla no se consulta nada. El repositorio solo agrega filas del
// projectId autorizado y la composición del contrato es una función pura.
@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async execute(input: GetDashboardInput): Promise<DashboardAggregate> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.PROJECT_READ,
      input.projectId,
    );

    const rows = await this.dashboardRepository.getMetricsRows(input.projectId);
    return buildDashboard(rows);
  }
}
