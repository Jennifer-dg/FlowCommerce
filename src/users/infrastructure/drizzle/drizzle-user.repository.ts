import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { users, type UserRow } from '../../../db/schema';
import { UserEntity } from '../../domain/entities/user.entity';
import type {
  CreateUserInput,
  UserRepository,
} from '../../domain/repositories/user.repository';

// Repositorio de usuarios sobre PostgreSQL usando Drizzle ORM.
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: Database,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const [row] = await this.db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    return row !== undefined;
  }

  private mapToEntity(row: UserRow): UserEntity {
    return new UserEntity(
      row.id,
      row.name,
      row.email,
      row.createdAt,
      row.updatedAt,
      row.emailVerified,
    );
  }
}
