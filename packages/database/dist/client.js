import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
export function createDatabase(databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl, max: 10 });
    return { pool, db: drizzle(pool, { schema }) };
}
export async function inTransaction(database, operation) {
    return database.transaction(operation);
}
