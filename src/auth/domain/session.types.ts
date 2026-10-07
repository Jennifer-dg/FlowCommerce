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
}

// Resultado de una autenticación correcta que genera un token de sesión.
// El llamador es responsable de persistirlo como cookie de sesión.
export interface SessionTokenResult {
  user: SafeUser;
  token: string;
}
