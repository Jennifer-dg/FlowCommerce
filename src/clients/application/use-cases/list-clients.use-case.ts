import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  CLIENTS_REPOSITORY,
  type ClientRepository,
  type ClientSortField,
  type PaginatedClients,
} from '../../domain/repositories/client.repository';

export interface ListClientsInput {
  actorUserId: string;
  projectId: string;
  search?: string;
  assignedUserId?: string;
  active?: boolean;
  sortBy?: ClientSortField;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class ListClientsUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(CLIENTS_REPOSITORY)
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(input: ListClientsInput): Promise<PaginatedClients> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.CLIENT_READ,
      input.projectId,
    );

    return this.clientRepository.listByProject(input.projectId, {
      search: input.search,
      assignedUserId: input.assignedUserId,
      active: input.active,
      sortBy: input.sortBy,
      order: input.order,
      page: input.page,
      limit: input.limit,
    });
  }
}
