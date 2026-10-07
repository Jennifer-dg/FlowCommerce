import { Inject, Injectable } from '@nestjs/common';
import { LeadStage, Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { LeadEntity } from '../../domain/entities/lead.entity';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../domain/repositories/lead.repository';

export interface CreateLeadInput {
  actorUserId: string;
  projectId: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  score: number;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
  ) {}

  // Crea un lead en el proyecto tras verificar el permiso LEAD_CREATE.
  // El projectId viene del contexto ya autorizado por el guard, nunca del body.
  async execute(input: CreateLeadInput): Promise<LeadEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.LEAD_CREATE,
      input.projectId,
    );

    return this.leadRepository.create({
      projectId: input.projectId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      stage: input.stage,
      score: input.score,
    });
  }
}
