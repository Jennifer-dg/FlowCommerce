import type { SafeUser, User } from '@flowcommerce/types';

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    creadoEn: user.creadoEn,
    actualizadoEn: user.actualizadoEn,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
