# AGENTS.md

Instructions for AI coding agents working in this repository. Humans: the same rules apply, but [README.md](README.md) is the better starting point.

## What this is

Jingang watches npm advisory feeds, confirms with Semgrep whether the demo app actually calls the vulnerable function, opens a verified upgrade PR, and stores two guardrails so the bug cannot return. It was built in one day at a hackathon (Oct 9, 2026) and now runs on free tiers: a website on Vercel, Postgres on Neon, the model through Vercel AI Gateway, and each run inside a Vercel Sandbox.

The spec is [docs/prd.md](docs/prd.md). Read its "The loop" and "Rules" sections before writing pipeline code; its data model names ClickHouse, which [docs/explanation/hosting.md](docs/explanation/hosting.md) maps to Postgres. Do not restate the PRD in code comments or new docs; link to it.

## Vocabulary

Use these words exactly, in code, dashboard labels, and PR text. They are defined in the PRD's "The loop" section:

`Matched`, `Exposed`, `Suppressed`, `Unconfirmed`, `Verified`, `Detection to PR`.

"Exposed" means the rule fired AND the lockfile version is inside the affected range. A rule hit alone is not exposure.

## Constraints that are easy to violate

- **`events` is append-only.** Insert a new row for every status; read current status through the `latest_status` view. Never `UPDATE` or `DELETE` an event.
- **Semver logic runs in Node**, with the `semver` package, never in SQL.
- **Model output is untrusted.** Generated rules run only after the fixture gate. Facts in a PR body (versions, file, line, advisory link) come from data; the model writes only the explanation around them, and `acceptableExplanation` rejects anything else.
- **Never push to `main`** of the demo repo. Every change there is a PR on a new branch.
- **Website visitors only ever get dry runs.** A real PR needs the `RUN_SECRET` header, and only those runs get `GITHUB_REPO`. Feed polls get the token alone, for the higher API limit.
- **Third-party code never sees a credential.** Anything that runs `npm`, the demo app's tests or Semgrep passes `childEnv()`, and the sandbox gets an AI Gateway key and the `jingang_runner` database role, never the deployment's OIDC token or owner database URL.
- **Secrets live in environment variables only.** `.env` is ignored; `.env.example` lists names. Adding a variable means adding it to `.env.example` and to [docs/reference/configuration.md](docs/reference/configuration.md).
- **The pipeline must run with only `DATABASE_URL` set.** A missing model credential means templated text; a missing GitHub token or repo means a dry PR.
- **Pass data forward, don't read it back.** See [docs/explanation/data-freshness.md](docs/explanation/data-freshness.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/` | The pipeline: watcher, the eight-step loop, Postgres access. Runs on a laptop or in a Vercel Sandbox. |
| `rules/` | Hand-written Semgrep rules and their fixtures, checked by `test/rules.test.js`. |
| `test/` | `node:test` unit tests; none of them need a database. |
| `web/` | The Next.js website and its API routes, deployed to Vercel with `web` as the root directory. |
| `deploy/` | Files seeded into the demo repo by hand, and the Akash manifest kept from the hackathon. |
| `docs/prd.md` | The hackathon spec. Edit only when the team doc changes. |
| `docs/reference/`, `docs/explanation/` | Lookup tables and design rationale. |

## Writing docs and comments

- The README is a landing page, under 150 lines. Reference material goes in `docs/reference/`, rationale in `docs/explanation/`.
- A comment must say something the adjacent code does not: units, invariants, the case deliberately not handled. Delete any comment a stranger could write by reading the line beside it.
- No transition words in comments ("now", "previously", "this fixes"). The history belongs in commit messages.
