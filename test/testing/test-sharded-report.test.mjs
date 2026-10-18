// Behavioural evidence for 144 — the sharded run's report and verdict (`scripts/test-sharded-report.mjs`).
//
//   tasks/01_a-lost-or-failing-case-is-red-and-a-case-that-is-not-isolated-is-logged.feature (the runner's half)
//   tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature (the slowest-files sums)
//
// The module is pure, so every row drives it with unit results shaped as the pool builds them, and no pool starts.
//
// …and 160/04 (the suite dies with its session): the pool, `scripts/test-sharded-pool.mjs`, driven with fake unit
// children, and once over real processes for a parent that dies.
// The gate's half of each scenario — what the row records from these lines — is `test/run/regression-gate.test.mjs`'s.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  failureLines,
  fileTimings,
  lostUnitFailure,
  notIsolatedLines,
  registryRefusal,
  shardedExit,
  shardedReport,
  slowestFiles,
} from "../../scripts/test-sharded-report.mjs";
import { poolExit, runPool, stdinIsPipe, unitResult as unitResultOf } from "../../scripts/test-sharded-pool.mjs";
import { fileEstimate, PACK_MAX_ARG_CHARS, packUnits, planCoverageProblem, planSummary, shardArgs, shardPlan } from "../../scripts/test-harness.mjs";
import { judgeShards, summaryMarkdown } from "../../scripts/test-ci-summary.mjs";
import { gateResult } from "@aof/work/regression-record";
import { createClaudeTrust } from "@aof/execution/claude-trust";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// 160/04 — a unit child that runs until it is killed, then closes with no exit code, as a killed process does.
function fakeUnitChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = () => {
    if (child.killed) return;
    child.killed = true;
    setImmediate(() => child.emit("close", null));
  };
  return child;
}

// Poll `check` until it answers true, or fail naming what never happened.
async function until(check, what, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) assert.fail(`timed out: ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// A pool result in the runner's own shape: the unit, its exit code, its seconds and the case names it failed.
const unitResult = (key, { failed = [], code = failed.length > 0 ? 1 : 0, seconds = 1, positions = [0] } = {}) =>
  ({ unit: { key, positions }, ok: failed.length === 0 && code === 0, code, seconds, executed: positions.length, failed });

// A unit red in the pool and red again alone, or red in the pool and green alone.
const failing = (key, names) => ({ first: unitResult(key, { failed: names }), retry: unitResult(key, { failed: names }) });
const notIsolated = (key, names) => ({ first: unitResult(key, { failed: names }), retry: unitResult(key) });

const report = (fields) => shardedReport({
  stamp: "2026-10-03T00-00-00-000Z",
  executed: 10,
  registered: 10,
  units: 4,
  wallSeconds: 60,
  summedSeconds: 240,
  jobs: 4,
  failures: [],
  flakes: [],
  perFile: {},
  logs: ".tmp/test-sharded/2026-10-03T00-00-00-000Z",
  ...fields,
});

export const testShardedReportTests = [
  {
    name: "144-01 a case red in the pool and red again alone is a column-0 not ok line, and the run exits 1",
    run: () => {
      const failures = [failing("test/loop/loop-command-wave.test.mjs", ["loop wave merges home"])];
      const lines = report({ failures });
      assert.ok(lines.includes("not ok - loop wave merges home"), "the case is a `not ok - <case>` line at column 0, which the TAP reader counts");
      assert.equal(shardedExit({ failures, flakes: [], executed: 10, registered: 10 }), 1);
      // A unit that failed without naming a case still names the unit, so a red run never reads as unexplained.
      assert.deepEqual(failureLines([{ retry: unitResult("test/x.test.mjs", { code: 1 }) }]), ["not ok - test/x.test.mjs: exited 1 with no failing case named"]);
    },
  },
  {
    name: "144-01 a case red in the pool and green alone is logged as not isolated, and the run exits 0",
    run: () => {
      const flakes = [notIsolated("test/fleet/boards.test.mjs", ["fleet boards branch deleted"])];
      const lines = report({ flakes });
      assert.ok(lines.includes("# not isolated - fleet boards branch deleted"), "one TAP comment line per case");
      assert.equal(lines.filter((line) => line.startsWith("not ok")).length, 0, "and no failure line, so neither reader counts it red");
      assert.equal(lines.some((line) => /flake|was red under load/.test(line)), false, "the old flake lines are gone");
      assert.equal(shardedExit({ failures: [], flakes, executed: 10, registered: 10 }), 0);
    },
  },
  {
    name: "144-01 the runner names every not-isolated case, in the order the pool reported them",
    run: () => {
      const flakes = [notIsolated("a.test.mjs", ["core workspace", "advertised paths"]), notIsolated("b.test.mjs", ["asset base seam"])];
      assert.deepEqual(notIsolatedLines(flakes), [
        "# not isolated - core workspace",
        "# not isolated - advertised paths",
        "# not isolated - asset base seam",
      ]);
    },
  },
  {
    name: "144-01 a run that cannot account for every registered case is red",
    run: () => {
      assert.equal(
        registryRefusal({ unassigned: 1, duplicates: 0 }),
        "not ok - the sharded run cannot account for the registry: 1 case(s) map to no suite file, 0 duplicate entries",
      );
      const lost = lostUnitFailure("test/loop/loop-command-wave.test.mjs", 3, 5);
      const failures = [{ first: unitResult("test/loop/loop-command-wave.test.mjs", { failed: [lost] }), retry: unitResult("test/loop/loop-command-wave.test.mjs", { failed: [lost] }) }];
      assert.ok(report({ failures }).includes("not ok - test/loop/loop-command-wave.test.mjs: executed 3 of 5 assigned cases"));
      assert.equal(shardedExit({ failures, flakes: [], executed: 8, registered: 10 }), 1);
      // Fewer cases executed than registered, with no failing unit to explain it, is a lost case and red too.
      assert.ok(report({ executed: 9 }).includes("not ok - executed 9 cases, the registry holds 10"));
      assert.equal(shardedExit({ failures: [], flakes: [], executed: 9, registered: 10 }), 1);
    },
  },
  {
    name: "144-01 --strict still makes a not-isolated case fail the run, and still logs it",
    run: () => {
      const flakes = [notIsolated("test/fleet/boards.test.mjs", ["fleet boards branch deleted"])];
      assert.equal(shardedExit({ failures: [], flakes, executed: 10, registered: 10, strict: true }), 1);
      assert.ok(report({ flakes }).includes("# not isolated - fleet boards branch deleted"));
    },
  },
  {
    name: "144-02 the slowest-files block sums each file's seconds across its chunks",
    run: () => {
      const key = "test/loop/loop-command-wave.test.mjs";
      const perFile = fileTimings([
        unitResult(key, { seconds: 300, positions: Array.from({ length: 23 }, (_, index) => index) }),
        unitResult(key, { seconds: 435, positions: Array.from({ length: 24 }, (_, index) => index + 23) }),
        unitResult("test/x.test.mjs", { seconds: 2 }),
      ]);
      assert.deepEqual(perFile[key], { seconds: 735, cases: 47 }, "the timings file records the summed seconds and cases");
      const block = slowestFiles(perFile);
      assert.equal(block[0], "# slowest files (seconds summed across their chunks):");
      assert.equal(block[1], `    735s  47 cases  ${key}`, "heaviest first, seconds then cases then file");
      const lines = report({ perFile });
      assert.ok(lines.indexOf(block[0]) >= 0 && lines.at(-1) === "# logs: .tmp/test-sharded/2026-10-03T00-00-00-000Z", "the report ends with the block and its logs line");
    },
  },
  // ── 160/04 · the suite dies with its session: the pool (`scripts/test-sharded-pool.mjs`) ─────────
  {
    name: "160/04 The pool stops when its stdin ends",
    run: async () => {
      const spawned = [];
      const stdin = new PassThrough();
      const plan = Array.from({ length: 5 }, (_, index) => ({ key: `unit-${index}`, positions: [0] }));
      const started = runPool(plan, {
        jobs: 2,
        stdin,
        unitTimeoutMs: 60_000,
        spawnUnit: (unit) => { const child = fakeUnitChild(); spawned.push({ unit, child }); return { child }; },
      });
      setTimeout(() => stdin.end(), 100);
      const pool = await started;
      assert.equal(pool.stopped, true);
      assert.deepEqual(spawned.map(({ unit }) => unit.key), ["unit-0", "unit-1"], "no further unit starts");
      assert.ok(spawned.every(({ child }) => child.killed), "both in-flight units are killed");
      assert.deepEqual(pool.killed.sort(), ["unit-0", "unit-1"], "the pool resolves with 2 stopped units…");
      assert.deepEqual(pool.notStarted, ["unit-2", "unit-3", "unit-4"], "…and 3 not started");
      assert.ok(pool.results.every((result) => result.stopped === true));
      assert.deepEqual([pool.flakes.length, pool.failures.length], [0, 0], "no alone-retry runs");
    },
  },
  {
    name: "160/04 The pool stops when its parent dies",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-pool-parent-"));
      const pids = path.join(dir, "pids.txt");
      const runner = path.join(dir, "runner.mjs");
      const parentScript = path.join(dir, "parent.cjs");
      const poolUrl = pathToFileURL(path.resolve(repoRoot, "scripts", "test-sharded-pool.mjs")).href;
      await writeFile(runner, [
        `import { runPool, stdinIsPipe } from ${JSON.stringify(poolUrl)};`,
        `import { spawn } from "node:child_process";`,
        `import { appendFileSync } from "node:fs";`,
        `const pids = ${JSON.stringify(pids)};`,
        `appendFileSync(pids, "runner " + process.pid + "\\n");`,
        `const plan = Array.from({ length: 3 }, (_, i) => ({ key: "u" + i, positions: [0] }));`,
        `const pool = await runPool(plan, { jobs: 2, stdin: stdinIsPipe() ? process.stdin : null, unitTimeoutMs: 120000, spawnUnit: () => {`,
        `  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 120000)"], { windowsHide: true });`,
        `  appendFileSync(pids, "unit " + child.pid + "\\n");`,
        `  return { child };`,
        `} });`,
        `appendFileSync(pids, "stopped " + pool.stopped + "\\n");`,
        `process.exit(pool.stopped ? 1 : 0);`,
      ].join("\n"), "utf8");
      // DETACHED, so the stdin pipe is the runner's only tie to its parent. On Windows libuv puts every
      // non-detached child in its parent's kill-on-close job, so a parent's death would kill the runner
      // before its stdin could end; detached, it is the POSIX case, where a parent's death kills no child.
      await writeFile(parentScript, [
        `const { spawn } = require("node:child_process");`,
        `spawn(process.execPath, [${JSON.stringify(runner)}], { stdio: ["pipe", "ignore", "ignore"], windowsHide: true, detached: true });`,
        `setInterval(() => {}, 60000);`,
      ].join("\n"), "utf8");
      const parent = spawn(process.execPath, [parentScript], { stdio: "ignore", windowsHide: true });
      const read = async () => (existsSync(pids) ? (await readFile(pids, "utf8")).split(/\r?\n/u).filter(Boolean) : []);
      const pidsOf = (lines, kind) => lines.filter((line) => line.startsWith(`${kind} `)).map((line) => Number(line.split(" ")[1]));
      const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
      try {
        await until(async () => pidsOf(await read(), "unit").length === 2, "the runner started its two workers");
        const lines = await read();
        const [runnerPid] = pidsOf(lines, "runner");
        const unitPids = pidsOf(lines, "unit");
        parent.kill("SIGKILL");
        await until(async () => !alive(runnerPid), "the runner exited once its stdin pipe closed");
        assert.ok((await read()).includes("stopped true"), "the runner's pool was stopped by its stdin");
        await until(async () => unitPids.every((pid) => !alive(pid)), `no unit process remains after the runner has exited: ${unitPids.filter(alive)}`);
        assert.equal(pidsOf(await read(), "unit").length, 2, "and no third unit was started");
      } finally {
        try { parent.kill("SIGKILL"); } catch { /* gone */ }
        for (const pid of pidsOf(await read(), "unit").concat(pidsOf(await read(), "runner"))) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
        await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
      }
    },
  },
  {
    name: "160/04 A stopped run never reads as green",
    run: async () => {
      const stdin = new PassThrough();
      const started = runPool([{ key: "only", positions: [0] }], { jobs: 1, stdin, unitTimeoutMs: 60_000, spawnUnit: () => ({ child: fakeUnitChild() }) });
      setTimeout(() => stdin.end(), 20);
      const pool = await started;
      assert.deepEqual([pool.stopped, pool.failures.length, pool.flakes.length], [true, 0, 0], "a pool stopped by its stdin, with no failing case");
      assert.equal(poolExit(pool, shardedExit({ failures: [], flakes: [], executed: 1, registered: 1 })), 1, "the runner exits non-zero");
      assert.equal(poolExit({ stopped: false }, 0), 0, "an unstopped green run still exits 0");
    },
  },
  {
    name: "160/04 a terminal, the null device or a file is never watched as the pool's stdin",
    run: () => {
      const stat = (kind) => () => ({ isFIFO: () => kind === "fifo", isSocket: () => kind === "socket", isCharacterDevice: () => kind === "chr", isFile: () => kind === "file", isDirectory: () => false, isBlockDevice: () => false });
      assert.equal(stdinIsPipe({ isTTY: true }, stat("chr")), false, "a terminal");
      assert.equal(stdinIsPipe({}, stat("chr")), false, "the null device an agent's shell hands node");
      assert.equal(stdinIsPipe({}, stat("file")), false, "a file");
      assert.equal(stdinIsPipe({}, stat("fifo")), true, "a POSIX pipe");
      assert.equal(stdinIsPipe({}, stat("socket")), true, "a socket pair");
      assert.equal(stdinIsPipe({}, stat("windows-pipe")), true, "a Windows pipe, which reports none of the other kinds");
    },
  },
  // ── 160/05 · the budget, and a unit out of time is not finished (ADR-006 §2-§3) ──────────────────
  {
    name: "160/05 E3 · a killed unit is not retried alone",
    run: async () => {
      const spawned = [];
      const pool = await runPool([{ key: "slow", positions: [0] }], {
        jobs: 1,
        unitTimeoutMs: 30,
        spawnUnit: (unit) => { const child = fakeUnitChild(); spawned.push(unit.key); return { child }; },
      });
      assert.deepEqual(spawned, ["slow"], "no alone-retry of that unit runs");
      assert.deepEqual(pool.notFinished, ["slow"], "the unit killed at its time limit is not finished");
      assert.deepEqual([pool.failures.length, pool.flakes.length], [0, 0], "and is neither a failure nor a flake");
      assert.deepEqual(pool.results[0].failed, [], "a killed unit names no failure");
      assert.equal(poolExit(pool, 0), 1, "a run with a unit that did not finish never exits 0");
    },
  },
  {
    name: "160/05 E5 · a run that reaches the budget stops there",
    run: async () => {
      const spawned = [];
      const plan = Array.from({ length: 40 }, (_, index) => ({ key: `unit-${String(index).padStart(2, "0")}`, positions: [0] }));
      const pool = await runPool(plan, {
        jobs: 16,
        unitTimeoutMs: 60_000,
        budgetMs: 100,
        spawnUnit: (unit) => { const child = fakeUnitChild(); spawned.push({ unit, child }); return { child }; },
      });
      assert.equal(pool.stoppedBy, "budget");
      assert.equal(spawned.length, 16, "16 units were in flight and no queued one started");
      assert.ok(spawned.every(({ child }) => child.killed), "the 16 in-flight units are killed");
      assert.deepEqual(pool.notFinished.sort(), spawned.map(({ unit }) => unit.key).sort(), "…and reported not finished");
      assert.equal(pool.notStarted.length, 24);
      assert.deepEqual([pool.failures.length, pool.flakes.length], [0, 0], "no alone-retry runs");
      const lines = report({ executed: 0, notFinished: pool.notFinished, notStarted: pool.notStarted });
      for (const key of pool.notFinished) assert.ok(lines.includes(`# not finished - ${key}`), `# not finished - ${key}`);
      assert.ok(lines.includes("# not started: 24 units"), "the runner prints # not started: 24 units");
      assert.equal(lines.some((line) => line.startsWith("not ok")), false, "and no not ok line");
      assert.equal(poolExit(pool, shardedExit({ failures: [], flakes: [], executed: 0, registered: 40, notFinished: pool.notFinished, notStarted: pool.notStarted })), 1);
      assert.equal(gateResult({ failures: 0, notFinished: true, passed: false }), "not-finished", "and the row is not-finished");
    },
  },
  {
    // m160/F-01 — at the real budget one killed unit never closed: a process it had started outlived it and held
    // its output open, so the pool waited on `close` until the gate's own deadline killed the runner and the row
    // named no unit. A unit that has EXITED gets a bounded drain for its output, then the pool stops waiting.
    name: "160/05 F-01 · a killed unit whose descendant holds its output open still leaves the pool within the drain",
    run: async () => {
      const grandchild = "setTimeout(() => {}, 60000)";
      const unitScript = `const { spawn } = require("node:child_process");`
        + `const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { detached: true, stdio: ["ignore", "inherit", "inherit"] });`
        + `console.log("grandchild " + g.pid); setTimeout(() => {}, 60000);`;
      const pids = [];
      const begun = Date.now();
      const pool = await runPool([{ key: "holder", positions: [0] }], {
        jobs: 1,
        unitTimeoutMs: 60_000,
        budgetMs: 1_500,
        drainMs: 500,
        spawnUnit: () => {
          const child = spawn(process.execPath, ["-e", unitScript], { windowsHide: true });
          child.stdout.on("data", (chunk) => { for (const match of String(chunk).matchAll(/grandchild (\d+)/gu)) pids.push(Number(match[1])); });
          return { child };
        },
      });
      try {
        const seconds = (Date.now() - begun) / 1000;
        assert.equal(pool.stoppedBy, "budget");
        assert.deepEqual(pool.notFinished, ["holder"], "the killed unit is reported not finished");
        assert.ok(seconds < 15, `the pool resolved ${seconds.toFixed(1)} s after it started, not when the descendant let go of the output`);
      } finally {
        for (const pid of pids) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
      }
    },
  },

  // ── 160/09 · short files pack into one unit (ADR-010) ───────────────────────────────────────────
  {
    name: "160/09 [outline] A file packs or stands alone by its recorded time (5 rows)",
    run: () => {
      const options = { packSeconds: 15, targetSeconds: 60 };
      // Two short neighbours, so a file that packs has other short files to pack with.
      const neighbours = [fileUnit("n1", 5), fileUnit("n2", 5)];
      for (const [seconds, chunking, placement] of [
        [3, "does not declare independent cases", "packed"],
        [14.9, "does not declare independent cases", "packed"],
        [15, "does not declare independent cases", "own"],
        [120, "declares independent cases", "chunks"],
      ]) {
        const subject = chunking.startsWith("declares")
          ? [fileUnit("subject", 60, { positions: [0, 1, 2], chunked: true }), fileUnit("subject", 60, { positions: [3, 4, 5], chunked: true })]
          : [fileUnit("subject", seconds)];
        const plan = packUnits([...subject, ...neighbours], options);
        const holders = plan.filter((unit) => (unit.files ?? [unit]).some((entry) => entry.key === "test/subject.test.mjs"));
        if (placement === "packed") assert.ok(holders.length === 1 && holders[0].files?.length > 1, `${seconds} s: packed with other short files`);
        if (placement === "own") assert.ok(holders.length === 1 && holders[0].files == null, `${seconds} s: its own unit`);
        if (placement === "chunks") assert.ok(holders.length === 2 && holders.every((unit) => unit.files == null && unit.chunked), `${seconds} s: split into case chunks, none of them packed`);
      }
      // No recorded time: half a second a case, and packed only when that is under 15 seconds.
      assert.equal(fileEstimate({}, "test/subject.test.mjs", 10), 5);
      assert.equal(fileEstimate({ "test/subject.test.mjs": { seconds: 2 } }, "test/subject.test.mjs", 10), 2, "a recorded time wins");
      for (const [cases, packed] of [[10, true], [40, false]]) {
        const plan = packUnits([fileUnit("subject", fileEstimate({}, "test/subject.test.mjs", cases)), ...neighbours], options);
        const holder = plan.find((unit) => (unit.files ?? [unit]).some((entry) => entry.key === "test/subject.test.mjs"));
        assert.equal(holder.files != null, packed, `${cases} cases with no recorded time: ${packed ? "packed" : "its own unit"}`);
      }
    },
  },
  {
    name: "160/09 A packed unit fills to its target and never splits a file",
    run: () => {
      const files = Array.from({ length: 40 }, (_, index) => fileUnit(`f${String(index).padStart(2, "0")}`, 4));
      const plan = packUnits(files, { packSeconds: 15, targetSeconds: 60 });
      const seen = [];
      for (const unit of plan) {
        assert.ok(unit.files != null, "every short file packed");
        assert.ok(unit.estimate <= 60, `${unit.key} is estimated at ${unit.estimate} s, no more than 60`);
        for (const entry of unit.files) {
          assert.deepEqual(entry.positions, [0, 1, 2], `${entry.key} keeps every position of its file`);
          seen.push(entry.key);
        }
      }
      assert.equal(new Set(seen).size, 40, "every file is in a unit");
      assert.equal(seen.length, 40, "and no file appears in two");
      assert.equal(plan.length, 3, "forty 4-second files fill three units: 15, 15 and 10 files");
    },
  },
  {
    name: "160/09 Every registered case runs exactly once across packed units",
    run: async () => {
      const assigned = new Map([["/r/a.test.mjs", [0, 1]], ["/r/b.test.mjs", [0]], ["/r/long.test.mjs", [0, 1, 2]], ["/r/chunky.test.mjs", [0, 1, 2, 3]]]);
      const filePlan = [
        { key: "a", file: "/r/a.test.mjs", positions: [0, 1], estimate: 2 },
        { key: "b", file: "/r/b.test.mjs", positions: [0], estimate: 1 },
        { key: "long", file: "/r/long.test.mjs", positions: [0, 1, 2], estimate: 90 },
        { key: "chunky", file: "/r/chunky.test.mjs", positions: [0, 1], chunked: true, estimate: 5 },
        { key: "chunky", file: "/r/chunky.test.mjs", positions: [2, 3], chunked: true, estimate: 5 },
        { key: "lanes (cargo)", lanes: true, positions: [], estimate: 30 },
      ];
      const plan = packUnits(filePlan);
      assert.ok(plan.some((unit) => unit.files?.length === 2), "the two short files packed");
      assert.equal(planCoverageProblem(plan, assigned), null, "every registered case is assigned exactly once");
      const packed = plan.find((unit) => unit.files != null);
      const lost = plan.map((unit) => (unit === packed ? { ...unit, files: [unit.files[0], { ...unit.files[1], positions: [] }] } : unit));
      assert.match(planCoverageProblem(lost, assigned) ?? "", /^not ok - .* 1 lost, 0 run twice/u, "a plan that lost a case is refused");
      const doubled = [...plan, { key: "a", file: "/r/a.test.mjs", positions: [1], estimate: 1 }];
      assert.match(planCoverageProblem(doubled, assigned) ?? "", /0 lost, 1 run twice/u, "a plan that doubled a case is refused");
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      const refusal = runner.indexOf("const coverage = planCoverageProblem(plan, units);");
      assert.ok(refusal > 0 && refusal < runner.indexOf("await runPool("), "the runner refuses such a plan before any unit starts");
      assert.match(runner.slice(refusal, refusal + 200), /process\.exit\(1\)/u, "…and exits non-zero");
    },
  },
  {
    name: "160/09 The plan shows how many processes the run will start",
    run: async () => {
      const plan = packUnits([...Array.from({ length: 5 }, (_, index) => fileUnit(`s${index}`, 4)), fileUnit("long", 90)]);
      assert.equal(planSummary(plan), "# plan: 2 units; 1 packed, holding 5 files");
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      assert.ok(runner.indexOf("console.log(planSummary(plan));") > runner.indexOf('if (argv.includes("--plan"))'), "--plan prints that line first");
    },
  },
  // ── 160/09 · a packed unit accounts per file ───────────────────────────────────────────────────
  {
    name: "160/09 Timings stay per file",
    run: () => {
      const unit = packedUnit(["one", "two", "three"]);
      const output = fileLinesFor(unit, [[2, 1], [3, 1], [4, 1]]);
      const perFile = fileTimings([{ unit, ok: true, code: 0, seconds: 10, executed: 3, failed: [], output }]);
      assert.deepEqual(perFile, {
        "test/one.test.mjs": { seconds: 2, cases: 1 },
        "test/two.test.mjs": { seconds: 3, cases: 1 },
        "test/three.test.mjs": { seconds: 4, cases: 1 },
      }, "one entry for each file, with its own seconds, and none naming the packed unit");
    },
  },
  {
    name: "160/09 A lost case is named by its file",
    run: () => {
      const unit = packedUnit(["first", "second"], [[0, 1, 2], [0, 1]]);
      const result = unitResultOf(unit, { code: 0, output: `${fileLinesFor(unit, [[1, 3], [1, 1]])}# executed 4 cases; failures 0\n`, seconds: 2 });
      assert.equal(result.ok, false);
      assert.deepEqual(result.failed, [lostUnitFailure("test/second.test.mjs", 1, 2)], "the second file is named as having lost a case, and the first is not");
    },
  },
  {
    name: "160/09 A failure in a packed unit names its case and is retried with its unit",
    run: async () => {
      const unit = packedUnit(["a", "b", "c"]);
      const runs = [];
      const pool = await runPool([unit], {
        jobs: 1,
        unitTimeoutMs: 60_000,
        spawnUnit: (spawned) => {
          runs.push(spawned);
          const red = runs.length === 1;
          return { child: scriptedChild(`${fileLinesFor(spawned, [[1, 1], [1, 1], [1, 1]])}${red ? "not ok - b's case\n" : ""}# executed 3 cases; failures ${red ? 1 : 0}\n`, red ? 1 : 0) };
        },
      });
      assert.equal(runs.length, 2, "the failed unit is retried once");
      assert.equal(runs[1], unit, "…as the same packed unit");
      assert.deepEqual(pool.results[0].failed, ["b's case"], "the report names the failing case by its name");
      assert.deepEqual(notIsolatedLines(pool.flakes), ["# not isolated - b's case"], "a case green when the unit runs alone is not isolated, not a failure");
      assert.equal(pool.failures.length, 0);
    },
  },
  {
    name: "160/09 A packed unit stopped at the budget names every file it held",
    run: async () => {
      const unit = packedUnit(["a", "b", "c"]);
      const pool = await runPool([unit], { jobs: 1, unitTimeoutMs: 60_000, budgetMs: 50, spawnUnit: () => ({ child: fakeUnitChild() }) });
      assert.equal(pool.stoppedBy, "budget");
      const lines = report({ executed: 0, notFinished: pool.notFinished, notStarted: pool.notStarted });
      for (const key of ["test/a.test.mjs", "test/b.test.mjs", "test/c.test.mjs"]) assert.ok(lines.includes(`# not finished - ${key}`), `# not finished - ${key}`);
      assert.equal(lines.includes(`# not finished - ${unit.key}`), false, "the packed unit is named by its files, not as a batch");
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      assert.match(runner, /for \(const target of pool\.stopped \? \[\] :/u, "and a stopped run writes no timings");
    },
  },
  // m160/F-06 — a 12-worker run planned from a quieter run's timings packed 109 files into one unit, whose
  // command line passed Windows' limit: `spawn ENAMETOOLONG` was thrown inside the pool and ended the run with
  // no report and no timings.
  {
    name: "160/09 F-06 · a pack closes when its command line would pass the bound",
    run: () => {
      const files = Array.from({ length: 400 }, (_, index) => fileUnit(`deeply/nested/directory/file-${String(index).padStart(4, "0")}`, 0.1));
      const unbounded = packUnits(files, { packSeconds: 15, targetSeconds: 60, maxArgChars: Infinity });
      assert.equal(unbounded.length, 1, "non-vacuity: without the bound, the 400 files fit one pack's target time");
      const plan = packUnits(files, { packSeconds: 15, targetSeconds: 60, maxArgChars: 4_000 });
      for (const unit of plan) assert.ok(argChars(unit) <= 4_000, `${unit.key}: ${argChars(unit)} argument characters`);
      assert.deepEqual(plan.flatMap((unit) => (unit.files ?? [unit]).map((entry) => entry.key)).sort(), files.map((entry) => entry.key).sort(), "every file is in exactly one unit");
    },
  },
  {
    name: "160/09 F-06 · the runner's default bound fits a Windows command line",
    run: () => {
      assert.ok(Number.isFinite(PACK_MAX_ARG_CHARS) && PACK_MAX_ARG_CHARS > 0, "a finite default bound");
      assert.ok(PACK_MAX_ARG_CHARS + 2_048 <= 32_767, `${PACK_MAX_ARG_CHARS} leaves room for the node path and the shard entry's path`);
      const files = Array.from({ length: 2_000 }, (_, index) => fileUnit(`deeply/nested/directory/file-${String(index).padStart(4, "0")}`, 0.01));
      for (const unit of packUnits(files)) assert.ok(argChars(unit) <= PACK_MAX_ARG_CHARS, `${unit.key}: ${argChars(unit)} argument characters`);
    },
  },
  {
    name: "160/09 F-06 · [outline] a unit that cannot start is a failed unit, not a crashed pool (2 rows)",
    run: async () => {
      const rows = [
        ["throws ENAMETOOLONG", () => { throw Object.assign(new Error("spawn ENAMETOOLONG"), { code: "ENAMETOOLONG" }); }],
        ["emits an error event instead of a close", () => {
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = () => {};
          setImmediate(() => child.emit("error", Object.assign(new Error("spawn EACCES"), { code: "EACCES" })));
          return { child };
        }],
      ];
      for (const [row, start] of rows) {
        const plan = ["first", "second", "third"].map((key) => ({ key, positions: [0] }));
        const pool = await runPool(plan, {
          jobs: 2,
          unitTimeoutMs: 60_000,
          spawnUnit: (unit) => (unit.key === "second" ? start() : { child: scriptedChild("# executed 1 cases; failures 0\n", 0) }),
        });
        assert.equal(pool.results.length, 3, `${row}: the pool resolves with three results`);
        const second = pool.results.find((result) => result.unit.key === "second");
        assert.equal(second.ok, false, `${row}: the second unit is a failure`);
        assert.match(second.output, /ENAMETOOLONG|EACCES/u, `${row}: its output names the error`);
        assert.ok(pool.results.filter((result) => result.unit.key !== "second").every((result) => result.ok), `${row}: the other two pass`);
        assert.deepEqual(pool.failures.map(({ first }) => first.unit.key), ["second"], `${row}: it is reported as a failure after its alone-retry`);
      }
    },
  },
  // ══════ FF-16014 (160/12, ADR-013 §1–2): a test run trusts folders in its own claude home ══════
  // Measured 2026-10-17: lane tests had written 106,899 temp-folder trust entries into the operator's real
  // ~/.claude.json (12 MB), because the trust writer resolved os.homedir() and AOF_GLOBAL_HOME isolates ~/.aof only.
  {
    name: "FF-16014 160/12 [outline] The trust writer chooses its home (2 rows)",
    run: async () => {
      const trust = createClaudeTrust({ reportDegrade: () => {} });
      const saved = process.env.AOF_TEST_CLAUDE_HOME;
      const option = await mkdtemp(path.join(os.tmpdir(), "aof-160-12-option-"));
      const variable = await mkdtemp(path.join(os.tmpdir(), "aof-160-12-variable-"));
      const trusted = async (home) => Object.keys(JSON.parse(await readFile(path.join(home, ".claude.json"), "utf8")).projects);
      try {
        for (const home of [option, variable]) await writeFile(path.join(home, ".claude.json"), JSON.stringify({ projects: {} }));
        process.env.AOF_TEST_CLAUDE_HOME = variable;
        await trust.ensureWorktreeTrusted("C:/fixture/one", { homedir: option });
        assert.deepEqual([await trusted(option), await trusted(variable)], [["C:/fixture/one"], []], "a home option: written in the home option");
        await trust.ensureWorktreeTrusted("C:/fixture/two");
        assert.deepEqual([await trusted(option), await trusted(variable)], [["C:/fixture/one"], ["C:/fixture/two"]], "no home option: written in the test folder");
      } finally {
        if (saved === undefined) delete process.env.AOF_TEST_CLAUDE_HOME;
        else process.env.AOF_TEST_CLAUDE_HOME = saved;
        await rm(option, { recursive: true, force: true });
        await rm(variable, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FF-16014 160/12 Every test process has a claude home of its own",
    run: () => {
      const env = { ...process.env };
      delete env.AOF_TEST_CLAUDE_HOME;
      const harness = pathToFileURL(path.join(repoRoot, "scripts", "test-harness.mjs")).href;
      const probe = `import { existsSync } from "node:fs"; await import(${JSON.stringify(harness)}); const dir = process.env.AOF_TEST_CLAUDE_HOME ?? ""; console.log(JSON.stringify({ dir, existed: dir !== "" && existsSync(dir) }));`;
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", probe], { cwd: repoRoot, env, encoding: "utf8", windowsHide: true });
      assert.equal(result.status, 0, result.stderr);
      const { dir, existed } = JSON.parse(result.stdout.trim().split(/\r?\n/u).pop());
      assert.ok(existed, `the harness set AOF_TEST_CLAUDE_HOME to a folder that exists while the process runs (got ${JSON.stringify(dir)})`);
      const inside = path.relative(path.resolve(os.tmpdir()), path.resolve(dir));
      assert.ok(inside !== "" && !inside.startsWith("..") && !path.isAbsolute(inside), `${dir} is under the system temporary directory`);
      assert.equal(existsSync(dir), false, "and it is removed when the process exits");
    },
  },
  {
    name: "FF-16014 160/12 Each unit of a sharded run has its own claude home",
    run: async () => {
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      assert.match(runner, /env: \{ \.\.\.env, AOF_GLOBAL_HOME: home, AOF_TEST_CLAUDE_HOME: home \}/u, "the unit's claude home is its own home, beside AOF_GLOBAL_HOME");
    },
  },
  // ══════ FF-16016 (160/13, ADR-014 §1–2): the runner takes one shard of the plan ══════
  {
    name: "FF-16016 160/13 [outline] The shards of a plan (3 rows)",
    run: () => {
      const rows = [
        [[90], 4],
        [[90, 60, 50, 40, 30, 20, 10], 3],
        [Array.from({ length: 40 }, (_, index) => index + 1), 8],
      ];
      for (const [estimates, count] of rows) {
        const plan = estimates.map((estimate, index) => ({ key: `u${String(index).padStart(2, "0")}`, estimate }));
        const bins = shardPlan(plan, count);
        assert.equal(bins.length, count, `${estimates.length} units into ${count}: ${count} shards`);
        assert.deepEqual(bins.flat().map((unit) => unit.key).sort(), plan.map((unit) => unit.key).sort(), `${estimates.length} units into ${count}: every unit in exactly one shard`);
        const loads = bins.map((bin) => bin.reduce((sum, unit) => sum + unit.estimate, 0));
        assert.ok(Math.max(...loads) - Math.min(...loads) <= Math.max(...estimates), `${estimates.length} units into ${count}: loads ${loads} differ by at most the heaviest unit`);
      }
    },
  },
  {
    name: "FF-16016 160/13 Every job computes the same split",
    run: () => {
      const plan = Array.from({ length: 30 }, (_, index) => ({ key: `test/f${index}.test.mjs`, estimate: (index * 7) % 11 }));
      const keys = (bins) => bins.map((bin) => bin.map((unit) => unit.key));
      const first = keys(shardPlan(plan, 4));
      assert.deepEqual(keys(shardPlan(plan, 4)), first, "the same plan splits the same way twice");
      assert.deepEqual(keys(shardPlan([...plan].reverse(), 4)), first, "and whatever order the units arrive in");
    },
  },
  {
    name: "FF-16016 160/13 [outline] A shard argument the runner refuses (4 rows)",
    run: () => {
      for (const argument of ["0/4", "5/4", "2", "a/b"]) {
        const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "test-sharded.mjs"), "--shard", argument, "--plan"], { cwd: repoRoot, encoding: "utf8", windowsHide: true, timeout: 60_000 });
        assert.equal(result.status, 1, `--shard ${argument}: exit 1`);
        assert.ok(result.stderr.includes(`--shard ${argument}`), `--shard ${argument}: the refusal names it (${result.stderr.trim()})`);
        assert.equal(result.stdout.includes("# sharded:"), false, `--shard ${argument}: refused before the registry was read`);
      }
    },
  },
  {
    name: "FF-16016 160/13 A shard counts only its own cases",
    run: async () => {
      assert.equal(shardedExit({ failures: [], flakes: [], executed: 30, registered: 30 }), 0, "30 of 30 is green");
      assert.equal(shardedExit({ failures: [], flakes: [], executed: 30, registered: 100 }), 1, "non-vacuity: 30 of the whole tree's 100 is a lost case");
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      assert.match(runner, /const registeredHere = SHARD == null \? tests\.length : plan\.filter\(\(unit\) => !unit\.lanes\)\.reduce/u, "a shard registers only its own units' cases");
      assert.match(runner, /registered: registeredHere,/u, "and its verdict reads that count");
    },
  },
  {
    name: "FF-16016 160/13 A shard reports in JSON, every field the summary reads",
    run: async () => {
      const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
      const written = runner.slice(runner.indexOf("if (REPORT_JSON) {"));
      for (const field of ["shard", "shards", "registeredTotal", "registered", "executed", "failures", "flakes", "notFinished", "notStarted", "wallSeconds", "summedSeconds", "perFile", "planned"]) {
        assert.match(written, new RegExp(`\\b${field}[,:]`, "u"), `the report writes ${field}`);
      }
      const summary = await readFile(path.join(repoRoot, "scripts", "test-ci-summary.mjs"), "utf8");
      for (const field of ["shard", "registeredTotal", "executed", "failures", "flakes", "notFinished", "notStarted", "wallSeconds", "summedSeconds", "perFile", "planned"]) {
        assert.ok(summary.includes(`report.${field}`), `the summary reads report.${field}`);
      }
    },
  },
  // ══════ FF-16017 (160/13, ADR-014 §4): the CI summary judges the shards ══════
  {
    name: "FF-16017 160/13 [outline] The summary's verdict (7 rows)",
    run: () => {
      const rows = [
        ["every shard is green and the slowest took 8 minutes", {}, true, /Suite wall: \*\*8\.0 min\*\*/u],
        ["one shard has a failing case", { failures: [{ unit: "test/b.test.mjs", cases: ["b's case"] }] }, false, /not ok - shard 2: b's case/u],
        ["the shards executed 99 of 100 registered cases", { drop: 1 }, false, /1 registered case\(s\) that no shard ran/u],
        ["the shards executed 101 of 100 registered cases", { doubled: true }, false, /a case ran in two shards: test\/a\.test\.mjs/u],
        ["every shard is green and the slowest took 11 minutes", { wall: 660 }, false, /over budget: the suite took 11\.0 min against 10 min \(slowest: shard 2\)/u],
        ["a shard report is missing", { missing: true }, false, /shard 2\/2 wrote no report/u],
        ["a unit did not finish", { notFinished: ["test/b.test.mjs"] }, false, /not finished - shard 2: test\/b\.test\.mjs/u],
      ];
      for (const [condition, change, passed, named] of rows) {
        const reports = shardReports(change);
        const verdict = judgeShards({ reports, shards: 2, budgetMinutes: 10 });
        const markdown = summaryMarkdown(verdict, { shards: 2, budgetMinutes: 10 });
        assert.equal(verdict.passed, passed, `${condition}: ${passed ? "passes" : "fails"} (${verdict.problems.join("; ")})`);
        assert.match(markdown, named, `${condition}: names it`);
        if (change.notFinished) assert.equal(verdict.problems.some((problem) => problem.startsWith("not ok")), false, "a unit that did not finish is never a failure");
      }
    },
  },
  {
    name: "FF-16017 160/13 Drift is reported and never fails the run",
    run: () => {
      const reports = shardReports({});
      reports[0].perFile["test/a.test.mjs"] = { seconds: 30, cases: 50 };
      reports[1].perFile["test/b.test.mjs"] = { seconds: 5, cases: 50 };
      const baseline = { "test/a.test.mjs": { seconds: 10 }, "test/b.test.mjs": { seconds: 20 } };
      const verdict = judgeShards({ reports, shards: 2, budgetMinutes: 10, baseline });
      assert.equal(verdict.passed, true, verdict.problems.join("; "));
      assert.deepEqual(verdict.drift.map(({ key, direction, before, after }) => [key, direction, before, after]), [["test/a.test.mjs", "slower", 10, 30], ["test/b.test.mjs", "faster", 20, 5]]);
      const markdown = summaryMarkdown(verdict, { shards: 2, budgetMinutes: 10 });
      assert.match(markdown, /\| `test\/a\.test\.mjs` \| 10\.0 s \| 30\.0 s \| \+20\.0 s slower \|/u);
      assert.match(markdown, /\| `test\/b\.test\.mjs` \| 20\.0 s \| 5\.0 s \| -15\.0 s faster \|/u);
    },
  },
  {
    name: "FF-16017 160/13 The merged timings are the union of the shards'",
    run: () => {
      const verdict = judgeShards({ reports: shardReports({}), shards: 2, budgetMinutes: 10 });
      assert.deepEqual(verdict.timings, { "test/a.test.mjs": { seconds: 100, cases: 50 }, "test/b.test.mjs": { seconds: 120, cases: 50 } });
    },
  },
  {
    name: "160/13 The workflow runs the shards, then the summary, on every pull request",
    run: async () => {
      const raw = await readFile(path.join(repoRoot, ".github", "workflows", "test.yml"), "utf8");
      // A checkout may hold the workflow with CRLF endings (core.autocrlf), so its lines are matched as LF.
      const workflow = raw.replace(/\r\n/gu, "\n").replace(/^\s*#.*$/gmu, "");
      assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- main\s*\n\s+pull_request:\s*\n\s+branches:\s*\n\s+- main/u, "on a pull request to main and a push to main");
      const shards = Number(/SHARDS: "(\d+)"/u.exec(workflow)?.[1]);
      const matrix = /shard: \[([^\]]+)\]/u.exec(workflow)?.[1].split(",").map((value) => Number(value.trim()));
      assert.deepEqual(matrix, Array.from({ length: shards }, (_, index) => index + 1), `the matrix is shards 1..${shards}`);
      assert.match(workflow, /node scripts\/test-sharded\.mjs [^\n]*\\\n\s+--shard \$\{\{ matrix\.shard \}\}\/\$\{\{ env\.SHARDS \}\} \\\n\s+--report-json reports\/shard-\$\{\{ matrix\.shard \}\}\.json/u, "each shard runs its shard and writes its report");
      assert.match(workflow, /name: test-report-\$\{\{ matrix\.shard \}\}/u, "and uploads it");
      assert.match(workflow, /summary:[\s\S]*?needs: \[shard\]\s*\n\s+if: always\(\)/u, "the summary needs every shard and runs when one fails");
      assert.match(workflow, /BUDGET_MINUTES: "10"/u, "with the 10-minute budget");
      assert.match(workflow, /node scripts\/test-ci-summary\.mjs --reports reports --shards "\$SHARDS" --budget-min "\$BUDGET_MINUTES"/u, "which the summary judges");
    },
  },
  {
    name: "160/13 The regression gate runs on a runner, unchanged, and its row comes home",
    run: async () => {
      const raw = await readFile(path.join(repoRoot, ".github", "workflows", "gate.yml"), "utf8");
      const workflow = raw.replace(/\r\n/gu, "\n").replace(/^\s*#.*$/gmu, "");
      assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- "gate\/\*\*"/u, "a push of gate/<ref> starts it");
      assert.match(workflow, /GATE_REF: \$\{\{ inputs\.ref \|\| github\.ref_name \}\}/u, "the ref reaches the shell through the environment, never interpolated into the script");
      assert.match(workflow, /node packages\/core\/bin\/aof\.mjs work regression-gate "\$\{GATE_REF#gate\/\}"/u, "it runs the CLI's own gate command, unchanged");
      assert.match(workflow, /fetch-depth: 0/u, "on a full-history checkout");
      assert.match(workflow, /if: always\(\)\s*\n\s+uses: actions\/upload-artifact@v4\s*\n\s+with:\s*\n\s+name: regression-row\s*\n\s+path: wiki\/work\/\*\*\/REGRESSION\.md/u, "and uploads the row it wrote, red or green");
      assert.equal(/\bgh\s|github\.com|api\.github|GITHUB_/u.test(await readFile(path.join(repoRoot, "packages", "work", "src", "commands", "regression-gate.mjs"), "utf8")), false, "and the CLI's gate knows nothing of CI");
    },
  },
  {
    name: "160/13 The control node's gate declares no budget",
    run: async () => {
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      assert.equal(Object.hasOwn(config.work.test.gate, "budgetMinutes"), false, "the control-node gate declares no budgetMinutes (160/ADR-014 §5)");
      assert.deepEqual(config.work.test.gate.budgetArgs, ["--budget-min", "{minutes}"], "and still declares how a budget reaches the runner");
    },
  },
];

// ── 160/09's helpers ─────────────────────────────────────────────────────────────────────────────

// A unit's argument characters, as Windows counts its command line: each argument plus a space and two quotes.
const argChars = (unit) => shardArgs(unit).reduce((sum, arg) => sum + arg.length + 3, 0);

// One whole-file plan entry, as the runner plans it.
function fileUnit(name, estimate, { positions = [0, 1, 2], chunked = false } = {}) {
  return { key: `test/${name}.test.mjs`, file: `/repo/test/${name}.test.mjs`, positions, chunked, estimate };
}

// A packed unit over `names`, each file with its positions.
function packedUnit(names, positions = names.map(() => [0])) {
  const files = names.map((name, index) => ({ file: `/repo/test/${name}.test.mjs`, key: `test/${name}.test.mjs`, positions: positions[index] }));
  return { key: `packed ${names.length} files from ${files[0].key}`, packed: true, files, positions: files.flatMap((entry) => entry.positions), estimate: 10 };
}

// The `# file` lines a packed unit prints, one per file: `[seconds, executed]` each.
const fileLinesFor = (unit, rows) => unit.files.map((entry, index) => `# file ${entry.file} ${rows[index][0]} ${rows[index][1]}\n`).join("");

// A unit child that prints `output` and exits with `code`.
function scriptedChild(output, code) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => {
    child.stdout.emit("data", output);
    child.emit("exit", code);
    child.emit("close", code);
  });
  return child;
}

// FF-16017's two shard reports over a 100-case tree: shard 1 holds test/a (50 cases), shard 2 holds test/b (50).
// `change` bends them into one row's condition.
function shardReports(change) {
  const report = (shard, key, wallSeconds) => ({
    shard, shards: 2, registeredTotal: 100, registered: 50, executed: 50,
    failures: [], flakes: [], notFinished: [], notStarted: [], stopped: false,
    wallSeconds, summedSeconds: wallSeconds * 4,
    perFile: { [key]: { seconds: wallSeconds / 4, cases: 50 } },
    planned: { [key]: Array.from({ length: 50 }, (_, position) => position) },
  });
  const reports = [report(1, "test/a.test.mjs", 400), report(2, "test/b.test.mjs", change.wall ?? 480)];
  if (change.failures) reports[1].failures = change.failures;
  if (change.notFinished) { reports[1].notFinished = change.notFinished; reports[1].executed = 0; }
  if (change.drop) { reports[1].planned["test/b.test.mjs"].pop(); reports[1].executed = 49; reports[1].registered = 49; }
  if (change.doubled) { reports[1].planned["test/a.test.mjs"] = [0]; reports[1].executed = 51; }
  if (change.missing) reports.pop();
  return reports;
}
