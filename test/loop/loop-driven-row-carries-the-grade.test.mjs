// Traceability wiring for milestone 54 / story 03, task `01_the-driven-row-carries-the-grade`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/tasks/01_the-driven-row-carries-the-grade.feature
//
// `LoopState` IS A FROZEN DOCUMENT WITH THREE CONTRACTED CONSUMERS (62, 63, 78) and the
// contract is literal: `acd-loop-probe-contract` asserts `Object.keys(state)` DEEP-EQUALS ten
// keys, order included, and `actShape()` strips anything outside `ref`/`phase`/`stop`/
// `producer` from `state.act`. An eleventh key, or a `findings` key on `act`, is a
// renegotiation with three milestones for a fact none of them asked for.
//
// The `driven` array is the one place in that document which is per-drive, ADDITIVE and
// pinned by nobody — re-measured at HEAD, every assertion on `state.driven` in this tree is
// either `deepEqual(driven, [])` or a `.map()` projection. So the row gains the verdict, the
// code list and the observed counts, and NOTHING ABOVE IT MOVES. The assertions below are
// deliberately on the DOCUMENT the shell returns, never on the source that builds it.
import assert from "node:assert/strict";
import path from "node:path";

import { GRADE_CODES } from "../../src/work/grade.mjs";
import { gradeSummary, runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, replaceStatus } from "./loop-command-probe.test.mjs";
import {
  INDETERMINATE_OUTCOMES, capturingReport, emitsFailing, emitsPassing, gradingCtx,
  gradingFixture, scriptedDriver, stubRubric,
} from "../support/loop-grade-fixture.mjs";

// THE FROZEN TEN, ORDER INCLUDED — the same literal `acd-loop-probe-contract` pins, restated
// here so this task's own contract fails if the document is widened, whether or not the
// arch-test runs in the same pass.
const TOP_KEYS = Object.freeze(["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
// The row's shape before this story: the keys an UNGRADED drive still carries, exactly.
const ROW_KEYS = Object.freeze(["ref", "phase", "runId", "outcome", "attempt", "cycle"]);
const GRADE_ROW_KEYS = Object.freeze([...ROW_KEYS, "verdict", "codes", "cases"]);

const completingThrough = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

/** Run one loop over a graded fixture and answer the state it returned. */
async function loopWith(plan, { options = {}, driverFor = completingDriver } = {}) {
  const fx = await gradingFixture(options);
  try {
    const driver = driverFor(fx);
    const spawn = stubRubric(plan);
    const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));
    return { state, driver, spawn };
  } finally {
    await fx.cleanup();
  }
}

export const loopDrivenRowCarriesTheGradeTests = [
  {
    name: "54/03 task01 a graded drive's row carries the verdict, the codes and the observed counts",
    run: async () => {
      const { state } = await loopWith(emitsFailing([["beta", "beta did not close"]], ["alpha", "gamma"]), {
        options: { cap: 2, reviewRounds: 9 },
      });
      const row = state.driven.find((entry) => entry.phase === "continue");
      assert.ok(row, "guard: a build was driven and graded");

      // THE VERDICT.
      assert.equal(row.verdict, "fail", "the driven row carries the grade's verdict");
      // THE CODES, IN THE FROZEN ORDER THEY ARE DECLARED IN. Asserted as a SUBSEQUENCE of
      // `GRADE_CODES` rather than against a literal, so the property survives the vocabulary
      // being extended and cannot be satisfied by a list that happens to be alphabetical.
      assert.deepEqual(row.codes, ["case-failed"]);
      const positions = row.codes.map((code) => GRADE_CODES.indexOf(code));
      assert.equal(positions.every((at) => at >= 0), true, "every code on the row is a GRADE_CODES member");
      assert.deepEqual(positions, [...positions].sort((left, right) => left - right), "the codes read in GRADE_CODES' own frozen order");
      // …AND THE ORDER IS OBSERVED WITH MORE THAN ONE CODE (review defect QA-3). The
      // monotonicity check above is trivially true of a one-element list, so the ordering
      // rule was never measured: reversing `gradeSummary`'s comparator left the whole story
      // green. This runner cannot be made to emit two codes for one cycle without a second
      // producer, so the property is taken at the EXPORTED HELPER'S DOOR — the one place the
      // ordering is performed — with the two codes supplied in the reverse of their declared
      // order, so a comparator that does nothing, or sorts the other way, fails here.
      const reversed = gradeSummary({
        configured: true,
        grade: { verdict: "fail", codes: ["case-unjoined", "case-failed"], cases: { total: 3, failed: 1, skipped: 0 } },
      });
      assert.deepEqual(reversed.codes, ["case-failed", "case-unjoined"], "two codes read in GRADE_CODES' own frozen order, whatever order they were observed in");
      assert.deepEqual(
        reversed.codes.map((code) => GRADE_CODES.indexOf(code)),
        [GRADE_CODES.indexOf("case-failed"), GRADE_CODES.indexOf("case-unjoined")],
        "…and those positions are the declaration's own, not an alphabetical coincidence",
      );
      assert.ok(GRADE_CODES.indexOf("case-failed") < GRADE_CODES.indexOf("case-unjoined"), "guard: the declared order is the one asserted above");
      // THE OBSERVED CASE TOTALS.
      assert.deepEqual(row.cases, { total: 3, failed: 1, skipped: 0 }, "the row carries the observed case totals");
    },
  },

  {
    name: "54/03 task01 the ten top-level keys are exactly the ten, in the same order",
    run: async () => {
      // TAKEN OVER EVERY SHAPE OF STATE THIS SHELL RETURNS — a done loop, a re-driving one,
      // and one halted by the grade — because a document is only frozen if it is frozen on
      // every exit.
      const shapes = [
        await loopWith(emitsPassing(), { options: { cap: 3 }, driverFor: completingThrough }),
        await loopWith(emitsFailing(), { options: { cap: 2, reviewRounds: 9 } }),
        await loopWith(INDETERMINATE_OUTCOMES["runner-timeout"](), { options: { cap: 3 } }),
      ];
      assert.deepEqual(shapes.map(({ state }) => state.state), ["done", "halted", "halted"], "guard: three genuinely different exits");
      for (const { state } of shapes) {
        // ITS TOP-LEVEL KEY SET DEEP-EQUALS THE FROZEN TEN, ORDER INCLUDED.
        assert.deepEqual(Object.keys(state), [...TOP_KEYS], "LoopState's key set and order are the frozen ten");
        // AND NO KEY WAS ADDED FOR THE GRADE.
        assert.equal(Object.keys(state).some((key) => /grade|verdict|codes|cases/iu.test(key)), false, "no top-level key was added for the grade");
        // AND THE THREE CONSUMERS OF THAT DOCUMENT RENEGOTIATE NOTHING: every fact they read
        // is where it was, and the grade rides `driven` — the one per-drive, additive place.
        assert.equal(typeof state.scope, "string");
        assert.equal(Array.isArray(state.stops), true);
        assert.deepEqual(Object.keys(state.resumable), ["stranded", "lastDeclaration"]);
        assert.equal(Array.isArray(state.driven), true);
      }
      const graded = shapes[1].state.driven.filter((row) => row.verdict != null);
      assert.ok(graded.length > 0, "…and the grade really did land, on the driven rows");
    },
  },

  {
    name: "54/03 task01 the act whitelist is untouched",
    run: async () => {
      // A DRIVE ACT: the loop still in flight, taken off the probe's own read.
      const drive = await loopWith(emitsFailing(), { options: { cap: 2, reviewRounds: 9 } });
      // A HALT ACT produced by the grade rung itself — the act most likely to have acquired
      // a grade fact, since a grade is what produced it.
      const halt = await loopWith(INDETERMINATE_OUTCOMES["report-vacuous"](), { options: { cap: 3 } });

      // A HALT ACT CARRIES ONLY `ref`, `stop` AND `producer` (plus the `act` discriminator).
      assert.deepEqual(Object.keys(halt.state.act), ["act", "ref", "stop", "producer"], "the halt act's key set is the whitelist");
      assert.equal(halt.state.act.stop, "grade-indeterminate", "guard: the halt really came from the grade rung");

      // AND NO GRADE FACT REACHED THE ACT — on either shape.
      for (const { state } of [drive, halt]) {
        const admitted = new Set(["act", "ref", "phase", "stop", "producer", "round", "cap", "blockerClasses", "findings", "workItems", "deadline", "ceilingMs", "elapsedMs", "disposition", "resets", "stalls", "resetBound", "summary", "failingCount", "noProgressRounds", "progressBound"]);
        for (const key of Object.keys(state.act)) assert.ok(admitted.has(key), `act key ${key} is outside actShape()'s whitelist`);
        assert.equal(Object.keys(state.act).some((key) => ["verdict", "codes", "cases", "grade"].includes(key)), false, "no grade fact reached the act");
      }
      // And the drive-shaped act still carries what it carried: this loop halted at its cap,
      // so its act is the cap halt — the whitelist is asserted above on both.
      assert.equal(drive.state.act.stop, "cap-exhausted");
    },
  },

  {
    name: "54/03 task01 an ungraded drive's row is exactly what it is today",
    run: async () => {
      // A REPOSITORY THAT DECLARES NO `work.rubric`, and a loop that drove a build.
      const { state, spawn } = await loopWith(emitsFailing(), {
        options: { cap: 3, rubric: null },
        driverFor: completingThrough,
      });
      assert.equal(spawn.calls.length, 0, "guard: nothing was launched, because nothing was declared");
      assert.ok(state.driven.length > 0, "guard: a build really was driven");
      for (const row of state.driven) {
        // THE DRIVEN ROW CARRIES THE SAME KEYS IT CARRIES TODAY.
        assert.deepEqual(Object.keys(row), [...ROW_KEYS], "the row's key set is the ungraded one, order included");
        // AND IT CARRIES NO VERDICT, NO CODES AND NO COUNTS.
        assert.equal(row.verdict, undefined);
        assert.equal(row.codes, undefined);
        assert.equal(row.cases, undefined);
      }
    },
  },

  {
    name: "54/03 task01 [outline] every verdict is reported on the row, including the ones that stop the loop (3 rows)",
    run: async () => {
      const rows = [
        { verdict: "pass", plan: emitsPassing(["alpha", "beta"]), driverFor: completingThrough, options: { cap: 3 }, cases: { total: 2, failed: 0, skipped: 0 } },
        { verdict: "fail", plan: emitsFailing([["beta", "boom"]], ["alpha"]), options: { cap: 2, reviewRounds: 9 }, cases: { total: 2, failed: 1, skipped: 0 } },
        // The counts are the EVIDENCE and are reported even when there were none to observe —
        // a timed-out runner enumerated nothing, and saying `0 of 0` is the honest report.
        { verdict: "indeterminate", plan: INDETERMINATE_OUTCOMES["runner-timeout"](), options: { cap: 3 }, cases: { total: 0, failed: 0, skipped: 0 } },
      ];
      for (const row of rows) {
        const { state } = await loopWith(row.plan, { options: row.options, ...(row.driverFor ? { driverFor: row.driverFor } : {}) });
        const driven = state.driven.find((entry) => entry.phase === "continue");
        // THE DRIVEN ROW'S VERDICT READS <verdict>.
        assert.equal(driven.verdict, row.verdict, `[${row.verdict}] the driven row's verdict reads ${row.verdict}`);
        // AND THE OBSERVED COUNTS ARE REPORTED WHETHER OR NOT THE VERDICT IS <verdict>.
        assert.deepEqual(driven.cases, row.cases, `[${row.verdict}] the observed counts are reported`);
        assert.deepEqual(Object.keys(driven), [...GRADE_ROW_KEYS], `[${row.verdict}] the graded row's key set is exact`);
      }
    },
  },

  {
    name: "54/03 task01 a retried drive on the same cycle gets its own row",
    run: async () => {
      // A BUILD PHASE THAT FAILED ONCE AND WAS RETRIED ON THE SAME LINEAGE — the run store's
      // own retry, `attempt + 1` with `retryOf` linking the two.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const driver = scriptedDriver([{ outcome: "failed", failureReason: "timeout" }, { outcome: "done" }]);
        const spawn = stubRubric(emitsFailing([["beta", "still red"]], ["alpha"]));
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        const attempts = state.driven.filter((row) => row.phase === "continue" && row.cycle === 1);
        // EACH ATTEMPT HAS ITS OWN DRIVEN ROW.
        assert.deepEqual(attempts.map((row) => row.attempt), [1, 2], "the failed attempt and its retry each have a row, on the same cycle");
        assert.equal(new Set(attempts.map((row) => row.runId)).size, 2, "…each naming its own run");
        assert.deepEqual(attempts.map((row) => row.outcome), ["failed", "done"], "…and its own outcome");

        // AND NO ROW OVERWROTE ANOTHER'S. The grade is attached to the row of the run it
        // graded, found by RUN ID and never by position, so the failed attempt's row is
        // exactly the row it was before the grade existed.
        assert.deepEqual(Object.keys(attempts[0]), [...ROW_KEYS], "the failed attempt's row is untouched by the grade of another attempt");
        assert.deepEqual(Object.keys(attempts[1]), [...GRADE_ROW_KEYS], "the graded attempt's row carries its own grade");
        assert.equal(attempts[1].verdict, "fail");
        assert.equal(spawn.calls.length >= 1, true, "guard: the runner was launched for the completed build");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task01 the existing projections over driven rows still read",
    run: async () => {
      // THE SHIPPED PROJECTIONS, applied verbatim: the four this tree actually performs over
      // `state.driven` (`loop-command-gate:37`, `sequencing:23`, `stops:251,434`), plus the
      // loop's own `reportLine` projection. Each must still yield what it yields today.
      const { state } = await loopWith(emitsFailing(), { options: { cap: 2, reviewRounds: 9 } });
      assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2]);
      assert.deepEqual(state.driven.map(({ ref, phase, cycle }) => ({ ref, phase, cycle })), [
        { ref: "03/01", phase: "continue", cycle: 1 },
        { ref: "03/01", phase: "continue", cycle: 2 },
      ]);
      assert.deepEqual(state.driven.map((row) => row.attempt), [1, 1]);
      assert.deepEqual(state.driven.map(({ attempt }) => attempt), [1, 1]);
      assert.deepEqual(
        state.driven.map((row) => `Driven ${row.ref} — ${row.phase} (${row.outcome}).`),
        ["Driven 03/01 — continue (done).", "Driven 03/01 — continue (done)."],
        "the loop's own report projection is unchanged",
      );

      // AND AN EMPTY LOOP STILL REPORTS AN EMPTY DRIVEN ARRAY — the probe read, which mints
      // nothing and therefore drives nothing.
      const fx = await gradingFixture({ cap: 3 });
      try {
        const { getCommand } = await import("../../src/command-core.mjs");
        const probe = await getCommand("work:loop").run({ scope: "03" }, gradingCtx(fx, { driver: completingDriver(fx), spawn: stubRubric(emitsPassing()) }));
        assert.deepEqual(probe.driven, [], "an empty loop still reports an empty driven array");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
