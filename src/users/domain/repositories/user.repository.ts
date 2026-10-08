import type { UserEntity } from '../entities/user.entity';

export interface CreateUserInput {
  name: string;
  email: string;
}

// Campos del perfil que edita el propio usuario. null borra el dato.
export interface UpdateUserProfileInput {
  phone?: string | null;
  position?: string | null;
}

// Puerto del repositorio de usuarios (lo implementa Drizzle en infraestructura).
export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(input: CreateUserInput): Promise<UserEntity>;
  existsByEmail(email: string): Promise<boolean>;
  // null si el usuario no existe.
  updateProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserEntity | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
