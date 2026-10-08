import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Permission } from '@flowcommerce/types';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../../auth/presentation/guards/authenticated.guard';
import { RequirePermission } from '../../../authorization/presentation/decorators/require-permission.decorator';
import { ProjectPermissionGuard } from '../../../authorization/presentation/guards/project-permission.guard';
import { GetDashboardUseCase } from '../../application/use-cases/get-dashboard.use-case';
import { DashboardDto } from '../dto/dashboard.dto';
import { ProjectIdFormatGuard } from '../guards/project-id-format.guard';

// Métricas agregadas del Dashboard del tenant. SOLO lectura: no modifica leads
// ni quotes. Orden de guards: sesión (401) → formato del projectId (400) →
// membresía + PROJECT_READ (403 uniforme para proyectos ajenos o inexistentes).
@ApiTags('dashboard')
@Controller({ path: 'projects/:projectId/dashboard', version: '1' })
@UseGuards(AuthenticatedGuard, ProjectIdFormatGuard, ProjectPermissionGuard)
export class DashboardController {
  constructor(private readonly getDashboardUseCase: GetDashboardUseCase) {}

  @Get()
  @RequirePermission(Permission.PROJECT_READ)
  @ApiOperation({
    summary: 'Dashboard del proyecto',
    description:
      'Vista agregada (histórica, sin filtros de fecha) de leads, cotizaciones, ventas derivadas de quotes.total y conversión mensual. Requiere PROJECT_READ en el proyecto.',
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: DashboardDto })
  @ApiBadRequestResponse({ description: 'projectId no es un UUID válido' })
  @ApiUnauthorizedResponse({ description: 'Sin sesión activa' })
  @ApiForbiddenResponse({
    description:
      'Sin PROJECT_READ en el proyecto (incluye proyectos ajenos o inexistentes)',
  })
  getDashboard(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<DashboardDto> {
    return this.getDashboardUseCase.execute({
      actorUserId: userId,
      projectId,
    });
  }
}
