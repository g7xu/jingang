"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DemoAdvisory } from "@/lib/advisories";
import { RunView } from "./run-view";

const EXPECT_CLASS: Record<DemoAdvisory["expect"], string> = {
  Exposed: "text-rose-400",
  Suppressed: "text-emerald-400",
  Unconfirmed: "text-amber-300",
};

export function DemoConsole({ advisories }: { advisories: DemoAdvisory[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(advisories[0].id);
  const [runId, setRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [ownerKey, setOwnerKey] = useState("");

  // Opening the page also asks for a feed poll; the server ignores it if one ran recently.
  useEffect(() => {
    fetch("/api/watch", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1_000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const start = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(ownerKey ? { "X-Jingang-Secret": ownerKey } : {}) },
        body: JSON.stringify({ advisoryId: selected }),
      });
      const data = (await res.json()) as { runId?: string; mode?: string; error?: string; retryAfter?: number };
      if (res.status === 429 && data.retryAfter) {
        setCooldown(data.retryAfter);
        setMessage("Someone else just started a run. Each one uses free sandbox time, so runs are spaced out.");
      } else if (!res.ok || !data.runId) {
        setMessage(data.error ?? "The run could not start.");
      } else {
        setRunId(data.runId);
        if (data.mode === "live") setMessage("Owner run: this one opens a real pull request.");
      }
    } catch {
      setMessage("The run could not start.");
    } finally {
      setBusy(false);
    }
  };

  const onFinished = useCallback(() => router.refresh(), [router]);

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="mb-3 text-sm text-zinc-400">Pick a real lodash advisory. All four match the demo app&apos;s lodash 4.17.4.</legend>
        {advisories.map((a) => (
          <label
            key={a.id}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              selected === a.id ? "border-amber-400/70 bg-amber-400/5" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
            }`}
          >
            <input type="radio" name="advisory" value={a.id} checked={selected === a.id} onChange={() => setSelected(a.id)} className="sr-only" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs text-zinc-400">{a.id}</span>
              <span className={`text-xs font-medium ${EXPECT_CLASS[a.expect]}`}>expect {a.expect}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-zinc-100">{a.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{a.why}</p>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={busy || cooldown > 0}
          className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Starting…" : cooldown > 0 ? `Next run in ${cooldown}s` : "Run the loop"}
        </button>
        <span className="text-xs text-zinc-500">Runs in a fresh Vercel Sandbox: about 30 to 90 seconds. Visitor runs never open a real PR.</span>
      </div>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      {runId ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Run <span className="font-mono text-zinc-300">{runId}</span>
            </span>
            <a href={`/runs/${runId}`} className="text-amber-300 hover:underline">
              Permalink
            </a>
          </div>
          <RunView key={runId} runId={runId} onFinished={onFinished} />
        </section>
      ) : null}

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer select-none">Owner key</summary>
        <input
          type="password"
          value={ownerKey}
          onChange={(e) => setOwnerKey(e.target.value)}
          placeholder="RUN_SECRET"
          autoComplete="off"
          className="mt-2 w-72 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-zinc-200 outline-none focus:border-amber-400/60"
        />
        <p className="mt-1">With the right key, a run skips the cooldown and opens a real pull request on the demo repository.</p>
      </details>
    </div>
  );
}
