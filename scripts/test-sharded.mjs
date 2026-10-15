// THE SHARDED WHOLE-TREE RUN. `scripts/test.mjs` runs every registered case one after another in one process;
// on this repository that is ~11,500 cases and an hour or more, and a long serial run on a busy machine also
// manufactures the load flakes that force the next round (backlog: the-whole-tree-run-signs-off-in-minutes).
// This runs the SAME registered cases across worker processes:
//
//   - The registry is still the one answer. Every case `scripts/test.mjs` assembles is mapped back to the file
//     that exports it BY IDENTITY, and the run refuses to start if any case is unassigned or assigned twice -
//     a sharded run that loses a case is a failure, never a pass.
//   - Every case still runs through `runCases` (via `scripts/test-shard.mjs`), with its own isolated global home.
//   - The integration and cargo lanes run exactly once, through `scripts/test.mjs --lanes-only`.
//   - Units are scheduled longest-first from the timings the previous run recorded (`.tmp/test-timings.json`).
//     A suite file is ATOMIC: its cases run in one process, in order, because cases in a file may share a fixture
//     (one case creates the item the next promotes) and a chunk that starts mid-file cannot recreate that setup.
//     Only a file that declares `export const independentCases = true` - every case builds its own state and
//     passes alone, in any order - is split into case chunks once it took longer than --split-seconds.
//   - A failed unit is re-run ONCE, alone, after the pool drains. Red again = a failure. Green alone = a test that is
//     not isolated, logged by name as `# not isolated - <case>` and not a failure; --strict makes it fail the run.
//   - The report text and the exit decision are `scripts/test-sharded-report.mjs`'s, a pure module (144).
//   - The pool is `scripts/test-sharded-pool.mjs`'s (160/04): it stops when this process's stdin pipe ends —
//     the gate ending it on a stop, or the parent dying — killing every in-flight unit, and a stopped run exits
//     non-zero whatever its units answered.
//
//   - Before the pool starts it builds ONE bundle of the CLI from the release's recipe (160/ADR-008), and every
//     unit's child `aof` loads it through AOF_TEST_CLI_BUNDLE. A failed build costs speed, not correctness: the
//     units run the source, and the run says `# cli bundle unavailable: <reason>`.
//
//   - At its budget (`--budget-min B`, 160/ADR-006 §2) the run stops: every in-flight unit is killed and reported
//     `# not finished - <unit>`, the queue left is `# not started: <n> units`, and the run exits non-zero. A unit killed
//     at `--unit-timeout-min` is not finished too, never a `not ok` line, and gets no alone-retry.
//
//   - Whole files estimated under --pack-seconds (15) are packed, largest first, into units of about
//     --pack-target-seconds (60) (160/ADR-010): one process, but its timings, lost cases and not-finished lines
//     still name each file.
//
//   node scripts/test-sharded.mjs [--jobs N] [--split-seconds S] [--pack-seconds P] [--pack-target-seconds T] [--unit-timeout-min M] [--budget-min B] [--strict] [--no-lanes] [--plan]
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fileEstimate, packUnits, planCoverageProblem, planSummary, runnerShapedExports, shardArgs, suiteCaseChunks } from "./test-harness.mjs";
import { fileTimings, registryRefusal, shardedExit, shardedReport } from "./test-sharded-report.mjs";
import { poolExit, runPool, stdinIsPipe } from "./test-sharded-pool.mjs";
import { buildTestCliBundle, cliBundleNotice, withTestCliBundle } from "./build-sea.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const at = argv.indexOf(name); return at < 0 ? fallback : Number(argv[at + 1]); };
const JOBS = option("--jobs", Math.max(2, Math.min(16, (os.availableParallelism?.() ?? os.cpus().length) - 4)));
const SPLIT_SECONDS = option("--split-seconds", 60);
const PACK_SECONDS = option("--pack-seconds", 15);
const PACK_TARGET_SECONDS = option("--pack-target-seconds", 60);
const UNIT_TIMEOUT_MS = option("--unit-timeout-min", 20) * 60_000;
const BUDGET_MS = argv.includes("--budget-min") ? option("--budget-min", null) * 60_000 : null;
const STRICT = argv.includes("--strict");
const LANES = !argv.includes("--no-lanes");
const slash = (value) => value.replaceAll("\\", "/");
const rel = (file) => slash(path.relative(repo, file));
const started = Date.now();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(repo, ".tmp", "test-sharded", stamp);
mkdirSync(outDir, { recursive: true });
// A TAP version line first, so a green run - which prints no result line at all - still reads as TAP to `aof test`
// (and so to the regression gate) rather than as a report it cannot read.
console.log("TAP version 13");
const timingsPath = path.join(repo, ".tmp", "test-timings.json");
// A gate runs from a fresh detached worktree, which has no `.tmp/` history: without timings the slow files run unsplit
// and the run's floor is its heaviest file. So timings are also read from, and written back to, the main checkout.
const mainTimingsPath = (() => {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: repo, encoding: "utf8", windowsHide: true }).trim();
    const main = path.join(path.dirname(common), ".tmp", "test-timings.json");
    return path.resolve(main) === path.resolve(timingsPath) ? null : main;
  } catch { return null; }
})();

// 1. THE REGISTRY, and every registered case mapped to the file that exports it.
const { tests } = await import(pathToFileURL(path.join(repo, "scripts", "test.mjs")).href);
const registered = new Set(tests);
const indexFiles = [];
const suiteFiles = [];
const importsOf = (file) => [...readFileSync(file, "utf8").matchAll(/^\s*import\s+\{[^}]*\}\s+from\s+"([^"]+)";/gm)].map((match) => path.resolve(path.dirname(file), match[1]));
for (const target of importsOf(path.join(repo, "scripts", "test.mjs"))) if (path.basename(target) === "index.mjs") indexFiles.push(target);
for (const index of indexFiles) for (const target of importsOf(index)) if (target.endsWith(".mjs") && !suiteFiles.includes(target)) suiteFiles.push(target);
const assignment = new Map(); // case object -> { file, position }
const units = new Map(); // file -> positions[]
const independent = new Set(); // files that declare their cases independent, so they may be chunked
for (const file of suiteFiles) {
  const module = await import(pathToFileURL(file).href);
  if (module.independentCases === true) independent.add(file);
  runnerShapedExports(module).flat().forEach((entry, position) => {
    if (!registered.has(entry) || assignment.has(entry)) return;
    assignment.set(entry, { file, position });
    (units.get(file) ?? units.set(file, []).get(file)).push(position);
  });
}
const unassigned = tests.filter((entry) => !assignment.has(entry));
const duplicates = tests.length - registered.size;
if (unassigned.length || duplicates) {
  console.error(registryRefusal({ unassigned: unassigned.length, duplicates }));
  for (const entry of unassigned.slice(0, 20)) console.error(`  unassigned: ${entry.name}`);
  process.exit(1);
}
console.log(`# sharded: ${tests.length} registered cases from ${units.size} files (${independent.size} chunkable), ${JOBS} workers`);

// 2. WORK UNITS, longest first; a file is one unit unless it declares independentCases (then a slow one is chunked).
const timingsSource = [timingsPath, mainTimingsPath].find((candidate) => candidate && existsSync(candidate));
const timings = timingsSource ? JSON.parse(readFileSync(timingsSource, "utf8")) : {};
const filePlan = [];
for (const [file, positions] of units) {
  const key = rel(file);
  const seconds = fileEstimate(timings, key, positions.length);
  const chunks = suiteCaseChunks(positions, { independentCases: independent.has(file), seconds, splitSeconds: SPLIT_SECONDS });
  for (const slice of chunks) {
    filePlan.push({ key, file, positions: slice, chunked: chunks.length > 1, estimate: seconds * (slice.length / positions.length) });
  }
}
// SHORT FILES SHARE A UNIT (160/ADR-010): a whole file estimated under --pack-seconds packs with others into a
// unit of about --pack-target-seconds, so the run starts about a thousand fewer processes. The packed plan must
// still run every registered case exactly once, or the run refuses before any unit starts.
const plan = packUnits(filePlan, { packSeconds: PACK_SECONDS, targetSeconds: PACK_TARGET_SECONDS });
const coverage = planCoverageProblem(plan, units);
if (coverage != null) {
  console.error(coverage);
  process.exit(1);
}
// THE INTEGRATION LANE IS SHARDED BY FEATURE (2026-10-13). Run as one unit its ~350 scenarios
// took ~25 min serially and became the run's long pole. Each feature is independent (a temp
// project and global home per scenario), so each runs as its own unit, in-process exactly as
// `scripts/test.mjs` embeds it; the remaining `--lanes-only` unit selects no feature and runs cargo.
if (LANES) {
  const integrationDir = path.join(repo, "test", "integration");
  const { discoverFeatureFiles } = await import(pathToFileURL(path.join(integrationDir, "support", "feature-runner.mjs")).href);
  for (const feature of await discoverFeatureFiles(integrationDir)) {
    const name = path.basename(feature, ".feature");
    const key = `integration ${name}`;
    plan.push({ key, lanes: true, positions: [], args: [path.join(integrationDir, "cli.mjs"), name], env: { AOF_IN_PROCESS_INTEGRATION: "1" }, estimate: timings[key]?.seconds ?? 120 });
  }
  plan.push({ key: "lanes (cargo)", lanes: true, positions: [], env: { AOF_INTEGRATION_FEATURES: "" }, estimate: timings["lanes (cargo)"]?.seconds ?? 30 });
}
plan.sort((a, b) => b.estimate - a.estimate);
if (argv.includes("--plan")) {
  console.log(planSummary(plan));
  console.log(`# the heaviest ${Math.min(10, plan.length)} (estimate from recorded timings):`);
  for (const unit of plan.slice(0, 10)) console.log(`  ${unit.estimate.toFixed(0).padStart(5)}s  ${unit.positions.length || "-"} cases  ${unit.key}${unit.chunked ? " (chunk)" : ""}`);
  process.exit(0);
}

// 3. THE CLI BUNDLE, built once, before the first unit starts (160/ADR-008 §2). Into this run's own directory, so
// a second run in the same checkout never rewrites a bundle this run's children are loading; removed at the end.
const cliBundleDir = path.join(outDir, "cli-bundle");
const cliBundle = await buildTestCliBundle(cliBundleDir);
const cliBundleLine = cliBundleNotice(cliBundle);
if (cliBundleLine) console.log(cliBundleLine);

// 4. THE POOL, and 5. ONE ALONE-RETRY for each failed unit after it drains — both the pool module's.
function spawnUnit(unit) {
  const home = mkdtempSync(path.join(os.tmpdir(), "aof-shard-home-"));
  const args = unit.args ?? (unit.lanes ? [path.join(repo, "scripts", "test.mjs"), "--lanes-only"] : [path.join(repo, "scripts", "test-shard.mjs"), ...shardArgs(unit)]);
  const env = withTestCliBundle({ ...process.env, ...(unit.env ?? {}) }, cliBundle);
  const child = spawn(process.execPath, args, { cwd: repo, windowsHide: true, env: { ...env, AOF_GLOBAL_HOME: home } });
  return { child, release: () => rmSync(home, { recursive: true, force: true }) };
}
const pool = await runPool(plan, {
  jobs: JOBS,
  spawnUnit,
  stdin: stdinIsPipe() ? process.stdin : null,
  unitTimeoutMs: UNIT_TIMEOUT_MS,
  budgetMs: BUDGET_MS,
  writeLog: (label, output) => writeFileSync(path.join(outDir, `${label}.log`), output),
  onResult: (result, done, total) => {
    if (!result.ok || result.seconds > 30) console.log(`[${done}/${total}] ${result.ok ? "ok  " : "FAIL"} ${result.seconds.toFixed(0).padStart(4)}s ${result.unit.key}${result.unit.chunked ? ` (chunk of ${result.unit.positions.length})` : ""}`);
  },
});
rmSync(cliBundleDir, { recursive: true, force: true });
const { results, flakes, failures, notFinished, notStarted } = pool;
if (pool.stopped) console.log(`# stopped - ${pool.stoppedBy === "budget" ? `the ${BUDGET_MS / 60_000}-minute budget passed` : "stdin ended"}`);

// 6. TIMINGS for the next schedule, and the report.
const perFile = fileTimings(results);
// A stopped run's killed units would teach the next schedule a duration they never had.
for (const target of pool.stopped ? [] : [timingsPath, mainTimingsPath].filter(Boolean)) {
  try { mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(perFile, null, 1)); } catch { /* best-effort */ }
}
// A unit that failed in the pool counts what its alone-retry executed: the retry ran exactly that unit's cases again.
const retried = new Map([...flakes, ...failures].map(({ first, retry }) => [first, retry]));
const executed = results.filter((result) => !result.unit.lanes).reduce((sum, result) => sum + Math.max(0, (retried.get(result) ?? result).executed), 0);
const verdict = { failures, flakes, executed, registered: tests.length, strict: STRICT, notFinished, notStarted };
const report = shardedReport({
  ...verdict,
  stamp,
  units: results.length,
  wallSeconds: (Date.now() - started) / 1000,
  summedSeconds: results.reduce((sum, result) => sum + result.seconds, 0),
  jobs: JOBS,
  perFile,
  logs: rel(outDir),
});
writeFileSync(path.join(outDir, "SUMMARY.txt"), report.join("\n") + "\n");
console.log(report.join("\n"));
process.exit(poolExit(pool, shardedExit(verdict)));
