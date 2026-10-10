"use client";

import { STEP_INFO, summarize, tone, TONE_CLASS } from "@/lib/steps";
import type { EventRow } from "@/lib/types";

// Times are shown relative to the first event so server and browser render the same text.
export function RunTimeline({ events, running }: { events: EventRow[]; running: boolean }) {
  const start = events.length ? Date.parse(events[0].ts) : 0;
  return (
    <ol className="divide-y divide-zinc-800/80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      {events.map((e) => {
        const info = STEP_INFO[e.step] ?? { label: e.step, blurb: "" };
        const detail = summarize(e);
        return (
          <li key={e.id} className="grid grid-cols-[4.5rem_1fr] gap-x-4 px-4 py-3 sm:grid-cols-[4.5rem_10rem_8rem_1fr]">
            <span className="font-mono text-xs tabular-nums text-zinc-500">+{((Date.parse(e.ts) - start) / 1000).toFixed(1)}s</span>
            <span className="text-sm font-medium text-zinc-200" title={info.blurb}>
              {info.label}
            </span>
            <span className={`col-start-2 font-mono text-sm sm:col-start-auto ${TONE_CLASS[tone(e.status)]}`}>{e.status}</span>
            <span className="col-start-2 break-words font-mono text-xs leading-relaxed text-zinc-400 sm:col-start-auto">
              {detail}
              {e.latency_ms ? <span className="text-zinc-600"> · {e.latency_ms} ms</span> : null}
            </span>
          </li>
        );
      })}
      {running ? (
        <li className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-500">
          <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
          waiting for the next step…
        </li>
      ) : null}
    </ol>
  );
}
