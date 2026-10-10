export type DemoAdvisory = {
  id: string;
  title: string;
  expect: "Exposed" | "Suppressed" | "Unconfirmed";
  why: string;
};

// The only advisories a visitor may run. All four match the demo app's lodash 4.17.4.
export const DEMO_ADVISORIES: DemoAdvisory[] = [
  {
    id: "GHSA-fvqr-27wr-82fm",
    title: "Prototype pollution in merge, mergeWith, defaultsDeep",
    expect: "Exposed",
    why: "The demo app deep-merges request data with _.merge at app.js:12, so Jingang upgrades, verifies and writes the PR.",
  },
  {
    id: "GHSA-35jh-r3h4-6jhm",
    title: "Command injection through template",
    expect: "Suppressed",
    why: "The version matches, but nothing in the app calls _.template. Dependabot would still alert.",
  },
  {
    id: "GHSA-p6mc-m468-83gw",
    title: "Prototype pollution in zipObjectDeep",
    expect: "Suppressed",
    why: "The version matches, but nothing in the app calls _.zipObjectDeep.",
  },
  {
    id: "GHSA-xxjr-mmjv-4gpg",
    title: "Prototype pollution in unset and omit",
    expect: "Unconfirmed",
    why: "There is no hand-written rule for this one yet, so Jingang refuses to guess and opens nothing.",
  },
];

const GHSA_ID = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/;

export function isDemoAdvisory(id: string) {
  return DEMO_ADVISORIES.some((a) => a.id === id);
}

export function isGhsaId(id: string) {
  return GHSA_ID.test(id);
}
