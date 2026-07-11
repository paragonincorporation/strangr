import { Pool } from 'pg';
import * as schema from './schema.js';
export declare function createDatabase(databaseUrl: string): {
    pool: Pool;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
        $client: Pool;
    };
};
export type Database = ReturnType<typeof createDatabase>['db'];
export declare function inTransaction<T>(database: Database, operation: (transaction: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>): Promise<T>;
