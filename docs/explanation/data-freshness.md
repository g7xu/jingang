# Data freshness

Stored rows are records of what happened, never the input to a run. These rules keep a run acting on current data.

- **The trigger carries an advisory ID, not an advisory.** The loop re-fetches that record from OSV at run start. The `advisories` table is a log of what the watcher saw.
- **An advisory row is replaced only by an equal or newer OSV edit.** OSV edits advisories after publication. The upsert in `ADVISORY_UPSERT` compares `modified`, which is the Postgres form of the `ReplacingMergeTree(modified)` table the PRD describes.
- **The match step reads `package-lock.json` from disk at run time.** The `lockfiles` table is a snapshot per scan, kept for blast radius ("which repos") and history.
- **The `deps` graph, when built, is a dated snapshot.** The loader writes its finish time to `events`; anything showing it says "graph as of <time>" rather than implying it is live.
- **Pass data forward instead of reading it back.** The website hands the sandbox a run id and an advisory id on the command line; the pipeline does not look up the request row it was started from. Neon has a single primary, so a read after a write does see it, but the run must not depend on another process having written first.

Status is never updated in place. `events` only receives inserts, and the `latest_status` view in `src/schema.sql` picks the newest row per advisory and step; every dashboard number is a count over that view.
