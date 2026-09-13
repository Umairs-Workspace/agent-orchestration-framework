// THE AUDIT'S CHILD PROGRAM — milestone 59 / story 01, ADR-002 §3 and ADR-003 §4.
//
// The census needs one fact it cannot get by reading text: WHAT THE RUNNER ASSEMBLED. A
// runner registers its suites by import + spread, so the only honest answer is the array
// the runner exports — and obtaining it means evaluating the runner's module graph, which
// for this repository is 880 test modules.
//
// 66/ADR-004 §2 forbids doing that inside the aof process ("importing executes its module
// scope"), so it is done HERE, in a child, reached through `src/work-audit/spawn.mjs`'s
// bounded seam and never by import.
//
// ── WHY THIS FILE IS NOT UNDER `src/work-audit/` ─────────────────────────────────────────
//
// FF-5904 freezes that directory: no module under it holds a dynamic `import()`, a
// `require`, or a static import of a path outside `src/`. This program's whole job is a
// dynamic import of a path outside `src/`, so putting it inside the family would either
// break the freeze or force the freeze to grow an exemption — and an exemption is how a
// structural rule becomes a convention. It lives beside the family instead, as a PROGRAM
// the family spawns rather than a module the family loads. Nothing under `src/work-audit/`
// imports it; the gate asserts that.
//
// CONTRACT (stdout, one line of JSON, so a truncated read is detectable rather than
// silently partial):
//
//   node src/work/audit-probe.mjs <runner-path>
//     → {"ok":true,"runner":"<abs>","names":["…"],"count":N}
//     → {"ok":false,"runner":"<abs>","error":"…"}          exit 1
//
// A runner is expected to EXPORT its assembled array and to run it only when it is the
// entry point (`scripts/test.mjs` already does exactly this, and says so at its foot). A
// runner that does not export one is reported as such — never guessed at, and never
// approximated from its source text.
import path from "node:path";
import { pathToFileURL } from "node:url";

const EXPORTED_ARRAY_KEYS = ["tests", "default"];

function isRunnerShaped(value) {
  return Array.isArray(value) && value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string");
}

function assembledFrom(module) {
  for (const key of EXPORTED_ARRAY_KEYS) {
    if (isRunnerShaped(module?.[key])) return module[key];
  }
  for (const value of Object.values(module ?? {})) {
    if (isRunnerShaped(value)) return value;
  }
  return null;
}

async function main() {
  const target = process.argv[2];
  if (typeof target !== "string" || target.length === 0) {
    process.stdout.write(`${JSON.stringify({ ok: false, runner: null, error: "no runner path was given — usage: node src/work/audit-probe.mjs <runner-path>" })}\n`);
    process.exitCode = 1;
    return;
  }
  const runner = path.resolve(target);
  let module;
  try {
    module = await import(pathToFileURL(runner).href);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, runner, error: `the runner could not be evaluated: ${error?.message ?? String(error)}` })}\n`);
    process.exitCode = 1;
    return;
  }
  const assembled = assembledFrom(module);
  if (assembled == null) {
    process.stdout.write(`${JSON.stringify({ ok: false, runner, error: "the runner exports no assembled array of { name } entries — registration cannot be decided by membership against a runner that does not publish what it assembles" })}\n`);
    process.exitCode = 1;
    return;
  }
  const names = assembled.map((entry) => String(entry.name));
  process.stdout.write(`${JSON.stringify({ ok: true, runner, names, count: names.length })}\n`);
}

await main();
