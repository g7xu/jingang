import { connection } from "next/server";
import { isCron } from "@/lib/auth";
import { executeRun, pipelineEnv } from "@/lib/execute";
import { claimPoll } from "@/lib/poll";

export const maxDuration = 300;

// Vercel Cron calls this once a day with CRON_SECRET as a bearer token.
export async function GET(req: Request) {
  await connection();
  if (!isCron(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const runId = await claimPoll("cron", 60);
  if (!runId) return Response.json({ started: false });
  await executeRun({ runId, advisoryId: "", args: ["--once"], env: pipelineEnv({ live: false, githubToken: true }) });
  return Response.json({ started: true, runId });
}
