import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SafeUser } from '@flowcommerce/types';
import type {
  AuthenticatedSession,
  SessionTokenResult,
  SignInSessionInput,
  SignUpSessionInput,
} from '../../domain/session.types';
import type { SessionManager } from '../../application/ports/session-manager';
import { BetterAuthProvider } from '../better-auth/better-auth.provider';

interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class BetterAuthSessionManager implements SessionManager {
  private readonly secret: string;

  constructor(
    private readonly authProvider: BetterAuthProvider,
    configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('BETTER_AUTH_SECRET');
  }

  private get auth() {
    return this.authProvider.instance;
  }

  // Registra al usuario en Better Auth y devuelve su sesión con token.
  async signUp(input: SignUpSessionInput): Promise<SessionTokenResult> {
    const result = await this.auth.api.signUpEmail({
      body: {
        name: input.name.trim(),
        email: input.email,
        password: input.password,
      },
    });

    if (!result.token) {
      throw new Error('Better Auth did not return a session token on sign up');
    }

    return {
      user: this.toSafeUser(result.user as BetterAuthUser),
      token: result.token,
    };
  }

  // Inicia sesión en Better Auth y devuelve su sesión con token.
  async signIn(input: SignInSessionInput): Promise<SessionTokenResult> {
    const result = await this.auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
    });

    if (!result.token) {
      throw new Error('Better Auth did not return a session token on sign in');
    }

    return {
      user: this.toSafeUser(result.user as BetterAuthUser),
      token: result.token,
    };
  }

  // Resuelve la sesión activa a partir de las cabeceras; null si no existe.
  async getSession(headers: Headers): Promise<AuthenticatedSession | null> {
    const result = await this.auth.api.getSession({
      headers: this.withForwardedFor(headers),
    });

    if (!result) {
      return null;
    }

    return {
      user: this.toSafeUser(result.user as BetterAuthUser),
      session: {
        id: result.session.id,
        userId: result.session.userId,
        expiresAt: new Date(result.session.expiresAt),
      },
    };
  }

  // Invalida la sesión del lado del servidor.
  async signOut(headers: Headers): Promise<void> {
    await this.auth.api.signOut({
      headers: this.withForwardedFor(headers),
    });
  }

  // Convierte el usuario de Better Auth a una forma segura (sin datos sensibles).
  private toSafeUser(user: BetterAuthUser): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      creadoEn: new Date(user.createdAt),
      actualizadoEn: new Date(user.updatedAt),
    };
  }

  private withForwardedFor(headers: Headers): Headers {
    const forward = headers.get('x-forwarded-for');
    const copy = new Headers(headers);
    if (!copy.has('x-forwarded-for')) {
      copy.set('x-forwarded-for', forward ?? '127.0.0.1');
    }
    return copy;
  }
}
