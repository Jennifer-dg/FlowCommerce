import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { messages, type MessageRow } from '../../../db/schema';
import { MessageEntity } from '../../domain/entities/message.entity';
import type {
  CreateMessageInput,
  MessagesRepository,
} from '../../domain/ports/messages.repository';

@Injectable()
export class DrizzleMessagesRepository implements MessagesRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  // El projectId viene del contexto autorizado (nunca del body del cliente)
  // y se escribe junto al mensaje: la fila nace dentro del tenant.
  async create(input: CreateMessageInput): Promise<MessageEntity> {
    const [row] = await this.db
      .insert(messages)
      .values({
        projectId: input.projectId,
        leadId: input.leadId,
        whatsappMessageId: input.whatsappMessageId,
        direction: input.direction,
        content: input.content,
        status: input.status,
      })
      .returning();

    return this.mapToEntity(row);
  }

  // Ambos criterios van al WHERE y se combinan con AND: leadId acota dentro
  // del tenant y projectId fija el tenant. Ninguno sustituye al otro, de modo
  // que filtrar solo por leadId sería imposible aunque alguien refactorizara.
  // Orden cronológico para que la conversación se lea como se produjo.
  async findByLeadId(
    leadId: string,
    projectId: string,
  ): Promise<MessageEntity[]> {
    const rows = await this.db.query.messages.findMany({
      where: and(
        eq(messages.leadId, leadId),
        eq(messages.projectId, projectId),
      ),
      orderBy: (message) => [asc(message.createdAt)],
    });

    return rows.map((row) => this.mapToEntity(row));
  }

  private mapToEntity(row: MessageRow): MessageEntity {
    return new MessageEntity(
      row.id,
      row.projectId,
      row.leadId,
      row.whatsappMessageId,
      row.direction,
      row.content,
      row.status,
      row.createdAt,
    );
  }
}
