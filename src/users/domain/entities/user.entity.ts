import type { User } from '@flowcommerce/types';

// Entidad de dominio de un usuario del sistema.
export class UserEntity implements User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
    public readonly emailVerified = false,
  ) {}

  toUser(): User {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
