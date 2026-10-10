export type EventRow = {
  id: string;
  ts: string;
  run_id: string;
  advisory_id: string;
  repo: string;
  step: string;
  status: string;
  latency_ms: number;
  detail: Record<string, unknown>;
};

export type Stats = {
  matched: number;
  notInRange: number;
  exposed: number;
  suppressed: number;
  unconfirmed: number;
  verified: number;
  needsHuman: number;
  prs: number;
  guardrails: number;
  advisoriesSeen: number;
  detectionToPr: { lastMs: number | null; avgMs: number | null };
  lastPoll: { at: string; status: string; listed: number | null; fresh: number | null } | null;
};

export type RunSummary = {
  runId: string;
  advisoryId: string;
  startedAt: string;
  outcome: string;
  prUrl: string | null;
};
