import { after } from "next/server";
import { executeRun, pipelineEnv } from "@/lib/execute";
import { claimPoll, POLL_EVERY_S } from "@/lib/poll";

export const maxDuration = 300;

export async function POST() {
  const runId = await claimPoll("visit", POLL_EVERY_S);
  if (!runId) return Response.json({ started: false });
  // The token only raises the Advisory API rate limit; without GITHUB_REPO no PR can open.
  const env = await pipelineEnv({ live: false, githubToken: true });
  after(() => executeRun({ runId, advisoryId: "", args: ["--once"], env }));
  return Response.json({ started: true, runId }, { status: 202 });
}
