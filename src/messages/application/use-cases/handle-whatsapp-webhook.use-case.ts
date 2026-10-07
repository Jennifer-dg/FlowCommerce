import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDirection } from '@flowcommerce/types';
import { ForbiddenException } from '../../../common/exceptions/domain.exceptions';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import {
  MESSAGES_REPOSITORY,
  type MessagesRepository,
} from '../../domain/ports/messages.repository';
import { normalizeWhatsAppPhone } from '../../infrastructure/whatsapp/normalize-phone';
import { verifyWhatsAppSignature } from '../../infrastructure/whatsapp/whatsapp-webhook.signature';

export interface HandleWhatsAppWebhookInput {
  rawBody: Buffer;
  signatureHeader?: string;
  payload: unknown;
}

interface WhatsAppMetadata {
  phone_number_id?: string;
}

interface WhatsAppIncomingMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
}

interface WhatsAppStatus {
  id?: string;
  status?: string;
}

interface WhatsAppChangeValue {
  metadata?: WhatsAppMetadata;
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: WhatsAppChangeValue;
      field?: string;
    }>;
  }>;
}

const STATUS_MAP: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

// Recepción de webhooks de Meta. No autentica por sesión: la prueba de
// identidad es la firma HMAC del App Secret y, después, el phone_number_id
// configurado. Toda persistencia se acota a WHATSAPP_PROJECT_ID.
@Injectable()
export class HandleWhatsAppWebhookUseCase {
  private readonly logger = new Logger(HandleWhatsAppWebhookUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
  ) {}

  verifyChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string {
    const expected = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (!expected || mode !== 'subscribe' || !token || token !== expected) {
      throw new ForbiddenException('WhatsApp webhook verification failed');
    }
    if (!challenge) {
      throw new ForbiddenException('WhatsApp webhook challenge is missing');
    }
    return challenge;
  }

  async execute(input: HandleWhatsAppWebhookInput): Promise<void> {
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    if (!appSecret) {
      throw new ForbiddenException('WhatsApp webhook is not configured');
    }

    if (
      !verifyWhatsAppSignature(input.rawBody, input.signatureHeader, appSecret)
    ) {
      throw new ForbiddenException('Invalid WhatsApp webhook signature');
    }

    const payload = input.payload as WhatsAppWebhookPayload;
    if (payload.object !== 'whatsapp_business_account') {
      return;
    }

    const expectedPhoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    const projectId = this.configService.get<string>('WHATSAPP_PROJECT_ID');

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) {
          continue;
        }

        if (
          expectedPhoneNumberId &&
          value.metadata?.phone_number_id &&
          value.metadata.phone_number_id !== expectedPhoneNumberId
        ) {
          this.logger.warn(
            'Ignoring WhatsApp event for a foreign phone_number_id',
          );
          continue;
        }

        if (!projectId) {
          this.logger.warn(
            'WHATSAPP_PROJECT_ID is not set; inbound WhatsApp events are not persisted',
          );
          continue;
        }

        await this.persistInboundMessages(projectId, value.messages ?? []);
        await this.persistStatuses(projectId, value.statuses ?? []);
      }
    }
  }

  private async persistInboundMessages(
    projectId: string,
    incoming: WhatsAppIncomingMessage[],
  ): Promise<void> {
    for (const message of incoming) {
      if (!message.id || !message.from) {
        continue;
      }

      const lead = await this.leadRepository.findByPhoneDigitsInProject(
        normalizeWhatsAppPhone(message.from),
        projectId,
      );

      if (!lead) {
        this.logger.warn(
          `Inbound WhatsApp message ${message.id} did not match a lead in project ${projectId}`,
        );
        continue;
      }

      await this.messagesRepository.createIfNotExists({
        projectId,
        leadId: lead.id,
        whatsappMessageId: message.id,
        direction: MessageDirection.INBOUND,
        content: this.extractContent(message),
        status: 'RECEIVED',
      });
    }
  }

  private async persistStatuses(
    projectId: string,
    statuses: WhatsAppStatus[],
  ): Promise<void> {
    for (const item of statuses) {
      if (!item.id || !item.status) {
        continue;
      }

      const mapped =
        STATUS_MAP[item.status.toLowerCase()] ?? item.status.toUpperCase();
      await this.messagesRepository.updateStatusInProject(
        item.id,
        projectId,
        mapped,
      );
    }
  }

  private extractContent(message: WhatsAppIncomingMessage): string {
    if (message.type === 'text' && message.text?.body) {
      return message.text.body;
    }
    return `[${message.type ?? 'unknown'}]`;
  }
}
