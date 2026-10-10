import { connection } from "next/server";
import { getShowcaseRun } from "@/lib/queries";
import { summarize } from "@/lib/steps";
import { HowItWorks, type ShowcaseRow } from "./how-it-works";

export async function Showcase() {
  await connection();
  const events = await getShowcaseRun().catch(() => []);
  const rows: Record<string, ShowcaseRow> = {};
  for (const e of events) rows[e.step] = { status: e.status, latencyMs: e.latency_ms, summary: summarize(e) };
  if (events.length) rows.watch = { status: "replay", latencyMs: 0, summary: `${events[0].advisory_id}, full record fetched from OSV` };
  return <HowItWorks rows={rows} />;
}
