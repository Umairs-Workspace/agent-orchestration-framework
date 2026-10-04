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
//
//   node scripts/test-sharded.mjs [--jobs N] [--split-seconds S] [--unit-timeout-min M] [--strict] [--no-lanes] [--plan]
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runnerShapedExports, suiteCaseChunks } from "./test-harness.mjs";
import { fileTimings, lostUnitFailure, registryRefusal, shardedExit, shardedReport } from "./test-sharded-report.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const at = argv.indexOf(name); return at < 0 ? fallback : Number(argv[at + 1]); };
const JOBS = option("--jobs", Math.max(2, Math.min(16, (os.availableParallelism?.() ?? os.cpus().length) - 4)));
const SPLIT_SECONDS = option("--split-seconds", 60);
const UNIT_TIMEOUT_MS = option("--unit-timeout-min", 20) * 60_000;
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
const plan = [];
for (const [file, positions] of units) {
  const key = rel(file);
  const seconds = timings[key]?.seconds ?? positions.length * 0.5;
  const chunks = suiteCaseChunks(positions, { independentCases: independent.has(file), seconds, splitSeconds: SPLIT_SECONDS });
  for (const slice of chunks) {
    plan.push({ key, file, positions: slice, chunked: chunks.length > 1, estimate: seconds * (slice.length / positions.length) });
  }
}
if (LANES) plan.push({ key: "lanes (integration + cargo)", lanes: true, positions: [], estimate: timings["lanes (integration + cargo)"]?.seconds ?? 300 });
plan.sort((a, b) => b.estimate - a.estimate);
if (argv.includes("--plan")) {
  console.log(`# plan: ${plan.length} units; the heaviest ${Math.min(10, plan.length)} (estimate from recorded timings):`);
  for (const unit of plan.slice(0, 10)) console.log(`  ${unit.estimate.toFixed(0).padStart(5)}s  ${unit.positions.length || "-"} cases  ${unit.key}${unit.chunked ? " (chunk)" : ""}`);
  process.exit(0);
}

// 3. THE POOL.
function runUnit(unit, label) {
  return new Promise((resolve) => {
    const home = mkdtempSync(path.join(os.tmpdir(), "aof-shard-home-"));
    const args = unit.lanes ? [path.join(repo, "scripts", "test.mjs"), "--lanes-only"] : [path.join(repo, "scripts", "test-shard.mjs"), unit.file, unit.positions.join(",")];
    const begun = Date.now();
    const child = spawn(process.execPath, args, { cwd: repo, windowsHide: true, env: { ...process.env, AOF_GLOBAL_HOME: home } });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    const timer = setTimeout(() => { output += `\nnot ok - ${unit.key} killed after ${UNIT_TIMEOUT_MS / 60000} min\n`; child.kill(); }, UNIT_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      try { rmSync(home, { recursive: true, force: true }); } catch { /* best-effort */ }
      const executed = Number(/^# executed (\d+) cases/m.exec(output)?.[1] ?? -1);
      const failed = [...output.matchAll(/^not ok - (.*)$/gm)].map((match) => match[1]);
      const lost = !unit.lanes && executed !== unit.positions.length;
      const ok = code === 0 && failed.length === 0 && !lost;
      if (lost) failed.push(lostUnitFailure(unit.key, executed, unit.positions.length));
      const result = { unit, ok, code, seconds: (Date.now() - begun) / 1000, executed, failed, output };
      writeFileSync(path.join(outDir, `${label}.log`), output);
      resolve(result);
    });
  });
}
const results = [];
let next = 0, done = 0;
async function worker() {
  while (next < plan.length) {
    const unit = plan[next++];
    const result = await runUnit(unit, `u${String(plan.indexOf(unit)).padStart(4, "0")}`);
    results.push(result);
    done += 1;
    if (!result.ok || result.seconds > 30) console.log(`[${done}/${plan.length}] ${result.ok ? "ok  " : "FAIL"} ${result.seconds.toFixed(0).padStart(4)}s ${unit.key}${unit.chunked ? ` (chunk of ${unit.positions.length})` : ""}`);
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, plan.length) }, worker));

// 4. ONE ALONE-RETRY for each failed unit, after the pool has drained (so it runs without the load).
const failedUnits = results.filter((result) => !result.ok);
const flakes = [], failures = [];
for (const result of failedUnits) {
  const retry = await runUnit(result.unit, `retry-${results.indexOf(result)}`);
  (retry.ok ? flakes : failures).push({ first: result, retry });
}

// 5. TIMINGS for the next schedule, and the report.
const perFile = fileTimings(results);
for (const target of [timingsPath, mainTimingsPath].filter(Boolean)) {
  try { mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, JSON.stringify(perFile, null, 1)); } catch { /* best-effort */ }
}
// A unit that failed in the pool counts what its alone-retry executed: the retry ran exactly that unit's cases again.
const retried = new Map([...flakes, ...failures].map(({ first, retry }) => [first, retry]));
const executed = results.filter((result) => !result.unit.lanes).reduce((sum, result) => sum + Math.max(0, (retried.get(result) ?? result).executed), 0);
const verdict = { failures, flakes, executed, registered: tests.length, strict: STRICT };
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
process.exit(shardedExit(verdict));
