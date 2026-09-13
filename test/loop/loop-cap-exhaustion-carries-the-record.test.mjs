// Traceability wiring for milestone 54 / story 03, task `02_cap-exhaustion-carries-the-record`.
//
// Every @executable scenario of
//   wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/tasks/02_cap-exhaustion-carries-the-record.feature
//
// The shell reported a cap-exhausted halt with a hardcoded `findings: []` — the SPEC's
// *"stop-and-flag"* delivered as a stop with nothing flagged. The loop tried its bounded
// number of times, failed to close, and threw away the only account of what it could not
// close; an operator reading that halt learned the cap was reached and nothing else.
//
// "ACCUMULATED" MEANS THE UNION OVER THE LOOP'S OWN RUNS, KEYED BY `loopRunId` (ADR-008 §4,
// ruling RESEARCH's one genuinely open question). `53/ADR-004` already says a loop's aggregate
// history *"is a query over run records rather than a single document"* and that `loopRunId`
// makes it *"a one-key filter"* — so no store, no document and no second aggregation is built
// here, and the assertions below prove the ABSENCE of one as directly as its presence.
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { LOOP_REFUSALS, LOOP_STOPS } from "../../src/work/loop.mjs";
import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { completingDriver } from "./loop-command-probe.test.mjs";
import {
  capturingReport, emitsFailing, emitsPassing, findingsFrom, gradingCtx, gradingFixture,
  lastLine, scriptedDriver, stubRubric,
} from "../support/loop-grade-fixture.mjs";

const execFileAsync = promisify(execFile);
const INVALID_FEATURE = "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n";

/** A distinct red per cycle, so "covers all three cycles" is a claim about CONTENT. */
const perCycle = (count) => Array.from(
  { length: count },
  (_unused, index) => emitsFailing([[`case-${index + 1}`, `cycle ${index + 1} did not close`]], ["alpha"]),
);

/**
 * Run one loop to its cap over a graded fixture; answer the state, the halt line and the
 * fixture. `driver` is injectable so a scenario can drive a REAL retry lineage through the
 * same harness — the shape the union property was never measured with (review defect D1).
 */
async function exhaust(fx, plan, { report = capturingReport(), driver = completingDriver(fx) } = {}) {
  const spawn = stubRubric(plan);
  const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));
  return { state, report, spawn, driver, record: findingsFrom(lastLine(report)) };
}

/** The grades a FRESH PROCESS can read back off this item's run records, for one loop id. */
async function gradesInAFreshProcess(fx, ref, loopRunId) {
  const item = await resolveItemExact(fx.ctx, ref);
  const script = `
    const { readRuns } = await import(${JSON.stringify(new URL("../../src/run-store.mjs", import.meta.url).href)});
    const runs = await readRuns({ dir: ${JSON.stringify(item.dir)}, ref: ${JSON.stringify(ref)} });
    const rebuilt = runs
      .filter((run) => run?.brief?.loop?.loopRunId === ${JSON.stringify(loopRunId)})
      .filter((run) => run?.brief?.grade != null)
      .map((run) => ({ runId: run.runId, verdict: run.brief.grade.verdict, failures: run.brief.grade.failures }));
    process.stdout.write(JSON.stringify(rebuilt));
  `;
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "-e", script], {
    windowsHide: true,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: process.env.AOF_GLOBAL_HOME ?? "" },
  });
  return JSON.parse(stdout);
}

export const loopCapExhaustionCarriesTheRecordTests = [
  {
    name: "54/03 task02 the exhausted halt reports the record instead of an empty list",
    run: async () => {
      // A LOOP WHOSE STORY FAILED ITS GATE ON EVERY CYCLE UP TO THE CAP, with a grade
      // recorded on each of those cycles. The review budget is set clear of the cycle cap so
      // the CYCLE cap is what binds — the bound this task is about.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, record } = await exhaust(fx, perCycle(3));
        // THE LOOP HALTS ON `cap-exhausted`.
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.state, "halted");
        // THE HALT'S REPORT CARRIES THE ACCUMULATED RECORD, AND THE RECORD IS NOT EMPTY.
        assert.ok(Array.isArray(record), "the halt's report carries a record");
        assert.ok(record.length > 0, "the record is not empty");
        assert.equal(record.every((entry) => entry.gate === "work:grade"), true, "every entry names the rung that produced it");
        assert.equal(record.every((entry) => entry.verdict === "fail"), true, "…and reports what that rung found");
      } finally {
        await fx.cleanup();
      }

      // THE HALT THIS TASK IS NAMED FOR (review defect QA-1). The contract's opening line and
      // the story record both name ONE site — the shell's early cycle-cap check, which reported
      // a hardcoded `findings: []` before a build is even driven — and nothing above reaches
      // it: the halt above is `engine:cycle>=cap`, the gate's own. The named subject had no
      // coverage at all; reverting the site to `findings: []` left the whole suite green.
      //
      // IT IS REACHED BY A LOOP THAT NEVER MARKS THE STORY DONE: a passing grade crosses to
      // verify, the verify leaves the story in-progress, and `work:next` offers the same
      // continue a second time — the cycle the cap refuses, with the previous cycle's grade
      // already durable on the run it drove.
      //
      // REBASED BY milestone 124 / story 01, and the rebase is the point rather than an
      // accommodation. That site no longer ENDS the range: it asks the engine, which hands the
      // exhausted unit back to its plan as `drive 03 refine` — the third directive below, which
      // did not exist before — sets the unit aside, and terminates only when the walk has
      // nothing left to offer. So the shell's cycle cap is still what starts this, and
      // 54/03's own claim is unchanged and still driven through it: the `cap-exhausted` halt
      // that ends the invocation carries the record the loop could not close, not an empty
      // list. What moved is WHERE the range ends, not WHAT the ending reports.
      const capped = await gradingFixture({ cap: 1 });
      try {
        const driver = completingDriver(capped);
        const { state, record } = await exhaust(capped, emitsPassing(["alpha", "beta"]), { report: capturingReport(), driver });
        assert.deepEqual(
          driver.typed.map((input) => input.split("\n\n")[0]),
          ["/aof:continue 03/01", "/aof:verify 03/01", "/aof:refine 03"],
          "guard: the loop drove the build, crossed to verify, came back to a story still in-progress, and handed it to its plan",
        );
        // THE STOP IS UNCHANGED AND ITS PRODUCER IS THE ENGINE'S — no module outside
        // `src/work/loop.mjs` mints this stop any more (124/01 task 00).
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "engine:ready-set-exhausted", "the walk ran out of members to offer, and the engine named the stop");
        assert.equal(state.act.ref, "03/01", "…naming the unit that exhausted");
        // AND IT CARRIES THE RECORD IT COULD NOT CLOSE, rather than the empty list it reported.
        assert.ok(Array.isArray(record), "the halt's report carries a record");
        assert.ok(record.length > 0, "…and it is not empty");
        assert.equal(record.every((entry) => entry.gate === "work:grade"), true, "every entry names the rung that produced it");
        assert.deepEqual(record.map((entry) => entry.verdict), ["pass"], "…and reports the grade the loop had already taken");
        assert.deepEqual(record[0].cases, { total: 2, failed: 0, skipped: 0 }, "…with the counts that grade observed");
        assert.equal(typeof record[0].runId, "string", "…named on the run it rode");
      } finally {
        await capped.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 the final cycle's own grade is in the record",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { record } = await exhaust(fx, perCycle(3));
        const messages = record.flatMap((entry) => entry.failures.map((failure) => failure.message));
        // THAT GRADE IS PRESENT IN THE ACCUMULATED RECORD.
        assert.ok(messages.some((message) => message.includes("cycle 3 did not close")), "the last permitted cycle's own grade is in the record");
        // AND IT IS PRESENT EVEN THOUGH NO SUCCESSOR RUN WAS STARTED TO CARRY IT: it is the
        // one entry naming no run, which is precisely why the halt has to carry it itself.
        const trailing = record.filter((entry) => entry.runId == null);
        assert.equal(trailing.length, 1, "exactly one entry rode no run");
        assert.deepEqual(trailing[0].failures.map((failure) => failure.case), ["case-3"], "…and it is the exhausting cycle's own grade");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 accumulation is the union over this loop's runs, keyed by its own loop run id",
    run: async () => {
      // A LOOP THAT GRADED THREE CYCLES ON ONE STORY.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      const before = await treeOf(fx.projectRoot);
      try {
        const { state, record } = await exhaust(fx, perCycle(3));
        // THE ACCUMULATED RECORD COVERS ALL THREE CYCLES — by CONTENT, because each cycle's
        // runner emitted a distinguishable red. A count alone would pass on three copies of
        // one cycle.
        const messages = record.flatMap((entry) => entry.failures.map((failure) => failure.message)).join("\n");
        for (const cycle of [1, 2, 3]) {
          assert.match(messages, new RegExp(`cycle ${cycle} did not close`, "u"), `cycle ${cycle}'s grade is in the record`);
        }
        assert.equal(record.length, 3, "three cycles, three grades, none duplicated");

        // AND IT WAS ASSEMBLED BY FILTERING RUN RECORDS ON THIS LOOP'S OWN ID: every entry
        // that names a run names one this loop minted, carrying this loop's declaration.
        const { readRuns } = await import("../../src/run-store.mjs");
        const runs = await readRuns(await resolveItemExact(fx.ctx, "03/01"));
        const mine = new Map(runs.filter((run) => run.brief?.loop?.loopRunId === state.loopRunId).map((run) => [run.runId, run]));
        for (const entry of record.filter((row) => row.runId != null)) {
          assert.ok(mine.has(entry.runId), `${entry.runId} is a run this loop minted`);
          assert.deepEqual(mine.get(entry.runId).brief.grade.failures, entry.failures, "…and the entry is that run's own brief, unaltered");
        }

        // AND NO NEW STORE, DOCUMENT OR AGGREGATION WAS WRITTEN TO DISK. Measured as the
        // difference between the tree before the loop and after it: everything new is a run
        // record under the item's own runs directory, and nothing else.
        const after = await treeOf(fx.projectRoot);
        const added = after.filter((file) => !before.includes(file));
        assert.ok(added.length > 0, "guard: the loop really did write something");
        // THE EXCLUSION IS THE ONE DIRECTORY A STORE WOULD GO IN (review defect QA-2). This
        // filter also excused anything under `wiki/work` — which is the fixture's ENTIRE work
        // tree, run records included — so the sweep excused everything and `strays` was empty
        // by construction: a `wiki/work/…/loop-history.json` minted from inside
        // `accumulatedRecord()` left it green. Measured at HEAD, everything this loop adds is
        // under the item's own `runs/`, so the disjunct is dropped and the sweep is the claim
        // its message makes.
        const strays = added.filter((file) => !/[\\/]runs[\\/]/u.test(file));
        assert.deepEqual(strays, [], `nothing was written outside the run records: ${strays.join(", ")}`);
        assert.deepEqual(added.filter((file) => /grade|record|accum/iu.test(path.basename(file))), [], "no grade store or record document was minted");
      } finally {
        await fx.cleanup();
      }

      // …AND THE UNION IS MEASURED WITH A RETRY LINEAGE IN IT (review defect D1). Every
      // harness above drives a build that never fails an attempt, so one grade always rode
      // exactly one run and "union" and "list" were indistinguishable. A build attempt that
      // FAILS is retried on the same lineage carrying THE SAME BRIEF, so the grade that
      // caused that re-drive lands on TWO run records under one `loopRunId` — measured
      // before the fix as 3 rubric spawns and FOUR entries, with cycle 1's grade present
      // twice. A union counts it once.
      const retried = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const driver = scriptedDriver([{ outcome: "done" }, { outcome: "failed", failureReason: "timeout" }, { outcome: "done" }, { outcome: "done" }]);
        const { state, record, spawn } = await exhaust(retried, perCycle(3), { report: capturingReport(), driver });
        assert.equal(state.act.stop, "cap-exhausted", "guard: the loop still exhausted its cap");

        // THE LINEAGE IS REAL: two run records for one cycle, the second naming the first.
        const { readRuns } = await import("../../src/run-store.mjs");
        const runs = await readRuns(await resolveItemExact(retried.ctx, "03/01"));
        const mine = runs.filter((run) => run.brief?.loop?.loopRunId === state.loopRunId);
        const lineage = mine.filter((run) => run.retryOf != null);
        assert.equal(lineage.length, 1, "guard: exactly one attempt was retried on its own lineage");
        const prior = mine.find((run) => run.runId === lineage[0].retryOf);
        assert.ok(prior, "guard: the retry names a run this loop minted");
        assert.equal(
          lineage[0].brief?.grade?.gradedAt,
          prior.brief?.grade?.gradedAt,
          "guard: the retry carries the SAME grade as the attempt it retried — the double-count's whole cause",
        );

        // THE GRADE THE LINEAGE CARRIES TWICE IS IN THE RECORD ONCE.
        assert.equal(spawn.calls.length, 1 + 3, "guard: the runner answered once for the baseline (2026-09-12), then once per completed build, and no more");
        assert.equal(record.length, 3, "three grades taken, three entries recorded — the retried attempt adds no fourth");
        const gradedAt = record.map((entry) => entry.gradedAt);
        assert.deepEqual([...new Set(gradedAt)], gradedAt, "no grade appears twice in the union");
        const messages = record.flatMap((entry) => entry.failures.map((failure) => failure.message));
        for (const cycle of [1, 2, 3]) {
          assert.equal(
            messages.filter((message) => message.includes(`cycle ${cycle} did not close`)).length,
            1,
            `cycle ${cycle}'s grade is in the record exactly once`,
          );
        }
        // AND THE ENTRY KEPT IS THE RUN THE GRADE FIRST RODE, never the retry that inherited it.
        assert.equal(
          record.some((entry) => entry.runId === lineage[0].runId),
          false,
          "the inheriting retry contributes no entry of its own",
        );
        assert.ok(record.some((entry) => entry.runId === prior.runId), "…and the run the grade first rode is the one named");
      } finally {
        await retried.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 another loop's runs on the same item are not in this loop's record",
    run: async () => {
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        // AN EARLIER LOOP OVER THE SAME STORY THAT RECORDED TWO FAILING GRADES.
        const earlier = await exhaust(fx, [
          emitsFailing([["earlier-1", "an earlier loop's first red"]], ["alpha"]),
          emitsFailing([["earlier-2", "an earlier loop's second red"]], ["alpha"]),
          emitsFailing([["earlier-3", "an earlier loop's third red"]], ["alpha"]),
        ]);
        assert.equal(earlier.record.length, 3, "guard: the earlier loop really left grades behind");

        // A LATER LOOP THAT REACHES ITS CAP AFTER ONE FAILING GRADE. A fresh invocation
        // mints a fresh `loopRunId`, which is the whole of the filter.
        const later = await runLoopBody(
          { scope: "03", cap: 1 },
          gradingCtx(fx, {
            driver: completingDriver(fx),
            report: (capturingReport()),
            // The lineage already carries the earlier loop's baseline, so a later loop measures
            // none (2026-09-12): the stub's first answer IS the grade.
            spawn: stubRubric(emitsFailing([["later-1", "the later loop's only red"]], ["alpha"]), { baseline: null }),
          }),
        );
        assert.notEqual(later.loopRunId, earlier.state.loopRunId, "guard: the later loop minted its own id");

        // Re-run with a capturing report so the halt line is observable.
        const report = capturingReport();
        const last = await runLoopBody(
          { scope: "03", cap: 1 },
          gradingCtx(fx, {
            driver: completingDriver(fx),
            report,
            spawn: stubRubric(emitsFailing([["later-2", "the later loop's only red"]], ["alpha"]), { baseline: null }),
          }),
        );
        assert.equal(last.act.stop, "cap-exhausted", "the later loop halts at its cap");
        const record = findingsFrom(lastLine(report));

        // ITS ACCUMULATED RECORD CARRIES ONLY ITS OWN CYCLE.
        assert.equal(record.length, 1, "one cycle graded, one entry recorded");
        assert.deepEqual(record[0].failures.map((failure) => failure.case), ["later-2"]);
        // AND THE EARLIER LOOP'S GRADES ARE ABSENT.
        const text = JSON.stringify(record);
        for (const absent of ["earlier-1", "earlier-2", "earlier-3", "later-1"]) {
          assert.equal(text.includes(absent), false, `${absent} belongs to another loop and is absent`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 an exhausted loop that graded nothing reports an honest empty record",
    run: async () => {
      // A REPOSITORY THAT DECLARES NO `work.rubric`, whose story failed its VALIDATE gate on
      // every cycle up to the cap.
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9, rubric: null });
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), INVALID_FEATURE);
        const { state, record, spawn } = await exhaust(fx, emitsFailing());
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(spawn.calls.length, 0, "guard: nothing was launched, because nothing was declared");

        // THE HALT CARRIES THE VALIDATE FINDINGS IT ACCUMULATED.
        assert.ok(record.length > 0, "the halt carries the findings it accumulated");
        assert.equal(record.every((entry) => typeof entry.problem === "string" && entry.problem.length > 0), true, "…and they are the validator's own");
        // AND IT FABRICATES NO GRADE.
        assert.equal(JSON.stringify(record).includes("work:grade"), false, "no grade entry was fabricated");
        assert.equal(record.some((entry) => "verdict" in entry), false, "…and no verdict was invented");
        // AND AN ITEM THAT WAS NEVER GRADED CONTRIBUTES NOTHING RATHER THAN A FICTIONAL
        // ENTRY: the findings are the validator's, unaltered — not even a producer tag was
        // added, because there was no second producer to tell them apart from.
        const { invoke } = await import("../../src/command-core.mjs");
        const validate = await invoke("work:validate", { scope: "03/01" }, fx.ctx);
        assert.deepEqual(record, validate.findings, "the record is exactly the validator's findings");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 the stop, its producer and the refusal set are unchanged",
    run: async () => {
      const graded = await gradingFixture({ cap: 2, reviewRounds: 9 });
      const control = await gradingFixture({ cap: 2, reviewRounds: 9, rubric: null });
      try {
        writeFileSync(path.join(control.storyDir, "tasks", "00_ready.feature"), INVALID_FEATURE);
        const withGrade = await exhaust(graded, perCycle(2));
        const withoutGrade = await exhaust(control, emitsFailing());

        // THE STOP READS `cap-exhausted`, AND ITS PRODUCER IS THE ONE IT REPORTS TODAY —
        // measured against the same loop over a repository the grade never touched.
        assert.equal(withGrade.state.act.stop, "cap-exhausted");
        assert.equal(withGrade.state.act.stop, withoutGrade.state.act.stop, "the stop is the one reported today");
        assert.equal(withGrade.state.act.producer, withoutGrade.state.act.producer, "…and so is its producer");
        assert.equal(withGrade.state.act.producer, "engine:cycle>=cap");
        assert.deepEqual(Object.keys(withGrade.state.act), Object.keys(withoutGrade.state.act), "the halt act's shape is unchanged");

        // AND NO STOP ID WAS MINTED FOR EXHAUSTION: `cap-exhausted` is the id it always was,
        // and the only member this milestone adds is the grade's own.
        assert.equal(LOOP_STOPS.filter((stop) => /exhaust/u.test(stop)).length, 3, "cap-, deadline- and progress-exhausted, and no fourth");
        assert.ok(LOOP_STOPS.includes("cap-exhausted"));
        assert.equal(LOOP_STOPS.filter((stop) => stop === "cap-exhausted").length, 1, "no second exhaustion id was minted");

        // AND THE LOOP REFUSAL SET IS UNCHANGED BY THIS MILESTONE. (102/00 later appended
        // `loop-id-missing` as its sixth member; the five 54 knew keep their names and order.)
        assert.deepEqual([...LOOP_REFUSALS], ["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved", "loop-id-missing"]);
        assert.equal(Object.isFrozen(LOOP_REFUSALS), true);
      } finally {
        await graded.cleanup();
        await control.cleanup();
      }
    },
  },

  {
    name: "54/03 task02 the record survives the process that produced it",
    run: async () => {
      // A LOOP THAT REACHED ITS CAP AND HALTED, then the item's run records read in a
      // GENUINELY FRESH PROCESS — a child node, importing the run store and reading the
      // files, with no access to anything the halted process held in memory.
      const fx = await gradingFixture({ cap: 3, reviewRounds: 9 });
      try {
        const { state, record } = await exhaust(fx, perCycle(3));
        const rebuilt = await gradesInAFreshProcess(fx, "03/01", state.loopRunId);

        // EVERY CYCLE'S GRADE THAT RODE A RUN IS STILL READABLE FROM THE RUNS THIS LOOP
        // MINTED. The exhausting cycle's own grade rode no run — ADR-008 §4 says so in as
        // many words ("the cap-exhausting cycle has no successor run to ride, so the halt
        // carries the final record itself"), and the sibling scenario above asserts it is
        // present *because* no successor run was started to carry it. That entry is
        // therefore excluded here rather than looked for on disk; the discrepancy between
        // this scenario's first `Then` and its sibling's is flagged in STATE.md, not
        // papered over.
        const carried = record.filter((entry) => entry.runId != null);
        assert.equal(carried.length, 2, "guard: two of the three grades rode a run");
        assert.deepEqual(
          rebuilt.map((entry) => ({ runId: entry.runId, verdict: entry.verdict, failures: entry.failures })),
          carried.map((entry) => ({ runId: entry.runId, verdict: entry.verdict, failures: entry.failures })),
          "a fresh process reads back exactly the grades this loop's runs carry",
        );
        assert.equal(rebuilt.length > 0, true, "NOTHING WAS READ would fail here rather than pass vacuously");

        // AND THE ACCUMULATED RECORD CAN BE REBUILT FROM THEM WITHOUT THE HALTED PROCESS:
        // the one-key filter is all it takes, and the child process ran it.
        const messages = rebuilt.flatMap((entry) => entry.failures.map((failure) => failure.message)).join("\n");
        assert.match(messages, /cycle 1 did not close/u);
        assert.match(messages, /cycle 2 did not close/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
];

/** Every file under a root, relative and sorted — the before/after sweep for "no new store". */
async function treeOf(root) {
  const { readdir } = await import("node:fs/promises");
  const rows = [];
  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else rows.push(path.relative(root, target));
    }
  };
  await walk(root);
  return rows.sort();
}

// ───────────────────────────── milestone 124 / story 01 — cap exhaustion returns to the plan ──
//
// The DRIVEN half of tasks 00–03. Every case below runs a real `runLoopBody` over a real
// fixture stream and reads the state it returns; the structural half — the literals no module
// may spell, the six call sites that pass no `cycle`, the key sets that may not grow — lives in
// `test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs` (FF-12404), so the two halves
// are never the same assertion written twice.
//
// The fixture below is a milestone with N stories rather than the one-story `loopFixture`,
// because every property this story is about is a property of a WALK: a unit handed back and
// stepped over, a plan re-entered a bounded number of times, a range that keeps running past a
// hand-off. A single-story stream can show the hand-off and nothing after it.

const PLAN_MILESTONE = "03";

const planMilestoneDoc = (status = "in-progress") => `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Fixture
`;

// `parent:` is AUTHORED here on purpose and is never what the hand-off reads — task 01's
// fourth row drives a story whose authored key disagrees with the directory it sits in.
const planStoryDoc = (number, { status = "in-progress", parent = 3 } = {}) => `---
type: story
number: ${number}
slug: ready-${number}
title: Ready ${number}
parent: ${parent}
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Ready ${number}
`;

/**
 * A milestone with `stories` in-progress stories, each carrying one `@executable` task, at a
 * declared `cap`. `authoredParents` overrides one story's frontmatter `parent:` so the
 * directory and the key disagree — the only way to DRIVE "derived, never authored" rather than
 * assert it about source text.
 */
async function planFixture({ stories = 2, cap = 1, authoredParents = {}, sibling = false } = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-loop-plan-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const milestoneDir = path.join(workDir, "03_milestone_fixture");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), planMilestoneDoc());
  // A SECOND, OUT-OF-SCOPE MILESTONE, so that an authored `parent:` naming it still RESOLVES.
  // Without it, a disagreeing key is simply an invalid record and the gate ladder's first rung
  // reds — which would prove that `work:validate` works, not that the derivation ignores the key.
  if (sibling) {
    const siblingDir = path.join(workDir, "04_milestone_other");
    await mkdir(siblingDir, { recursive: true });
    await writeFile(path.join(siblingDir, "SPEC.md"), planMilestoneDoc().replace("number: 3", "number: 4").replace("slug: fixture", "slug: other"));
  }
  const storyDirs = new Map();
  for (let index = 1; index <= stories; index += 1) {
    const number = String(index).padStart(2, "0");
    const dir = path.join(milestoneDir, "stories", `${number}_story_ready-${index}`);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeFile(path.join(dir, "STORY.md"), planStoryDoc(index, {
      ...(Object.prototype.hasOwnProperty.call(authoredParents, number) ? { parent: authoredParents[number] } : {}),
    }));
    await writeFile(path.join(dir, "tasks", "00_ready.feature"), "@executable\nFeature: Ready\n  Scenario: ready\n    Given a fixture\n    When it runs\n    Then it passes\n");
    storyDirs.set(`${PLAN_MILESTONE}/${number}`, dir);
  }
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: { work: { dir: "wiki/work", autonomous: { maxAttempts: cap } } },
  };
  return {
    projectRoot,
    workDir,
    milestoneDir,
    storyDirs,
    workspace,
    ctx: { workspace },
    cleanup: () => rm(projectRoot, { recursive: true, force: true }),
  };
}

/** Run one loop over a plan fixture and answer everything a case below reads. */
async function walk(fx, { scope = PLAN_MILESTONE, cap } = {}) {
  const report = capturingReport();
  const driver = completingDriver(fx);
  const state = await runLoopBody(
    { scope, ...(cap === undefined ? {} : { cap }) },
    gradingCtx(fx, { driver, report }),
  );
  return {
    state,
    report,
    driver,
    directives: driver.typed.map((input) => input.split("\n\n")[0]),
    refines: (state.driven ?? []).filter((row) => row.phase === "refine"),
  };
}

export const loopCapExhaustionReturnsToThePlanTests = [
  {
    name: "124/01 task 01 the hand-off is the existing drive act, and it is what actually runs",
    run: async () => {
      const fx = await planFixture({ stories: 1, cap: 1 });
      try {
        const { state, directives, refines } = await walk(fx);
        // THE COMMAND THE SHELL INVOKED IS `work:drive-refine`, observed as the directive the
        // refine phase driver types. No new command id, no new act kind, no `GATE_ORDER` row.
        assert.deepEqual(directives, ["/aof:continue 03/01", "/aof:verify 03/01", "/aof:refine 03"]);
        // …AND `state.driven` GAINED THE ROW.
        assert.equal(refines.length, 1, "exactly one refine row");
        assert.equal(refines[0].ref, PLAN_MILESTONE, "…aimed at the plan, not at the unit");
        assert.ok(Number.isInteger(refines[0].cycle) && refines[0].cycle > 0, "…carrying a positive integer cycle");
        // THE RANGE DID NOT END AT THE HAND-OFF — it ended when the walk ran out of members.
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.state, "halted");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 01 the plan ref is derived from the item graph, never from an authored key",
    run: async () => {
      // A STORY WHOSE `STORY.md` SAYS `parent: 4` WHILE SITTING UNDER `03_milestone_fixture`.
      // `listItems` builds `ref` and `parent` from the SAME directory walk and consults the
      // authored key for neither, so the hand-off must still name `03`. Milestone `04` really
      // exists here, so the key is a VALID disagreement rather than an invalid record the gate
      // ladder would red on first — and `04` is outside the declared scope, so a derivation that
      // reached for the frontmatter would produce a TERMINAL out-of-scope halt naming `4`
      // instead of the hand-off below. The two outcomes are maximally far apart on purpose.
      const fx = await planFixture({ stories: 1, cap: 1, sibling: true, authoredParents: { "01": 4 } });
      try {
        const { directives, refines } = await walk(fx);
        assert.deepEqual(directives, ["/aof:continue 03/01", "/aof:verify 03/01", "/aof:refine 03"], "the directory decides, the key does not");
        assert.deepEqual(refines.map((row) => row.ref), [PLAN_MILESTONE]);
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 00 [outline] a unit still gets exactly `cap` drives before it exhausts",
    run: async () => {
      // THE DEFAULT AND TWO OVERRIDES, one of them a range scope. The unit is never closed, so
      // `work:next` keeps offering it: the cycles under one phase must be 1..cap with no gap and
      // no repeat, and the decision that follows the cap-th is the cap-exhaustion decision — never
      // a cap+1th drive.
      for (const row of [{ scope: PLAN_MILESTONE, cap: 3 }, { scope: "01-10", cap: 1 }, { scope: "01-10", cap: 5 }]) {
        const fx = await planFixture({ stories: 1, cap: row.cap });
        try {
          const { state, refines } = await walk(fx, { scope: row.scope });
          const cycles = (state.driven ?? [])
            .filter((driven) => driven.ref === "03/01" && driven.phase === "continue")
            .map((driven) => driven.cycle);
          assert.equal(cycles.length, row.cap, `scope ${row.scope} at cap ${row.cap}: exactly ${row.cap} row(s) for the unit under one phase`);
          assert.deepEqual(cycles, Array.from({ length: row.cap }, (_unused, index) => index + 1), "…their cycles are 1..cap with no gap and no repeat");
          // THE DECISION THAT FOLLOWS THE CAP-TH IS THE CAP-EXHAUSTION DECISION — here, the
          // hand-off, which is what proves no cap+1th drive of the unit was taken.
          assert.equal(refines.length, 1, "the cap-th drive is followed by the plan hand-off, not by another drive of the unit");
          assert.equal((state.driven ?? []).filter((driven) => driven.ref === "03/01" && driven.phase === "continue").length, row.cap);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },

  {
    name: "124/01 task 02 the plan counter survives a resume and the set-aside does not",
    run: async () => {
      // The two bounds have two LIFETIMES, and that falls out of where each one lives rather than
      // out of anything written for it. Set-aside is in-process; the plan counter is rebuilt by
      // `reconstructCycleCounts` from the run records the refine drive minted AGAINST THE PLAN REF
      // — which is why it survives precisely BECAUSE nothing new was stored.
      const fx = await planFixture({ stories: 2, cap: 1 });
      try {
        const first = await walk(fx);
        assert.equal(first.refines.length, 1, "guard: the first invocation re-entered the plan once and was then interrupted by its own terminus");

        assert.equal(first.state.act.ref, "03/02", "guard: the first invocation had walked PAST 03/01, which it set aside");

        const driver = completingDriver(fx);
        const report = capturingReport();
        const resumed = await runLoopBody(
          { scope: PLAN_MILESTONE, resume: true },
          gradingCtx(fx, { driver, report }),
        );
        // THE SET-ASIDE DID NOT SURVIVE: the unit the prior invocation stepped over is at the head
        // of this one's walk again — it is offered, gated, and it is the unit the halt names, where
        // the first invocation had already moved past it to `03/02`.
        assert.equal(resumed.act.ref, "03/01", "the previously set-aside unit may be offered again in the resumed invocation");
        assert.ok(report.lines.some((line) => line.includes("work:validate 03/01")), "…and it really was walked, not merely named");
        // THE PLAN COUNTER DID: `03\0refine` was reconstructed at its pre-interrupt value, which is
        // already the cap, so the plan is re-entered at most `cap` times COUNTING the pre-interrupt
        // re-entries — and this invocation drives no second refine.
        assert.deepEqual((resumed.driven ?? []).filter((row) => row.phase === "refine"), [], "the plan is not re-entered a second time");
        assert.equal(resumed.act.stop, "cap-exhausted");
        assert.equal(resumed.act.producer, "engine:plan-re-entry>=cap", "the reconstructed count is what refused the re-entry");
        assert.equal(resumed.act.plan, PLAN_MILESTONE);
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 02 a plan re-entry resets nothing",
    run: async () => {
      // A cap an agent's action can clear is not a cap (ADR-005 §6). The refine drive increments
      // the PLAN's key and must leave the exhausted unit's own `${ref}\0continue` count alone —
      // otherwise a hand-off buys the unit a fresh budget every time it exhausts.
      const fx = await planFixture({ stories: 1, cap: 2 });
      try {
        const { state } = await walk(fx);
        const cycles = (state.driven ?? [])
          .filter((row) => row.ref === "03/01" && row.phase === "continue")
          .map((row) => row.cycle);
        assert.deepEqual(cycles, [1, 2], "the unit was driven exactly `cap` times…");
        // …AND NEVER A cap+1th TIME within this invocation, which is what a reset would buy it.
        assert.equal(cycles.length, 2, "the refine drive did not reduce the unit's own continue count");
        assert.equal(Math.max(...cycles), 2, "…nor restart it");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 02 an exhausted unit is handed back once and then stepped over",
    run: async () => {
      const fx = await planFixture({ stories: 2, cap: 1 });
      try {
        const { state, directives, refines } = await walk(fx);
        // ONE refine row for the plan, however many units exhausted into it.
        assert.equal(refines.length, 1, "the plan was re-entered once, not once per unit");
        // THE FIRST UNIT WAS HANDED BACK AND THEN STEPPED OVER — no further act names it, and
        // the walk moved to another member of the ready set `work:next` returned.
        const afterHandOff = directives.slice(directives.indexOf("/aof:refine 03") + 1);
        assert.equal(afterHandOff.some((directive) => directive.endsWith(" 03/01")), false, "no act names the exhausted unit again");
        assert.ok(afterHandOff.some((directive) => directive.endsWith(" 03/02")), "the next act targets another member of the ready set");
        // THE LOOP DID NOT WRITE THE EXHAUSTED UNIT'S STATUS.
        const story = readFileSync(path.join(fx.storyDirs.get("03/01"), "STORY.md"), "utf8");
        assert.match(story, /^status: in-progress$/mu, "the exhausted unit's own status is not written by the loop");
        assert.equal(state.state, "halted");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 02 [outline] a plan is re-entered at most `cap` times in one invocation",
    run: async () => {
      // Fewer units than cap, exactly cap, and more — the row that would expose an escalation
      // with no ceiling is the third, and it is the row most likely to be skipped.
      const rows = [
        { cap: 3, units: 2, refines: 2 },
        { cap: 3, units: 3, refines: 3 },
        { cap: 3, units: 5, refines: 3 },
        { cap: 1, units: 4, refines: 1 },
      ];
      for (const row of rows) {
        const fx = await planFixture({ stories: row.units, cap: row.cap });
        try {
          const { state, refines } = await walk(fx);
          assert.equal(refines.length, row.refines, `cap ${row.cap} over ${row.units} unit(s) re-enters the plan ${row.refines} time(s)`);
          assert.deepEqual(
            refines.map((driven) => driven.cycle),
            Array.from({ length: row.refines }, (_unused, index) => index + 1),
            "…their cycles are 1..N under the plan's own key, with no gap and no repeat",
          );
          assert.deepEqual(refines.map((driven) => driven.ref), Array.from({ length: row.refines }, () => PLAN_MILESTONE));
          // AND THE INVOCATION ENDS TERMINALLY once there is nothing left to hand back.
          assert.equal(state.act.stop, "cap-exhausted");
          assert.equal(state.state, "halted");
        } finally {
          await fx.cleanup();
        }
      }
    },
  },

  {
    name: "124/01 task 02 a unit whose plan is itself does not re-enter itself",
    run: async () => {
      // A MILESTONE WITH NO STORIES exhausts under phase `refine`: `decideLoopPhase` returns
      // `refine` for it on every tick, so at `cap: 1` the second tick trips the shell's counter
      // with `03\0refine` ALREADY at the cap. Its derived plan is itself, so the key consulted
      // IS the key that just tripped and the re-entry is refused on its first attempt — with no
      // special case written for it anywhere.
      const fx = await planFixture({ stories: 0, cap: 1 });
      try {
        const { state, directives, refines } = await walk(fx);
        assert.deepEqual(directives, ["/aof:refine 03"], "the milestone was refined once and never re-entered");
        assert.equal(refines.length, 1);
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "engine:plan-re-entry>=cap", "the re-entry was refused, not the ready set exhausted");
        assert.equal(state.act.ref, PLAN_MILESTONE, "…naming the milestone");
        assert.equal(state.act.plan, PLAN_MILESTONE, "…whose plan is itself");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 02 the walk stops when it has nothing left to offer",
    run: async () => {
      const fx = await planFixture({ stories: 2, cap: 1 });
      try {
        const { state } = await walk(fx);
        // RETURNED RATHER THAN ITERATING FURTHER, and `halted` — never `done`, which would
        // report a range closed that nobody closed.
        assert.equal(state.state, "halted");
        assert.equal(state.act.stop, "cap-exhausted");
        assert.ok(LOOP_STOPS.includes(state.act.stop), "the stop is a member of the declared vocabulary");
        assert.ok(["03/01", "03/02"].includes(state.act.ref), "…and its ref is a unit that exhausted");
        assert.equal(typeof state.act.producer, "string");
        assert.notEqual(state.act.producer, "", "every reported cap-exhausted act carries a non-empty producer");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 02 the hand-off adds no store of its own",
    run: async () => {
      const fx = await planFixture({ stories: 2, cap: 1 });
      try {
        const before = await treeOf(fx.projectRoot);
        const { state } = await walk(fx);
        const appeared = (await treeOf(fx.projectRoot)).filter((rel) => !before.includes(rel));
        assert.ok(appeared.length > 0, "guard: the walk did write something, so the claim below is not vacuous");
        // EVERY FILE THE WALK WROTE IS A RUN RECORD BESIDE THE ITEM IT DROVE. No new store, no
        // set of "already handed off" refs persisted anywhere, and nothing under `.aof/`.
        for (const rel of appeared) {
          assert.match(rel.replaceAll("\\", "/"), /\/runs\//u, `${rel} is a run record, not a new store`);
        }
        // THE COUNTER IS STILL KEYED ON A PHASE, and `refine` is among the phases.
        assert.ok((state.driven ?? []).some((row) => row.phase === "refine"), "`refine` is among the phases the counter is keyed on");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 03 the range keeps running past a hand-off, which is the only behaviour that changed",
    run: async () => {
      const fx = await planFixture({ stories: 3, cap: 1 });
      try {
        const { directives, refines } = await walk(fx);
        // THE PLAN'S REFINE ROW IS FOLLOWED BY ACTS FOR THE LATER UNITS — the range did not end
        // at the first unit, which is exactly what it did before this story.
        const handOff = directives.indexOf("/aof:refine 03");
        assert.ok(handOff >= 0, "the hand-off happened");
        assert.ok(
          directives.slice(handOff + 1).some((directive) => directive.endsWith(" 03/02")),
          "later units were driven after the hand-off",
        );
        assert.equal(refines.length, 1, "…and the plan's own re-entry happened once");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "124/01 task 03 the read-only surfaces are untouched",
    run: async () => {
      const fx = await planFixture({ stories: 2, cap: 1 });
      try {
        // `--dry-run` IS `loopCommand.run` — the probe. It performs no drive at all and reports
        // ONE decision, for the head of the ready set.
        const probe = await loopCommand.run({ scope: PLAN_MILESTONE }, fx.ctx);
        assert.equal(probe.next?.ref, "03/01", "the probe reports one decision for the head of the ready set");
        assert.equal(probe.act.act, "drive");
        assert.equal(existsSync(path.join(fx.storyDirs.get("03/01"), "runs")), false, "the probe minted no run");

        // `--level L1` LIKEWISE drives nothing.
        const l1Driver = completingDriver(fx);
        const l1 = await runLoopBody({ scope: PLAN_MILESTONE, level: "L1" }, gradingCtx(fx, { driver: l1Driver, report: capturingReport() }));
        assert.deepEqual(l1Driver.typed, [], "the L1 pass drove nothing");
        assert.equal(l1.level, "L1");
        assert.equal(existsSync(path.join(fx.storyDirs.get("03/01"), "runs")), false, "…and minted no run either");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
