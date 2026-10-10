import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { exec, ping, rows } from "./db.js";

// reset drops every Jingang table first: a clean slate for a recording, so no earlier
// run's guardrail colours the first replay. It also drops the runner role's grants.
export async function applySchema({ reset = false } = {}) {
  if (reset) {
    await exec("DROP VIEW IF EXISTS latest_status");
    await exec("DROP TABLE IF EXISTS events, lockfiles, guardrails, advisories");
  }
  const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await exec(sql);
  return rows(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name",
  );
}

// The login a sandbox run uses: it can read, append, and upsert advisories, but holds no
// DELETE, TRUNCATE or DDL, so a run cannot erase history whatever code it executes.
// Each call rotates the password and returns the connection URL for that role.
export async function ensureRunnerRole() {
  const password = randomBytes(24).toString("base64url");
  await exec(
    "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jingang_runner') THEN CREATE ROLE jingang_runner LOGIN; END IF; END $$",
  );
  // base64url has no quote characters, so the literal cannot be broken out of.
  await exec(`ALTER ROLE jingang_runner WITH LOGIN PASSWORD '${password}'`);
  await exec("GRANT USAGE ON SCHEMA public TO jingang_runner");
  await exec("GRANT SELECT, INSERT ON advisories, lockfiles, events, guardrails TO jingang_runner");
  await exec("GRANT UPDATE ON advisories TO jingang_runner");
  await exec("GRANT SELECT ON latest_status TO jingang_runner");
  await exec("GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO jingang_runner");
  const url = new URL(config.databaseUrl);
  url.username = "jingang_runner";
  url.password = password;
  return url.toString();
}

if (import.meta.filename === process.argv[1]) {
  const reset = process.argv.includes("--reset");
  const host = new URL(config.databaseUrl || "postgres://unset").host;
  console.log(`${await ping()} at ${host}${reset ? " (dropping and recreating the tables)" : ""}`);
  const tables = await applySchema({ reset });
  console.log(`tables: ${tables.map((t) => t.name).join(", ")}`);
  const roleOut = process.argv.find((a) => a.startsWith("--runner-role="))?.split("=")[1];
  if (roleOut) {
    await writeFile(roleOut, `${await ensureRunnerRole()}\n`, { mode: 0o600 });
    console.log(`runner role ready; its URL is in ${roleOut} (set it as RUNNER_DATABASE_URL)`);
  }
}
