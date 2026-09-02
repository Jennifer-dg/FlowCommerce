import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { ResourceEntity } from '../../domain/entities/resource.entity';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';

export interface ListResourcesInput {
  actorUserId: string;
  projectId: string;
}

@Injectable()
export class ListResourcesUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: ResourceRepository,
  ) {}

  // Lista solo los recursos del tenant indicado.
  async execute(input: ListResourcesInput): Promise<ResourceEntity[]> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.RESOURCE_READ,
      input.projectId,
    );

    return this.resourceRepository.listByProject(input.projectId);
  }
}
