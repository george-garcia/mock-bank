import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://mockbank:mockbank_dev_password@localhost:5432/mockbank';

const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });

export * from './schema';
export * from './types';