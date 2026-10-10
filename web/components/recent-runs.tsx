import Link from "next/link";
import { connection } from "next/server";
import { getRecentRuns } from "@/lib/queries";
import { tone, TONE_CLASS } from "@/lib/steps";

export async function RecentRuns() {
  await connection();
  const runs = await getRecentRuns().catch(() => []);
  if (runs.length === 0) return <p className="text-sm text-zinc-500">No runs yet.</p>;
  return (
    <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/40">
      {runs.map((r) => (
        <li key={r.runId}>
          <Link href={`/runs/${r.runId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm hover:bg-zinc-900">
            <span className="font-mono text-xs text-zinc-500">{r.runId}</span>
            <span className="font-mono text-xs text-zinc-300">{r.advisoryId}</span>
            <span className={`font-mono text-xs ${TONE_CLASS[tone(r.outcome)]}`}>{r.outcome}</span>
            {r.prUrl ? <span className="text-xs text-emerald-300">real PR</span> : null}
            <time className="ml-auto text-xs text-zinc-600" dateTime={r.startedAt}>
              {r.startedAt.slice(0, 16).replace("T", " ")} UTC
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
