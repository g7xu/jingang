import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("a secrets file is read into config and deleted before anything else runs", () => {
  const file = join(mkdtempSync(join(tmpdir(), "jingang-secrets-")), "secrets.json");
  writeFileSync(file, JSON.stringify({ DATABASE_URL: "postgres://runner:pw@db/x", GITHUB_TOKEN: "github_pat_file", GITHUB_REPO: "o/r" }));
  const out = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", `const m = await import(${JSON.stringify(new URL("../src/env.js", import.meta.url).href)}); console.log(JSON.stringify({ db: m.config.databaseUrl, token: m.config.github.token, github: m.mode.github }));`],
    { env: { PATH: process.env.PATH, JINGANG_SECRETS_FILE: file }, encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(out), { db: "postgres://runner:pw@db/x", token: "github_pat_file", github: "live" });
  assert.equal(existsSync(file), false);
});

test("child processes get the toolchain basics and no credential", async () => {
  Object.assign(process.env, {
    DATABASE_URL: "postgres://user:secret@db/x",
    LLM_API_KEY: "sk-test",
    GITHUB_TOKEN: "github_pat_test",
    VERCEL_OIDC_TOKEN: "oidc-test",
    AI_GATEWAY_API_KEY: "gw-test",
  });
  const { childEnv } = await import("../src/env.js");
  const env = childEnv();
  assert.ok(env.PATH, "PATH is passed so npm and semgrep can start");
  for (const secret of ["DATABASE_URL", "LLM_API_KEY", "GITHUB_TOKEN", "VERCEL_OIDC_TOKEN", "AI_GATEWAY_API_KEY", "GITHUB_REPO"]) {
    assert.equal(env[secret], undefined, secret);
  }
  assert.ok(!Object.values(env).some((v) => /secret|sk-test|github_pat|oidc-test|gw-test/.test(v)));
});
