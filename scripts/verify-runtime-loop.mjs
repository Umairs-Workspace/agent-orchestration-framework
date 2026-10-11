// Explicit local proof/preparation. This entry never launches an installed assistant.
import { defaultApplication as app } from "aof/default-application";
import { runRuntimeRegression, prepareLiveRuntimeFixture } from "../test/support/runtime-loop/fixture.mjs";

const argv = process.argv.slice(2);
let runtime = "both", prepare = false;
try {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--runtime") runtime = argv[++index];
    else if (argv[index] === "--prepare-live") prepare = true;
    else if (argv[index] !== "--json") throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!["claude", "codex", "both"].includes(runtime)) throw new Error("Usage: node scripts/verify-runtime-loop.mjs [--runtime claude|codex|both] [--prepare-live] [--json]");
  const runtimes = runtime === "both" ? ["claude", "codex"] : [runtime];
  const reports = [];
  for (const selected of runtimes) {
    if (prepare) reports.push(await prepareLiveRuntimeFixture(selected));
    else reports.push({ passing: await runRuntimeRegression(selected), boundedFailure: await runRuntimeRegression(selected, { failBuild: true }) });
  }
  console.log(JSON.stringify({ accepted: false, liveExecution: false, reports }, null, 2));
} catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
finally { await app.close(); }
