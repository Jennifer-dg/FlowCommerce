import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  SendWhatsAppMessageResult,
  WhatsAppGateway,
} from '../../domain/ports/whatsapp.gateway';

// Implementación provisional del puerto de WhatsApp.
//
// NO envía nada: devuelve un id sintáctico con el prefijo "wamid.stub." para
// que la columna whatsappMessageId reciba un valor que cumple NOT NULL y el
// índice único, y para que todo el resto del módulo (use-case, repositorio,
// controller, tests) se pueda desarrollar y probar contra el contrato real.
//
// El método no recoge parámetros porque no los usa todavía: el contrato de
// entrada completo vive en WhatsAppGateway.send, que es donde hay que mirarlo.
//
// Para pasar a producción hay que sustituir ESTA clase por una que llame a la
// Graph API y devuelva el id que responda el servidor. Al estar enlazado por
// el token WHATSAPP_GATEWAY en messages.module.ts, ese cambio se limita a
// reemplazar la clase que hay en `useClass`; ningún use-case ni test se toca.
//
// randomUUID() satisface el índice único sin necesidad de esquema compartido.
@Injectable()
export class StubWhatsAppGateway implements WhatsAppGateway {
  send(): Promise<SendWhatsAppMessageResult> {
    return Promise.resolve({
      whatsappMessageId: `wamid.stub.${randomUUID()}`,
      status: 'SENT',
    });
  }
}
