import Link from "next/link";
import { Suspense } from "react";
import { HowItWorks } from "@/components/how-it-works";
import { LiveTiles } from "@/components/live-tiles";
import { Showcase } from "@/components/showcase";
import { TilesSkeleton } from "@/components/tiles";
import { Video } from "@/components/video";
import { LINKS } from "@/lib/links";

const COMPARISON = [
  ["Trigger", "A version matches an advisory", "A version matches and the code calls the vulnerable function"],
  ["Alerts on the demo app", "10, one per lodash advisory", "1 exposed, 2 suppressed, 1 left unconfirmed"],
  ["Upgrade target", "First fixed version", "Newest version outside every known advisory, transitive copies forced"],
  ["Proof the fix works", "CI, if you have it", "Lockfile outside every range and npm test, before the PR opens"],
  ["After the merge", "Nothing", "Version policy and a Semgrep taint rule that fail any PR reintroducing the call"],
];

const STACK = [
  ["Vercel", "Hosts this site, and runs each scan in a fresh Sandbox microVM with Node, Python and Semgrep."],
  ["Neon Postgres", "Every step is one append-only row; each number on this page is a count over a view of the newest rows."],
  ["Semgrep", "A reachability rule finds the call; a taint rule finds request data flowing into it, on any version."],
  ["AI Gateway", "gpt-oss-120b writes the two-sentence explanation. Facts come from data, and text that invents any is rejected."],
];

const CAVEATS = [
  "The rules are hand-written and tested on fixtures. Generating them from fix commits was designed but not built.",
  "The demo replays real advisories on demand; the live poller checks the real feed daily and when someone opens the demo.",
  "Detection to PR is measured from our watcher, not from the advisory's publication.",
  "Reachable means the code calls the function, and the taint rule adds “with request data”. Neither proves an exploit.",
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-24 px-5 pt-16">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-300/80">An agent that guards the gate</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Dependabot tells you a library is old. Jingang tells you <span className="text-amber-300">line 12</span> calls it with user input,
          ships the fix, and blocks anyone from writing line 12 again.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          Jingang (金刚, the guardian statues at temple gates) watches npm security advisories, checks whether your code actually reaches the
          vulnerable function, opens a verified upgrade pull request, and leaves two guardrails behind.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo" className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300">
            Run it live
          </Link>
          <a href="#video" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium hover:border-zinc-500">
            Watch the 3-minute demo
          </a>
          <a href={LINKS.repo} target="_blank" rel="noopener noreferrer" className="rounded-lg px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-100">
            Source on GitHub →
          </a>
        </div>
      </section>

      <section id="video" className="scroll-mt-20">
        <Video />
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Most alerts are noise</h2>
        <p className="max-w-3xl leading-relaxed text-zinc-400">
          The <a href={LINKS.demoRepo} className="text-amber-300 hover:underline">demo app</a> pins lodash 4.17.4. Ten real advisories match that
          version, but the app calls only <code className="font-mono text-amber-200">_.merge</code>, at{" "}
          <a href={LINKS.demoApp} className="text-amber-300 hover:underline">app.js line 12</a>, with the request body. One advisory is a real
          problem. A version scanner raises all ten.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium" />
                <th className="px-4 py-3 font-medium">Version scanner</th>
                <th className="px-4 py-3 font-medium text-amber-300">Jingang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {COMPARISON.map(([what, them, us]) => (
                <tr key={what}>
                  <td className="px-4 py-3 text-zinc-500">{what}</td>
                  <td className="px-4 py-3 text-zinc-400">{them}</td>
                  <td className="px-4 py-3 text-zinc-200">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 space-y-6">
        <h2 className="text-2xl font-semibold">How one advisory becomes a pull request</h2>
        <Suspense fallback={<HowItWorks rows={{}} />}>
          <Showcase />
        </Suspense>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Live numbers</h2>
          <Link href="/demo" className="text-sm text-amber-300 hover:underline">
            Add a run →
          </Link>
        </div>
        <Suspense fallback={<TilesSkeleton />}>
          <LiveTiles />
        </Suspense>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a href={LINKS.fixPr} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-600">
          <div className="text-xs uppercase tracking-widest text-emerald-400">Opened by the agent</div>
          <div className="mt-2 text-lg font-medium">The fix pull request</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            lodash 4.17.4 → 4.18.1, the call site, request data reaching it, tests passing, and the taint rule added to the repo.
          </p>
        </a>
        <a href={LINKS.regressionPr} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-600">
          <div className="text-xs uppercase tracking-widest text-rose-400">Blocked by the guardrail</div>
          <div className="mt-2 text-lg font-medium">The regression pull request</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            A new endpoint merges request data again. The Semgrep check fails it before review: nobody writes line 12 again.
          </p>
        </a>
      </section>

      <section className="grid gap-12 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Under the hood</h2>
          <dl className="space-y-4">
            {STACK.map(([name, what]) => (
              <div key={name}>
                <dt className="font-medium text-zinc-200">{name}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-400">{what}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-zinc-600">
            At the hackathon the same loop ran on ClickHouse Cloud and AkashML; every service here is on a free tier.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Honest caveats</h2>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-zinc-400">
            {CAVEATS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
