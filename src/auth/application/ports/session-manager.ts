import type {
  AuthenticatedSession,
  SessionTokenResult,
  SignInSessionInput,
  SignUpSessionInput,
} from '../../domain/session.types';

// Puerto que abstrae el motor de sesiones/autenticación (Better Auth).
// El dominio y la aplicación dependen de esta interfaz, no de Better Auth.
export interface SessionManager {
  signUp(input: SignUpSessionInput): Promise<SessionTokenResult>;
  signIn(input: SignInSessionInput): Promise<SessionTokenResult>;
  getSession(headers: Headers): Promise<AuthenticatedSession | null>;
  signOut(headers: Headers): Promise<void>;
}

export const SESSION_MANAGER = Symbol('SESSION_MANAGER');
