import { resolve } from "node:path";

const env = (key, fallback = "") => process.env[key] || fallback;

export const config = {
  databaseUrl: env("DATABASE_URL"),
  // Any OpenAI-compatible chat endpoint. On Vercel the deployment's OIDC token authenticates
  // to AI Gateway, so no key needs to be stored.
  llm: {
    apiKey: env("LLM_API_KEY") || env("AI_GATEWAY_API_KEY") || env("VERCEL_OIDC_TOKEN"),
    baseUrl: env("LLM_BASE_URL", "https://ai-gateway.vercel.sh/v1"),
    model: env("LLM_MODEL", "openai/gpt-oss-120b"),
  },
  github: {
    token: env("GITHUB_TOKEN"),
    repo: env("GITHUB_REPO"),
  },
  demoAppPath: resolve(env("DEMO_APP_PATH", "../jingang-demo-app")),
  rulesDir: resolve(env("JINGANG_RULES_DIR", "rules")),
  outDir: resolve(env("JINGANG_OUT_DIR", "out")),
};

// Environment for processes that run third-party code: npm install, the demo app's tests,
// Semgrep. Only what a toolchain needs to start is passed; every credential is left out.
const CHILD_ENV_KEYS = ["PATH", "HOME", "USER", "TMPDIR", "TEMP", "TMP", "LANG", "TERM", "SystemRoot", "ComSpec", "PATHEXT", "APPDATA", "LOCALAPPDATA"];
export function childEnv() {
  return Object.fromEntries(CHILD_ENV_KEYS.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
}

// A missing credential degrades one step instead of blocking the loop. A real PR needs
// both the repository and a token scoped to it.
export const mode = {
  llm: config.llm.apiKey ? "live" : "mock",
  github: config.github.repo && config.github.token ? "live" : "dry",
};
