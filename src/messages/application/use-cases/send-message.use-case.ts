import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { MessageDirection, Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import { MessageEntity } from '../../domain/entities/message.entity';
import {
  MESSAGES_REPOSITORY,
  type MessagesRepository,
} from '../../domain/ports/messages.repository';
import {
  WHATSAPP_GATEWAY,
  type WhatsAppGateway,
} from '../../domain/ports/whatsapp.gateway';

// El use-case NO acepta whatsappMessageId, direction ni status desde el
// controller: los tres son datos que no son del cliente. El id lo asigna la API
// de WhatsApp, la dirección es siempre OUTBOUND porque este endpoint solo
// envía (lo entrante llega por webhook), y el estado lo reporta la propia API.
export interface SendMessageInput {
  actorUserId: string;
  projectId: string;
  leadId: string;
  content: string;
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
    @Inject(WHATSAPP_GATEWAY)
    private readonly whatsappGateway: WhatsAppGateway,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  // Envía un mensaje de WhatsApp a un lead tras verificar WHATSAPP_SEND_MESSAGE
  // y persiste el resultado.
  //
  // El leadId viene de la ruta, así que hay que comprobar que ese lead
  // pertenece REALMENTE al proyecto. Sin esta comprobación la FK compuesta
  // (lead_id, project_id) rechazaría la inserción con un 500 y, peor, el
  // gateway se habría llamado para un lead ajeno. Validarlo aquí devuelve un
  // 404 limpio e indistinguible del caso "no existe".
  //
  // El ORDEN es la parte sensible: primero WhatsApp, después la base.
  // whatsappMessageId es NOT NULL con índice único y lo genera el servidor de
  // WhatsApp, así que no se puede insertar la fila hasta que exista. Si el
  // envío falla, no se persiste nada y la base no registra un mensaje que
  // nadie recibió.
  async execute(input: SendMessageInput): Promise<MessageEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.WHATSAPP_SEND_MESSAGE,
      input.projectId,
    );

    const lead = await this.leadRepository.findByIdInProject(
      input.leadId,
      input.projectId,
    );

    if (!lead) {
      throw new NotFoundException('Lead not found in this project');
    }

    // Un lead sin teléfono no tiene a quién enviarle un mensaje de WhatsApp.
    // Sin esta regla el stub devolvería un id, la fila se insertaría y quedaría
    // registrada una entrega que no ocurrió.
    if (!lead.phone) {
      throw new ConflictException(
        'Lead has no phone number, WhatsApp message not sent',
      );
    }

    const sent = await this.whatsappGateway.send({
      projectId: input.projectId,
      leadId: input.leadId,
      phone: lead.phone,
      content: input.content,
    });

    return this.messagesRepository.create({
      projectId: input.projectId,
      leadId: input.leadId,
      whatsappMessageId: sent.whatsappMessageId,
      direction: MessageDirection.OUTBOUND,
      content: input.content,
      status: sent.status,
    });
  }
}
