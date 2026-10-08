import { Inject, Injectable } from '@nestjs/common';
import { LeadSource, LeadStage, Permission } from '@flowcommerce/types';
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
} from '../../domain/repositories/lead.repository';
import { rethrowLeadReferenceError } from '../lead-reference-errors';

export interface CreateLeadInput {
  actorUserId: string;
  projectId: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  score: number;
  company?: string | null;
  source?: LeadSource | null;
  estimatedValue?: number | null;
  notes?: string | null;
  assignedUserId?: string | null;
  clientId?: string | null;
  interestProductId?: string | null;
  lastContactAt?: Date | null;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Crea un lead en el proyecto tras verificar el permiso LEAD_CREATE.
  // El projectId viene del contexto ya autorizado por el guard, nunca del body.
  // Referencias del body: el responsable se valida como miembro del proyecto;
  // cliente y producto los ata al proyecto la FK compuesta (→ 404 si no).
  async execute(input: CreateLeadInput): Promise<LeadEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.LEAD_CREATE,
      input.projectId,
    );

    await assertAssignableMember(
      this.membershipRepository,
      input.assignedUserId,
      input.projectId,
    );

    try {
      return await this.leadRepository.create({
        projectId: input.projectId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        stage: input.stage,
        score: input.score,
        company: input.company ?? null,
        source: input.source ?? null,
        estimatedValue: input.estimatedValue ?? null,
        notes: input.notes ?? null,
        assignedUserId: input.assignedUserId ?? null,
        clientId: input.clientId ?? null,
        interestProductId: input.interestProductId ?? null,
        lastContactAt: input.lastContactAt ?? null,
      });
    } catch (error) {
      rethrowLeadReferenceError(error);
    }
  }
}
