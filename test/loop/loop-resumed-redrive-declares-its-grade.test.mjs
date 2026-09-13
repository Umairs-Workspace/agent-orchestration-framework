// Traceability wiring for story 81, task `02_a-resumed-redrive-declares-its-grade`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/81_story_bounds-under-a-real-grader/tasks/02_a-resumed-redrive-declares-its-grade.feature
//
// THE GAP, AS 54/03 DECLARED IT (*"The resume path never walks rung 3"*): `brief.grade` is
// not always present on a re-driven run — a loop resumed from a parked or stranded run
// re-drives with no grade on its brief, and 62, 63 and 78 consume `LoopState` without being
// told the key is conditional.
//
// THIS TASK TAKES THE SECOND LIMB. Re-grading on resume would put a rung-3 spawn on a path
// `54/ADR-007 §1` prices as once per COMPLETED BUILD, and a resume completes none; carrying
// the pre-interruption grade forward would present evidence about the old tree as evidence
// about the new one — this milestone's own defect shape pointed at itself. The honest answer
// is cheap and is the one a consumer can act on: 62, 63 and 78 do not need a grade on every
// drive, they need to know WHICH drives carry one.
//
// THE INTERRUPTION IS SEEDED, NOT SIMULATED. A completed `continue` run carrying the loop's
// declaration is exactly the persisted lineage a process killed between a build and its
// re-drive leaves behind, and it is written here through the shipped run store — so the
// resume path below reconstructs from the same bytes production would.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync } from "node:fs";

import { invoke } from "../../src/command-core.mjs";
import { LOOP_STOPS } from "../../src/work/loop.mjs";
import { runLoopBody, SHELL_LOOP_ID } from "../../src/commands/loop.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { startRun, completeRun } from "../../src/run-store.mjs";
// A seeded `brief.grade` is a CLAIM, and the run store refuses an unstamped one
// (`assertStampedClaim`, 55/ADR-003) — so the fixture stamps it through the same pure
// compiler the grade command uses rather than hand-rolling a four-key object.
import { compileProvenance } from "../../src/claim-provenance.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import {
  capturingReport, emitsPassing, gradingCtx, gradingFixture, stubRubric,
} from "../support/loop-grade-fixture.mjs";

// The frozen ten, order included — the same literal `acd-loop-probe-contract` pins, restated
// so this task's own contract fails if the document is widened.
const TOP_KEYS = Object.freeze(["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
const ACT_KEYS = Object.freeze(["act", "ref", "phase", "stop", "producer"]);

const INVALID_FEATURE = "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n";
const VALID_FEATURE = "@executable\nFeature: Ready\n  Scenario: ready\n    Given a fixture\n    When it runs\n    Then it passes\n";

const featurePath = (fx) => path.join(fx.storyDir, "tasks", "00_ready.feature");

/**
 * The declaration a process killed mid-loop leaves on the run it had already completed.
 *
 * It carries the loop id (102/00's eighth key) because the run it stands for was minted by THIS
 * shell, which since 102/01 always declares `loop:autonomous-cascade` — so the "the declaration is
 * unchanged" comparison below stays a real check rather than a seven-against-eight mismatch.
 * (A genuinely PRE-102 seven-key record still resumes; that is pinned in
 * `test/loop/loop-command-board-state.test.mjs` and `test/loop/work-loop-declaration.test.mjs`.)
 */
const declarationFor = (cap) => ({
  loopRunId: "loop-interrupted",
  scope: "03",
  level: "L2",
  cap,
  phase: "continue",
  cycle: 1,
  startedAt: "2026-09-01T00:00:00.000Z",
  id: SHELL_LOOP_ID,
  // 126/02 appends the NINTH key by the same discipline 102/00 used for the eighth, and it is
  // seeded here for the reason stated above: so the "unchanged" comparison below stays a real
  // check rather than an eight-against-nine mismatch. A genuinely pre-126 eight-key record still
  // resumes — that is pinned in `work-loop-declaration.test.mjs`.
  supervised: false,
});

/** A clean baseline of this rule's era: measured before the story's first drive, nothing inherited. */
const CLEAN_BASELINE = Object.freeze({ measuredAt: "2026-09-01T00:00:00.000Z", priorDrives: 0, failures: [] });

/**
 * The state a loop is in when it is killed AFTER a build completed and BEFORE its re-drive
 * started: one completed `continue` run carrying the declaration, and a gate that is still
 * red. `grade` seeds a grade that was taken before the interruption.
 */
async function seedInterrupted(fx, { cap = 3, grade = null, baseline = CLEAN_BASELINE } = {}) {
  writeFileSync(featurePath(fx), INVALID_FEATURE);
  const item = await resolveItemExact(fx.ctx, "03/01");
  // The lineage carries its grade baseline (2026-09-12) — a clean one — so the resume reads it
  // back and measures none: "resuming pays for no child process" stays an observation about
  // THIS era's records. A lineage that predates the baseline pays one measurement, pinned below.
  const brief = { loop: declarationFor(cap), ...(grade == null ? {} : { grade }), ...(baseline == null ? {} : { gradeBaseline: baseline }) };
  const started = await startRun(item, { brief, now: "2026-09-01T00:00:00.000Z" });
  await completeRun(item, { runId: started.runId, outcome: "done", now: "2026-09-01T00:01:00.000Z" });
  return { item, buildRunId: started.runId };
}

/**
 * A driver that REPAIRS the contract when it receives the reconstructed fix, so the resumed
 * re-drive completes and the loop reaches its own grade rung — the state the last scenario is
 * about. It also snapshots the launch count at the instant the re-drive is handed its input,
 * which is how "resuming pays for no child process" is OBSERVED rather than inferred.
 */
function resumingDriver(fx, spawn, seen) {
  return completingDriver(fx, {
    onCommand(command) {
      if (command === "/aof:continue 03/01") {
        seen.launchesWhenRedriveStarted ??= spawn.calls.length;
        writeFileSync(featurePath(fx), VALID_FEATURE);
      }
      if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
      if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
    },
  });
}

/** Resume a seeded interruption and answer everything the drive wrote. */
async function resumeOver(fx, { plan = emitsPassing(), grade = null, cap = 3, baseline = CLEAN_BASELINE } = {}) {
  const seeded = await seedInterrupted(fx, { cap, grade, baseline });
  // A seeded baseline is read back, so the stub's first answer is the grade; a lineage seeded
  // without one gets the stub's default clean baseline as the resume's own measurement.
  const spawn = stubRubric(plan, baseline == null ? {} : { baseline: null });
  const seen = {};
  const driver = resumingDriver(fx, spawn, seen);
  const report = capturingReport();
  const state = await runLoopBody({ scope: "03", resume: true }, gradingCtx(fx, { driver, report, spawn }));
  const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
  return { ...seeded, state, spawn, driver, report, runs, seen };
}

/** The row of the drive the resume reconstructed — the continue that is not the seeded one. */
const redriveRow = (state, buildRunId) => state.driven.find((row) => row.phase === "continue" && row.runId !== buildRunId);

export const loopResumedRedriveDeclaresItsGradeTests = [
  {
    name: "81/02 a resumed loop's re-drive declares that no grade was taken, and why",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, buildRunId } = await resumeOver(fx);
        const row = redriveRow(state, buildRunId);
        assert.ok(row, "guard: the resume really reconstructed a re-drive and drove it");

        // THE ROW DECLARES THAT NO GRADE WAS TAKEN…
        assert.equal(row.graded, false, "the re-drive's driven row declares that no grade was taken");
        // …AND NAMES THAT THE DRIVE WAS RECONSTRUCTED ON RESUME.
        assert.equal(row.gradeAbsence, "reconstructed-on-resume", "…and names that the drive was reconstructed on resume");
        // A CONSUMER READS THAT FROM A KEY, NOT FROM PROSE.
        assert.ok(Object.prototype.hasOwnProperty.call(row, "graded"), "a consumer reads it from a key");
        assert.ok(Object.prototype.hasOwnProperty.call(row, "gradeAbsence"), "…and from a key naming the cause");
        assert.equal(typeof row.gradeAbsence, "string", "…whose value is data, not a rendered sentence");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 no grade is fabricated on the resumed re-drive's run",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, runs, buildRunId } = await resumeOver(fx);
        const redriven = runs.find((run) => run.runId === redriveRow(state, buildRunId)?.runId);
        assert.ok(redriven, "guard: the re-driven run was written");

        // NO GRADE KEY.
        assert.equal(redriven.brief.grade, undefined, "that run's brief carries no grade key");
        // NO VERDICT, CODE OR CASE COUNT FOR THAT DRIVE — the drive's INPUT, which is what the
        // absence is about. The keys the row does carry are its own grade, taken later.
        const row = redriveRow(state, buildRunId);
        assert.equal(row.graded, false, "no grade was recorded for the drive that caused this one");

        // THE BRIEF'S LOOP DECLARATION IS UNCHANGED.
        const seededRun = runs.find((run) => run.runId === buildRunId);
        assert.deepEqual(
          Object.keys(redriven.brief.loop).sort(),
          Object.keys(seededRun.brief.loop).sort(),
          "the brief's loop declaration is unchanged",
        );
        assert.equal(redriven.brief.loop.loopRunId, "loop-interrupted", "…and it continues the interrupted lineage");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 the grade taken before the interruption is not carried forward",
    run: async () => {
      const priorGrade = {
        ref: "03/01",
        verdict: "fail",
        codes: ["case-failed"],
        cases: { total: 2, failed: 1, skipped: 0 },
        failures: [{ case: "before-the-interruption", message: "an old tree's red", scenario: null }],
        gradedAt: "2026-08-31T00:00:00.000Z",
        provenance: compileProvenance({ node: "test-node", run: null, commit: null, at: "2026-08-31T00:00:00.000Z" }),
        runner: null,
        report: null,
      };
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, runs, buildRunId } = await resumeOver(fx, { grade: priorGrade });
        const row = redriveRow(state, buildRunId);
        const redriven = runs.find((run) => run.runId === row?.runId);

        // IT DOES NOT APPEAR ON THE RE-DRIVEN RUN.
        assert.notEqual(redriven.brief.grade?.gradedAt, priorGrade.gradedAt, "the earlier grade does not appear on the re-driven run");
        assert.ok(
          !JSON.stringify(redriven.brief.grade ?? null).includes("before-the-interruption"),
          "…not even as one of its failures",
        );
        // NOR ON THE RE-DRIVE'S DRIVEN ROW.
        assert.notEqual(row.codes?.join(","), "case-failed-from-before", "…and not on the re-drive's driven row");
        assert.equal(row.graded, false, "…which declares the absence instead");

        // AND IT IS STILL READABLE WHERE IT WAS ORIGINALLY RECORDED.
        const original = runs.find((run) => run.runId === buildRunId);
        assert.equal(original.brief.grade.gradedAt, priorGrade.gradedAt, "it is still readable where it was originally recorded");
        assert.deepEqual(original.brief.grade.failures, priorGrade.failures, "…with the failures it was recorded with");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 resuming pays for no child process",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { spawn, seen } = await resumeOver(fx);
        // THE DECLARED RUNNER IS NOT LAUNCHED WHILE THE RESUME REBUILDS ITS PENDING FIX.
        assert.equal(seen.launchesWhenRedriveStarted, 0, "the declared runner is not launched by the resume");
        // AND THE LOOP'S FIRST LAUNCH IS THE ONE ITS OWN COMPLETED BUILD EARNS.
        assert.ok(spawn.calls.length >= 1, "the loop did eventually launch the runner");
        assert.equal(spawn.calls.length, 1, "…exactly once, for the build it completed itself");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    // 2026-09-12 — a lineage recorded before the grade baseline existed carries none, so the
    // resume MEASURES one before the re-drive starts: one spawn, and it is a measurement of
    // the tree (no run claimed), not a grade of the interrupted build — 81/02's property is
    // that rung 3 is never re-walked for a build the resume reconstructed, and it is not.
    name: "81/02 a lineage with no recorded baseline pays one measurement before the re-drive, and no grade of the interrupted build",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { spawn, seen, runs, buildRunId } = await resumeOver(fx, { baseline: null });
        assert.equal(seen.launchesWhenRedriveStarted, 1, "one launch before the re-drive: the baseline");
        assert.equal(spawn.calls.length, 2, "…then exactly one grade, for the build the loop completed itself");
        const original = runs.find((run) => run.runId === buildRunId);
        assert.equal(original.brief.gradeBaseline, undefined, "the interrupted build's record is untouched");
        const redriven = runs.find((run) => run.runId !== buildRunId && run.brief?.loop?.phase === "continue");
        assert.ok(redriven, "guard: the resume drove the reconstructed re-drive");
        assert.deepEqual(redriven.brief.gradeBaseline.failures, [], "the re-drive's record carries the baseline it was measured against");
        assert.equal(redriven.brief.gradeBaseline.priorDrives, 1, "…and says it was taken after one prior drive of this story");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 [outline] the three states a driven row can be in are told apart from the row alone (4 rows)",
    run: async () => {
      const readings = {};

      // ROW 1 — declares a rubric, completed a build and was graded.
      const graded = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const driver = completingDriver(graded, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(graded.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(graded.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03" }, gradingCtx(graded, {
          driver, report: capturingReport(), spawn: stubRubric(emitsPassing()),
        }));
        readings.gradedRow = state.driven.find((row) => row.phase === "continue");
      } finally {
        await graded.cleanup();
      }

      // ROW 2 — declares a rubric, was reconstructed by the resume path.
      const resumed = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, buildRunId } = await resumeOver(resumed);
        readings.reconstructedRow = redriveRow(state, buildRunId);
      } finally {
        await resumed.cleanup();
      }

      // ROW 3 — declares NO rubric, completed a build.
      const plainFx = await loopFixture({ cap: 3, reviewRounds: 9 });
      try {
        const driver = completingDriver(plainFx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(plainFx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(plainFx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03" }, gradingCtx(plainFx, { driver, report: capturingReport() }));
        readings.plainRow = state.driven.find((row) => row.phase === "continue");
      } finally {
        await plainFx.cleanup();
      }

      // ROW 4 — declares NO rubric, was reconstructed by the resume path.
      const plainResumed = await loopFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, buildRunId } = await resumeOver(plainResumed);
        readings.plainReconstructedRow = redriveRow(state, buildRunId);
      } finally {
        await plainResumed.cleanup();
      }

      const todaysKeys = ["ref", "phase", "runId", "outcome", "attempt", "cycle"];

      // ROW 1 READS: the verdict, the codes and the counts — and NO declared absence.
      assert.equal(readings.gradedRow.verdict, "pass", "[rubric / graded] the row reads the verdict");
      assert.ok(Array.isArray(readings.gradedRow.codes), "…the codes");
      assert.equal(typeof readings.gradedRow.cases.total, "number", "…and the counts");
      assert.equal(readings.gradedRow.gradeAbsence, undefined, "…and declares no absence");

      // ROW 2 READS: a declared absence naming the resume.
      assert.equal(readings.reconstructedRow.graded, false, "[rubric / reconstructed] the row reads a declared absence");
      assert.equal(readings.reconstructedRow.gradeAbsence, "reconstructed-on-resume", "…naming the resume");

      // ROWS 3 AND 4 READ: exactly the keys they carry today.
      assert.deepEqual(Object.keys(readings.plainRow), todaysKeys, "[no rubric / graded build] exactly the keys it carries today");
      assert.deepEqual(Object.keys(readings.plainReconstructedRow), todaysKeys, "[no rubric / reconstructed] exactly the keys it carries today");

      // AND THE THREE READINGS REALLY ARE PAIRWISE DISTINGUISHABLE FROM THE ROW ALONE.
      const shape = (row) => [row.verdict != null, row.graded === false].join("/");
      assert.notEqual(shape(readings.gradedRow), shape(readings.reconstructedRow), "graded and reconstructed are told apart");
      assert.notEqual(shape(readings.gradedRow), shape(readings.plainRow), "graded and unconfigured are told apart");
      assert.notEqual(shape(readings.reconstructedRow), shape(readings.plainRow), "reconstructed and unconfigured are told apart");
    },
  },

  {
    name: "81/02 an unconfigured repository's resumed document is byte-identical to today's",
    run: async () => {
      const fx = await loopFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, runs } = await resumeOver(fx);

        // NO DECLARATION OF ABSENCE APPEARS ON ANY ROW.
        for (const row of state.driven) {
          assert.equal(row.graded, undefined, "no declaration of absence appears on any row");
          assert.equal(row.gradeAbsence, undefined, "…on any row at all");
          assert.deepEqual(
            Object.keys(row),
            ["ref", "phase", "runId", "outcome", "attempt", "cycle"],
            "…and the row is the one the pre-grade shell produces",
          );
        }
        // AND NO GRADE KEY WAS WRITTEN ANYWHERE EITHER.
        for (const run of runs) {
          assert.equal(run?.brief?.grade, undefined, "the document is the one the pre-grade shell produces");
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 the frozen state contract is unchanged",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state } = await resumeOver(fx);

        // TEN TOP-LEVEL KEYS, IN THE SAME ORDER.
        assert.deepEqual(Object.keys(state), [...TOP_KEYS], "its top-level keys are exactly the ten it carries today, in the same order");
        // THE ACT'S KEYS ARE EXACTLY THE WHITELISTED ONES.
        assert.deepEqual(
          Object.keys(state.act).filter((key) => !ACT_KEYS.includes(key)),
          [],
          "the act's keys are exactly the whitelisted ones",
        );
        // THE STOP SET IS REPORTED IN FULL AND UNCHANGED.
        assert.deepEqual(state.stops, [...LOOP_STOPS], "the stop set is reported in full and unchanged");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/02 once the resumed loop completes a build of its own, that drive is graded normally",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, spawn, runs, buildRunId } = await resumeOver(fx);
        const row = redriveRow(state, buildRunId);

        // THE RUNNER IS LAUNCHED EXACTLY ONCE FOR THAT COMPLETED BUILD.
        assert.equal(spawn.calls.length, 1, "the runner is launched exactly once for that completed build");
        // THAT DRIVE'S ROW CARRIES THE VERDICT, THE CODES AND THE COUNTS.
        assert.equal(row.verdict, "pass", "that drive's row carries the verdict");
        assert.deepEqual(row.codes, [], "…the codes");
        assert.equal(row.cases.total, 2, "…and the counts");
        // AND THAT DRIVE'S RUN CARRIES THE GRADE ON ITS BRIEF — the verify run the pass
        // caused to start is the successor this grade rode to (`54/ADR-008 §3`).
        const gradedRuns = runs.filter((run) => run?.brief?.grade != null && run.runId !== buildRunId);
        assert.ok(gradedRuns.length > 0, "that drive's grade reached a run's brief");
        assert.equal(gradedRuns[0].brief.grade.verdict, "pass", "…carrying the verdict it earned");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
