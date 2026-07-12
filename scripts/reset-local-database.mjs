import { execFileSync } from "node:child_process";
if (process.env.NODE_ENV === "production")
  throw new Error("Refusing to reset a production database");
execFileSync("docker", ["compose", "down", "--volumes"], { stdio: "inherit" });
execFileSync("docker", ["compose", "up", "-d", "postgres", "redis"], {
  stdio: "inherit",
});
console.info(
  "Local services reset. Run npm run db:migrate after Postgres is healthy.",
);
