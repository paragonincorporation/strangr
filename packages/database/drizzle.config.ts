import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? 'postgresql://strangr:strangr_local_only@localhost:5432/strangr',
  },
  strict: true,
  verbose: true,
})
