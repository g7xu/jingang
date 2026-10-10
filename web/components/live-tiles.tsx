import { connection } from "next/server";
import { getStats } from "@/lib/queries";
import { TileGrid } from "./tiles";

export async function LiveTiles() {
  await connection();
  const stats = await getStats().catch(() => null);
  if (!stats) return <p className="text-sm text-zinc-500">Live numbers are unavailable right now.</p>;
  const poll = stats.lastPoll;
  return (
    <div className="space-y-2">
      <TileGrid stats={stats} />
      <p className="text-xs text-zinc-500">
        Counts are the newest result per advisory, straight from the event log.{" "}
        {poll && poll.status === "ok" && poll.listed !== null
          ? `The last feed poll read ${poll.listed} recently updated npm advisories, ${poll.fresh} of them new.`
          : null}
      </p>
    </div>
  );
}
