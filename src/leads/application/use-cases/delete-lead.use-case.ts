import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../domain/repositories/lead.repository';

export interface DeleteLeadInput {
  actorUserId: string;
  projectId: string;
  leadId: string;
}

@Injectable()
export class DeleteLeadUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
  ) {}

  // Elimina un lead tras verificar LEAD_DELETE. El projectId viaja hasta el
  // WHERE del DELETE, así que borrar un lead de otro tenant no afecta ninguna
  // fila y produce el mismo 404 que un lead inexistente.
  //
  // OJO: al borrar el lead caen en cascada sus cotizaciones y sus mensajes,
  // porque quotes y messages lo referencian con FK compuesta ON DELETE CASCADE.
  async execute(input: DeleteLeadInput): Promise<void> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.LEAD_DELETE,
      input.projectId,
    );

    const deleted = await this.leadRepository.deleteInProject(
      input.leadId,
      input.projectId,
    );

    if (!deleted) {
      throw new NotFoundException('Lead not found in this project');
    }
  }
}
