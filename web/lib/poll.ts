import { randomUUID } from "node:crypto";
import { insertEvent, withLock } from "./db";

// Hobby cron runs once a day, so opening the demo page also polls the feed, at most this often.
export const POLL_EVERY_S = 600;

// Records a poll request unless one is younger than minAgeS. Returns the run id to use, or null.
export async function claimPoll(by: "visit" | "cron", minAgeS: number): Promise<string | null> {
  const runId = `poll-${randomUUID().slice(0, 6)}`;
  return withLock("jingang-poll", async (q) => {
    const [last] = await q<{ age: number }>(
      "SELECT extract(epoch FROM clock_timestamp() - ts)::int AS age FROM events WHERE step = 'request' AND advisory_id = '' ORDER BY ts DESC LIMIT 1",
    );
    if (last && last.age < minAgeS) return null;
    await insertEvent({ q, runId, advisoryId: "", step: "request", status: "queued", detail: { mode: "poll", by } });
    return runId;
  });
}
