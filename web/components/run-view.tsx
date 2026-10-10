"use client";

import { useEffect, useState } from "react";
import { isFinished } from "@/lib/steps";
import type { EventRow } from "@/lib/types";
import { PrCard } from "./pr-card";
import { RunTimeline } from "./run-timeline";

const POLL_MS = 2_000;

function outcome(events: EventRow[]): { text: string; className: string } | null {
  const last = (step: string) => [...events].reverse().find((e) => e.step === step);
  const sandbox = last("sandbox");
  if (sandbox?.status === "error") return { text: String(sandbox.detail.message ?? "The run failed."), className: "border-rose-500/40 text-rose-200" };
  const verify = last("verify");
  if (verify) {
    return verify.status === "Verified"
      ? { text: "Exposed, upgraded and verified. The pull request is below.", className: "border-emerald-500/40 text-emerald-200" }
      : { text: "Exposed and upgraded, but tests failed: the PR is labelled needs-human.", className: "border-amber-400/40 text-amber-100" };
  }
  const exposed = last("exposed");
  if (exposed?.status === "Suppressed") {
    return { text: "Suppressed. The version matches, but the code never calls the vulnerable function, so there is nothing to fix.", className: "border-emerald-500/40 text-emerald-200" };
  }
  const rule = last("rule");
  if (rule?.status === "Unconfirmed") {
    return { text: "Unconfirmed. No validated rule exists for this advisory, so Jingang opens nothing rather than guess.", className: "border-amber-400/40 text-amber-100" };
  }
  const match = last("match");
  if (match?.status === "not_in_range") return { text: "Not in range. The installed version is not affected.", className: "border-zinc-700 text-zinc-300" };
  return null;
}

export function RunView({
  runId,
  initialEvents = [],
  onFinished,
}: {
  runId: string;
  initialEvents?: EventRow[];
  onFinished?: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [finished, setFinished] = useState(isFinished(initialEvents));

  useEffect(() => {
    if (finished) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { events: EventRow[]; finished: boolean };
        if (cancelled) return;
        setEvents(data.events);
        if (data.finished) {
          setFinished(true);
          onFinished?.();
        }
      } catch {
        // A dropped poll is retried on the next tick.
      }
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, finished, onFinished]);

  const pr = [...events].reverse().find((e) => e.step === "pr");
  const result = finished ? outcome(events) : null;

  return (
    <div className="space-y-4">
      <RunTimeline events={events} running={!finished} />
      {result ? <p className={`rounded-xl border bg-zinc-900/40 px-4 py-3 text-sm ${result.className}`}>{result.text}</p> : null}
      {pr && typeof pr.detail.body === "string" ? (
        <PrCard title={String(pr.detail.title ?? "")} body={pr.detail.body} url={(pr.detail.url as string | null) ?? null} />
      ) : null}
    </div>
  );
}
