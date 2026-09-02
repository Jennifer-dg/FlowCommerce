import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';

export interface DeleteResourceInput {
  actorUserId: string;
  projectId: string;
  resourceId: string;
}

@Injectable()
export class DeleteResourceUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: ResourceRepository,
  ) {}

  // Elimina un recurso solo si pertenece al proyecto del contexto autorizado.
  async execute(input: DeleteResourceInput): Promise<void> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.RESOURCE_DELETE,
      input.projectId,
    );

    const deleted = await this.resourceRepository.deleteInProject(
      input.resourceId,
      input.projectId,
    );

    if (!deleted) {
      throw new NotFoundException('Resource not found in this project');
    }
  }
}
