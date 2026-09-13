// Traceability wiring for milestone 54 / story 03, task `03_only-fail-redrives`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/tasks/03_only-fail-redrives.feature
//
// THIS IS THE RUNG'S ROUTING, and it is the last place the milestone could quietly turn an
// absence of evidence into a green light. The rule is a closed table: `pass` crosses to
// verify, `fail` re-drives up to `cap`, `indeterminate` halts — with one named exception,
// `rubric-unconfigured`, which proceeds EXACTLY as today. That last row is the whole
// no-regression rule (ADR-002 §3, ADR-004 §4) and it is **not** "indeterminate read as
// `pass`": no path ever records a `pass`, the record says `indeterminate`, and the loop
// behaves byte-for-byte as it does.
//
// TWO CONTRACT DISCREPANCIES ARE FLAGGED RATHER THAN PAPERED OVER, both recorded in the
// milestone's STATE.md `## Feedback (for retro)`:
//
//   (a) the outline's last row asserts *"the loop state records the verdict as
//       indeterminate"* for `rubric-unconfigured`. That contradicts the SIBLING task
//       (`01_the-driven-row-carries-the-grade`, *"an ungraded drive's row … carries no
//       verdict, no codes and no counts"*), and contradicts task 00's *"no grade key is
//       written to the run's brief"*. The byte-identical guarantee wins: what records the
//       verdict for an unconfigured repository is `work:grade`'s own answer, asserted below
//       at that door, and the loop state records nothing.
//
//   (b) *"the stop set it reports is exactly nine ids"* was measured when `LOOP_STOPS` held
//       eight. Between this contract being authored and this build, 69's in-flight work
//       added `deadline-exhausted`, `progress-exhausted` and `no-progress`. The PROPERTY the
//       scenario protects — 54 adds exactly ONE member, and every other id is unrenamed — is
//       asserted in full; the literal count is not, because it is now twelve.
import assert from "node:assert/strict";
import path from "node:path";

import { GRADE_CODES } from "../../src/work/grade.mjs";
import { LOOP_REFUSALS, LOOP_STOPS } from "../../src/work/loop.mjs";
import { getCommand, invoke } from "../../src/command-core.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, replaceStatus } from "./loop-command-probe.test.mjs";
import {
  INDETERMINATE_OUTCOMES, capturingReport, emits, emitsFailing, emitsPassing, findingsFrom,
  gradingCtx, gradingFixture, lastLine, stubRubric,
} from "../support/loop-grade-fixture.mjs";

// THE EIGHT `LOOP_STOPS` HELD WHEN THIS CONTRACT WAS AUTHORED — "the other eight … the ones
// reported today, unrenamed".
const STOPS_BEFORE_54 = Object.freeze([
  "uat-gate", "dependency-blocked", "cap-exhausted", "session-needs-input",
  "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt",
]);
// The three that arrived from milestone 69's in-flight work, named so the count below is a
// measurement with a stated provenance rather than a number somebody adjusted until it passed.
const STOPS_FROM_69 = Object.freeze(["deadline-exhausted", "progress-exhausted", "no-progress"]);
// The one member milestone 54 contributes.
const STOP_FROM_54 = "grade-indeterminate";
// The three that 129/01 appended LAST (129/ADR-008 §5) — the lane stops, named with the same
// provenance so "54 contributes exactly one" stays a measurement over a set of known origin.
const STOPS_FROM_129 = Object.freeze(["lane-open-failed", "lane-merge-refused", "lane-merge-conflict"]);

// A story is graded on the DELTA from a baseline the shell measures before its first drive
// (2026-09-12): every spawn count below is that one measurement plus the grades the contract
// states. The stub answers the baseline with a clean tree by default, so every plan here still
// means "the grade says X".
const BASELINE_NOTE = "the baseline (one spawn per story lineage, before its first drive) plus";

const completingThrough = (fx, extra = {}) => completingDriver(fx, {
  onCommand(command) {
    extra.onCommand?.(command);
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

export const loopOnlyFailRedrivesTests = [
  {
    // 2026-09-12 — THE DEADLOCK THE BASELINE EXISTS TO BREAK, measured live on 127/01: the
    // whole fitness tier over a shared checkout was red on seven cases and none was the
    // story's — two red at HEAD, three from other lanes, two from the milestone's OWN
    // ARCHITECTURE citing modules its later stories create — so `fail` re-drove the story
    // four times for reds it could not touch and the loop never reached the stories that
    // would have cleared them. A story is graded on the DELTA from a baseline taken before
    // its first drive: a red the baseline already carried is INHERITED and routes as a pass;
    // a red the baseline did not carry is the story's own and re-drives exactly as before.
    name: "the grade is a delta — a red the baseline already carried is inherited and crosses to verify; a new red re-drives",
    run: async () => {
      const cases = [
        { label: "inherited only", baseline: [["alpha", "red before the story"]], grade: [["alpha", "red before the story"]], expect: "verify", own: 0, inherited: 1 },
        { label: "inherited plus own", baseline: [["alpha", "red before the story"]], grade: [["alpha", "red before the story"], ["beta", "the story broke beta"]], expect: "continue", own: 1, inherited: 1 },
        { label: "own only", baseline: [], grade: [["beta", "the story broke beta"]], expect: "continue", own: 1, inherited: 0 },
      ];
      for (const row of cases) {
        const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
        try {
          const driver = row.expect === "verify" ? completingThrough(fx) : completingDriver(fx);
          const baseline = row.baseline.length === 0 ? emitsPassing(["gamma"]) : emitsFailing(row.baseline, ["gamma"]);
          const spawn = stubRubric(emitsFailing(row.grade, ["gamma"]), { baseline });
          const report = capturingReport();
          const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));
          const label = `[${row.label}]`;
          const directives = driver.typed.map((input) => input.split("\n\n")[0]);

          if (row.expect === "verify") {
            assert.ok(directives.includes("/aof:verify 03/01"), `${label} an inherited red does not hold the story: it crosses to verify`);
            assert.equal(directives.filter((directive) => directive === "/aof:continue 03/01").length, 1, `${label} …and never re-drives`);
            assert.equal(state.state, "done", `${label} …and the loop completes`);
          } else {
            assert.equal(directives.filter((directive) => directive === "/aof:continue 03/01").length, 2, `${label} the story's own red re-drives continue`);
            assert.equal(directives.includes("/aof:verify 03/01"), false, `${label} …and never crosses to verify`);
          }

          // THE ROW CARRIES THE DELTA: the story's own count, over the whole tier's total.
          const driven = state.driven.find((entry) => entry.phase === "continue");
          assert.equal(driven.verdict, row.own > 0 ? "fail" : "pass", `${label} the row's verdict is the delta's`);
          assert.equal(driven.cases.failed, row.own, `${label} the row counts the story's own failures`);
          assert.equal(driven.cases.total, row.grade.length + 1, `${label} …over every case the runner enumerated`);

          // THE NARRATION NAMES WHAT WAS EXCLUDED, and the baseline announced itself first.
          const lines = report.lines;
          const baselineLine = lines.find((line) => line.startsWith("Baseline work:grade 03/01"));
          assert.ok(baselineLine, `${label} the baseline is narrated — got ${JSON.stringify(lines)}`);
          assert.match(baselineLine, new RegExp(`— ${row.baseline.length} failing case\\(s\\) inherited`, "u"), `${label} …with the count it carries`);
          const gateLine = lines.find((line) => line.startsWith("Gate work:grade 03/01"));
          assert.ok(gateLine, `${label} the grade rung is narrated`);
          if (row.inherited > 0) {
            assert.match(gateLine, new RegExp(`\\(${row.inherited} inherited, excluded by the baseline\\)`, "u"), `${label} the rung names the inherited count`);
          } else {
            assert.equal(/inherited/u.test(gateLine), false, `${label} nothing inherited, nothing claimed`);
          }

          // THE RECORD SAYS WHAT WAS EXCLUDED: the baseline rides the graded drive's brief, and a
          // re-drive carries the delta it was decided on beside the same baseline.
          const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
          const graded = runs.find((run) => run.runId === driven.runId);
          assert.deepEqual(graded.brief.gradeBaseline.failures, row.baseline.map(([name]) => name), `${label} the graded drive carries the baseline it was measured against`);
          assert.equal(graded.brief.gradeBaseline.priorDrives, 0, `${label} …taken before the story's first drive`);
          if (row.expect === "continue") {
            const redriven = runs.find((run) => run.brief?.loop?.cycle === 2 && run.brief?.loop?.phase === "continue");
            assert.deepEqual(redriven.brief.grade.failures.map((failure) => failure.case), ["beta"], `${label} the re-drive carries only the story's own red`);
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "54/03 task03 [outline] the verdict decides the act, and nothing else does (8 rows)",
    run: async () => {
      const rows = [
        { verdict: "pass", code: "none", act: "drive verify" },
        { verdict: "fail", code: "case-failed", act: "drive continue" },
        { verdict: "indeterminate", code: "runner-timeout", act: "halt grade-indeterminate" },
        { verdict: "indeterminate", code: "runner-spawn-failed", act: "halt grade-indeterminate" },
        { verdict: "indeterminate", code: "report-missing", act: "halt grade-indeterminate" },
        { verdict: "indeterminate", code: "report-unreadable", act: "halt grade-indeterminate" },
        { verdict: "indeterminate", code: "report-vacuous", act: "halt grade-indeterminate" },
        { verdict: "indeterminate", code: "rubric-unconfigured", act: "proceed as today" },
      ];
      for (const row of rows) {
        const unconfigured = row.code === "rubric-unconfigured";
        const crosses = row.act === "drive verify" || row.act === "proceed as today";
        const fx = await gradingFixture({
          cap: crosses ? 3 : 2,
          reviewRounds: 9,
          ...(unconfigured ? { rubric: null } : {}),
        });
        try {
          const driver = crosses ? completingThrough(fx) : completingDriver(fx);
          const plan = row.verdict === "pass"
            ? emitsPassing(["alpha", "beta"])
            : row.verdict === "fail"
              ? emitsFailing([["beta", "beta did not close"]], ["alpha"])
              : (INDETERMINATE_OUTCOMES[row.code] ?? (() => emitsPassing()))();
          const spawn = stubRubric(plan);
          const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));
          const label = `[${row.verdict}/${row.code}]`;
          const directives = driver.typed.map((input) => input.split("\n\n")[0]);

          // THE LOOP'S ACT IS <act>.
          if (row.act === "drive verify" || row.act === "proceed as today") {
            assert.ok(directives.includes("/aof:verify 03/01"), `${label} the loop drives verify for that story`);
            assert.equal(state.state, "done", `${label} …and the loop completes`);
            assert.equal(state.act.stop, undefined, `${label} no halt was produced`);
          } else if (row.act === "drive continue") {
            assert.deepEqual(
              directives.filter((directive) => directive === "/aof:continue 03/01").length,
              2,
              `${label} the loop re-drives continue`,
            );
            assert.equal(directives.includes("/aof:verify 03/01"), false, `${label} …and never crosses to verify`);
          } else {
            assert.equal(state.act.stop, "grade-indeterminate", `${label} the loop halts on grade-indeterminate`);
            assert.equal(state.act.producer, `work:grade:${row.code}`, `${label} …attributed to the code it returned`);
            assert.equal(directives.filter((directive) => directive === "/aof:continue 03/01").length, 1, `${label} …without re-driving`);
          }

          // AND THE LOOP STATE RECORDS THE VERDICT AS <verdict> — for every row where a
          // rubric was declared. For `rubric-unconfigured` (flag (a) in this file's header)
          // the loop state deliberately records NOTHING, and the verdict is recorded where
          // it exists: on `work:grade`'s own answer, asserted at that door.
          const driven = state.driven.find((entry) => entry.phase === "continue");
          if (unconfigured) {
            assert.equal(driven.verdict, undefined, `${label} the loop state records nothing — byte-identical to today`);
            const answer = await invoke("work:grade", { ref: "03/01", run: true }, fx.ctx);
            assert.equal(answer.grade.verdict, "indeterminate", `${label} the grade itself records indeterminate`);
            assert.deepEqual(answer.grade.codes, ["rubric-unconfigured"], `${label} …with rubric-unconfigured`);
            assert.equal(spawn.calls.length, 0, `${label} and nothing was launched`);
          } else {
            assert.equal(driven.verdict, row.verdict, `${label} the loop state records the verdict`);
            if (row.code !== "none") assert.ok(driven.codes.includes(row.code), `${label} …with the code that produced it`);
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },

  {
    name: "54/03 task03 an unconfigured rubric meets no new refusal anywhere in the loop",
    run: async () => {
      // A REPOSITORY THAT DECLARES NO `work.rubric`, AND A STORY WHOSE VALIDATE AND DOCTOR
      // GATES REPORT CLEAN — the ordinary repository on the day it installs aof.
      const fx = await gradingFixture({ cap: 3, rubric: null });
      try {
        const report = capturingReport();
        const driver = completingThrough(fx);
        const spawn = stubRubric(emitsFailing());
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));

        assert.deepEqual(report.gates(), ["work:validate", "work:doctor"], "guard: both deterministic rungs walked clean");
        // THE LOOP CROSSES TO `verify`.
        assert.ok(driver.typed.some((input) => input.startsWith("/aof:verify 03/01")), "the loop crosses to verify");
        assert.equal(state.state, "done");
        // AND NO HALT WAS PRODUCED BY THE GRADE RUNG.
        assert.equal(state.act.act, "done", "no halt at all");
        assert.equal(report.lines.some((line) => line.includes("grade-indeterminate")), false, "the grade rung produced no halt");
        assert.deepEqual(report.gradeLines(), [], "…and announced no rung, for a rubric nobody declared");
        assert.equal(spawn.calls.length, 0, "nothing was launched");

        // AND THE GRADE RECORDED `indeterminate` WITH `rubric-unconfigured`.
        const answer = await invoke("work:grade", { ref: "03/01", run: true }, fx.ctx);
        assert.equal(answer.grade.verdict, "indeterminate");
        assert.deepEqual(answer.grade.codes, ["rubric-unconfigured"]);
        // AND NO PATH RECORDED A `pass`. Swept over every surface this loop wrote: the run
        // records it minted, the loop state it returned, and the operator report it printed.
        const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
        assert.equal(runs.some((run) => run.brief?.grade != null), false, "no run record carries a grade at all");
        assert.equal(state.driven.some((row) => row.verdict != null), false, "no driven row carries a verdict");
        assert.equal(report.lines.some((line) => /verdict=pass|graded pass|"verdict":"pass"/u.test(line)), false, "no report line records a pass");
      } finally {
        await fx.cleanup();
      }

      // ---- THE BOUNDARY'S OTHER SIDE: A DECLARED RUBRIC THAT COULD NOT BE GRADED --------
      //
      // 54/03 review finding D3, root cause. `runLoopBody` caught everything `work:grade`
      // could throw and left `gradeResult` NULL — and a null answer reads as
      // `configured !== true` at every door in this file, which is EXACTLY the
      // `rubric-unconfigured` row above: the one `indeterminate` that proceeds as today. So a
      // repository that DID declare a rubric, whose grade could not be taken, met the
      // no-regression path meant for a repository that declared none.
      //
      // Measured before the fix, with the registered command made to throw `EPERM` (the shape
      // a saturated `%TEMP%` produces on this machine, and the shape the reviewer's
      // intermittent failures took): directives `["/aof:continue 03/01", "/aof:verify 03/01",
      // "/aof:verify 03"]`, `state=done`, **0 of 2 runs carrying a grade** — a `fail` fixture
      // reported as a completed loop. Silently, too: `reportDegrade` throttles the second
      // occurrence in a process to nothing at all.
      //
      // THE DECLARATION IS WHAT TELLS THE TWO APART, and it is asserted from both sides in
      // one place so neither can drift onto the other's path.
      const faults = [];
      for (const declared of [true, false]) {
        const fx = await gradingFixture({ cap: 2, reviewRounds: 9, ...(declared ? {} : { rubric: null }) });
        const graded = getCommand("work:grade");
        const originalGrade = graded.run.bind(graded);
        graded.run = async () => { throw Object.assign(new Error("EPERM: operation not permitted, scandir"), { code: "EPERM" }); };
        try {
          const driver = completingThrough(fx);
          const report = capturingReport();
          const spawn = stubRubric(emitsFailing([["beta", "beta did not close"]], ["alpha"]));
          const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));
          const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
          faults.push({
            declared,
            stop: state.act.stop ?? null,
            producer: state.act.producer ?? null,
            loopState: state.state,
            directives: driver.typed.map((input) => input.split("\n\n")[0]),
            graded: runs.filter((run) => run.brief?.grade != null).length,
            verdicts: state.driven.filter((row) => row.verdict != null).length,
          });
        } finally {
          graded.run = originalGrade;
          await fx.cleanup();
        }
      }
      const [withRubric, withoutRubric] = faults;

      // A DECLARED RUBRIC THAT COULD NOT BE GRADED HALTS — the run told us NOTHING about
      // whether the item is correct, which is ADR-007 §3's `indeterminate` row.
      assert.equal(withRubric.stop, "grade-indeterminate", "a declared rubric whose grade could not be taken halts");
      assert.equal(withRubric.loopState, "halted");
      assert.equal(withRubric.producer, "work:grade", "…attributed to the command, with no code to name and none invented");
      assert.equal(withRubric.directives.includes("/aof:verify 03/01"), false, "…and it never crosses to verify on an answer nobody got");
      // AND NO RECORD IS FABRICATED FOR IT: an item that was not graded contributes nothing,
      // exactly as an item that was never graded does.
      assert.equal(withRubric.graded, 0, "no run's brief carries a grade that was never taken");
      assert.equal(withRubric.verdicts, 0, "no driven row carries a verdict that was never returned");

      // AND THE UNCONFIGURED REPOSITORY IS UNTOUCHED BY ALL OF IT — the same fault, and the
      // loop still behaves byte-for-byte as today. This is the half ADR-002 §3 protects, and
      // it is measured under the SAME fault rather than assumed to be unaffected by it.
      assert.equal(withoutRubric.stop, null, "an unconfigured repository meets no new refusal, fault or no fault");
      assert.equal(withoutRubric.loopState, "done");
      assert.ok(withoutRubric.directives.includes("/aof:verify 03/01"), "…and still crosses to verify");
      assert.equal(withoutRubric.graded, 0, "…recording no grade, because there was none");
    },
  },

  {
    name: "54/03 task03 a failing grade re-drives up to the cap and then exhausts",
    run: async () => {
      // A STORY WHOSE GRADE RETURNS `fail` ON EVERY CYCLE, and a review budget clear of the
      // cycle cap so the CYCLE cap is the bound under test.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const report = capturingReport();
        const driver = completingDriver(fx);
        const spawn = stubRubric([
          emitsFailing([["case-1", "cycle one red"]], ["alpha"]),
          emitsFailing([["case-2", "cycle two red"]], ["alpha"]),
          emitsFailing([["case-3", "cycle three red"]], ["alpha"]),
        ]);
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));

        // EACH CYCLE RE-DRIVES `continue`.
        assert.deepEqual(
          state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle),
          [1, 2, 3],
          "the loop re-drove continue on every cycle up to the cap",
        );
        assert.equal(state.driven.some((row) => row.phase === "verify"), false, "and never crossed to verify");
        assert.equal(spawn.calls.length, 1 + 3, `${BASELINE_NOTE} once per cycle`);
        // AND THE CYCLE AT THE CAP HALTS ON `cap-exhausted`.
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "engine:cycle>=cap");
        // AND THE HALT CARRIES THE ACCUMULATED RECORD.
        const record = findingsFrom(lastLine(report));
        assert.equal(record.length, 3, "all three cycles' grades are in the record");
        const messages = JSON.stringify(record);
        for (const cycle of ["cycle one red", "cycle two red", "cycle three red"]) {
          assert.ok(messages.includes(cycle), `${cycle} is in the accumulated record`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task03 an indeterminate grade halts immediately rather than retrying",
    run: async () => {
      // A STORY WHOSE GRADE RETURNS `indeterminate` WITH `runner-timeout`, over a cap that
      // would happily admit two more cycles — so "immediately" is a real claim.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const driver = completingDriver(fx);
        const spawn = stubRubric(INDETERMINATE_OUTCOMES["runner-timeout"]());
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        // THE LOOP HALTS ON `grade-indeterminate`.
        assert.equal(state.act.stop, "grade-indeterminate");
        assert.equal(state.state, "halted");
        // AND IT DOES NOT RE-DRIVE THE BUILD.
        assert.deepEqual(driver.typed.map((input) => input.split("\n\n")[0]), ["/aof:continue 03/01"], "one build, and no second");
        assert.equal(spawn.calls.length, 1 + 1, `${BASELINE_NOTE} one grade`);
        // AND THE CYCLE COUNT WAS NOT CONSUMED BY A RETRY: one continue row, at cycle 1, of
        // three the cap would have allowed.
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1]);
        assert.equal(state.cap, 3, "…with two cycles still unspent");
        assert.deepEqual(state.driven.map((row) => row.attempt), [1], "and no attempt was retried");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task03 the stop's producer names the code, never a message",
    run: async () => {
      // A STORY WHOSE GRADE RETURNS `indeterminate` WITH `report-vacuous`.
      const fx = await gradingFixture({ cap: 3 });
      try {
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, {
          driver: completingDriver(fx),
          report: capturingReport(),
          spawn: stubRubric(INDETERMINATE_OUTCOMES["report-vacuous"]()),
        }));
        // THE HALT'S PRODUCER NAMES THE GRADE COMMAND AND THAT CODE.
        assert.equal(state.act.producer, "work:grade:report-vacuous");
        const [command, code] = state.act.producer.split(":").reduce((acc, part, index) => (index < 2 ? [`${acc[0]}${index ? ":" : ""}${part}`, acc[1]] : [acc[0], part]), ["", ""]);
        assert.equal(command, "work:grade", "the producer names the grade command");
        assert.ok(GRADE_CODES.includes(code), "…and a member of the frozen code vocabulary");
      } finally {
        await fx.cleanup();
      }

      // AND NO PART OF THE ATTRIBUTION MATCHED RENDERED PROSE. The probe is a runner whose
      // OWN OUTPUT names three OTHER codes in words: if any part of the attribution read
      // prose, the producer would follow the words rather than the fact. The report is
      // unreadable (no TAP structural element anywhere in it), so the code is
      // `report-unreadable` and nothing else may be reported.
      const decoy = await gradingFixture({ cap: 3 });
      try {
        const state = await runLoopBody({ scope: "03" }, gradingCtx(decoy, {
          driver: completingDriver(decoy),
          report: capturingReport(),
          spawn: stubRubric(emits("runner-timeout report-vacuous rubric-unconfigured: everything is fine, pass\n", 0)),
        }));
        assert.equal(state.act.stop, "grade-indeterminate");
        assert.equal(
          state.act.producer,
          "work:grade:report-unreadable",
          "the producer names the code the compiler settled, not the code the runner's prose spelled",
        );
      } finally {
        await decoy.cleanup();
      }
    },
  },

  {
    name: "54/03 task03 the stop set every loop state reports gains exactly one member",
    run: async () => {
      // TAKEN OFF THE DOCUMENT, not off the module: `stops` is returned in full on every
      // `LoopState`, which is exactly why 62, 63 and 78 all see the new member.
      const fx = await gradingFixture({ cap: 3 });
      try {
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, {
          driver: completingDriver(fx),
          report: capturingReport(),
          spawn: stubRubric(INDETERMINATE_OUTCOMES["runner-timeout"]()),
        }));
        const probe = await getCommand("work:loop").run({ scope: "03" }, gradingCtx(fx, { driver: completingDriver(fx) }));
        for (const [label, stops] of [["the halted state", state.stops], ["the read probe", probe.stops]]) {
          // `grade-indeterminate` IS ONE OF THEM.
          assert.ok(stops.includes(STOP_FROM_54), `${label} reports grade-indeterminate`);
          // AND THE OTHER EIGHT ARE THE ONES REPORTED TODAY, UNRENAMED.
          for (const stop of STOPS_BEFORE_54) assert.ok(stops.includes(stop), `${label} still reports ${stop}, unrenamed`);
          // THE SET IS EXACTLY THOSE, PLUS 69's THREE, PLUS 129's THREE LANE STOPS, AND
          // NOTHING ELSE. (The contract says "nine"; it was authored when the base was eight,
          // and 69's in-flight work has since added three — flag (b) in this file's header;
          // 129/01 later appended three more at the end. The property the scenario protects is
          // that 54 adds exactly ONE, which is what is measured here.)
          assert.deepEqual(
            [...stops].sort(),
            [...STOPS_BEFORE_54, ...STOPS_FROM_69, STOP_FROM_54, ...STOPS_FROM_129].sort(),
            `${label} reports the eight, 69's three, 54's one and 129's three — and no other`,
          );
          const contributedBy54 = stops.filter((stop) => !STOPS_BEFORE_54.includes(stop) && !STOPS_FROM_69.includes(stop) && !STOPS_FROM_129.includes(stop));
          assert.deepEqual(contributedBy54, [STOP_FROM_54], "milestone 54 contributes exactly one member");
          assert.deepEqual([...stops], [...LOOP_STOPS], `${label} reports the closed set in full`);
        }
        assert.equal(Object.isFrozen(LOOP_STOPS), true, "the set stays CLOSED");
        assert.throws(() => LOOP_STOPS.push("sixteenth"), TypeError);

        // AND THE REFUSALS THE LOOP CAN REPORT ARE UNCHANGED BY THIS MILESTONE. (102/00 later
        // appended `loop-id-missing` as its sixth; the five keep their names and their order.)
        assert.deepEqual([...LOOP_REFUSALS], ["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved", "loop-id-missing"]);
        assert.equal(Object.isFrozen(LOOP_REFUSALS), true);
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task03 a passing grade crosses to verify by the path that already exists",
    run: async () => {
      // A STORY WHOSE VALIDATE AND DOCTOR GATES REPORT CLEAN, AND A GRADE RETURNING `pass`.
      const fx = await gradingFixture({ cap: 3 });
      const nextCommand = getCommand("work:next");
      const originalRun = nextCommand.run.bind(nextCommand);
      const trace = [];
      nextCommand.run = async (commandInput, commandCtx) => {
        trace.push("work:next");
        return await originalRun(commandInput, commandCtx);
      };
      try {
        const report = capturingReport();
        const driver = completingThrough(fx, { onCommand: (command) => trace.push(command) });
        const spawn = stubRubric(emitsPassing(["alpha", "beta"]));
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));

        // THE LOOP DRIVES `verify` FOR THAT STORY.
        assert.ok(driver.typed.some((input) => input.startsWith("/aof:verify 03/01")), "the loop drives verify");
        assert.equal(state.state, "done");
        assert.deepEqual(
          report.gates(),
          ["work:validate", "work:doctor", "work:grade"],
          "guard: both deterministic rungs walked clean, and the grade rung answered after them",
        );
        assert.deepEqual(report.gradeLines().length, 1, "…and the grade rung answered once");
        assert.match(report.gradeLines()[0], /pass, 0 of 2 case\(s\) failing/u, "…reporting the grade it read");

        // AND IT DOES SO WITHOUT ASKING `work:next` FOR A FRESH DECISION — read off the
        // ORDER of the real invocations, not inferred from the sequence of driver inputs: no
        // `work:next` call falls between the continue and the verify for the same story.
        const between = trace.slice(trace.indexOf("/aof:continue 03/01") + 1, trace.indexOf("/aof:verify 03/01"));
        assert.deepEqual(between, [], `work:next was not asked between the continue and the verify (saw: ${between.join(", ")})`);

        // AND THE GRADE IS RECORDED ON THE RUN THAT PRODUCED IT.
        const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
        const carrying = runs.filter((run) => run.brief?.grade != null);
        assert.equal(carrying.length, 1, "exactly one run carries the grade");
        assert.equal(carrying[0].brief.grade.verdict, "pass");
        assert.equal(carrying[0].brief.loop.loopRunId, state.loopRunId, "…on a run this loop minted");
      } finally {
        nextCommand.run = originalRun;
        await fx.cleanup();
      }
    },
  },
];
