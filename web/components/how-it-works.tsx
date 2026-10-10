"use client";

import { useEffect, useState } from "react";
import { TONE_CLASS, tone } from "@/lib/steps";

export type ShowcaseRow = { status: string; latencyMs: number; summary: string };

const STEPS = [
  { key: "watch", title: "Watch", text: "Poll the GitHub Advisory feed for npm and fetch each new advisory's full record from OSV." },
  { key: "match", title: "Match", text: "Read package-lock.json and check every installed copy against the affected range, with semver in Node." },
  { key: "rule", title: "Get the rule", text: "Load the Semgrep rule written for this exact advisory. No validated rule means Unconfirmed: no guessing." },
  { key: "exposed", title: "Exposed?", text: "Run the reachability rule and the taint guardrail. No call site means Suppressed: the alert Dependabot would have sent is noise." },
  { key: "upgrade", title: "Upgrade", text: "Pick the newest version outside every known advisory, not just the first fix, and force transitive copies with npm overrides." },
  { key: "verify", title: "Verify", text: "Every installed copy must sit outside every affected range, and npm test must pass. Otherwise the PR is labelled needs-human." },
  { key: "pr", title: "Pull request", text: "Advisory, file and line, taint finding and test results come from data. A model on AI Gateway writes only the explanation, and invented facts are rejected." },
  { key: "guardrails", title: "Guardrails", text: "Store a version policy and commit the taint rule to the repo's CI, so nobody writes line 12 again." },
];

export function HowItWorks({ rows }: { rows: Partial<Record<string, ShowcaseRow>> }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 3_500);
    return () => clearInterval(t);
  }, [auto]);

  const step = STEPS[active];
  const row = rows[step.key];

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <ol className="space-y-1">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => {
                setActive(i);
                setAuto(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                i === active ? "bg-amber-400/10 text-amber-200" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span className="font-mono text-xs text-zinc-600">{i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="font-mono text-xs uppercase tracking-widest text-zinc-500">Step {active + 1} of {STEPS.length}</div>
        <h3 className="mt-2 text-xl font-semibold text-zinc-100">{step.title}</h3>
        <p className="mt-3 leading-relaxed text-zinc-300">{step.text}</p>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 font-mono text-sm">
          <div className="text-[11px] uppercase tracking-widest text-zinc-600">from a real run</div>
          {row ? (
            <div className="mt-2 space-y-1">
              <div className={TONE_CLASS[tone(row.status)]}>
                {row.status}
                {row.latencyMs ? <span className="text-zinc-600"> · {row.latencyMs} ms</span> : null}
              </div>
              {row.summary ? <div className="break-words text-zinc-400">{row.summary}</div> : null}
            </div>
          ) : (
            <div className="mt-2 text-zinc-600">Run the live demo to fill this in.</div>
          )}
        </div>
      </div>
    </div>
  );
}
