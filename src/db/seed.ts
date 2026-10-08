import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { createBetterAuth } from '../auth/infrastructure/better-auth/create-better-auth';
import { createDatabaseClient } from './index';
import { users } from './schema';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed cannot be executed in production');
}

const SEED_USER_EMAIL = 'seed@flowcommerce.local';
const SEED_USER_NAME = 'Seed User';
const SEED_USER_PASSWORD = 'SeedPassword123!';
const SEED_USER_SECRET = process.env.BETTER_AUTH_SECRET ?? 'seed-only-secret';

// Crea el usuario semilla con su sesión de Better Auth (nunca en producción).
async function seed(): Promise<void> {
  const client = postgres(databaseUrl as string, { max: 1 });
  const db = createDatabaseClient(databaseUrl as string);

  const auth = createBetterAuth(db, {
    secret: SEED_USER_SECRET,
    baseURL: `http://localhost:${process.env.PORT ?? 3000}`,
    hash: (plain) => bcrypt.hash(plain, 12),
    verify: (hash, plain) => bcrypt.compare(plain, hash),
  });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, SEED_USER_EMAIL),
  });

  if (existingUser) {
    console.log(`Seed user already exists: ${SEED_USER_EMAIL}`);
    await client.end();
    process.exit(0);
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: SEED_USER_NAME,
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
    },
  });

  console.log(`Seed user created: ${result.user.email}`);
  await client.end();
  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
