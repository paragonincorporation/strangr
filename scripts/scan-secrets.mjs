import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);
const ignoredFiles = new Set(["package-lock.json", ".env.example"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk_live_[0-9a-zA-Z]{16,}\b/,
  /\bghp_[0-9a-zA-Z]{30,}\b/,
  /\bxox[baprs]-[0-9a-zA-Z-]{20,}\b/,
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(target)));
    else if (
      !ignoredFiles.has(entry.name) &&
      textExtensions.has(path.extname(entry.name))
    )
      files.push(target);
  }
  return files;
}

const findings = [];
for (const file of await filesUnder(".")) {
  const content = await readFile(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}

if (findings.length) {
  console.error(`Possible committed secrets found in: ${findings.join(", ")}`);
  process.exit(1);
}

console.info("Secret pattern scan passed.");
