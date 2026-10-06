import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  SendWhatsAppMessageResult,
  WhatsAppGateway,
} from '../../domain/ports/whatsapp.gateway';

// Doble de prueba del puerto de WhatsApp. El módulo de producción usa
// CloudWhatsAppGateway; este stub solo se inyecta en E2E para no llamar a
// Graph API. Devuelve un wamid sintético que cumple NOT NULL y el único.
@Injectable()
export class StubWhatsAppGateway implements WhatsAppGateway {
  send(): Promise<SendWhatsAppMessageResult> {
    return Promise.resolve({
      whatsappMessageId: `wamid.stub.${randomUUID()}`,
      status: 'SENT',
    });
  }
}
