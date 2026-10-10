import assert from "node:assert/strict";
import { test } from "node:test";

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
