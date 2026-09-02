import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Role, UserMembership } from '@flowcommerce/types';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import {
  memberships,
  type MembershipRow,
  type UserRow,
} from '../../../db/schema';
import { MembershipEntity } from '../../domain/entities/membership.entity';
import type {
  CreateMembershipInput,
  MembershipRepository,
  ProjectMember,
} from '../../domain/repositories/membership.repository';

interface MembershipWithUser extends MembershipRow {
  user: Pick<UserRow, 'name' | 'email'>;
}

interface MembershipWithProject extends MembershipRow {
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<MembershipEntity | null> {
    const row = await this.db.query.memberships.findFirst({
      where: eq(memberships.id, id),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async findMemberById(id: string): Promise<ProjectMember | null> {
    const row = await this.db.query.memberships.findFirst({
      where: eq(memberships.id, id),
      with: {
        user: {
          columns: { name: true, email: true },
        },
      },
    });

    if (!row) {
      return null;
    }

    const member = row;
    return {
      membership: this.mapToEntity(row),
      userId: row.userId,
      name: member.user.name,
      email: member.user.email,
    };
  }

  async findByUserAndProject(
    userId: string,
    projectId: string,
  ): Promise<MembershipEntity | null> {
    const row = await this.db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, userId),
        eq(memberships.projectId, projectId),
      ),
    });

    return row ? this.mapToEntity(row) : null;
  }

  // Lista los miembros de un proyecto incluyendo nombre y email del usuario.
  async findMembersByProject(projectId: string): Promise<ProjectMember[]> {
    const rows = await this.db.query.memberships.findMany({
      where: eq(memberships.projectId, projectId),
      with: {
        user: {
          columns: { name: true, email: true },
        },
      },
    });

    return (rows as MembershipWithUser[]).map((row) => ({
      membership: this.mapToEntity(row),
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
    }));
  }

  async findMyProjects(userId: string): Promise<UserMembership[]> {
    const rows = await this.db.query.memberships.findMany({
      where: eq(memberships.userId, userId),
      with: {
        project: true,
      },
    });

    return (rows as MembershipWithProject[]).map((row) => ({
      project: {
        id: row.project.id,
        name: row.project.name,
        slug: row.project.slug,
        description: row.project.description,
        creadoEn: row.project.createdAt,
        actualizadoEn: row.project.updatedAt,
      },
      role: row.role as Role,
    }));
  }

  async create(input: CreateMembershipInput): Promise<MembershipEntity> {
    const [row] = await this.db
      .insert(memberships)
      .values({
        userId: input.userId,
        projectId: input.projectId,
        role: input.role,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async updateRole(id: string, role: Role): Promise<MembershipEntity> {
    const [row] = await this.db
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, id))
      .returning();

    return this.mapToEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(memberships).where(eq(memberships.id, id));
  }

  // Cuenta los OWNER del proyecto; evita que se demote o elimine al último.
  async countOwners(projectId: string): Promise<number> {
    const result = await this.db
      .select({ count: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.projectId, projectId),
          eq(memberships.role, 'OWNER'),
        ),
      );

    return result.length;
  }

  private mapToEntity(row: MembershipRow): MembershipEntity {
    return new MembershipEntity(
      row.id,
      row.userId,
      row.projectId,
      row.role as Role,
      row.createdAt,
      row.updatedAt,
    );
  }
}
