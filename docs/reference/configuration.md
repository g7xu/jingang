# Configuration

All settings are environment variables. The pipeline reads `.env` (copy `.env.example`); the website reads its Vercel project's environment, and `vercel env pull` brings those values down for local development. Only names are committed.

## Pipeline (`src/`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | none | Postgres connection string. Neon in production; `postgres://postgres:jingang@localhost:5433/jingang` for the local Docker container. |
| `LLM_BASE_URL` | no | `https://ai-gateway.vercel.sh/v1` | Any OpenAI-compatible chat endpoint. |
| `LLM_API_KEY` | no | empty | Key for that endpoint. When empty, `AI_GATEWAY_API_KEY` and then `VERCEL_OIDC_TOKEN` are tried; with none of the three, the PR explanation uses the fact-based template. |
| `LLM_MODEL` | no | `openai/gpt-oss-120b` | Model id the endpoint lists under `/v1/models`. |
| `GITHUB_TOKEN` | no | empty | Fine-grained token scoped to the demo repo only: Contents and Pull requests read/write. Also raises the GitHub Advisory API limit from 60 to 5,000 requests an hour. |
| `GITHUB_REPO` | no | empty | `owner/name` of the demo repo. A real PR opens only when this and `GITHUB_TOKEN` are both set; otherwise the PR step is dry and the body is stored in the `pr` event. |
| `DEMO_APP_PATH` | yes | `../jingang-demo-app` | Local clone of the demo app the loop reads, upgrades and commits in. |
| `JINGANG_RULES_DIR` | no | `rules` | Directory of hand-written Semgrep rules. |
| `JINGANG_OUT_DIR` | no | `out` | Scratch output: PR bodies and materialised guardrail rules. |

## Website (`web/`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | none | Set by the Neon integration in the Vercel Marketplace. The website reads with it. |
| `RUNNER_DATABASE_URL` | no | `DATABASE_URL` | Connection URL for the `jingang_runner` role, which sandbox runs use. Created by `npm run schema -- --runner-role=<file>`, which writes the URL to that file. |
| `AI_GATEWAY_API_KEY` | no | empty | AI Gateway key passed into the sandbox for the PR explanation. Empty means the template. The deployment's own OIDC token never enters a sandbox. |
| `NEXT_PUBLIC_VIDEO_URL` | no | empty | YouTube or Loom link for the demo video. Empty shows a placeholder. |
| `RUN_SECRET` | yes, for live PRs | empty | Value of the `X-Jingang-Secret` header that turns a run into a real PR. Without it every run is dry. |
| `CRON_SECRET` | yes, for the cron | empty | Vercel sends it as a bearer token to the daily watch route. |
| `GITHUB_TOKEN`, `GITHUB_REPO` | for live PRs | empty | Passed into the sandbox only on owner runs. |
| `SANDBOX_SNAPSHOT_ID` | no | empty | Snapshot with Semgrep and dependencies preinstalled. Empty installs them on every run, about a minute slower. |
| `JINGANG_GIT_URL` | no | `https://github.com/g7xu/jingang.git` | Repository the sandbox clones to get the pipeline. |
| `JINGANG_GIT_REF` | no | `main` | Branch of that repository to run. Set it on Preview to test a branch before merging. |
| `DEMO_APP_GIT_URL` | no | `https://github.com/g7xu/jingang-demo-app.git` | Demo app the sandbox clones and patches. |
| `JINGANG_RUNNER` | no | `sandbox` | `local` runs the pipeline as a child process of the dev server instead of in a sandbox. Development only. |

Inside a run, `npm install`, the demo app's tests and Semgrep get only `PATH`, `HOME` and similar basics; no credential reaches third-party code.
