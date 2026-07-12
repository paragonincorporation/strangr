import { parseServerConfig } from "@paramingle/config";
import {
  CommunicationRepository,
  EncounterRepository,
  FriendRepository,
  createDatabase,
} from "@paramingle/database";
import { AvatarService, SupabaseStorage } from "./avatar-service.js";

const config = parseServerConfig(process.env);
const { db, pool } = createDatabase(config.DATABASE_URL);
const avatars = new AvatarService(
  db,
  new SupabaseStorage(
    config.SUPABASE_URL,
    config.SUPABASE_STORAGE_BUCKET,
    config.SUPABASE_SERVICE_ROLE_KEY,
  ),
);
const encounters = new EncounterRepository(db);
const friends = new FriendRepository(db);
const communications = new CommunicationRepository(db);
const dryRun = process.argv.includes("--dry-run");
const intervalMs = Number(process.env.WORKER_HEARTBEAT_MS || 30_000);
const once = process.argv.includes("--once");
console.info(
  JSON.stringify({
    service: "paramingle-worker",
    status: "ready",
    intervalMs,
    once,
  }),
);

const run = async (): Promise<boolean> => {
  try {
    const lease = await pool.query<{ acquired: boolean }>(
      "select pg_try_advisory_lock(74213912) as acquired",
    );
    if (!lease.rows[0]?.acquired) return true;
    const abandonedAvatarUploads = await avatars.cleanup();
    const encounterRetention = await encounters.cleanupExpired(
      500,
      new Date(),
      dryRun,
    );
    const friendRequestRetention = await friends.cleanup(
      500,
      new Date(),
      dryRun,
    );
    const missedDirectCalls = await communications.expireUnanswered(
      config.DIRECT_CALL_RING_SECONDS,
    );
    const callRetention = await communications.cleanupCalls(
      500,
      new Date(),
      dryRun,
    );
    console.info(
      JSON.stringify({
        service: "paramingle-worker",
        event: "retention-pass",
        abandonedAvatarUploads,
        encounterRetention,
        friendRequestRetention,
        missedDirectCalls,
        callRetention,
        timestamp: new Date().toISOString(),
      }),
    );
    await pool.query("select pg_advisory_unlock(74213912)");
    return true;
  } catch (error) {
    await pool
      .query("select pg_advisory_unlock(74213912)")
      .catch(() => undefined);
    console.error(
      JSON.stringify({
        service: "paramingle-worker",
        event: "retention-failed",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return false;
  }
};
if (once) {
  const succeeded = await run();
  await pool.end();
  process.exit(succeeded ? 0 : 1);
}

const timer = setInterval(() => void run(), intervalMs);
void run();
const shutdown = async (signal: string) => {
  clearInterval(timer);
  await pool.end();
  console.info(
    JSON.stringify({ service: "paramingle-worker", status: "stopped", signal }),
  );
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
