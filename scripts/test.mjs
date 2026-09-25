import path from "node:path";
import { pathToFileURL } from "node:url";
// THE SUITE REGISTRY — it names DIRECTORIES, not suites (119/03, ADR-010 §1).
//
// It used to carry one import and one spread per suite: 1,033 of each, in 5,192 lines, growing by
// two lines every time anybody wrote a test.  That is the shape TECH_DEBT item 63 is about, and it
// is why 26 suites carrying 117 entries could stay dead for a month — a file imported and not
// spread looked exactly like the 1,032 around it.  Now each directory under `test/` owns an
// `index.mjs` that names its own members, and this file spreads those.  A new suite is registered
// in its own directory's index; THIS FILE IS UNCHANGED BY ITS ARRIVAL.
//
// WHAT DID NOT CHANGE, and must not: `registrationDecision` (`src/work-audit/census.mjs`) is still
// the single decider of which file contributed which entries (ADR-010 §3).  An index is an INPUT
// to that decision, never a second answer to it: no index derives its membership by `readdir`, no
// directory carries two indexes, and no directory's suites are spread by another's index.
// FF-11906 asserts each of those, and `59/FF-5903` and `72/FF-7203` are untouched in claim —
// they read the assembled array and the files on disk, and both are what they were.
//
// The per-suite rationale that used to sit above each import moved WITH the suite, into its own
// directory's index — the same move 119/02 made for `src/command-core.mjs`, for the same reason.
import { tests as archAssignmentTests } from "../test/arch/assignment/index.mjs";
import { tests as archAuditTests } from "../test/arch/audit/index.mjs";
import { tests as archBundleTests } from "../test/arch/bundle/index.mjs";
import { tests as archCommandTests } from "../test/arch/command/index.mjs";
import { tests as archDiagramsTests } from "../test/arch/diagrams/index.mjs";
import { tests as archExamplesTests } from "../test/arch/examples/index.mjs";
import { tests as archGradeTests } from "../test/arch/grade/index.mjs";
import { tests as archGraphTests } from "../test/arch/graph/index.mjs";
import { tests as archLoopTests } from "../test/arch/loop/index.mjs";
import { tests as archMemoryTests } from "../test/arch/memory/index.mjs";
import { tests as archMeshTests } from "../test/arch/mesh/index.mjs";
import { tests as archNotionTests } from "../test/arch/notion/index.mjs";
import { tests as archPlanningTests } from "../test/arch/planning/index.mjs";
import { tests as archRunTests } from "../test/arch/run/index.mjs";
import { tests as archSessionTests } from "../test/arch/session/index.mjs";
import { tests as archStoreTests } from "../test/arch/store/index.mjs";
import { tests as archTestingTests } from "../test/arch/testing/index.mjs";
import { tests as archUiTests } from "../test/arch/ui/index.mjs";
import { tests as archWorkTests } from "../test/arch/work/index.mjs";
import { tests as assignmentTests } from "../test/assignment/index.mjs";
import { tests as auditTests } from "../test/audit/index.mjs";
import { tests as bundleTests } from "../test/bundle/index.mjs";
import { tests as commandTests } from "../test/command/index.mjs";
import { tests as diagramsTests } from "../test/diagrams/index.mjs";
import { tests as examplesTests } from "../test/examples/index.mjs";
import { tests as gradeTests } from "../test/grade/index.mjs";
import { tests as graphTests } from "../test/graph/index.mjs";
import { tests as loopTests } from "../test/loop/index.mjs";
import { tests as memoryTests } from "../test/memory/index.mjs";
import { tests as meshTests } from "../test/mesh/index.mjs";
import { tests as meshAssignmentTests } from "../test/mesh/assignment/index.mjs";
import { tests as meshCloneTests } from "../test/mesh/clone/index.mjs";
import { tests as meshDesktopTests } from "../test/mesh/desktop/index.mjs";
import { tests as meshEnrollmentTests } from "../test/mesh/enrollment/index.mjs";
import { tests as meshFleetTests } from "../test/mesh/fleet/index.mjs";
import { tests as meshIdentityTests } from "../test/mesh/identity/index.mjs";
import { tests as meshLauncherTests } from "../test/mesh/launcher/index.mjs";
import { tests as meshPresenceTests } from "../test/mesh/presence/index.mjs";
import { tests as meshRegistryTests } from "../test/mesh/registry/index.mjs";
import { tests as meshRelayTests } from "../test/mesh/relay/index.mjs";
import { tests as meshSessionTests } from "../test/mesh/session/index.mjs";
import { tests as meshTerminalTests } from "../test/mesh/terminal/index.mjs";
import { tests as meshUiTests } from "../test/mesh/ui/index.mjs";
import { tests as meshWorkerTests } from "../test/mesh/worker/index.mjs";
import { tests as notionTests } from "../test/notion/index.mjs";
import { tests as notifyTests } from "../test/notify/index.mjs";
import { tests as planningTests } from "../test/planning/index.mjs";
import { tests as runTests } from "../test/run/index.mjs";
import { tests as sessionTests } from "../test/session/index.mjs";
import { tests as storeTests } from "../test/store/index.mjs";
import { tests as testingTests } from "../test/testing/index.mjs";
import { tests as uiTests } from "../test/ui/index.mjs";
import { tests as workTests } from "../test/work/index.mjs";
import { tests as workGateTests } from "../test/work/gate/index.mjs";
import { tests as workLifecycleTests } from "../test/work/lifecycle/index.mjs";
import { tests as workRecordTests } from "../test/work/record/index.mjs";
import { tests as workStreamTests } from "../test/work/stream/index.mjs";

export const tests = [
  ...archAssignmentTests,
  ...archAuditTests,
  ...archBundleTests,
  ...archCommandTests,
  ...archDiagramsTests,
  ...archExamplesTests,
  ...archGradeTests,
  ...archGraphTests,
  ...archLoopTests,
  ...archMemoryTests,
  ...archMeshTests,
  ...archNotionTests,
  ...archPlanningTests,
  ...archRunTests,
  ...archSessionTests,
  ...archStoreTests,
  ...archTestingTests,
  ...archUiTests,
  ...archWorkTests,
  ...assignmentTests,
  ...auditTests,
  ...bundleTests,
  ...commandTests,
  ...diagramsTests,
  ...examplesTests,
  ...gradeTests,
  ...graphTests,
  ...loopTests,
  ...memoryTests,
  ...meshTests,
  ...meshAssignmentTests,
  ...meshCloneTests,
  ...meshDesktopTests,
  ...meshEnrollmentTests,
  ...meshFleetTests,
  ...meshIdentityTests,
  ...meshLauncherTests,
  ...meshPresenceTests,
  ...meshRegistryTests,
  ...meshRelayTests,
  ...meshSessionTests,
  ...meshTerminalTests,
  ...meshUiTests,
  ...meshWorkerTests,
  ...notionTests,
  ...notifyTests,
  ...planningTests,
  ...runTests,
  ...sessionTests,
  ...storeTests,
  ...testingTests,
  ...uiTests,
  ...workTests,
  ...workGateTests,
  ...workLifecycleTests,
  ...workRecordTests,
  ...workStreamTests
];

// Run the suite ONLY when this module is the entry point. The
// acd-roundtrip-registration meta-test imports the assembled `tests` array above
// to verify every arch-test is registered; that import must NOT re-run the suite.
async function runSuite(tests, { lanes = true } = {}) {
  let failures = 0;

  // Per-test hermetic global AOF home (34/story 00) — see scripts/test-unit.mjs for the
  // rationale: the node identity is machine-wide now, so each test gets its OWN empty
  // global home to stop identity/global-store state leaking across tests (or onto the real
  // machine). The integration lane below keeps process.env untouched afterward.
  //
  // Rooted under ~/.aof-test (never ~/.aof, the real machine's global home) — a fixed,
  // dedicated, gitignored test root, not raw OS tmpdir, so stray test fixtures are
  // trivially auditable/wipeable in one place instead of scattered across the OS temp dir.
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { rmSync } = await import("node:fs");
  const ghRoot = join(homedir(), ".aof-test", `gh-${process.pid}`);
  let ghIndex = 0;

  console.log("# unit");
  for (const { name, run } of tests) {
    const prevHome = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);
    try {
      await run();
      console.log(`ok - ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok - ${name}`);
      console.error(error.stack ?? error.message);
    } finally {
      if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;
      else process.env.AOF_GLOBAL_HOME = prevHome;
    }
  }
  try { rmSync(ghRoot, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }

  // A SELECTED RUN STOPS HERE. The integration, cargo and shell lanes are the whole-suite
  // lanes; a selection of unit suites is not a reason to compile a Rust crate, and the gate is
  // an early return rather than a wrapped block so none of them is re-indented.
  if (!lanes) return failures;

  console.log("# integration");
  const previousInProcess = process.env.AOF_IN_PROCESS_INTEGRATION;
  process.env.AOF_IN_PROCESS_INTEGRATION = "1";
  await import("../test/integration/cli.mjs");

  if (previousInProcess === undefined) {
    delete process.env.AOF_IN_PROCESS_INTEGRATION;
  } else {
    process.env.AOF_IN_PROCESS_INTEGRATION = previousInProcess;
  }

  // milestone 36 / story 00 — the guard-if-present cargo lane for the app/desktop/ Rust core.
  // Shells `cargo test` when the Rust toolchain AND the crate are both present; a clean, explicit
  // skip otherwise (mirroring the guard-if-present arch-test ethos) so the suite stays green pre-build
  // and becomes a real gate the moment the crate lands. Folds cargo's exit code into `failures`.
  console.log("# cargo (app/desktop)");
  {
    const { spawnSync } = await import("node:child_process");
    const { existsSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const cargoManifest = fileURLToPath(new URL("../app/desktop/Cargo.toml", import.meta.url));
    const hasCargo = spawnSync("cargo", ["--version"], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
    if (hasCargo && existsSync(cargoManifest)) {
      const result = spawnSync("cargo", ["test", "--manifest-path", cargoManifest], { stdio: "inherit", shell: process.platform === "win32" });
      if (result.status !== 0) failures += 1;
      console.log(result.status === 0 ? "ok - cargo test (app/desktop)" : "not ok - cargo test (app/desktop)");
    } else {
      console.log(`ok - cargo test (app/desktop) skipped (cargo=${hasCargo}, manifest=${existsSync(cargoManifest)})`);
    }

    // The Tauri shell (`crates/app`) is deliberately EXCLUDED from the workspace
    // `members` (see app/desktop/Cargo.toml) so `cargo test` above never pulls in
    // tauri/WebView2 — but that also means nothing compiles the shell, so a core API
    // change could silently break it while this suite stays green. `cargo check`
    // (not `build` — cheaper, still catches API drift) closes that gap, gated behind
    // the SAME guard-if-present shape as the lane above.
    const appManifest = fileURLToPath(new URL("../app/desktop/crates/app/Cargo.toml", import.meta.url));
    if (hasCargo && existsSync(appManifest)) {
      const shellResult = spawnSync("cargo", ["check", "--manifest-path", appManifest, "--quiet"], { stdio: "inherit", shell: process.platform === "win32" });
      if (shellResult.status !== 0) failures += 1;
      console.log(shellResult.status === 0 ? "ok - cargo check (app/desktop shell)" : "not ok - cargo check (app/desktop shell)");
    } else {
      console.log(`ok - cargo check (app/desktop shell) skipped (cargo=${hasCargo}, manifest=${existsSync(appManifest)})`);
    }
  }

  if (failures > 0 || process.exitCode) {
    process.exitCode = 1;
  }

  return failures;
}

// - THE SELECTION ARGV (milestone 72 / story 02 - 72/ADR-004 §1, §2, §3) --------------------
//
// aof's own runner is an ORDINARY CONSUMER of the project's `work.test` declaration, not a special
// case: `aof test` selects suite FILES and hands them to whatever program the project declared,
// and for this repository that program is this script. So it has to learn a selection argv exactly
// as any other project's runner would.
//
// THE OBVIOUS IMPLEMENTATION IS THE WRONG ONE. The exported array above is FLAT - an entry records
// its name and how to run it, and nothing records which file produced it - so selection cannot be
// a filter over that array, and an attempt to make it one ends in a second registry keyed by
// filename, which is the duplication this milestone exists to indict. Selection is a SEPARATE PATH
// that imports the named files and takes what they export.
//
// THE ARRAY IS LEFT COMPLETELY ALONE. Nothing below reads it, reorders it, restructures it or
// appends to it; it is read by the existing path and by nothing this change adds.
//
// AND THE SHAPE IS TIGHTENED against the audit probe's, deliberately. `src/work/audit-probe.mjs`
// tests only `typeof entry.name === "string"`, so it admits an entry with no callable `run` - and
// this path RUNS what it takes, so such an entry would throw inside the loop instead of being
// reported as an unusable file. Here `run` must be a function.
export const ONLY_FLAG = "--only";

// The files a selection names, or null when this argv is not a selection at all. THE SENTINEL IS
// REQUIRED and bare positionals are never treated as suite files - which is what makes the
// "importing the runner runs nothing, whatever the importing process's argv holds" row pass for a
// reason rather than by luck: the registration census's own child runs
// `node src/work/audit-probe.mjs <runner>`, whose argv carries the runner's path as a bare
// positional, and that child imports this module for its assembled array.
export function selectionArgv(argv) {
  const at = argv.indexOf(ONLY_FLAG);
  if (at < 0) return null;
  return argv.slice(at + 1).filter((token) => !token.startsWith("--"));
}

// Every runner-shaped array a module exports, deduped by identity. ALL of them rather than the
// first one found: a file exporting two registered arrays would otherwise contribute half its
// tests, and a selection that runs FEWER tests than the file registers is exactly the silent
// narrowing this milestone's invariant refuses.
export function runnerShapedExports(module) {
  const found = [];
  for (const value of Object.values(module ?? {})) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string" && typeof entry.run === "function")) continue;
    if (!found.includes(value)) found.push(value);
  }
  return found;
}

// Import each named file and take its tests. A file that is not on disk, that does not evaluate,
// or that exports nothing runner-shaped is UNUSABLE and is reported BY PATH - never dropped, and
// never left to contribute zero tests in silence, which would read as a green run.
export async function loadSelected(files) {
  const selected = [];
  const unusable = [];
  for (const file of files) {
    let module;
    try {
      module = await import(pathToFileURL(path.resolve(file)).href);
    } catch (error) {
      unusable.push({ file, reason: `could not be loaded: ${error?.message ?? String(error)}` });
      continue;
    }
    const found = runnerShapedExports(module);
    if (found.length === 0) {
      unusable.push({ file, reason: "exports no array of { name, run } entries, so there is nothing in it to run" });
      continue;
    }
    for (const array of found) selected.push(...array);
  }
  return { selected, unusable };
}

// The selected run, through THE SAME execution loop the full path calls. One loop, because a
// second copy of it is how the per-test global-home isolation, the `ok -`/`not ok -` printing and
// the failure count quietly stop applying to this path - and this repository has been bitten hard
// enough by a suite writing into the real global home to install a hook against it.
async function runSelection(files) {
  if (files.length === 0) {
    console.error(`not ok - ${ONLY_FLAG} names no suite file - pass one or more suite paths after it.`);
    process.exitCode = 1;
    return;
  }
  const { selected, unusable } = await loadSelected(files);
  for (const problem of unusable) console.error(`not ok - ${problem.file} ${problem.reason}`);
  const failures = await runSuite(selected, { lanes: false });
  if (failures > 0 || unusable.length > 0 || process.exitCode) {
    process.exitCode = 1;
  }
}

// Invoke WITHOUT a blocking top-level await: the acd-roundtrip-registration
// meta-test resolves the assembled suite by `import()`-ing this module, and a
// pending top-level await here would deadlock that import. Letting runSuite()
// run on its own keeps the event loop alive until it settles and sets the exit
// code, while the module's evaluation completes immediately for importers.
//
// THE SELECTION IS DISPATCHED INSIDE THIS GUARD, never beside the parse. A top-level dispatch
// would run inside every importer - including the census's probe child - and that is 8,401
// registered cases executed inside what was meant to be a read.
const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const only = selectionArgv(process.argv.slice(2));
  const body = only == null ? runSuite(tests) : runSelection(only);
  body.catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
