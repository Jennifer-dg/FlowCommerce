import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { isUniqueViolation } from '../../../common/utils/postgres-error';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import { assertAssignableMember } from '../../../projects/application/services/assignable-member';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../projects/domain/repositories/membership.repository';
import { ClientEntity } from '../../domain/entities/client.entity';
import {
  CLIENTS_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository';

export interface CreateClientInput {
  actorUserId: string;
  projectId: string;
  name: string;
  company: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  assignedUserId: string | null;
  sourceLeadId: string | null;
}

@Injectable()
export class CreateClientUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(CLIENTS_REPOSITORY)
    private readonly clientRepository: ClientRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
  ) {}

  // Alta de cliente tras verificar CLIENT_CREATE. Las referencias del body
  // (responsable y lead de origen) se validan DENTRO del proyecto: un usuario o
  // un lead de otro tenant se rechaza antes de escribir nada.
  async execute(input: CreateClientInput): Promise<ClientEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.CLIENT_CREATE,
      input.projectId,
    );

    await assertAssignableMember(
      this.membershipRepository,
      input.assignedUserId,
      input.projectId,
    );

    if (input.sourceLeadId) {
      const lead = await this.leadRepository.findByIdInProject(
        input.sourceLeadId,
        input.projectId,
      );
      if (!lead) {
        throw new NotFoundException('Lead not found in this project');
      }
    }

    try {
      return await this.clientRepository.create({
        projectId: input.projectId,
        name: input.name.trim(),
        company: input.company,
        taxId: input.taxId,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        assignedUserId: input.assignedUserId,
        sourceLeadId: input.sourceLeadId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A client with that tax id already exists in this project',
        );
      }
      throw error;
    }
  }
}
