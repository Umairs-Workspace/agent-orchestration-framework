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
import { spawn } from "node:child_process";
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
import { poolExit, runPool, stdinIsPipe } from "../../scripts/test-sharded-pool.mjs";
import { gateResult } from "@aof/work/regression-record";

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
];
