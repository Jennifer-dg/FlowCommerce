import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { Database } from '../../../db';
import { accounts, sessions, users, verifications } from '../../../db/schema';

export interface CreateBetterAuthDeps {
  secret: string;
  baseURL: string;
  hash: (plainPassword: string) => Promise<string>;
  verify: (hash: string, plainPassword: string) => Promise<boolean>;
}

// Construye la instancia compartida de Better Auth usada por la app, el seed
// y los tests. Las contraseñas se gestionan con bcryptjs vía hash/verify
// inyectables para mantener un único enfoque de hashing en todo el proyecto.
export function createBetterAuth(
  db: Database,
  deps: CreateBetterAuthDeps,
): ReturnType<typeof betterAuth> {
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
    emailAndPassword: {
      enabled: true,
      password: {
        hash: (plain: string) => deps.hash(plain),
        verify: (input: { hash: string; password: string }) =>
          deps.verify(input.hash, input.password),
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
