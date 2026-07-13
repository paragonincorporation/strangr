import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const scenario = process.argv[2];
const allowed = new Set([
  "database-restore",
  "redis-loss",
  "webhook-replay",
  "auth-outage",
  "turn-outage",
  "credential-rotation",
  "bad-migration",
  "moderator-compromise",
  "data-exposure",
]);
if (!allowed.has(scenario))
  throw new Error(`Choose one rehearsal: ${[...allowed].join(", ")}`);

const evidence = process.env.REHEARSAL_EVIDENCE;
if (!evidence)
  throw new Error("Set REHEARSAL_EVIDENCE to a non-secret evidence file");
await access(resolve(evidence));
const outcome = process.env.REHEARSAL_OUTCOME;
if (outcome !== "pass" && outcome !== "fail")
  throw new Error("REHEARSAL_OUTCOME must be pass or fail");
const owner = process.env.REHEARSAL_OWNER?.trim();
if (!owner)
  throw new Error("REHEARSAL_OWNER must name the accountable role/person");

const record = {
  schemaVersion: 1,
  scenario,
  environment: process.env.REHEARSAL_ENVIRONMENT ?? "staging",
  performedAt: new Date().toISOString(),
  owner,
  outcome,
  evidenceFile: resolve(evidence),
  recoveryPointMinutes: Number(process.env.REHEARSAL_RPO_MINUTES ?? "0"),
  recoveryTimeMinutes: Number(process.env.REHEARSAL_RTO_MINUTES ?? "0"),
  followUp: process.env.REHEARSAL_FOLLOW_UP ?? "",
};
const output = resolve(
  process.env.REHEARSAL_OUTPUT ??
    `artifacts/rehearsals/${scenario}-${Date.now()}.json`,
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, {
  mode: 0o600,
});
console.log(JSON.stringify(record, null, 2));
if (outcome === "fail") process.exitCode = 1;
