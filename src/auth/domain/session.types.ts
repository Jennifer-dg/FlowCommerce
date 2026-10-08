import type { SafeUser } from '@flowcommerce/types';

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthenticatedSession {
  user: SafeUser;
  session: SessionInfo;
}

export interface SignUpSessionInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInSessionInput {
  email: string;
  password: string;
  // true = sesión persistente («Recordarme»); false = sesión de navegador.
  rememberMe?: boolean;
}

// Solicitud de envío del enlace de recuperación de contraseña. Better Auth
// responde siempre de forma genérica (sin revelar si el email existe).
export interface RequestPasswordResetInput {
  email: string;
}

// Aplica un token de recuperación con la contraseña nueva. El token es de un
// solo uso: Better Auth lo consume y revoca las sesiones existentes.
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

// Resultado de una autenticación correcta que genera un token de sesión.
// El llamador es responsable de persistirlo como cookie de sesión.
export interface SessionTokenResult {
  user: SafeUser;
  token: string;
}
