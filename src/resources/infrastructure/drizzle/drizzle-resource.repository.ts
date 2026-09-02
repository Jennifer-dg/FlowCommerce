import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { resources, type ResourceRow } from '../../../db/schema';
import { ResourceEntity } from '../../domain/entities/resource.entity';
import type {
  CreateResourceInput,
  ResourceRepository,
  UpdateResourceInput,
} from '../../domain/repositories/resource.repository';

@Injectable()
export class DrizzleResourceRepository implements ResourceRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  // Busca un recurso filtrando SIEMPRE por proyecto (impide IDOR entre tenants).
  async findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<ResourceEntity | null> {
    const row = await this.db.query.resources.findFirst({
      where: and(eq(resources.id, id), eq(resources.projectId, projectId)),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async listByProject(projectId: string): Promise<ResourceEntity[]> {
    const rows = await this.db.query.resources.findMany({
      where: eq(resources.projectId, projectId),
      orderBy: (resource) => [asc(resource.name)],
    });

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateResourceInput): Promise<ResourceEntity> {
    const [row] = await this.db
      .insert(resources)
      .values({
        projectId: input.projectId,
        name: input.name,
        description: input.description,
      })
      .returning();

    return this.mapToEntity(row);
  }

  // Actualiza el recurso solo si pertenece al proyecto indicado.
  async updateInProject(
    id: string,
    projectId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceEntity | null> {
    const [row] = await this.db
      .update(resources)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      })
      .where(and(eq(resources.id, id), eq(resources.projectId, projectId)))
      .returning();

    return row ? this.mapToEntity(row) : null;
  }

  // Elimina el recurso solo si pertenece al proyecto indicado.
  async deleteInProject(id: string, projectId: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(resources)
      .where(and(eq(resources.id, id), eq(resources.projectId, projectId)))
      .returning({ id: resources.id });

    return deleted !== undefined;
  }

  private mapToEntity(row: ResourceRow): ResourceEntity {
    return new ResourceEntity(
      row.id,
      row.projectId,
      row.name,
      row.description,
      row.createdAt,
      row.updatedAt,
    );
  }
}
