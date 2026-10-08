import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { clients, leads, quotes, type ClientRow } from '../../../db/schema';
import { ClientEntity } from '../../domain/entities/client.entity';
import type {
  ClientRepository,
  ClientStats,
  CreateClientFromLeadInput,
  DuplicateCriteria,
  CreateClientInput,
  ListClientsFilter,
  PaginatedClients,
  UpdateClientInput,
} from '../../domain/repositories/client.repository';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

type ClientWithUser = ClientRow & {
  assignedUser: { id: string; name: string } | null;
};

@Injectable()
export class DrizzleClientRepository implements ClientRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  async findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<ClientEntity | null> {
    const row = await this.db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.projectId, projectId)),
      with: { assignedUser: { columns: { id: true, name: true } } },
    });

    return row ? this.mapToEntity(row) : null;
  }

  async listByProject(
    projectId: string,
    filter: ListClientsFilter = {},
  ): Promise<PaginatedClients> {
    const conditions: SQL[] = [eq(clients.projectId, projectId)];

    if (filter.assignedUserId) {
      conditions.push(eq(clients.assignedUserId, filter.assignedUserId));
    }

    if (filter.active !== undefined) {
      conditions.push(eq(clients.active, filter.active));
    }

    if (filter.search) {
      const pattern = `%${this.escapeLikePattern(filter.search)}%`;
      const searchCondition = or(
        ilike(clients.name, pattern),
        ilike(clients.company, pattern),
        ilike(clients.email, pattern),
        ilike(clients.phone, pattern),
        ilike(clients.taxId, pattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(clients)
      .where(where);

    const limit = Math.min(
      Math.max(filter.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const page = Math.max(filter.page ?? 1, 1);
    const direction = filter.order === 'desc' ? desc : asc;
    const sortColumn =
      filter.sortBy === 'createdAt' ? clients.createdAt : clients.name;

    const rows = await this.db.query.clients.findMany({
      where,
      with: { assignedUser: { columns: { id: true, name: true } } },
      // El id desempata para que la paginación sea estable.
      orderBy: [direction(sortColumn), asc(clients.id)],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      clients: rows.map((row) => this.mapToEntity(row)),
      total: totalRow?.value ?? 0,
    };
  }

  async create(input: CreateClientInput): Promise<ClientEntity> {
    const [row] = await this.db
      .insert(clients)
      .values({
        projectId: input.projectId,
        name: input.name,
        company: input.company,
        taxId: input.taxId,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        assignedUserId: input.assignedUserId,
        sourceLeadId: input.sourceLeadId,
      })
      .returning();

    // Se relee para devolver también el nombre del responsable.
    const created = await this.findByIdInProject(row.id, input.projectId);
    return created ?? this.mapToEntity({ ...row, assignedUser: null });
  }

  async findPossibleDuplicatesInProject(
    projectId: string,
    criteria: DuplicateCriteria,
  ): Promise<ClientEntity[]> {
    const matches: SQL[] = [];
    const email = criteria.email?.trim();
    const company = criteria.company?.trim();
    if (email) {
      matches.push(sql`lower(${clients.email}) = lower(${email})`);
    }
    if (company) {
      matches.push(sql`lower(${clients.company}) = lower(${company})`);
    }
    if (matches.length === 0) {
      return [];
    }

    const conditions: SQL[] = [eq(clients.projectId, projectId)];
    const anyMatch = or(...matches);
    if (anyMatch) conditions.push(anyMatch);
    if (criteria.excludeId) conditions.push(ne(clients.id, criteria.excludeId));

    const rows = await this.db.query.clients.findMany({
      where: and(...conditions),
      with: { assignedUser: { columns: { id: true, name: true } } },
      orderBy: [asc(clients.createdAt)],
      limit: 5,
    });
    return rows.map((row) => this.mapToEntity(row));
  }

  // Crear + vincular en una sola transacción: si el proceso cae entre ambos
  // pasos no queda un cliente huérfano. El UPDATE del lead es condicional
  // (client_id IS NULL): de dos conversiones simultáneas solo una lo consigue;
  // la otra se revierte entera.
  async createFromLead(
    input: CreateClientFromLeadInput,
  ): Promise<ClientEntity | null> {
    const rollback = new Error('LEAD_ALREADY_LINKED');
    try {
      const clientId = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(clients)
          .values({
            projectId: input.projectId,
            name: input.name,
            company: input.company,
            taxId: input.taxId,
            email: input.email,
            phone: input.phone,
            notes: input.notes,
            assignedUserId: input.assignedUserId,
            sourceLeadId: input.leadId,
          })
          .returning({ id: clients.id });

        const linked = await tx
          .update(leads)
          .set({
            clientId: row.id,
            ...(input.leadStage ? { stage: input.leadStage } : {}),
          })
          .where(
            and(
              eq(leads.id, input.leadId),
              eq(leads.projectId, input.projectId),
              isNull(leads.clientId),
            ),
          )
          .returning({ id: leads.id });

        if (linked.length === 0) {
          throw rollback;
        }
        return row.id;
      });

      return this.findByIdInProject(clientId, input.projectId);
    } catch (error) {
      if (error === rollback) {
        return null;
      }
      throw error;
    }
  }

  // projectId en el WHERE del UPDATE: nunca alcanza otro tenant.
  async updateInProject(
    id: string,
    projectId: string,
    input: UpdateClientInput,
  ): Promise<ClientEntity | null> {
    const changes: Partial<typeof clients.$inferInsert> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.company !== undefined) changes.company = input.company;
    if (input.taxId !== undefined) changes.taxId = input.taxId;
    if (input.email !== undefined) changes.email = input.email;
    if (input.phone !== undefined) changes.phone = input.phone;
    if (input.notes !== undefined) changes.notes = input.notes;
    if (input.assignedUserId !== undefined)
      changes.assignedUserId = input.assignedUserId;
    if (input.active !== undefined) changes.active = input.active;

    if (Object.keys(changes).length > 0) {
      const updated = await this.db
        .update(clients)
        .set(changes)
        .where(and(eq(clients.id, id), eq(clients.projectId, projectId)))
        .returning({ id: clients.id });

      if (updated.length === 0) {
        return null;
      }
    }

    return this.findByIdInProject(id, projectId);
  }

  // projectId en el WHERE del DELETE.
  async deleteInProject(id: string, projectId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.projectId, projectId)))
      .returning({ id: clients.id });

    return deleted.length > 0;
  }

  // Una sola consulta con agregados filtrados. La suma la hace PostgreSQL
  // (numeric exacto) y project_id va en el WHERE como en todo lo demás.
  async getStatsInProject(id: string, projectId: string): Promise<ClientStats> {
    const [row] = await this.db
      .select({
        quotesCount: count(),
        paidQuotesCount: sql<number>`count(*) filter (where ${quotes.status} = 'PAID')::int`,
        salesTotal: sql<string>`coalesce(sum(${quotes.total}) filter (where ${quotes.status} = 'PAID'), 0)`,
      })
      .from(quotes)
      .where(and(eq(quotes.clientId, id), eq(quotes.projectId, projectId)));

    return {
      quotesCount: row?.quotesCount ?? 0,
      paidQuotesCount: row?.paidQuotesCount ?? 0,
      salesTotal: Number(row?.salesTotal ?? 0),
    };
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  private mapToEntity(row: ClientWithUser): ClientEntity {
    return new ClientEntity(
      row.id,
      row.projectId,
      row.name,
      row.company,
      row.taxId,
      row.email,
      row.phone,
      row.notes,
      row.assignedUserId,
      row.sourceLeadId,
      row.active,
      row.createdAt,
      row.updatedAt,
      row.assignedUser
        ? { id: row.assignedUser.id, name: row.assignedUser.name }
        : null,
    );
  }
}
