import type { EventRow } from "./types";

export const STEP_INFO: Record<string, { label: string; blurb: string }> = {
  request: { label: "Run requested", blurb: "The website queued this run and handed it an id." },
  sandbox: { label: "Sandbox", blurb: "A fresh microVM with Node, Semgrep and both repositories." },
  match: { label: "Match", blurb: "Is the installed version inside the advisory's affected range?" },
  guardrail_check: { label: "Guardrail check", blurb: "A version policy stored by an earlier fix spotted a known-bad version." },
  rule: { label: "Get the rule", blurb: "Load the hand-written Semgrep rule for this exact advisory." },
  exposed: { label: "Exposed?", blurb: "Does the code call the vulnerable function, and does request data reach it?" },
  upgrade: { label: "Upgrade", blurb: "Newest version outside every known advisory, forced on transitive copies with overrides." },
  verify: { label: "Verify", blurb: "Every installed copy is outside every range, and npm test passes." },
  pr: { label: "Pull request", blurb: "Facts come from data; the model writes only the explanation." },
  guardrails: { label: "Store guardrails", blurb: "The version policy and taint rule join every future scan." },
  run: { label: "Run", blurb: "The run stopped with an error." },
};

export type Tone = "good" | "bad" | "warn" | "info" | "muted";

const TONES: Record<string, Tone> = {
  Exposed: "bad",
  error: "bad",
  install_failed: "bad",
  Suppressed: "good",
  Verified: "good",
  opened: "good",
  stored: "good",
  upgraded: "good",
  finished: "good",
  Unconfirmed: "warn",
  "needs-human": "warn",
  violated: "warn",
  dry: "warn",
  Matched: "info",
  hand_written: "info",
  queued: "muted",
  started: "muted",
  not_in_range: "muted",
};

export const tone = (status: string): Tone => TONES[status] ?? "muted";

export const TONE_CLASS: Record<Tone, string> = {
  good: "text-emerald-400",
  bad: "text-rose-400",
  warn: "text-amber-300",
  info: "text-sky-300",
  muted: "text-zinc-400",
};

// A run is over when the sandbox reports back, or the pipeline recorded a fatal error.
export function isFinished(events: EventRow[]) {
  return events.some((e) => (e.step === "sandbox" && e.status !== "started") || (e.step === "run" && e.status === "error"));
}

export function summarize(e: EventRow): string {
  const d = e.detail;
  const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
  if (Array.isArray(d.callSites)) {
    const sites = (d.callSites as { file: string; line: number }[]).map((c) => `${c.file}:${c.line}`).join(", ");
    const taint = Array.isArray(d.taintFindings) && d.taintFindings.length ? " · request data reaches the call" : "";
    return `${sites}${taint}`;
  }
  if (d.from && d.to) return `${d.from} → ${d.to}`;
  if (e.step === "verify") return `outside every range: ${d.outsideAllRanges ? "yes" : "no"} · npm test: ${d.testsPassed ? "passed" : "failed"}`;
  if (e.step === "pr") return d.url ? String(d.url) : `dry run · explanation by ${d.explanation_source === "model" ? "the model" : "the template"}`;
  if (e.step === "match") return `installed ${list(d.installed)}`;
  if (e.step === "rule") return d.reason ? String(d.reason) : list(d.rules);
  if (e.step === "exposed") return "no call site found";
  if (e.step === "guardrails") return `stored ${list(d.stored) || "none new"}`;
  if (e.step === "guardrail_check") return list(d.policies);
  if (e.step === "request") return d.mode === "live" ? "owner run: real pull request" : "visitor run: dry pull request";
  if (e.step === "sandbox" && e.status === "started") {
    if (d.runner === "local") return "running on the development machine";
    return d.fromSnapshot ? "booted from snapshot" : "installing Semgrep and dependencies";
  }
  if (e.step === "sandbox" || e.step === "run") return d.message ? String(d.message) : d.exitCode === undefined ? "" : `exit code ${d.exitCode}`;
  return "";
}
