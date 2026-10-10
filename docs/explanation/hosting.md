# Hosting on free tiers

At the hackathon Jingang ran on a laptop against trial services: ClickHouse Cloud, AkashML credits, and a dashboard on `localhost`. The trials end, and nobody outside the room could watch it work. The hosted version keeps the pipeline unchanged and moves each piece to a service with a permanent free tier.

## Where each piece runs

| Piece | Hackathon | Hosted | Why |
| --- | --- | --- | --- |
| Event store | ClickHouse Cloud | Neon Postgres | Free plan needs no card and scales to zero after five idle minutes. The data is a few thousand rows, so ClickHouse's strengths do not matter here. |
| Model | AkashML | Vercel AI Gateway, `openai/gpt-oss-120b` | Monthly included credit, and the deployment's OIDC token authenticates, so no key is stored. |
| Website and API | `src/api.js` on a laptop | Next.js on Vercel Hobby | Free for personal projects. |
| A run | The laptop | A Vercel Sandbox microVM | A run needs Semgrep (Python), `npm install`, `npm test` and `git`, none of which a serverless function has. |
| Watcher | A 60-second loop in a terminal | Daily Vercel Cron, plus a poll when someone opens the demo page | Hobby cron runs at most once a day. |

The PRD's data model is written for ClickHouse. The mapping: `ReplacingMergeTree(modified)` on `advisories` becomes an upsert that only accepts an equal or newer `modified`; `argMax(status, ts)` becomes the `latest_status` view; append-only `events` stays append-only.

## The limits, and what a visitor sees at each

| Service | Free allowance | When it runs out |
| --- | --- | --- |
| Vercel Sandbox | 5 active-CPU hours, 420 GB-hours of memory, 5,000 creations a month | New sandboxes are refused until the 30-day window resets. The demo page shows "the free sandbox allowance is used up" and points at the video. |
| Vercel Functions | 4 active-CPU hours a month, 300 s per invocation | Functions pause. A run takes well under 300 s, so the duration limit is not the binding one. |
| Neon | 1 GB storage and 100 CU-hours per project | Compute suspends until the next period; the site shows "live numbers are unavailable". |
| AI Gateway | Monthly included credit, lower per-model rate limits | Requests fail with 402 or 429, and the PR explanation falls back to the fact-based template. Nothing else changes. |

Most of a run's wall-clock time is waiting on the network (OSV, the npm registry, the model), which costs no active CPU. Semgrep and `npm install` are the CPU-heavy parts; booting from a snapshot removes the installs.

## Why visitors only get dry runs

Every real run would open a pull request on the demo repository. A public button that does that lets anyone fill the repository with pull requests and spend the month's sandbox allowance in an afternoon. So a visitor's run does everything except the push: the PR body is stored in the `pr` event and rendered on the page. The owner's `RUN_SECRET` turns a run live, and only then does the GitHub token for the demo repository enter the sandbox.

A run also executes third-party code: `npm install` and the demo app's tests run whatever its dependencies contain. Those processes start with an environment stripped of every credential. The sandbox itself gets the narrowest credentials that work: the `jingang_runner` database role, which can read and append but not delete or drop, and an AI Gateway key rather than the deployment's own OIDC token, which could do far more than call a model.

Visitor runs are also spaced at least three minutes apart site-wide. The check and the insert happen under a Postgres advisory lock, so two simultaneous clicks cannot both pass.
