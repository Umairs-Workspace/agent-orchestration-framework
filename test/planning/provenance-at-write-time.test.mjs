import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compileProvenance, PROVENANCE_KEYS } from "../../src/claim-provenance.mjs";
import { compileGrade } from "../../src/work/grade.mjs";
import { readRuns, recordAnchorReading, runRecordPath, startRun } from "../../src/run-store.mjs";
import { gradeCommand } from "../../src/commands/grade.mjs";
import { makeGradeRepo, rubricFor, writeRunner, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";

const AT = "2026-08-26T14:00:00.000Z";
const stamp = (overrides = {}) => ({ node: "node-a", run: null, commit: null, at: AT, ...overrides });

async function tempItem() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-provenance-"));
  const item = { ref: "55/02", type: "story", dir: path.join(root, "story") };
  await mkdir(item.dir, { recursive: true });
  return { root, item };
}

export const provenanceAtWriteTimeTests = [
  {
    name: "55/02 envelope: four frozen keys, meaningful nulls, and no fifth key",
    run() {
      assert.deepEqual([...PROVENANCE_KEYS], ["node", "run", "commit", "at"]);
      assert.ok(Object.isFrozen(PROVENANCE_KEYS));
      const value = compileProvenance({ ...stamp(), extra: "cannot enter" });
      assert.deepEqual(Object.keys(value), [...PROVENANCE_KEYS]);
      assert.deepEqual(value, stamp());
      assert.ok(Object.isFrozen(value));
      assert.throws(() => compileProvenance(null), (error) => error.code === "claim-provenance-missing");
      const inherited = Object.create({ run: null, commit: null });
      Object.assign(inherited, { node: "node-a", at: AT });
      assert.throws(
        () => compileProvenance(inherited),
        (error) => error.code === "claim-provenance-missing" && error.missing.includes("run") && error.missing.includes("commit"),
      );
      assert.equal(compileProvenance(stamp({ run: "run-1" })).run, "run-1");
      assert.equal(compileProvenance(stamp({ commit: "abc1234" })).commit, "abc1234");
      for (const key of ["node", "at"]) {
        const partial = stamp();
        delete partial[key];
        assert.throws(() => compileProvenance(partial), (error) => error.code === "claim-provenance-missing" && error.missing.includes(key));
      }
    },
  },
  {
    name: "55/02 compiler: injected provenance is deterministic and no fact is re-derived",
    run() {
      const observation = {
        ref: "55/02",
        gradedAt: AT,
        provenance: stamp({ run: "run-1", commit: "abc1234" }),
        rubric: { report: { format: "tap", floor: 1 } },
        runner: { command: ["node"], cwd: "/repo", exit: 0, durationMs: 1, outcome: "completed" },
        report: { present: true, text: "ok 1 - green\n1..1\n" },
      };
      assert.deepEqual(compileGrade(observation), compileGrade(observation));
      assert.deepEqual(compileGrade(observation).provenance, observation.provenance);
      assert.equal(compileGrade(observation).gradedAt, AT);
    },
  },
  {
    name: "55/02 command edge: node, run, commit, and instant are gathered before compile",
    async run() {
      const runnerRepo = await makeGradeRepo();
      const runner = await writeRunner(runnerRepo.repo, "green.cjs", 'process.stdout.write("ok 1 - green\\n1..1\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const spawn = countingSpawn(() => ({
          status: 0,
          stdout: "ok 1 - green\n1..1\n",
          stderr: "",
          error: null,
          signal: null,
        }));
        const result = await gradeCommand.run(
          { ref: "03", run: true, claimRun: "run-7", now: AT },
          await ctxFor(fx.repo, {
            spawnRubric: spawn,
            resolveProvenanceNode: async () => "node-a",
            readHeadCommit: async () => "abc1234",
          }),
        );
        assert.equal(spawn.calls.length, 1);
        assert.deepEqual(result.grade.provenance, stamp({ run: "run-7", commit: "abc1234" }));
      } finally {
        await rm(runnerRepo.repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/02 command edge: node-resolution failure is coded and launches or records nothing",
    async run() {
      const runnerRepo = await makeGradeRepo();
      const runner = await writeRunner(runnerRepo.repo, "green.cjs", 'process.stdout.write("ok 1 - green\\n1..1\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const spawn = countingSpawn(() => ({ status: 0, stdout: "ok 1 - green\n1..1\n", stderr: "", error: null, signal: null }));
        await assert.rejects(
          gradeCommand.run(
            { ref: "03", run: true, now: AT },
            await ctxFor(fx.repo, {
              spawnRubric: spawn,
              resolveProvenanceNode: async () => { throw new Error("identity unavailable"); },
              readHeadCommit: async () => "abc1234",
            }),
          ),
          (error) => error.code === "provenance-node-unavailable",
        );
        assert.equal(spawn.calls.length, 0, "gathering fails before the runner or compiler is reached");
      } finally {
        await rm(runnerRepo.repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/02 refusal: an unstamped grade writes nothing and names the missing stamp",
    async run() {
      const fx = await tempItem();
      try {
        const grade = compileGrade({ ref: fx.item.ref, gradedAt: AT, rubric: null });
        await assert.rejects(
          startRun(fx.item, { brief: { grade }, now: AT }),
          (error) => error.code === "claim-provenance-missing" && error.missing.includes("provenance"),
        );
        assert.deepEqual(await readdir(fx.item.dir), [], "refusal creates no runs directory or record");
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/02 readings: they append inside the run record and never touch the registry",
    async run() {
      const fx = await tempItem();
      try {
        const run = await startRun(fx.item, { now: AT });
        const registry = path.join(fx.root, ".aof", "loops");
        const directoriesBeforeReadings = await readdir(fx.item.dir);
        await recordAnchorReading(fx.item, {
          runId: run.runId,
          anchor: "anchor:test-process-exit",
          value: { exit: 0 },
          provenance: stamp({ run: run.runId, commit: "abc1234" }),
        });
        await recordAnchorReading(fx.item, {
          runId: run.runId,
          anchor: "anchor:test-process-exit",
          value: { exit: 1 },
          provenance: stamp({ run: run.runId, at: "2026-08-26T14:01:00.000Z" }),
        });
        const [stored] = await readRuns(fx.item);
        assert.equal(stored.brief.anchorReadings.length, 2);
        assert.deepEqual(stored.brief.anchorReadings.map((entry) => entry.value.exit), [0, 1]);
        assert.deepEqual(await readdir(fx.item.dir), directoriesBeforeReadings, "readings introduce no directory beside the existing run store");
        await assert.rejects(readdir(registry), (error) => error.code === "ENOENT");

        const before = await readFile(runRecordPath(fx.item, run.runId), "utf8");
        await assert.rejects(
          recordAnchorReading(fx.item, {
            runId: run.runId,
            anchor: "anchor:test-process-exit",
            value: { exit: 2 },
            provenance: { run: run.runId, commit: null, at: AT },
          }),
          (error) => error.code === "claim-provenance-missing" && error.missing.includes("node"),
        );
        assert.equal(await readFile(runRecordPath(fx.item, run.runId), "utf8"), before, "a refused write leaves the prior record byte-identical");
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
];
