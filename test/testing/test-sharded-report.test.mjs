// Behavioural evidence for 144 — the sharded run's report and verdict (`scripts/test-sharded-report.mjs`).
//
//   tasks/01_a-lost-or-failing-case-is-red-and-a-case-that-is-not-isolated-is-logged.feature (the runner's half)
//   tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature (the slowest-files sums)
//
// The module is pure, so every row drives it with unit results shaped as the pool builds them, and no pool starts.
// The gate's half of each scenario — what the row records from these lines — is `test/run/regression-gate.test.mjs`'s.
import assert from "node:assert/strict";

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
];
