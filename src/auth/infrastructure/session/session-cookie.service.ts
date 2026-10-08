import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildSignedSessionToken } from './session-cookie.helper';
import { REMEMBERED_SESSION_SECONDS } from './session-lifetime';

export interface SessionCookieDefinition {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  // En milisegundos (unidad de res.cookie de Express). Ausente = cookie de
  // sesión del navegador.
  maxAge?: number;
}

export interface BuildSessionCookieOptions {
  // true = «Recordarme»: la cookie sobrevive al cierre del navegador.
  persistent?: boolean;
}

// Construye y limpia la cookie de sesión firmada que espera Better Auth.
@Injectable()
export class SessionCookieService {
  private readonly secret: string;
  private readonly cookieName: string;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('BETTER_AUTH_SECRET');
    const prefix =
      configService.get<string>('BETTER_AUTH_COOKIE_PREFIX') ?? 'flowcommerce';
    this.cookieName = `${prefix}.session_token`;
  }

  get name(): string {
    return this.cookieName;
  }

  async build(
    token: string,
    options: BuildSessionCookieOptions = {},
  ): Promise<SessionCookieDefinition> {
    const value = await buildSignedSessionToken(token, this.secret);
    const secure = process.env.NODE_ENV === 'production';
    return {
      name: this.cookieName,
      value,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      ...(options.persistent
        ? { maxAge: REMEMBERED_SESSION_SECONDS * 1000 }
        : {}),
    };
  }

  clear(): SessionCookieDefinition {
    return {
      name: this.cookieName,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    };
  }
}
