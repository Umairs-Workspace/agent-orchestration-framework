// scripts/test-rubric.mjs — THE RUNNER THIS PROJECT DECLARES TO `work.rubric`.
//
// WHY THIS FILE EXISTS. `work.rubric` declared `["node", "scripts/test.mjs"]` with no `env`
// and no ref scoping (69/06's declaration; 54/03 review finding D5). `work:grade --run`
// inherits the ambient environment and adds only the re-entrancy stamp — exactly as
// `54/ADR-004` §2 rules, because *the hazards are the PROJECT's to declare* — so on this
// control node `aof work loop <ref>` would, after every completed build, spawn the WHOLE
// suite with no `AOF_GLOBAL_HOME`. This repository's own `CLAUDE.md` writes down two hazards
// that declaration honoured neither of:
//
//   (1) "Never run aof tests without `AOF_GLOBAL_HOME=$(mktemp -d)` — unisolated runs write
//       fixtures into the real `~/.aof` (config AND mesh stores) and pollute the live soak."
//       `scripts/test.mjs` rotates a per-test home for its UNIT lane, but its INTEGRATION
//       lane runs on the ambient one, and a module-level singleton bound at import time
//       (e.g. `src/degrade.mjs`'s sink) binds before any rotation happens.
//   (2) "Never run the full suite on this machine — `global-work-propagation.test.mjs` binds
//       `:4182`, which the live control daemon holds." Confirmed at source: that suite calls
//       `startLauncher` (`src/mesh/launcher.mjs`), whose `DEFAULT_CONTROL_SERVICE_PORT` is
//       4182. Fifteen registered suites start the launcher, so a name deny-list would drift
//       the moment a sixteenth arrives.
//
// WHAT IT RUNS, AND WHY THAT SCOPE. `54/ADR-004` §3 (`verify.md:85-92`): *"a story runs its
// own scenarios plus the fitness functions; the full suite runs ONCE at the milestone gate;
// never silently widen to everything."* The old declaration silently widened to everything.
// This runner is the FITNESS TIER — every arch-test the assembled suite registers — which is
// the invariant set every story must keep green, is enumerated FROM DISK rather than from a
// curated list (so it cannot drift), and was measured on this control node as binding no
// port and minting nothing outside its own throwaway homes.
//
// The integration and cargo lanes are deliberately absent: the integration lane is the one
// that runs on the ambient global home, and the milestone gate is where the whole suite
// belongs.
//
// TAP is emitted because `work.rubric.report.format` declares `tap` and `src/work/grade.mjs`
// normalises it. Nothing is emitted as `# SKIP`: a skipped case is not evidence
// (`54/ADR-005` §2c as amended), and a lane this runner does not run is not a case it
// observed — so it is ABSENT from the report rather than reported as a skip it did not take.
// The declared `report.floor` is what makes a truncated or filtered run fail rather than pass
// vacuously.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";

// (1) THE ISOLATION IS TAKEN BEFORE ANY aof MODULE IS LOADED, not hoped for. A throwaway
// global home is minted here and exported into this process's own environment, so every
// module-level singleton that binds a path at import time binds it inside the throwaway.
// Rooted under `~/.aof-test` (gitignored, auditable, never `~/.aof`) exactly as
// `scripts/test.mjs` roots its per-test rotation.
const testRoot = join(homedir(), ".aof-test");
const ambientHome = process.env.AOF_GLOBAL_HOME;
let ownedHome = null;
if (ambientHome == null || ambientHome.length === 0 || ambientHome === join(homedir(), ".aof")) {
  try {
    ownedHome = mkdtempSync(join(testRoot, "rubric-"));
  } catch {
    // The root does not exist yet on a fresh checkout — mint it and retry once.
    const { mkdirSync } = await import("node:fs");
    mkdirSync(testRoot, { recursive: true });
    ownedHome = mkdtempSync(join(testRoot, "rubric-"));
  }
  process.env.AOF_GLOBAL_HOME = ownedHome;
}

// The assembled suite is imported for its REGISTRATION only — `scripts/test.mjs` runs itself
// solely when it is the entry point, which `acd-roundtrip-registration` already relies on.
const { tests } = await import(new URL("./test.mjs", import.meta.url).href);

// (2) THE LANE IS THE FITNESS TIER, ENUMERATED FROM DISK. Every module under `test/arch/`
// is imported and every `{ name, run }` it exports is collected; the assembled suite is then
// filtered to those names, IN THE RUNNER'S OWN REGISTRATION ORDER. A new arch-test joins by
// existing, and a suite that binds a port joins no list here because it is not an arch-test.
//
// THE SWEEP IS RECURSIVE, BECAUSE THE FITNESS TIER HAS AN INTERIOR. It was a flat `readdir`
// when this runner was written and every arch-test sat directly under `test/arch/`. Commit
// b088825c gave the tree an interior and moved all 442 of them one level down into family
// folders (`test/arch/work/`, `test/arch/planning/`, …), updating this file's comment paths
// and not its enumeration — after which the flat sweep matched no `.test.mjs` at all, the
// lane resolved to zero, and `work:grade` could not go green. It failed LOUDLY rather than
// emitting a vacuously empty report, which is exactly what the guard below is for and the
// only reason the move did not bank a silently green fitness gate.
//
// `recursive` returns entries relative to the root and separated by the PLATFORM's separator,
// so they are forward-slashed before being resolved against a `file:` URL — the win32 path
// this sweep actually runs on is the one that would otherwise carry backslashes.
const archDir = new URL("../test/arch/", import.meta.url);
const { readdir } = await import("node:fs/promises");
const archNames = new Set();
const archModules = (await readdir(archDir, { recursive: true }))
  .map((entry) => entry.replaceAll("\\", "/"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();
for (const file of archModules) {
  const mod = await import(new URL(file, archDir).href);
  for (const exported of Object.values(mod)) {
    if (!Array.isArray(exported)) continue;
    for (const entry of exported) {
      if (entry != null && typeof entry.name === "string" && typeof entry.run === "function") archNames.add(entry.name);
    }
  }
}
const lane = tests.filter((test) => archNames.has(test.name));

// EVERY SWEEP REPORTS WHAT IT READ. A filter that matched nothing must fail loudly rather
// than emit an empty, vacuously green report — which is the milestone's own thesis. The
// diagnostic names the three numbers that separate the ways this can happen: a sweep that
// read no module, a sweep that read modules registering no entry, and a lane whose names
// met the assembled suite nowhere.
if (lane.length === 0) {
  const swept = `${archModules.length} module(s) under test/arch/, ${archNames.size} registered name(s), 0 matched by the assembled suite`;
  process.stdout.write(`TAP version 13\nnot ok 1 - the fitness lane resolved to zero tests\n  ---\n  error: ${JSON.stringify(swept)}\n  ...\n1..1\n`);
  process.exit(1);
}

const ghRoot = join(testRoot, `rubric-gh-${process.pid}`);
let ghIndex = 0;
let failures = 0;
const lines = ["TAP version 13"];
let ordinal = 0;
for (const { name, run } of lane) {
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);
  ordinal += 1;
  try {
    await run();
    lines.push(`ok ${ordinal} - ${name}`);
  } catch (error) {
    failures += 1;
    lines.push(`not ok ${ordinal} - ${name}`, "  ---", `  error: ${JSON.stringify(String(error?.message ?? error))}`, "  ...");
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
  }
}
lines.push(`1..${ordinal}`);
process.stdout.write(`${lines.join("\n")}\n`);

for (const path of [ghRoot, ownedHome]) {
  if (path == null) continue;
  try { rmSync(path, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
}
process.exit(failures > 0 ? 1 : 0);
