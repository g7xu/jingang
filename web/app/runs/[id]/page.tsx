import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RunView } from "@/components/run-view";
import { getRunEvents } from "@/lib/queries";

async function Run({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[\w-]{4,40}$/.test(id)) notFound();
  const events = await getRunEvents(id);
  if (events.length === 0) notFound();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Run <span className="font-mono text-amber-300">{id}</span>
        <span className="ml-3 font-mono text-base font-normal text-zinc-400">{events[0].advisory_id}</span>
      </h1>
      <RunView runId={id} initialEvents={events} />
    </>
  );
}

export default function RunPage(props: PageProps<"/runs/[id]">) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 pt-12">
      <Link href="/demo" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Live demo
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />}>
        <Run params={props.params} />
      </Suspense>
    </main>
  );
}
