import { insertEvent } from "./db";
import { runPipeline, usesSnapshot } from "./runner";

// The environment the pipeline sees inside the sandbox. It holds only what a run needs:
// a database URL (RUNNER_DATABASE_URL, a role without DROP or DELETE, when configured), an
// AI Gateway key rather than the deployment's own OIDC token, and the GitHub repository only
// for owner runs. Empty strings override anything a local runner inherited.
export function pipelineEnv({ live, githubToken }: { live: boolean; githubToken: boolean }) {
  return {
    DATABASE_URL: process.env.RUNNER_DATABASE_URL || process.env.DATABASE_URL || "",
    LLM_BASE_URL: process.env.LLM_BASE_URL ?? "",
    LLM_MODEL: process.env.LLM_MODEL ?? "",
    LLM_API_KEY: process.env.LLM_API_KEY || process.env.AI_GATEWAY_API_KEY || "",
    VERCEL_OIDC_TOKEN: "",
    GITHUB_TOKEN: githubToken ? (process.env.GITHUB_TOKEN ?? "") : "",
    GITHUB_REPO: live ? (process.env.GITHUB_REPO ?? "") : "",
  };
}

// Run pages are public, so an event carries a fixed sentence per failure class and the raw
// error goes only to the server log.
function publicMessage(raw: string) {
  if (/quota|limit|paused|exceeded|402|429/i.test(raw)) {
    return "The free sandbox allowance is used up for now. The video above shows a full run.";
  }
  if (/timed? ?out|timeout/i.test(raw)) return "The run took longer than the time limit and was stopped.";
  return "The run stopped with an error. The details are in the server log.";
}

// Brackets one pipeline invocation with sandbox events, so the page can tell a run that is
// still going from one that died before the pipeline wrote anything.
export async function executeRun({
  runId,
  advisoryId,
  args,
  env,
}: {
  runId: string;
  advisoryId: string;
  args: string[];
  env: Record<string, string>;
}) {
  const started = Date.now();
  const runner = process.env.JINGANG_RUNNER === "local" ? "local" : "sandbox";
  await insertEvent({ runId, advisoryId, step: "sandbox", status: "started", detail: { runner, fromSnapshot: usesSnapshot() } });
  try {
    const result = await runPipeline(args, env);
    if (result.exitCode !== 0) console.error(`run ${runId} exited ${result.exitCode}\n${result.stderr}`);
    await insertEvent({
      runId,
      advisoryId,
      step: "sandbox",
      status: result.exitCode === 0 ? "finished" : "error",
      detail: {
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
        ...(result.exitCode ? { message: publicMessage(result.stderr) } : {}),
      },
    });
  } catch (err) {
    console.error(`run ${runId} failed`, err);
    await insertEvent({
      runId,
      advisoryId,
      step: "sandbox",
      status: "error",
      detail: { durationMs: Date.now() - started, message: publicMessage((err as Error).message) },
    });
  }
}
