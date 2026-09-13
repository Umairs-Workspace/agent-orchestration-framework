// Traceability wiring for milestone 54 / story 03, task `00_the-record-reaches-the-redrive`.
//
// Every @executable scenario of
//   wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/tasks/00_the-record-reaches-the-redrive.feature
//
// TWO THINGS LAND HERE, AND NEITHER IS A TRANSPORT. **(1)** The grade's failing cases ride the
// fix payload 70/04 already built (`pendingFixes` -> `ctx.loopDrive.fix` ->
// `composeFixInput`'s `## REVIEW FINDINGS`), each entry naming its producer. **(2)** The
// durable record is `brief.grade` on the run the grade DROVE, written through the seam that
// already writes `brief.loop` — `transitionRunStart`'s `edge.brief`. `src/run-store.mjs` (46
// dependents) and `src/effects/run-transitions.mjs` (17) are passed THROUGH, not edited.
//
// THE LOOP, THE STORE AND THE TRANSITION SEAM ARE ALL REAL HERE. Only two edges are injected:
// the PTY (as every loop suite in this tree does) and the rubric's child process (as 54/01's
// four suites do, through the shipped `ctx.spawnRubric` seam). What is asserted is what the
// loop DID — read off the run records it wrote and the input the driver received — never off
// the source of the code that was supposed to do it.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import { registeredSuitePaths } from "../support/registration/registration-surface.mjs";
import {
  capturingReport, emitsFailing, emitsPassing, gradingCtx, gradingFixture, stubRubric,
} from "../support/loop-grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// THE THREE SHIPPED LOOP SUITES — ADR-002 §3's evidence that the loop is unchanged for a
// repository that declares no rubric. Named the same way 54/01 and 54/02 name them.
const LOOP_SUITES = ["loop/loop-command-gate", "loop/loop-command-sequencing", "loop/loop-command-stops"];

const INVALID_FEATURE = "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n";

const seedInvalid = (fx) => writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), INVALID_FEATURE);

/** The driver used wherever the loop must run to completion rather than stop at a red gate. */
const completingThrough = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

/** The `## REVIEW FINDINGS` block of a driver input, parsed back into the entries it carried. */
function findingsIn(input) {
  const body = String(input ?? "").split("## REVIEW FINDINGS")[1];
  if (body == null) return [];
  return body.split(/\n(?=## )/u)[0]
    .split(/\n\n(?=\{)/u)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("{"))
    .map((chunk) => JSON.parse(chunk));
}

/** Every run record the loop wrote for the story, oldest first. */
const runsFor = async (fx, ref = "03/01") => (await invoke("work:run-status", { ref }, fx.ctx)).runs;

export const loopRecordReachesTheRedriveTests = [
  {
    name: "54/03 task00 a failing grade re-drives the build carrying what failed",
    run: async () => {
      // A DECLARED RUBRIC WHOSE GRADE RETURNS `fail` WITH TWO FAILING CASES, and a cap that
      // admits the re-drive. The build phase completes (the driver reports done), so the
      // gate is reached exactly as it is in production.
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        const driver = completingDriver(fx);
        const spawn = stubRubric(emitsFailing([["beta", "beta did not close"], ["gamma", "gamma threw"]], ["alpha"]));
        await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        assert.equal(driver.typed.length, 2, "guard: the loop really re-drove the build");
        const carried = findingsIn(driver.typed[1]);

        // THE RE-DRIVE'S FIX PAYLOAD CARRIES BOTH FAILING CASES.
        assert.deepEqual(carried.map((entry) => entry.case), ["beta", "gamma"], "both failing cases are carried");
        // AND EACH ENTRY CARRIES THE CASE NAME AND THE MESSAGE THE RUNNER EMITTED — the
        // runner's own words, lifted verbatim rather than re-worded or summarised.
        assert.match(carried[0].message, /beta did not close/u, "the runner's own message for the first case");
        assert.match(carried[1].message, /gamma threw/u, "…and for the second");
        assert.equal(carried.every((entry) => typeof entry.case === "string" && entry.case.length > 0), true, "every entry names its case");

        // THE PAYLOAD IS THE ONE THE SHELL ALREADY BUILDS, NOT A SECOND ONE. 70/04's transport
        // renders findings under exactly one `## REVIEW FINDINGS` heading; a second payload
        // would have to arrive as a second section, a second driver input, or a second spawn.
        assert.equal(driver.typed[1].split("## REVIEW FINDINGS").length - 1, 1, "exactly one findings section reaches the maker");
        assert.equal(driver.typed.length, driver.spawnCalls.length, "one input per session, so no second delivery channel exists");
        // The first spawn is the story's baseline (2026-09-12), then once per cycle.
        assert.equal(spawn.calls.length, 1 + 2, "the runner was launched once for the baseline, then once per cycle and never twice for one answer");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task00 the grade's entries name their producer beside the validate findings",
    run: async () => {
      // A GATE THAT PRODUCED ONE VALIDATE FINDING **AND** ONE FAILING CASE. The grade has
      // already been taken for this cycle, so including it costs nothing and withholding it
      // would send the maker back knowing half of what went wrong.
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        seedInvalid(fx);
        const driver = completingDriver(fx);
        const spawn = stubRubric(emitsFailing([["beta", "beta did not close"]], ["alpha"]));
        await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        const carried = findingsIn(driver.typed[1]);
        // THE PAYLOAD CARRIES BOTH.
        assert.equal(carried.length, 2, "one validate finding and one graded case");
        // AND EACH ENTRY NAMES WHICH GATE PRODUCED IT.
        assert.deepEqual(carried.map((entry) => entry.gate), ["work:validate", "work:grade"], "each entry names its rung");
        // AND A READER CAN TELL A VALIDATE FINDING FROM A GRADED CASE WITHOUT PARSING PROSE:
        // the discrimination is a KEY whose value is a rung name, not a pattern over the
        // finding's text. Proven by discriminating with the messages themselves removed.
        const blinded = carried.map(({ gate }) => gate);
        assert.deepEqual(
          [blinded.filter((gate) => gate === "work:validate").length, blinded.filter((gate) => gate === "work:grade").length],
          [1, 1],
          "the two are separable from the producer key alone, with every message discarded",
        );
        const validate = carried.find((entry) => entry.gate === "work:validate");
        assert.ok(validate.problem.length > 0, "the validator's own finding is unaltered beneath its tag");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task00 the durable record is written through the seam that already writes the loop declaration",
    run: async () => {
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        const spawn = stubRubric(emitsFailing([["beta", "beta did not close"]], ["alpha"]));
        await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver: completingDriver(fx), report: capturingReport(), spawn }));

        const runs = await runsFor(fx);
        const redriven = runs.find((run) => run.brief?.loop?.cycle === 2 && run.brief?.loop?.phase === "continue");
        assert.ok(redriven, "guard: the loop started a run to re-drive the build");

        // THAT RUN'S BRIEF CARRIES THE GRADE BESIDE THE LOOP DECLARATION.
        // The baseline the delta was taken against rides the same brief (2026-09-12), so the
        // record says what a re-drive's grade excluded as inherited — here nothing.
        assert.deepEqual(Object.keys(redriven.brief), ["loop", "grade", "gradeBaseline"], "the brief carries the grade and the baseline beside the declaration and nothing else");
        assert.deepEqual(redriven.brief.gradeBaseline.failures, [], "…a clean baseline: the failure below is the story's own");
        assert.equal(redriven.brief.grade.verdict, "fail");
        assert.deepEqual(redriven.brief.grade.failures.map((failure) => failure.case), ["beta"]);

        // AND THE BRIEF'S LOOP DECLARATION IS UNCHANGED — the same eight keys (102/00 appended
        // the loop id last), carrying this loop's own run id and the cycle it re-drove.
        assert.deepEqual(
          Object.keys(redriven.brief.loop),
          ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"],
          "brief.loop's seven original keys are untouched and the loop id is appended last",
        );
        assert.equal(redriven.brief.loop.phase, "continue");
        assert.equal(redriven.brief.loop.cycle, 2);

        // AND THE RUN RECORD GAINED NO TOP-LEVEL KEY. Measured against a run minted by the
        // very same loop before any grade existed, so the comparison is with THIS tree's
        // record shape rather than with a literal somebody typed.
        const first = runs.find((run) => run.brief?.loop?.cycle === 1);
        assert.deepEqual(Object.keys(redriven), Object.keys(first), "the graded run's top-level key set equals the ungraded run's");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task00 the run record gains a brief entry and nothing else",
    run: async () => {
      const graded = await gradingFixture({ cap: 2, reviewRounds: 9 });
      const control = await loopFixture({ cap: 2, reviewRounds: 9 });
      try {
        const spawn = stubRubric(emitsFailing());
        await runLoopBody({ scope: "03" }, gradingCtx(graded, { driver: completingDriver(graded), report: capturingReport(), spawn }));
        seedInvalid(control);
        await runLoopBody({ scope: "03" }, { ...control.ctx, agentSessionDriverOptions: completingDriver(control).options, report: () => {} });

        const gradedRuns = await runsFor(graded);
        const controlRuns = await runsFor(control);
        assert.ok(gradedRuns.length > 1 && controlRuns.length > 1, "guard: both loops minted several runs");

        // THE GRADE IS PRESENT ONLY INSIDE THE RUN'S BRIEF. Proven over the whole record
        // rather than at the one key it was written to: every path in the serialised record
        // that reaches a grade goes through `brief`.
        for (const run of gradedRuns) {
          const paths = [];
          const walk = (value, trail) => {
            if (value == null || typeof value !== "object") return;
            for (const [key, child] of Object.entries(value)) {
              if (key === "grade") paths.push([...trail, key].join("."));
              walk(child, [...trail, key]);
            }
          };
          walk(run, []);
          assert.equal(paths.every((where) => where === "brief.grade"), true, `the grade appears only at brief.grade (found: ${paths.join(", ")})`);
        }
        assert.ok(gradedRuns.some((run) => run.brief?.grade != null), "guard: a grade really was recorded");

        // AND THE RECORD CARRIES THE SAME TOP-LEVEL FIELDS IT CARRIES TODAY — measured
        // against a loop over an ungraded repository, run in the same process.
        assert.deepEqual(Object.keys(gradedRuns[0]), Object.keys(controlRuns[0]), "the top-level field set is the ungraded one");

        // AND THE RUN PASSED THROUGH THE SAME LIFECYCLE STATES IT PASSES THROUGH TODAY: the
        // same terminal state and outcome, over the same closed five-state machine.
        assert.deepEqual(
          [...new Set(gradedRuns.map((run) => `${run.state}/${run.outcome}`))].sort(),
          [...new Set(controlRuns.map((run) => `${run.state}/${run.outcome}`))].sort(),
          "the graded loop's runs end in exactly the states the ungraded loop's do",
        );
      } finally {
        await graded.cleanup();
        await control.cleanup();
      }
    },
  },

  {
    name: "54/03 task00 the record is complete even when the warm payload degrades cold",
    run: async () => {
      // A BUILD RUN WHOSE RECORDED SESSION CANNOT BE RESUMED ON THIS NODE — 70/04's warm
      // path refused at its own availability seam, which is exactly the degradation ADR-008
      // §5 says 54's records must survive: *"where 70 has not landed, 54's records are still
      // complete and reported"*.
      const shapes = [];
      for (const resumable of [true, false]) {
        const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
        try {
          const driver = completingDriver(fx);
          driver.options.resumeSessionAvailable = async () => resumable;
          const spawn = stubRubric(emitsFailing([["beta", "beta did not close"], ["gamma", "gamma threw"]], ["alpha"]));
          await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

          const warm = driver.spawnCalls[1].args.includes("--resume");
          const runs = await runsFor(fx);
          const record = runs.find((run) => run.brief?.grade != null)?.brief?.grade ?? null;
          shapes.push({
            resumable,
            warm,
            carried: findingsIn(driver.typed[1]).map(({ gate, code, case: name, message, scenario }) => ({ gate, code, case: name, message, scenario })),
            // The volatile facts of THIS run (when it was taken, where it ran, how long it
            // took) are normalised away; what must be unchanged is the RECORD.
            record: record == null ? null : {
              ...record,
              gradedAt: null,
              runner: null,
              report: null,
              provenance: record.provenance == null ? null : { ...record.provenance, run: null, at: null },
            },
          });
        } finally {
          await fx.cleanup();
        }
      }
      const [warmRun, coldRun] = shapes;
      assert.equal(warmRun.warm, true, "guard: the resumable run really did resume its build session");
      assert.equal(coldRun.warm, false, "the degraded run launched cold, with no session to resume");

      // THEN THE RE-DRIVE STILL CARRIES THE GRADE'S FAILING CASES.
      assert.deepEqual(coldRun.carried.map((entry) => entry.case), ["beta", "gamma"], "both failing cases reach the cold re-drive");
      assert.match(coldRun.carried[0].message, /beta did not close/u, "…carrying the runner's own words");

      // AND THE DURABLE RECORD ON THE RUN IS UNCHANGED BY THE DEGRADATION.
      assert.deepEqual(coldRun.record, warmRun.record, "the record written on the run is identical warm and cold");
      assert.deepEqual(coldRun.carried, warmRun.carried, "…and so is the payload it produced");
    },
  },

  {
    name: "54/03 task00 a passing grade puts nothing on a re-drive, because there is no re-drive",
    run: async () => {
      const fx = await gradingFixture({ cap: 3 });
      try {
        const driver = completingThrough(fx);
        const spawn = stubRubric(emitsPassing(["alpha", "beta"]));
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        // NO FIX PAYLOAD IS PREPARED FOR THAT STORY.
        assert.equal(driver.typed.some((input) => input.includes("## REVIEW FINDINGS")), false, "no findings payload is prepared");
        // AND THE LOOP CROSSES TO `verify`.
        assert.deepEqual(
          driver.typed.map((input) => input.split("\n\n")[0]),
          ["/aof:continue 03/01", "/aof:verify 03/01", "/aof:verify 03"],
          "the continue is followed straight by the verify for the same story",
        );
        assert.equal(state.state, "done");
        // AND THE GRADE IS STILL RECORDED ON THE RUN THAT PRODUCED IT — the run this grade
        // caused to start, which for a `pass` is the verify it crossed to (ADR-008 §3: the
        // record rides the run the grade DROVE, and there is exactly one such run).
        const runs = await runsFor(fx);
        const carrying = runs.filter((run) => run.brief?.grade != null);
        assert.equal(carrying.length, 1, "exactly one run carries the grade");
        assert.equal(carrying[0].brief.loop.phase, "verify", "…the run the passing grade drove");
        assert.equal(carrying[0].brief.grade.verdict, "pass");
        assert.deepEqual(carrying[0].brief.grade.cases, { total: 2, failed: 0, skipped: 0 }, "the observed counts are recorded with it");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "54/03 task00 an unconfigured repository's re-drive is byte-identical to today's",
    run: async () => {
      // A REPOSITORY THAT DECLARES NO `work.rubric` — the ordinary case, and the whole of
      // ADR-002 §3's no-regression rule.
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9, rubric: null });
      try {
        assert.equal(fx.workspace.config.work.rubric, undefined, "guard: the fixture declares no rubric");
        seedInvalid(fx);
        const driver = completingDriver(fx);
        const report = capturingReport();
        const spawn = stubRubric(emitsFailing());
        await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));

        // THE FIX PAYLOAD CARRIES EXACTLY THE VALIDATE FINDINGS AND NOTHING ELSE — deep-equal
        // against what `work:validate` itself answers for that ref, entry for entry and key
        // for key, so a producer tag or any other addition would fail here.
        const validate = await invoke("work:validate", { scope: "03/01" }, fx.ctx);
        assert.ok(validate.findings.length > 0, "guard: the validator really reported a finding");
        assert.deepEqual(findingsIn(driver.typed[1]), validate.findings, "the payload is the validator's own findings, unaltered");
        assert.equal(spawn.calls.length, 0, "and nothing was launched");
        assert.deepEqual(report.gradeLines(), [], "no rung announced itself for a rubric nobody declared");

        // AND NO GRADE KEY IS WRITTEN TO THE RUN'S BRIEF.
        for (const run of await runsFor(fx)) {
          assert.deepEqual(Object.keys(run.brief), ["loop"], "the brief carries the loop declaration and nothing else");
        }

        // AND THE THREE SHIPPED LOOP SUITES OBSERVE THE SAME PAYLOAD THEY OBSERVE TODAY.
        // `m08/R2` warns that "green verbatim" and "guarantee preserved" are different
        // claims; the second is closed by the property below — a suite that had to be TAUGHT
        // about the grade would name it, and none of them does.
        // Registration is transitive since 119/03 — the runner names directories and each
        // directory's index names its own suites — so the aggregate's membership is read from
        // the registration surface rather than from the runner's text. Same claim.
        const registered = await registeredSuitePaths(repoRoot);
        for (const suite of LOOP_SUITES) {
          assert.ok(registered.has(`test/${suite}.test.mjs`), `test/${suite}.test.mjs is still registered in the aggregate suite`);
          const text = await readFile(path.join(repoRoot, "test", `${suite}.test.mjs`), "utf8");
          assert.ok(!text.includes("work:grade"), `${suite} names work:grade nowhere`);
          assert.ok(!text.includes("brief.grade"), `${suite} reaches for the durable record nowhere`);
          assert.ok(!text.includes("spawnRubric"), `${suite} was not taught the rubric seam`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
];
