import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { memberships, projects, type ProjectRow } from '../../../db/schema';
import { MembershipEntity } from '../../domain/entities/membership.entity';
import { ProjectEntity } from '../../domain/entities/project.entity';
import type {
  CreateProjectInput,
  CreateProjectWithOwnerInput,
  CreateProjectWithOwnerResult,
  ProjectRepository,
} from '../../domain/repositories/project.repository';

@Injectable()
export class DrizzleProjectRepository implements ProjectRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<ProjectEntity | null> {
    const row = await this.db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<ProjectEntity | null> {
    const row = await this.db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateProjectInput): Promise<ProjectEntity> {
    const [row] = await this.db
      .insert(projects)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      })
      .returning();

    return this.mapToEntity(row);
  }

  // Crea el proyecto y su membresía OWNER dentro de una misma transacción,
  // garantizando que el proyecto nunca quede sin propietario.
  async createWithOwner(
    input: CreateProjectWithOwnerInput,
  ): Promise<CreateProjectWithOwnerResult> {
    return this.db.transaction(async (tx) => {
      const [projectRow] = await tx
        .insert(projects)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
        })
        .returning();

      const [ownerRow] = await tx
        .insert(memberships)
        .values({
          userId: input.ownerUserId,
          projectId: projectRow.id,
          role: 'OWNER',
        })
        .returning();

      return {
        project: this.mapToEntity(projectRow),
        ownerMembership: new MembershipEntity(
          ownerRow.id,
          ownerRow.userId,
          ownerRow.projectId,
          ownerRow.role as 'OWNER',
          ownerRow.createdAt,
          ownerRow.updatedAt,
        ),
      };
    });
  }

  private mapToEntity(row: ProjectRow): ProjectEntity {
    return new ProjectEntity(
      row.id,
      row.name,
      row.slug,
      row.description,
      row.createdAt,
      row.updatedAt,
    );
  }
}
