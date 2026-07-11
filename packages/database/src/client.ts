import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

export function createDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 })
  return { pool, db: drizzle(pool, { schema }) }
}
export type Database = ReturnType<typeof createDatabase>['db']
export async function inTransaction<T>(
  database: Database,
  operation: (transaction: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return database.transaction(operation)
}
