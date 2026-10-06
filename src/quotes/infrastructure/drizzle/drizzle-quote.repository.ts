import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, type SQL } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { quotes, type QuoteRow } from '../../../db/schema';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import type {
  CreateQuoteInput,
  ListQuotesFilter,
  PaginatedQuotes,
  QuoteRepository,
  UpdateQuoteStatusInput,
} from '../../domain/repositories/quote.repository';

// Límite duro por página, alineado con PaginationQueryDto. El repositorio se
// defiende por si algún llamante interno lo invoca sin pasar por el DTO.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class DrizzleQuoteRepository implements QuoteRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  // El projectId va SIEMPRE en el WHERE. Un id de cotización válido pero de
  // otro tenant devuelve null y el use-case lo traduce a 404 indistinguible.
  async findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<QuoteEntity | null> {
    const row = await this.db.query.quotes.findFirst({
      where: and(eq(quotes.id, id), eq(quotes.projectId, projectId)),
    });

    return row ? this.mapToEntity(row) : null;
  }

  // Lista cotizaciones del tenant con filtros opcionales combinados por AND
  // sobre una base que ya incluye project_id.
  async listByProject(
    projectId: string,
    filter: ListQuotesFilter = {},
  ): Promise<PaginatedQuotes> {
    const conditions: SQL[] = [eq(quotes.projectId, projectId)];

    if (filter.status) {
      conditions.push(eq(quotes.status, filter.status));
    }

    if (filter.leadId) {
      conditions.push(eq(quotes.leadId, filter.leadId));
    }

    const where = and(...conditions);

    // El total se cuenta con el MISMO where que las filas: sin projectId
    // devolvería el número de cotizaciones de todos los tenants.
    const [totalRow] = await this.db
      .select({ value: count() })
      .from(quotes)
      .where(where);

    const limit = Math.min(
      Math.max(filter.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const page = Math.max(filter.page ?? 1, 1);

    const rows = await this.db.query.quotes.findMany({
      where,
      orderBy: (quote) => [asc(quote.createdAt), asc(quote.folio)],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      quotes: rows.map((row) => this.mapToEntity(row)),
      total: totalRow?.value ?? 0,
    };
  }

  // El projectId y el leadId los fija el use-case desde el contexto autorizado.
  // La FK compuesta (lead_id, project_id) es la red de seguridad: aunque un bug
  // colisionara un lead de otro proyecto, PostgreSQL rechazaría la fila.
  async create(input: CreateQuoteInput): Promise<QuoteEntity> {
    const [row] = await this.db
      .insert(quotes)
      .values({
        projectId: input.projectId,
        leadId: input.leadId,
        folio: input.folio,
        subtotal: input.subtotal,
        tax: input.tax,
        total: input.total,
        status: input.status,
      })
      .returning();

    return this.mapToEntity(row);
  }

  // Solo se cambia el status, y el projectId está en el WHERE del UPDATE. El
  // amount nunca se edita desde este endpoint: una cotización enviada es un
  // snapshot, corregirla exige una nueva cotización.
  async updateStatusInProject(
    id: string,
    projectId: string,
    input: UpdateQuoteStatusInput,
  ): Promise<QuoteEntity | null> {
    const [row] = await this.db
      .update(quotes)
      .set({ status: input.status })
      .where(and(eq(quotes.id, id), eq(quotes.projectId, projectId)))
      .returning();

    return row ? this.mapToEntity(row) : null;
  }

  private mapToEntity(row: QuoteRow): QuoteEntity {
    return new QuoteEntity(
      row.id,
      row.projectId,
      row.leadId,
      row.folio,
      row.subtotal,
      row.tax,
      row.total,
      row.status,
      row.createdAt,
      row.updatedAt,
    );
  }
}
