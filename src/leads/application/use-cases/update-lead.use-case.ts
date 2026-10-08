import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { assertAssignableMember } from '../../../projects/application/services/assignable-member';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../projects/domain/repositories/membership.repository';
import { LeadEntity } from '../../domain/entities/lead.entity';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
  type UpdateLeadInput as RepoUpdateLeadInput,
} from '../../domain/repositories/lead.repository';
import { rethrowLeadReferenceError } from '../lead-reference-errors';

export interface UpdateLeadInput extends RepoUpdateLeadInput {
  actorUserId: string;
  projectId: string;
  leadId: string;
}

@Injectable()
export class UpdateLeadUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Actualiza un lead tras verificar LEAD_UPDATE. El projectId se propaga al
  // repositorio, que lo aplica en el WHERE: un lead de otro tenant produce
  // null y por tanto un 404, nunca una modificación.
  async execute(input: UpdateLeadInput): Promise<LeadEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.LEAD_UPDATE,
      input.projectId,
    );

    await assertAssignableMember(
      this.membershipRepository,
      input.assignedUserId,
      input.projectId,
    );

    let updated: LeadEntity | null;
    try {
      updated = await this.leadRepository.updateInProject(
        input.leadId,
        input.projectId,
        {
          name: input.name,
          email: input.email,
          phone: input.phone,
          stage: input.stage,
          score: input.score,
          company: input.company,
          source: input.source,
          estimatedValue: input.estimatedValue,
          notes: input.notes,
          assignedUserId: input.assignedUserId,
          clientId: input.clientId,
          interestProductId: input.interestProductId,
          lastContactAt: input.lastContactAt,
        },
      );
    } catch (error) {
      rethrowLeadReferenceError(error);
    }

    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    return updated;
  }
}
