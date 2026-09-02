import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { ResourceEntity } from '../../domain/entities/resource.entity';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';

export interface CreateResourceInput {
  actorUserId: string;
  projectId: string;
  name: string;
  description: string | null;
}

@Injectable()
export class CreateResourceUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: ResourceRepository,
  ) {}

  // Crea un recurso en el proyecto tras verificar el permiso RESOURCE_CREATE.
  async execute(input: CreateResourceInput): Promise<ResourceEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.RESOURCE_CREATE,
      input.projectId,
    );

    return this.resourceRepository.create({
      projectId: input.projectId,
      name: input.name,
      description: input.description,
    });
  }
}
