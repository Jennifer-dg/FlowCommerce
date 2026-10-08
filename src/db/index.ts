import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

// Agrupa el cliente Drizzle y el client de postgres para poder cerrar el pool.
export interface DatabaseConnection {
  db: Database;
  client: postgres.Sql;
}

// Crea la conexión a PostgreSQL (pool) y el cliente Drizzle tipado con el schema.
export function createDatabaseConnection(
  databaseUrl: string,
): DatabaseConnection {
  const client = postgres(databaseUrl, { max: 10 });
  return { db: drizzle(client, { schema }), client };
}

// Crea solo el cliente Drizzle sin exponer el pool (uso puntual, p. ej. seed).
export function createDatabaseClient(databaseUrl: string): Database {
  return createDatabaseConnection(databaseUrl).db;
}

export { schema };
