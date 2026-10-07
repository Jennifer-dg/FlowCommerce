import type { MessageDirection } from '@flowcommerce/types';
import type { MessageEntity } from '../entities/message.entity';

export interface CreateMessageInput {
  projectId: string;
  leadId: string;
  whatsappMessageId: string;
  direction: MessageDirection;
  content: string;
  status: string;
}

// Almacén de mensajes con ámbito de tenant. Igual que en leads y quotes, la
// lectura DEBE recibir el `projectId`: no existe un `findByLeadId(leadId)`
// global, porque un lead de otro tenant se identificaría igual que uno propio.
// El ámbito forma parte de la firma, de modo que la restricción se ve al leer
// el puerto.
export interface MessagesRepository {
  create(input: CreateMessageInput): Promise<MessageEntity>;
  // Idempotente para reintentos del webhook: si el wamid ya existe en el
  // tenant, no duplica la fila. Devuelve null cuando el conflicto es de otro
  // proyecto (el índice único es global) para no cruzar tenants.
  createIfNotExists(input: CreateMessageInput): Promise<MessageEntity | null>;
  findByWhatsappMessageIdInProject(
    whatsappMessageId: string,
    projectId: string,
  ): Promise<MessageEntity | null>;
  updateStatusInProject(
    whatsappMessageId: string,
    projectId: string,
    status: string,
  ): Promise<MessageEntity | null>;
  // Los mensajes de un lead, más antiguos primero. Devuelve [] si el lead no
  // existe en ese proyecto, igual que si no tiene mensajes: el 404 del lead
  // lo decide el use-case, no el almacén.
  findByLeadId(leadId: string, projectId: string): Promise<MessageEntity[]>;
}

export const MESSAGES_REPOSITORY = Symbol('MESSAGES_REPOSITORY');
