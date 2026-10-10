import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoConsole } from "@/components/demo-console";
import { LiveTiles } from "@/components/live-tiles";
import { RecentRuns } from "@/components/recent-runs";
import { TilesSkeleton } from "@/components/tiles";
import { DEMO_ADVISORIES } from "@/lib/advisories";

export const metadata: Metadata = { title: "Live demo · Jingang" };

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-5 pt-12">
      <section className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Run the loop</h1>
        <p className="leading-relaxed text-zinc-400">
          Each run boots a clean sandbox, installs Semgrep, clones the demo app, and runs the same pipeline that ran on stage: match, rule,
          reachability, upgrade, verify, pull request, guardrails. Steps appear here as they are written to the database.
        </p>
      </section>

      <Suspense fallback={<TilesSkeleton />}>
        <LiveTiles />
      </Suspense>

      <DemoConsole advisories={DEMO_ADVISORIES} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent runs</h2>
        <Suspense fallback={<div className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />}>
          <RecentRuns />
        </Suspense>
      </section>
    </main>
  );
}
