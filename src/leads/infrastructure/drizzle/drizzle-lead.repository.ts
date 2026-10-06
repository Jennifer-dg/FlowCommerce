import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { leads, type LeadRow } from '../../../db/schema';
import { LeadEntity } from '../../domain/entities/lead.entity';
import type {
  CreateLeadInput,
  LeadRepository,
  ListLeadsFilter,
  PaginatedLeads,
  UpdateLeadInput,
} from '../../domain/repositories/lead.repository';

// Límite duro por página. El DTO de presentación ya valida @Max(100), pero el
// repositorio se defiende por si algún llamante interno lo invoca sin DTO.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class DrizzleLeadRepository implements LeadRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  // Busca un lead filtrando SIEMPRE por proyecto (impide IDOR entre tenants).
  async findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<LeadEntity | null> {
    const row = await this.db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.projectId, projectId)),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async findByPhoneDigitsInProject(
    phoneDigits: string,
    projectId: string,
  ): Promise<LeadEntity | null> {
    if (!phoneDigits) {
      return null;
    }

    const row = await this.db.query.leads.findFirst({
      where: and(
        eq(leads.projectId, projectId),
        sql`regexp_replace(coalesce(${leads.phone}, ''), '[^0-9]', '', 'g') = ${phoneDigits}`,
      ),
    });

    return row ? this.mapToEntity(row) : null;
  }

  // Lista los leads del tenant, paginado. Los filtros son AND entre sí y se
  // construyen sobre una base que ya incluye project_id, de forma que ningún
  // filtro puede abrir la consulta a datos de otro proyecto.
  async listByProject(
    projectId: string,
    filter: ListLeadsFilter = {},
  ): Promise<PaginatedLeads> {
    const conditions: SQL[] = [eq(leads.projectId, projectId)];

    if (filter.stage) {
      conditions.push(eq(leads.stage, filter.stage));
    }

    if (filter.search) {
      // ILIKE cubre mayúsculas y minúsculas, que es lo que espera un usuario al
      // buscar "ana" y encontrar "Ana". El comodín se aplica a los tres campos
      // de contacto y se escapan los %, para que un usuario pueda buscar
      // literalmente un "%" sin que se convierta en comodín.
      const pattern = `%${this.escapeLikePattern(filter.search)}%`;
      const searchCondition = or(
        ilike(leads.name, pattern),
        ilike(leads.email, pattern),
        ilike(leads.phone, pattern),
      );

      // or() devuelve undefined si no recibe condiciones; aquí siempre recibe
      // tres, pero el tipo lo marca como opcional y no conviene fuerzar con !.
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);

    // El total se cuenta con el MISMO where que las filas, incluido el
    // project_id. Contar sin projectId filtrado devolvería el número de filas de
    // todos los tenants, que es una fuga de metadatos.
    const [totalRow] = await this.db
      .select({ value: count() })
      .from(leads)
      .where(where);

    const limit = Math.min(
      Math.max(filter.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const page = Math.max(filter.page ?? 1, 1);

    const rows = await this.db.query.leads.findMany({
      where,
      orderBy: (lead) => [asc(lead.createdAt), asc(lead.name)],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      leads: rows.map((row) => this.mapToEntity(row)),
      total: totalRow?.value ?? 0,
    };
  }

  // El projectId viene del contexto autorizado (nunca del body del cliente).
  async create(input: CreateLeadInput): Promise<LeadEntity> {
    const [row] = await this.db
      .insert(leads)
      .values({
        projectId: input.projectId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        stage: input.stage,
        score: input.score,
      })
      .returning();

    return this.mapToEntity(row);
  }

  // El projectId está en el WHERE del UPDATE, no solo en el input: así el
  // update nunca alcanza una fila de otro tenant. Si no hay fila, devuelve null
  // y el use-case lo traduce a 404.
  async updateInProject(
    id: string,
    projectId: string,
    input: UpdateLeadInput,
  ): Promise<LeadEntity | null> {
    const changes = this.toColumnPatch(input);

    if (Object.keys(changes).length === 0) {
      // Nada que actualizar. Se devuelve el lead actual para no inventar un 404
      // por una petición que en realidad era válida.
      return this.findByIdInProject(id, projectId);
    }

    const [row] = await this.db
      .update(leads)
      .set(changes)
      .where(and(eq(leads.id, id), eq(leads.projectId, projectId)))
      .returning();

    return row ? this.mapToEntity(row) : null;
  }

  // El projectId está en el WHERE del DELETE. false significa "no había nada que
  // borrar en ESTE proyecto", que el use-case convierte en 404 indistinguible.
  async deleteInProject(id: string, projectId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.projectId, projectId)))
      .returning({ id: leads.id });

    return deleted.length > 0;
  }

  // Traduce el input opcional del dominio a un patch de columnas. Se descartan
  // las claves con valor undefined para no sobrescribir con NULL; un null
  // explícito sí se escribe, que es como se borra un email o un teléfono.
  private toColumnPatch(input: UpdateLeadInput) {
    const changes: Record<string, unknown> = {};

    if (input.name !== undefined) changes.name = input.name;
    if (input.email !== undefined) changes.email = input.email;
    if (input.phone !== undefined) changes.phone = input.phone;
    if (input.stage !== undefined) changes.stage = input.stage;
    if (input.score !== undefined) changes.score = input.score;

    return changes;
  }

  // Escapa los comodines de LIKE para que la búsqueda sea literal. Sin esto,
  // buscar "%" devolvería todos los leads del tenant.
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  private mapToEntity(row: LeadRow): LeadEntity {
    return new LeadEntity(
      row.id,
      row.projectId,
      row.name,
      row.email,
      row.phone,
      row.stage,
      row.score,
      row.createdAt,
      row.updatedAt,
    );
  }
}
