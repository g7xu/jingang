import { copyFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { insert, rows } from "./db.js";
import { installedVersions } from "./match.js";
import { isAffected } from "./osv.js";

// Rule files the fix PR carries into the demo repo. The CI workflow that runs them
// (deploy/demo-app-guardrails.yml) is seeded by hand: a token without the workflow
// scope cannot push anything under .github/workflows, and the agent's token must not have it.
export async function writeGuardrailFiles(repoPath, taintRules) {
  const semgrepDir = join(repoPath, ".semgrep");
  await mkdir(semgrepDir, { recursive: true });
  const written = [];
  for (const rule of taintRules) {
    const target = join(semgrepDir, basename(rule.file));
    await copyFile(rule.file, target);
    written.push(`.semgrep/${basename(rule.file)}`);
  }
  return written;
}

export async function storeGuardrails({ advisoryId, pkg, ranges, taintRules }) {
  const candidates = [
    {
      id: `${advisoryId}-version-policy`,
      advisory_id: advisoryId,
      kind: "version_policy",
      package: pkg,
      affected_range: JSON.stringify(ranges),
      rule_yaml: "",
      validated: true,
    },
    ...taintRules.map((r) => ({
      id: r.id,
      advisory_id: advisoryId,
      kind: "taint_rule",
      package: pkg,
      affected_range: "",
      rule_yaml: r.yaml,
      validated: true,
    })),
  ];
  const inserted = await insert("guardrails", candidates, { onConflict: "(id) DO NOTHING", returning: "id" });
  const stored = new Set(inserted.map((r) => r.id));
  return { stored: [...stored], alreadyPresent: candidates.map((c) => c.id).filter((id) => !stored.has(id)) };
}

// Guardrail A at scan time: any stored range the lockfile has drifted back into.
export async function versionPolicyViolations(repoPath, pkg) {
  const policies = await rows(
    "SELECT id, advisory_id, affected_range FROM guardrails WHERE kind = 'version_policy' AND package = $1",
    [pkg],
  );
  if (policies.length === 0) return [];
  const installed = await installedVersions(repoPath, pkg);
  return policies
    .map((p) => ({ ...p, hits: installed.filter((i) => isAffected(i.version, JSON.parse(p.affected_range))) }))
    .filter((p) => p.hits.length > 0);
}
