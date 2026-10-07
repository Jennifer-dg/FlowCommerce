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

  async createIfNotExists(
    input: CreateMessageInput,
  ): Promise<MessageEntity | null> {
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
      .onConflictDoNothing({ target: messages.whatsappMessageId })
      .returning();

    if (row) {
      return this.mapToEntity(row);
    }

    // Conflicto de wamid: solo se reutiliza si ya pertenece a ESTE proyecto.
    return this.findByWhatsappMessageIdInProject(
      input.whatsappMessageId,
      input.projectId,
    );
  }

  async findByWhatsappMessageIdInProject(
    whatsappMessageId: string,
    projectId: string,
  ): Promise<MessageEntity | null> {
    const row = await this.db.query.messages.findFirst({
      where: and(
        eq(messages.whatsappMessageId, whatsappMessageId),
        eq(messages.projectId, projectId),
      ),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async updateStatusInProject(
    whatsappMessageId: string,
    projectId: string,
    status: string,
  ): Promise<MessageEntity | null> {
    const [row] = await this.db
      .update(messages)
      .set({ status })
      .where(
        and(
          eq(messages.whatsappMessageId, whatsappMessageId),
          eq(messages.projectId, projectId),
        ),
      )
      .returning();

    return row ? this.mapToEntity(row) : null;
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
