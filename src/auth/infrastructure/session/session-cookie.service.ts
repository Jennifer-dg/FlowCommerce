import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildSignedSessionToken } from './session-cookie.helper';

export interface SessionCookieDefinition {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge?: number;
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

  async build(token: string): Promise<SessionCookieDefinition> {
    const value = await buildSignedSessionToken(token, this.secret);
    const secure = process.env.NODE_ENV === 'production';
    return {
      name: this.cookieName,
      value,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
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
