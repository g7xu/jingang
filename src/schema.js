import { readFile } from "node:fs/promises";
import { config } from "./env.js";
import { exec, ping, rows } from "./db.js";

// reset drops every Jingang table first: a clean slate for a recording, so no earlier
// run's guardrail colours the first replay.
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

if (import.meta.filename === process.argv[1]) {
  const reset = process.argv.includes("--reset");
  const host = new URL(config.databaseUrl || "postgres://unset").host;
  console.log(`${await ping()} at ${host}${reset ? " (dropping and recreating the tables)" : ""}`);
  const tables = await applySchema({ reset });
  console.log(`tables: ${tables.map((t) => t.name).join(", ")}`);
}
