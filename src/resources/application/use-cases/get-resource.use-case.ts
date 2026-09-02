import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { ResourceEntity } from '../../domain/entities/resource.entity';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';

export interface GetResourceInput {
  actorUserId: string;
  projectId: string;
  resourceId: string;
}

@Injectable()
export class GetResourceUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: ResourceRepository,
  ) {}

  // Obtiene un recurso; 404 si no pertenece al proyecto (previene IDOR).
  async execute(input: GetResourceInput): Promise<ResourceEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.RESOURCE_READ,
      input.projectId,
    );

    const resource = await this.resourceRepository.findByIdInProject(
      input.resourceId,
      input.projectId,
    );

    if (!resource) {
      throw new NotFoundException('Resource not found in this project');
    }

    return resource;
  }
}
