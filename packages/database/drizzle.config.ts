import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://paramingle:paramingle_local_only@localhost:5432/paramingle",
  },
  strict: true,
  verbose: true,
});
