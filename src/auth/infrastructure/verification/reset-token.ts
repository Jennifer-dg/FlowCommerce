import { createHash } from 'node:crypto';

// Prefijo de los identificadores de verificación usados por el flujo de
// recuperación de contraseña en Better Auth (ver password.mjs: la fila se
// guarda con identifier = `reset-password:<token>`).
export const RESET_TOKEN_IDENTIFIER_PREFIX = 'reset-password:';

export function buildResetTokenIdentifier(token: string): string {
  return `${RESET_TOKEN_IDENTIFIER_PREFIX}${token}`;
}

// Réplica exacta del defaultKeyHasher de Better Auth (SHA-256 → base64url
// sin padding) para poder buscar filas cuyo identifier se persiste con
// `verification.storeIdentifier: { 'reset-password:': 'hashed' }`.
export function hashVerificationIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier, 'utf8').digest('base64url');
}
