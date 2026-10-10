// Runs the pipeline in src/ for one advisory or one poll, either inside a Vercel Sandbox
// (production) or as a child process of this server (JINGANG_RUNNER=local, for development).
// Imported by scripts/build-snapshot.mts too, so it uses relative imports and erasable TypeScript only.
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { Sandbox } from "@vercel/sandbox";

export type RunResult = { exitCode: number; stdout: string; stderr: string };

const ROOT = "/vercel/sandbox";
export const PATHS = {
  jingang: `${ROOT}/jingang`,
  demo: `${ROOT}/jingang-demo-app`,
  venv: `${ROOT}/venv`,
};

// The version the rules in rules/ were validated with.
const SEMGREP_VERSION = "1.180.0";
const NPM_CI = ["ci", "--ignore-scripts", "--no-audit", "--no-fund"];

function repos() {
  return {
    jingangUrl: process.env.JINGANG_GIT_URL || "https://github.com/g7xu/jingang.git",
    jingangRef: process.env.JINGANG_GIT_REF || "main",
    demoUrl: process.env.DEMO_APP_GIT_URL || "https://github.com/g7xu/jingang-demo-app.git",
  };
}

const tail = (text: unknown, max = 4_000) => String(text ?? "").slice(-max);

async function sh(sandbox: Sandbox, cmd: string, args: string[], opts: { cwd?: string; sudo?: boolean } = {}) {
  const result = await sandbox.runCommand({ cmd, args, ...opts });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} exited ${result.exitCode}: ${tail(await result.stderr(), 600)}`);
  }
}

// Everything a run needs beyond the base image. Every run without a snapshot does this
// (about a minute); build-snapshot does it once and saves the result.
export async function provision(sandbox: Sandbox) {
  const { jingangUrl, jingangRef, demoUrl } = repos();
  await sh(sandbox, "git", ["clone", "--quiet", "--depth", "1", "--branch", jingangRef, jingangUrl, PATHS.jingang]);
  await sh(sandbox, "git", ["clone", "--quiet", demoUrl, PATHS.demo]);
  await sh(sandbox, "python3", ["-m", "venv", PATHS.venv]);
  await sh(sandbox, `${PATHS.venv}/bin/pip`, ["install", "--quiet", `semgrep==${SEMGREP_VERSION}`]);
  await sh(sandbox, "ln", ["-sf", `${PATHS.venv}/bin/semgrep`, "/usr/local/bin/semgrep"], { sudo: true });
  await sh(sandbox, "npm", NPM_CI, { cwd: PATHS.jingang });
  await sh(sandbox, "npm", NPM_CI, { cwd: PATHS.demo });
}

// A snapshot can be weeks old, so both repositories move to their current tip before a run.
async function refresh(sandbox: Sandbox) {
  const { jingangRef } = repos();
  await sh(sandbox, "git", ["-C", PATHS.jingang, "fetch", "--quiet", "--depth", "1", "origin", jingangRef]);
  await sh(sandbox, "git", ["-C", PATHS.jingang, "reset", "--quiet", "--hard", "FETCH_HEAD"]);
  await sh(sandbox, "npm", NPM_CI, { cwd: PATHS.jingang });
  await sh(sandbox, "git", ["-C", PATHS.demo, "fetch", "--quiet", "origin"]);
  await sh(sandbox, "git", ["-C", PATHS.demo, "checkout", "--quiet", "-f", "-B", "main", "origin/main"]);
}

export const usesSnapshot = () => process.env.JINGANG_RUNNER !== "local" && Boolean(process.env.SANDBOX_SNAPSHOT_ID);

export async function runPipeline(args: string[], env: Record<string, string>): Promise<RunResult> {
  if (process.env.JINGANG_RUNNER === "local") return runLocal(args, env);
  const snapshotId = process.env.SANDBOX_SNAPSHOT_ID;
  const base = { timeout: 270_000, resources: { vcpus: 2 }, persistent: false };
  const sandbox = await Sandbox.create(snapshotId ? { ...base, source: { type: "snapshot" as const, snapshotId } } : base);
  try {
    if (snapshotId) await refresh(sandbox);
    else await provision(sandbox);
    const result = await sandbox.runCommand({
      cmd: "node",
      args: ["src/watcher.js", ...args],
      cwd: PATHS.jingang,
      env: { ...env, DEMO_APP_PATH: PATHS.demo },
    });
    return { exitCode: result.exitCode, stdout: tail(await result.stdout()), stderr: tail(await result.stderr()) };
  } finally {
    await sandbox.stop().catch(() => {});
  }
}

const run = promisify(execFile);

// The repository root is the parent of web/, where src/watcher.js lives.
async function runLocal(args: string[], env: Record<string, string>): Promise<RunResult> {
  try {
    const { stdout, stderr } = await run(process.execPath, ["src/watcher.js", ...args], {
      cwd: resolve(process.cwd(), ".."),
      env: { ...process.env, ...env },
      maxBuffer: 16 * 1024 * 1024,
      timeout: 270_000,
    });
    return { exitCode: 0, stdout: tail(stdout), stderr: tail(stderr) };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message: string };
    return { exitCode: typeof e.code === "number" ? e.code : 1, stdout: tail(e.stdout), stderr: tail(e.stderr ?? e.message) };
  }
}
