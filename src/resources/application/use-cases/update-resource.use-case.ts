import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { ResourceEntity } from '../../domain/entities/resource.entity';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';

export interface UpdateResourceInput {
  actorUserId: string;
  projectId: string;
  resourceId: string;
  name?: string;
  description?: string | null;
}

@Injectable()
export class UpdateResourceUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: ResourceRepository,
  ) {}

  // Actualiza un recurso solo si pertenece al proyecto del contexto autorizado.
  async execute(input: UpdateResourceInput): Promise<ResourceEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.RESOURCE_UPDATE,
      input.projectId,
    );

    const updated = await this.resourceRepository.updateInProject(
      input.resourceId,
      input.projectId,
      {
        name: input.name,
        description: input.description,
      },
    );

    if (!updated) {
      throw new NotFoundException('Resource not found in this project');
    }

    return updated;
  }
}
