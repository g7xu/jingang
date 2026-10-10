import type { Stats } from "@/lib/types";

type Tile = { label: string; value: string; note: string; tone: string };

const seconds = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);

export function TileGrid({ stats }: { stats: Stats }) {
  const tiles: Tile[] = [
    { label: "Matched", value: String(stats.matched), note: `version in range · ${stats.notInRange} more checked, not in range`, tone: "text-sky-300" },
    { label: "Exposed", value: String(stats.exposed), note: "rule hit and version in range", tone: "text-rose-400" },
    { label: "Suppressed", value: String(stats.suppressed), note: "matched, never called: the noise", tone: "text-emerald-400" },
    { label: "Unconfirmed", value: String(stats.unconfirmed), note: "no rule, so no guess", tone: "text-amber-300" },
    { label: "Verified", value: String(stats.verified), note: `${stats.needsHuman} needs-human · ${stats.guardrails} guardrails stored`, tone: "text-emerald-400" },
    { label: "Detection to PR", value: seconds(stats.detectionToPr.lastMs), note: `average ${seconds(stats.detectionToPr.avgMs)}`, tone: "text-zinc-100" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{t.label}</div>
          <div className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${t.tone}`}>{t.value}</div>
          <div className="mt-1 text-xs leading-snug text-zinc-500">{t.note}</div>
        </div>
      ))}
    </div>
  );
}

export function TilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[104px] animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
      ))}
    </div>
  );
}
