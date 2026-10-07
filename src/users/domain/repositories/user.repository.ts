import type { UserEntity } from '../entities/user.entity';

export interface CreateUserInput {
  name: string;
  email: string;
}

// Puerto del repositorio de usuarios (lo implementa Drizzle en infraestructura).
export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(input: CreateUserInput): Promise<UserEntity>;
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
