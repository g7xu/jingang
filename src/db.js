import pg from "pg";
import { config } from "./env.js";

let pool;

// Created on first use so modules that never query (and the unit tests) need no DATABASE_URL.
// allowExitOnIdle lets a CLI run end on its own once the last query returns.
function getPool() {
  if (pool) return pool;
  if (!config.databaseUrl) throw new Error("DATABASE_URL is not set");
  pool = new pg.Pool({ connectionString: config.databaseUrl, max: 3, allowExitOnIdle: true });
  return pool;
}

export async function rows(sql, params = []) {
  return (await getPool().query(sql, params)).rows;
}

export async function exec(sql, params = []) {
  await getPool().query(sql, params);
}

// Columns come from the first record. Arrays bind as Postgres arrays, so a jsonb column
// must be given a JSON string; every caller passes detail and ranges already stringified.
export async function insert(table, records, { onConflict = "", returning = "" } = {}) {
  const list = Array.isArray(records) ? records : [records];
  if (list.length === 0) return [];
  const columns = Object.keys(list[0]);
  const params = [];
  const tuples = list.map((record) => `(${columns.map((c) => `$${params.push(record[c])}`).join(", ")})`);
  const sql = [
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`,
    onConflict && `ON CONFLICT ${onConflict}`,
    returning && `RETURNING ${returning}`,
  ]
    .filter(Boolean)
    .join(" ");
  return rows(sql, params);
}

export async function ping() {
  const [{ version }] = await rows("SELECT version()");
  return version.split(" on ")[0];
}

export async function close() {
  if (pool) await pool.end();
  pool = undefined;
}
