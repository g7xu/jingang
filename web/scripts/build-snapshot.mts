// Builds the sandbox snapshot that runs boot from: both repositories cloned, dependencies
// installed, Semgrep on the PATH. Run once after `vercel env pull`, then set the printed
// SANDBOX_SNAPSHOT_ID in the Vercel project. Rebuild when either package-lock.json changes.
//
//   node --env-file=.env.local scripts/build-snapshot.mts
import { Sandbox } from "@vercel/sandbox";
import { provision } from "../lib/runner.ts";

const started = Date.now();
const sandbox = await Sandbox.create({ timeout: 15 * 60_000, resources: { vcpus: 2 }, persistent: false });
try {
  await provision(sandbox);
} catch (err) {
  await sandbox.stop().catch(() => {});
  throw err;
}
// snapshot() stops the sandbox itself. Expiration 0 keeps it until deleted.
const snapshot = await sandbox.snapshot({ expiration: 0 });
console.log(`provisioned and snapshotted in ${Math.round((Date.now() - started) / 1000)} s`);
console.log(`SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);
