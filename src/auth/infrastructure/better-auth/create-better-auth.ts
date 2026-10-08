import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { Database } from '../../../db';
import { accounts, sessions, users, verifications } from '../../../db/schema';
import { RESET_TOKEN_IDENTIFIER_PREFIX } from '../verification/reset-token';
import { REMEMBERED_SESSION_SECONDS } from '../session/session-lifetime';

// Datos que Better Auth entrega al handler de envío del correo de
// restablecimiento. `url` es la URL interna de Better Auth; quien reciba el
// handler puede construir su propio enlace (la app usa APP_URL + token).
export interface ResetPasswordEmailData {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
}

export interface CreateBetterAuthDeps {
  secret: string;
  baseURL: string;
  hash: (plainPassword: string) => Promise<string>;
  verify: (hash: string, plainPassword: string) => Promise<boolean>;
  sendResetPassword?: (data: ResetPasswordEmailData) => Promise<void>;
}

// El token de recuperación dura 30 minutos y es de un solo uso: Better Auth
// lo consume al aplicarlo (consumeVerificationValue) y caduca por expiresAt.
export const RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS = 30 * 60;

// Construye la instancia compartida de Better Auth usada por la app, el seed
// y los tests. Las contraseñas se gestionan con bcryptjs vía hash/verify
// inyectables para mantener un único enfoque de hashing en todo el proyecto.
export function createBetterAuth(
  db: Database,
  deps: CreateBetterAuthDeps,
): ReturnType<typeof betterAuth> {
  const { sendResetPassword } = deps;

  const options: BetterAuthOptions = {
    secret: deps.secret,
    baseURL: deps.baseURL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    // Vigencia explícita de la sesión recordada: debe coincidir con el Max-Age
    // de la cookie que emite SessionCookieService.
    session: {
      expiresIn: REMEMBERED_SESSION_SECONDS,
    },
    emailAndPassword: {
      enabled: true,
      password: {
        hash: (plain: string) => deps.hash(plain),
        verify: (input: { hash: string; password: string }) =>
          deps.verify(input.hash, input.password),
      },
      // Token de recuperación: 30 minutos de vigencia, de un solo uso y con
      // revocación de todas las sesiones del usuario al aplicarse.
      resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      // Sólo se habilita el flujo si el llamador inyecta un transportista de
      // correo; sin él Better Auth responde RESET_PASSWORD_DISABLED.
      ...(sendResetPassword
        ? {
            sendResetPassword: (data: ResetPasswordEmailData) =>
              sendResetPassword(data),
          }
        : {}),
    },
    // Los identificadores de los tokens de recuperación se persisten hasheados
    // (SHA-256); el resto de verificaciones conserva el comportamiento
    // por defecto en claro.
    verification: {
      storeIdentifier: {
        default: 'plain',
        overrides: { [RESET_TOKEN_IDENTIFIER_PREFIX]: 'hashed' },
      },
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
      cookiePrefix: 'flowcommerce',
    },
  };

  return betterAuth(options);
}
