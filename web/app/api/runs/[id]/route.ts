import { connection } from "next/server";
import { getRunEvents } from "@/lib/queries";
import { isFinished } from "@/lib/steps";

export async function GET(_req: Request, ctx: RouteContext<"/api/runs/[id]">) {
  await connection();
  const { id } = await ctx.params;
  if (!/^[\w-]{4,40}$/.test(id)) return Response.json({ error: "Bad run id" }, { status: 400 });
  const events = await getRunEvents(id);
  return Response.json({ events, finished: isFinished(events) }, { headers: { "Cache-Control": "no-store" } });
}
