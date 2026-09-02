import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  REQUIRED_PERMISSIONS_KEY,
  type RequiredPermissions,
} from '../decorators/require-permission.decorator';
import { AuthorizationService } from '../../application/services/authorization.service';

// Autoriza el acceso a una ruta con ámbito de proyecto.
// - Se ejecuta DESPUÉS de `AuthenticatedGuard` (que define `request.userId`).
// - La ruta debe declarar `@RequirePermission(...)`.
// - El proyecto se resuelve desde `request.params.projectId`.
// En caso de éxito fija `request.projectId`/`request.userProjectRole` para que
// controllers y use-cases confíen en el contexto autorizado sin re-verificar.
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId?: string }>();

    const permissions = this.reflector.getAllAndOverride<
      RequiredPermissions | undefined
    >(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!permissions || permissions.length === 0) {
      return true;
    }

    const { userId } = request;
    if (!userId) {
      throw new UnauthorizedException('No active session');
    }

    const projectId = this.resolveProjectId(request);
    if (!projectId) {
      throw new ForbiddenException('Project context is required');
    }

    const decision = await this.authorizationService.decide(
      userId,
      permissions,
      projectId,
    );

    if (!decision.allowed) {
      // Do not reveal whether the project exists or which permission is
      // missing: the caller has no authorization in this project context.
      throw new ForbiddenException('Insufficient permissions for this project');
    }

    request.projectId = projectId;
    request.userProjectRole = decision.role ?? null;

    return true;
  }

  // Extrae el projectId del parámetro de ruta (por defecto `projectId`).
  private resolveProjectId(
    request: Request,
    param = 'projectId',
  ): string | undefined {
    const params = request.params as Record<string, string | undefined>;
    return params?.[param];
  }
}
