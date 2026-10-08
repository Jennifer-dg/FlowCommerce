// Lectura de tokens de recuperación de contraseña para validarlos sin
// consumirlos (el consumo lo hace Better Auth al aplicar el reset).
export interface ActiveResetToken {
  expiresAt: Date;
}

export interface ResetTokenReader {
  // Devuelve el token activo si existe y no ha caducado; null en caso
  // contrario. No borra ni modifica la fila.
  findActiveResetToken(token: string): Promise<ActiveResetToken | null>;
}

export const RESET_TOKEN_READER = Symbol('RESET_TOKEN_READER');
