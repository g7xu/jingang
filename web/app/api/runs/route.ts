import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { isDemoAdvisory, isGhsaId } from "@/lib/advisories";
import { isOwner } from "@/lib/auth";
import { insertEvent, withLock } from "@/lib/db";
import { executeRun, pipelineEnv } from "@/lib/execute";

// The sandbox run continues in after(), which shares this limit (the Hobby maximum).
export const maxDuration = 300;

// Minimum gap between visitor runs, site-wide. Each run costs sandbox CPU from a free monthly allowance.
const VISITOR_COOLDOWN_S = 180;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { advisoryId?: unknown };
  const advisoryId = typeof body.advisoryId === "string" ? body.advisoryId.trim() : "";
  const owner = isOwner(req);
  if (!isDemoAdvisory(advisoryId) && !(owner && isGhsaId(advisoryId))) {
    return Response.json({ error: "Pick one of the four demo advisories." }, { status: 400 });
  }

  const live = owner && Boolean(process.env.GITHUB_REPO && process.env.GITHUB_TOKEN);
  const runId = randomUUID().slice(0, 8);
  const gate = await withLock("jingang-run", async (q) => {
    if (!owner) {
      const [last] = await q<{ age: number }>(
        "SELECT extract(epoch FROM clock_timestamp() - ts)::int AS age FROM events WHERE step = 'request' AND advisory_id <> '' ORDER BY ts DESC LIMIT 1",
      );
      if (last && last.age < VISITOR_COOLDOWN_S) return { ok: false as const, retryAfter: VISITOR_COOLDOWN_S - last.age };
    }
    await insertEvent({ q, runId, advisoryId, step: "request", status: "queued", detail: { mode: live ? "live" : "dry", by: owner ? "owner" : "visitor" } });
    return { ok: true as const };
  });

  if (!gate.ok) {
    return Response.json(
      { error: "Another run started moments ago.", retryAfter: gate.retryAfter },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  const env = pipelineEnv({ live, githubToken: live });
  after(() => executeRun({ runId, advisoryId, args: ["--replay", advisoryId, "--run-id", runId], env }));
  return Response.json({ runId, mode: live ? "live" : "dry" }, { status: 202 });
}
