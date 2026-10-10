import { query } from "./db";
import type { EventRow, RunSummary, Stats } from "./types";

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function toEventRow(r: Record<string, unknown>): EventRow {
  return {
    id: String(r.id),
    ts: new Date(r.ts as string).toISOString(),
    run_id: String(r.run_id),
    advisory_id: String(r.advisory_id),
    repo: String(r.repo ?? ""),
    step: String(r.step),
    status: String(r.status),
    latency_ms: num(r.latency_ms),
    detail: (r.detail ?? {}) as Record<string, unknown>,
  };
}

// Every tile is a count over latest_status, the view that holds the newest row per (advisory, step).
export async function getStats(): Promise<Stats> {
  const [[counts], prs, [extra], [poll]] = await Promise.all([
    query<Record<string, unknown>>(`
      SELECT count(*) FILTER (WHERE step = 'match' AND status = 'Matched')        AS matched,
             count(*) FILTER (WHERE step = 'match' AND status = 'not_in_range')   AS not_in_range,
             count(*) FILTER (WHERE step = 'exposed' AND status = 'Exposed')      AS exposed,
             count(*) FILTER (WHERE step = 'exposed' AND status = 'Suppressed')   AS suppressed,
             count(*) FILTER (WHERE step = 'rule' AND status = 'Unconfirmed')     AS unconfirmed,
             count(*) FILTER (WHERE step = 'verify' AND status = 'Verified')      AS verified,
             count(*) FILTER (WHERE step = 'verify' AND status = 'needs-human')   AS needs_human,
             count(*) FILTER (WHERE step = 'pr')                                  AS prs
      FROM latest_status`),
    query<{ ms: string | null }>(
      "SELECT detail->>'detection_to_pr_ms' AS ms FROM latest_status WHERE step = 'pr' ORDER BY ts DESC",
    ),
    query<Record<string, unknown>>(
      "SELECT (SELECT count(*) FROM guardrails) AS guardrails, (SELECT count(*) FROM advisories) AS advisories",
    ),
    query<Record<string, unknown>>("SELECT ts, status, detail FROM events WHERE step = 'poll' ORDER BY ts DESC LIMIT 1"),
  ]);
  const times = prs.map((p) => Number(p.ms)).filter((n) => Number.isFinite(n));
  const pollDetail = (poll?.detail ?? {}) as Record<string, unknown>;
  return {
    matched: num(counts.matched),
    notInRange: num(counts.not_in_range),
    exposed: num(counts.exposed),
    suppressed: num(counts.suppressed),
    unconfirmed: num(counts.unconfirmed),
    verified: num(counts.verified),
    needsHuman: num(counts.needs_human),
    prs: num(counts.prs),
    guardrails: num(extra.guardrails),
    advisoriesSeen: num(extra.advisories),
    detectionToPr: {
      lastMs: times[0] ?? null,
      avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    },
    lastPoll: poll
      ? {
          at: new Date(poll.ts as string).toISOString(),
          status: String(poll.status),
          listed: pollDetail.listed === undefined ? null : num(pollDetail.listed),
          fresh: pollDetail.fresh === undefined ? null : num(pollDetail.fresh),
        }
      : null,
  };
}

export async function getRunEvents(runId: string): Promise<EventRow[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT id, ts, run_id, advisory_id, repo, step, status, latency_ms, detail FROM events WHERE run_id = $1 ORDER BY ts, id",
    [runId],
  );
  return rows.map(toEventRow);
}

// The landing page tells the story with the newest run that reached Verified.
export async function getShowcaseRun(): Promise<EventRow[]> {
  const [latest] = await query<{ run_id: string }>(
    "SELECT run_id FROM events WHERE step = 'verify' AND status = 'Verified' ORDER BY ts DESC LIMIT 1",
  );
  return latest ? getRunEvents(latest.run_id) : [];
}

export async function getRecentRuns(limit = 8): Promise<RunSummary[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT run_id, advisory_id, min(ts) AS started,
            max(status) FILTER (WHERE step = 'verify')  AS verify,
            max(status) FILTER (WHERE step = 'exposed') AS exposed,
            max(status) FILTER (WHERE step = 'rule')    AS rule,
            max(status) FILTER (WHERE step = 'match')   AS match,
            max(status) FILTER (WHERE step = 'sandbox') AS sandbox,
            max(detail->>'url') FILTER (WHERE step = 'pr') AS pr_url
     FROM events
     WHERE run_id <> 'watch' AND advisory_id <> ''
     GROUP BY run_id, advisory_id
     ORDER BY started DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    runId: String(r.run_id),
    advisoryId: String(r.advisory_id),
    startedAt: new Date(r.started as string).toISOString(),
    outcome: String(
      r.verify ?? r.exposed ?? (r.rule === "Unconfirmed" ? r.rule : null) ?? r.match ?? (r.sandbox === "error" ? "error" : null) ?? "running",
    ),
    prUrl: (r.pr_url as string | null) ?? null,
  }));
}
