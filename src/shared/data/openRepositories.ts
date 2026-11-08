import AsyncStorage from '@react-native-async-storage/async-storage';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import migrations from '../../../drizzle/migrations';
import { newId } from '@/shared/lib/id';
import { importLegacyStores } from './legacyImport';
import type { Repositories } from './ports';
import * as schema from './sqlite/schema';
import { createSqliteRepositories } from './sqlite/repositories';

export const DATABASE_NAME = 'hn-reader.db';

/**
 * Native composition: open the SQLite file, apply pending Drizzle migrations,
 * then move any pre-DB AsyncStorage data across. Runs once at startup.
 */
export async function openRepositories(): Promise<Repositories> {
  const sqlite = openDatabaseSync(DATABASE_NAME);
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  const repos = createSqliteRepositories(db, newId);
  await importLegacyStores(AsyncStorage, repos, Date.now());
  return repos;
}
