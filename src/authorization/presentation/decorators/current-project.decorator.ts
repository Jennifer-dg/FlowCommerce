import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@flowcommerce/types';

// Expone el `projectId` autorizado que fija el ProjectPermissionGuard.
export const CurrentProjectId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ projectId?: string }>();
    return request.projectId;
  },
);

// Expone el rol del usuario dentro del proyecto autorizado.
export const CurrentProjectRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Role | null | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ userProjectRole?: Role | null }>();
    return request.userProjectRole;
  },
);
