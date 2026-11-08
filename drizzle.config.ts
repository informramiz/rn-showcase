import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/data/sqlite/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
