import type { Message, MessageDirection, MessageId } from '@flowcommerce/types';

// Entidad de dominio de un mensaje de WhatsApp. Es un registro de auditoría
// inmutable: no tiene actualizadoEn porque un mensaje enviado no se edita, se
// envía otro. El whatsappMessageId es el identificador que asignó la API de
// WhatsApp y es la clave de idempotencia del webhook.
export class MessageEntity implements Message {
  constructor(
    public readonly id: MessageId,
    public readonly projectId: string,
    public readonly leadId: string,
    public readonly whatsappMessageId: string,
    public readonly direction: MessageDirection,
    public readonly content: string,
    public readonly status: string,
    public readonly creadoEn: Date,
  ) {}

  toMessage(): Message {
    return {
      id: this.id,
      projectId: this.projectId,
      leadId: this.leadId,
      whatsappMessageId: this.whatsappMessageId,
      direction: this.direction,
      content: this.content,
      status: this.status,
      creadoEn: this.creadoEn,
    };
  }
}
