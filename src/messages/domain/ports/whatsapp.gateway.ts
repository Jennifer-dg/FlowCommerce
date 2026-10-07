// Puerto de salida hacia la API de WhatsApp. Vive en domain/ porque el
// use-case depende de él, no de ningún SDK concreto: el resto del sistema solo
// sabe que necesita "enviar un mensaje y que me devuelvan el id de WhatsApp".
//
// La API es quien asigna whatsappMessageId, y esa columna es NOT NULL con
// índice único. Por eso el contrato devuelve el id en lugar de recibirlo:
// el orden obligatorio es llamar a WhatsApp primero y persistir después, y
// este puerto hace explícito ese orden.
export interface SendWhatsAppMessageInput {
  projectId: string;
  leadId: string;
  // Destinatario. El use-case lo resuelve desde el lead antes de llamar aquí.
  phone: string | null;
  content: string;
}

export interface SendWhatsAppMessageResult {
  // Id devuelto por la API. Se guarda tal cual en messages.whatsapp_message_id.
  whatsappMessageId: string;
  // Estado inicial que la API reporta para el mensaje.
  status: string;
}

export interface WhatsAppGateway {
  send(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}

export const WHATSAPP_GATEWAY = Symbol('WHATSAPP_GATEWAY');
