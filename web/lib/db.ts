import pg from "pg";

type Query = <T>(sql: string, params?: unknown[]) => Promise<T[]>;

// One pool per server instance; kept on globalThis so dev-mode hot reloads reuse it.
const holder = globalThis as unknown as { jingangPool?: pg.Pool };

function pool(): pg.Pool {
  if (!holder.jingangPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    holder.jingangPool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 5_000 });
  }
  return holder.jingangPool;
}

export const query: Query = async (sql, params = []) => (await pool().query(sql, params)).rows;

// Serialises check-then-insert sections across every server instance: the advisory lock
// is held until COMMIT, so two visitors clicking Run at once cannot both pass the cooldown.
export async function withLock<T>(key: string, fn: (q: Query) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const result = await fn(async (sql, params = []) => (await client.query(sql, params)).rows);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function insertEvent(e: {
  runId: string;
  advisoryId: string;
  step: string;
  status: string;
  detail?: Record<string, unknown>;
  q?: Query;
}) {
  await (e.q ?? query)(
    "INSERT INTO events (run_id, advisory_id, step, status, detail) VALUES ($1, $2, $3, $4, $5)",
    [e.runId, e.advisoryId, e.step, e.status, JSON.stringify(e.detail ?? {})],
  );
}
