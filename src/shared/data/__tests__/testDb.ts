import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import * as schema from '@/shared/data/sqlite/schema';
import type { AppDatabase } from '@/shared/data/sqlite/repositories';

/** A fresh in-memory SQLite database with every Drizzle migration applied. */
export function createTestDb(): AppDatabase {
  const db = drizzle(new Database(':memory:'), { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../../../../drizzle') });
  return db;
}
