import { parseArgs } from "node:util";
import { insert, rows } from "./db.js";
import { config, mode } from "./env.js";
import { listNpmAdvisories } from "./ghsa.js";
import { runAdvisory } from "./loop.js";
import { ADVISORY_UPSERT, getVuln, toAdvisoryRow } from "./osv.js";
import { resetRepo } from "./pr.js";

const POLL_MS = 60_000;
// GitHub answers rate-limited polls with 403 or 429; waiting a full window beats hammering it.
const RATE_LIMIT_BACKOFF_MS = 5 * 60_000;

async function intake(vuln, status, detail, detectedAt) {
  await insert("advisories", toAdvisoryRow(vuln, { detectedAt }), ADVISORY_UPSERT);
  await insert("events", { run_id: "watch", advisory_id: vuln.id, repo: "", step: "watch", status, latency_ms: 0, detail: JSON.stringify(detail) });
}

export async function replay(advisoryId, { repoPath = config.demoAppPath, reset = true, runId } = {}) {
  const detectedAt = new Date();
  const vuln = await getVuln(advisoryId);
  await intake(vuln, "replay", { modified: vuln.modified, run_id: runId ?? null }, detectedAt);
  if (reset) await resetRepo(repoPath);
  return runAdvisory(vuln, { repoPath, detectedAt, source: "replay", runId });
}

export async function pollOnce(seen, { repoPath = config.demoAppPath, modifiedSince } = {}) {
  const list = await listNpmAdvisories({ modifiedSince });
  const fresh = list.filter((a) => !seen.has(a.id));
  for (const a of fresh) {
    const detectedAt = new Date();
    let vuln;
    try {
      vuln = await getVuln(a.id);
    } catch (err) {
      console.log(`${a.id}: OSV not ready (${err.message}), retrying next poll`);
      continue;
    }
    seen.add(a.id);
    await intake(vuln, "live", { summary: a.summary }, detectedAt);
    console.log(`live: ${vuln.id} ${a.summary ?? ""}`);
    // One advisory that blows up must not stop the poller; the failure is recorded as its own event.
    try {
      await runAdvisory(vuln, { repoPath, detectedAt, source: "live" });
    } catch (err) {
      console.error(`${vuln.id}: run failed: ${err.message}`);
      await insert("events", { run_id: "watch", advisory_id: vuln.id, repo: "", step: "run", status: "error", latency_ms: 0, detail: JSON.stringify({ message: err.message.slice(0, 500) }) });
    }
  }
  return { listed: list.length, fresh: fresh.length };
}

export async function watch({ repoPath = config.demoAppPath, once = false } = {}) {
  const seen = new Set((await rows("SELECT id FROM advisories")).map((r) => r.id));
  const modifiedSince = Date.now() - 24 * 60 * 60 * 1000;
  console.log(`watching GitHub Advisory API (npm), ${seen.size} advisories already seen, modes: llm=${mode.llm} github=${mode.github}`);
  do {
    let wait = POLL_MS;
    try {
      const { listed, fresh } = await pollOnce(seen, { repoPath, modifiedSince });
      console.log(`${new Date().toISOString()} poll: ${fresh} new`);
      // One row per poll, so a scheduled or on-visit poll is visible even when nothing is new.
      await insert("events", { run_id: "watch", advisory_id: "", repo: "", step: "poll", status: "ok", latency_ms: 0, detail: JSON.stringify({ listed, fresh }) });
    } catch (err) {
      console.error(`poll failed: ${err.message}`);
      await insert("events", { run_id: "watch", advisory_id: "", repo: "", step: "poll", status: "error", latency_ms: 0, detail: JSON.stringify({ message: err.message.slice(0, 500) }) });
      if (/\b(403|429)\b/.test(err.message)) wait = RATE_LIMIT_BACKOFF_MS;
    }
    if (!once) await new Promise((r) => setTimeout(r, wait));
  } while (!once);
}

if (import.meta.filename === process.argv[1]) {
  const { values } = parseArgs({
    options: {
      replay: { type: "string" },
      once: { type: "boolean", default: false },
      repo: { type: "string" },
      "run-id": { type: "string" },
      "no-reset": { type: "boolean", default: false },
    },
  });
  const repoPath = values.repo ?? config.demoAppPath;
  if (values.replay) {
    const summary = await replay(values.replay, { repoPath, reset: !values["no-reset"], runId: values["run-id"] });
    console.log(JSON.stringify(summary, null, 2));
  } else {
    await watch({ repoPath, once: values.once });
  }
}
