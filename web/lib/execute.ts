import { getVercelOidcToken } from "@vercel/oidc";
import { insertEvent } from "./db";
import { runPipeline, usesSnapshot } from "./runner";

// The environment the pipeline sees. A real PR needs both GITHUB_REPO and GITHUB_TOKEN, and
// only owner runs get the repository; empty strings override anything this server inherited.
export async function pipelineEnv({ live, githubToken }: { live: boolean; githubToken: boolean }) {
  const oidc = await getVercelOidcToken().catch(() => "");
  return {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    LLM_BASE_URL: process.env.LLM_BASE_URL ?? "",
    LLM_MODEL: process.env.LLM_MODEL ?? "",
    LLM_API_KEY: process.env.LLM_API_KEY || process.env.AI_GATEWAY_API_KEY || oidc || "",
    GITHUB_TOKEN: githubToken ? (process.env.GITHUB_TOKEN ?? "") : "",
    GITHUB_REPO: live ? (process.env.GITHUB_REPO ?? "") : "",
  };
}

function friendly(message: string) {
  if (/quota|limit|paused|exceeded|402|429/i.test(message)) {
    return "The free sandbox allowance is used up for now. The video above shows a full run.";
  }
  return message.slice(0, 300);
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
    const lastErrorLine = result.stderr.trim().split("\n").filter(Boolean).pop() ?? "";
    await insertEvent({
      runId,
      advisoryId,
      step: "sandbox",
      status: result.exitCode === 0 ? "finished" : "error",
      detail: { exitCode: result.exitCode, durationMs: Date.now() - started, ...(result.exitCode ? { message: friendly(lastErrorLine) } : {}) },
    });
  } catch (err) {
    await insertEvent({
      runId,
      advisoryId,
      step: "sandbox",
      status: "error",
      detail: { durationMs: Date.now() - started, message: friendly((err as Error).message) },
    });
  }
}
