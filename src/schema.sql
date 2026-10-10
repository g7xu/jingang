CREATE TABLE IF NOT EXISTS advisories (
    id           text PRIMARY KEY,
    aliases      text[] NOT NULL DEFAULT '{}',
    package      text NOT NULL DEFAULT '',
    ecosystem    text NOT NULL DEFAULT 'npm',
    ranges       jsonb NOT NULL DEFAULT '[]',
    details      text NOT NULL DEFAULT '',
    refs         text[] NOT NULL DEFAULT '{}',
    fix_commits  text[] NOT NULL DEFAULT '{}',
    modified     timestamptz NOT NULL,
    detected_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lockfiles (
    repo        text NOT NULL,
    commit_sha  text NOT NULL DEFAULT '',
    package     text NOT NULL,
    version     text NOT NULL,
    ts          timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS lockfiles_repo_package_ts ON lockfiles (repo, package, ts);

-- Append-only: a status change is a new row, never an UPDATE.
CREATE TABLE IF NOT EXISTS events (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts           timestamptz NOT NULL DEFAULT clock_timestamp(),
    run_id       text NOT NULL,
    advisory_id  text NOT NULL,
    repo         text NOT NULL DEFAULT '',
    step         text NOT NULL,
    status       text NOT NULL,
    latency_ms   integer NOT NULL DEFAULT 0,
    detail       jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS events_run ON events (run_id, ts);
CREATE INDEX IF NOT EXISTS events_latest ON events (advisory_id, step, ts DESC);
CREATE INDEX IF NOT EXISTS events_step_ts ON events (step, ts DESC);

CREATE TABLE IF NOT EXISTS guardrails (
    id              text PRIMARY KEY,
    advisory_id     text NOT NULL,
    kind            text NOT NULL,
    package         text NOT NULL,
    affected_range  text NOT NULL DEFAULT '',
    rule_yaml       text NOT NULL DEFAULT '',
    validated       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- The one definition of "current status": the newest event per (advisory, step).
-- Intake rows (run_id 'watch') say an advisory arrived, not how a run ended.
CREATE OR REPLACE VIEW latest_status AS
SELECT DISTINCT ON (advisory_id, step)
       advisory_id, step, status, detail, run_id, ts
FROM events
WHERE run_id <> 'watch'
ORDER BY advisory_id, step, ts DESC, id DESC;
