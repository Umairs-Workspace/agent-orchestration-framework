// Traceability wiring for milestone 54 / story 01, task `01_unconfigured-is-an-honest-no-op`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/01_story_the-declared-rubric/tasks/01_unconfigured-is-an-honest-no-op.feature
//
// ALMOST EVERY REPO THAT INSTALLS AOF HAS NO `work.rubric` ON THE DAY IT INSTALLS IT. What
// happens to those repos is the whole no-regression rule, and there are exactly two ways to
// get it wrong: read the silence as `pass` (and ship a green nothing paid for), or read it as
// a failure (and halt every loop in a repo that never asked for a grader). Neither happens.
//
// THIS IS A DIFFERENT ASSERTION FROM 54/00's, AND THE DIFFERENCE IS THE POINT. 54/00's
// `00_the-frozen-vocabularies` proves the PURE COMPILER, handed the observation "no rubric",
// yields the code and the verdict — a leaf, no config, no disk. This proves the COMMAND over
// a real repository: it reads that repo's actual configuration, decides there is nothing to
// run, and SPAWNS NOTHING. A grader that produced the right record while still launching a
// process would pass 54/00 and fail here.
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke, getCommand } from "../../src/command-core.mjs";
import { makeGradeRepo, writeRunner, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";
import { registeredSuitePaths } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// THE THREE SHIPPED LOOP SUITES — ADR-002 §3's evidence that the loop is unchanged.
const LOOP_SUITES = ["loop/loop-command-gate", "loop/loop-command-sequencing", "loop/loop-command-stops"];

// ADR-007 §3's admission predicate, stated once. `rubric-unconfigured` is the ONE
// `indeterminate` that PROCEEDS; every other indeterminate code halts. The gate that reads
// this lands with 54/02 (`work:grade` does not enter `GATE_ORDER` until then, and the task's
// own narrative says so) — what is provable HERE is that the two records fall on opposite
// sides of it, by their CODE alone.
const meetsGradeIndeterminateStop = (grade) =>
  grade.verdict === "indeterminate" && !grade.codes.includes("rubric-unconfigured");

export const gradeUnconfiguredNoOpTests = [
  {
    name: "grade/01 a repository that declares no rubric is told so, by name",
    run: async () => {
      const fx = await makeGradeRepo();
      try {
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));
        assert.equal(result.grade.verdict, "indeterminate", "the verdict reads indeterminate");
        assert.ok(result.grade.codes.includes("rubric-unconfigured"), "the codes contain rubric-unconfigured");
        // The `roadmap-folder-mismatch` idiom, verbatim: NAME THE KEY that would activate
        // the lane rather than emitting nothing and rather than emitting an alarm.
        assert.match(result.message, /work\.rubric/, "the message names work.rubric as the key to set");
        assert.equal(result.rubricKey, "work.rubric", "…and the key is reported as data, not only in prose");
        assert.match(result.message, /not a failure of the project's tests/, "the message does not read as a failure of the project's tests");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/01 nothing is launched, because there was nothing to launch",
    run: async () => {
      const fx = await makeGradeRepo();
      try {
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
        assert.equal(spawn.calls.length, 0, "no process was launched");
        assert.equal(result.launched, 0, "…and the record says so");
        assert.equal(result.grade.runner, null, "`runner` reads null");
        assert.equal(result.grade.report, null, "`report` reads null");
        // THE ZERO COUNTS ARE REPORTED, NOT OMITTED (ADR-005 §4): evidence that there was
        // nothing to count is still evidence, and an absent key would read as "unknown".
        assert.deepEqual(result.grade.cases, { total: 0, failed: 0, skipped: 0 }, "the observed case counts each read zero rather than being absent");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/01 [outline] no absent-rubric path anywhere yields a pass (4 rows: every door into the grade)",
    run: async () => {
      const fx = await makeGradeRepo();
      try {
        const ctx = await ctxFor(fx.repo);
        const doors = [
          { row: "the rubric is graded with `--run`", input: { ref: "03", run: true } },
          { row: "the plan is read without `--run`", input: { ref: "03" } },
          { row: "the grade is requested for a story rather than a milestone", input: { ref: "03/00", run: true } },
        ];
        for (const { row, input } of doors) {
          const result = await invoke("work:grade", input, ctx);
          assert.equal(result.grade.verdict, "indeterminate", `[${row}] the verdict reads indeterminate`);
          assert.notEqual(result.grade.verdict, "pass", `[${row}] the verdict does not read pass`);
          assert.notEqual(result.grade.verdict, "fail", `[${row}] the verdict does not read fail`);
        }
        // The fourth row — the grade is requested TWICE in succession. Asked apart because
        // the second answer is the one a memoised or accumulating implementation gets wrong.
        const first = await invoke("work:grade", { ref: "03", run: true }, ctx);
        const second = await invoke("work:grade", { ref: "03", run: true }, ctx);
        for (const [label, result] of [["first", first], ["second", second]]) {
          assert.equal(result.grade.verdict, "indeterminate", `[twice in succession/${label}] the verdict reads indeterminate`);
          assert.notEqual(result.grade.verdict, "pass", `[twice in succession/${label}] the verdict does not read pass`);
          assert.notEqual(result.grade.verdict, "fail", `[twice in succession/${label}] the verdict does not read fail`);
        }
        assert.deepEqual(second.grade.codes, first.grade.codes, "…and the second answer is the first answer, not an accumulation of it");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/01 undeclared proceeds, declared-and-unusable halts — the adjacent pair, side by side",
    run: async () => {
      // ADJACENT INPUTS WITH OPPOSITE LOOP CONSEQUENCES. Asserted here side by side rather
      // than left to be inferred from two files, because conflating them is the expensive
      // mistake: a project that TRIED to declare a rubric and got the shape wrong would
      // otherwise meet the same behaviour as one that never tried.
      const undeclared = await makeGradeRepo();
      const unusable = await makeGradeRepo({ rubric: { report: { format: "tap", path: "report.tap", floor: 1 } } });
      try {
        const first = (await invoke("work:grade", { ref: "03", run: true }, await ctxFor(undeclared.repo))).grade;
        const second = (await invoke("work:grade", { ref: "03", run: true }, await ctxFor(unusable.repo))).grade;

        assert.ok(first.codes.includes("rubric-unconfigured"), "the first reports rubric-unconfigured");
        assert.equal(meetsGradeIndeterminateStop(first), false, "…and the loop's stop conditions are not met by it");

        assert.ok(second.codes.includes("runner-spawn-failed"), "the second reports runner-spawn-failed");
        assert.equal(meetsGradeIndeterminateStop(second), true, "…and it DOES meet the grade-indeterminate stop");

        // DISTINGUISHABLE BY THEIR CODE ALONE, without reading their messages: both read
        // `indeterminate`, so the verdict cannot be what separates them.
        assert.equal(first.verdict, second.verdict, "guard: the verdict alone does not separate them");
        assert.notDeepEqual(first.codes, second.codes, "the two records are distinguishable by their code alone");
      } finally {
        await rm(undeclared.repo, { recursive: true, force: true });
        await rm(unusable.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/01 the shipped loop behaves as it did, and the evidence is the suites themselves — registered, and naming the grade nowhere",
    run: async () => {
      // ADR-002 §3's evidence, taken the way the ADR asks for it. `m08/R2` warns that "green
      // verbatim" and "guarantee preserved" are different claims; HERE they coincide,
      // because at this story nothing has been inserted into the loop at all — `work:grade`
      // does not enter `GATE_ORDER` until 54/02.
      // Registration is transitive since 119/03 — the runner names directories and each
      // directory's index names its own suites — so the aggregate's membership is read from
      // the registration surface rather than from the runner's text. Same claim.
      const registered = await registeredSuitePaths(repoRoot);
      for (const suite of LOOP_SUITES) {
        // Green is proven by the aggregate run, which is what "the suite is green" means in
        // this repo — so the durable assertion is that the aggregate still RUNS them.
        assert.ok(registered.has(`test/${suite}.test.mjs`), `test/${suite}.test.mjs is still registered in the aggregate suite`);
        // …AND THAT NONE OF THEM WAS EDITED TO MAKE THEM GREEN. Expressed as a property
        // rather than as a diff, so it keeps holding: a loop suite that had to learn about
        // the grade to stay green would name it, and none of them does.
        const text = await readFile(path.join(repoRoot, "test", `${suite}.test.mjs`), "utf8");
        assert.ok(!text.includes("work:grade"), `${suite} names work:grade nowhere`);
        assert.ok(!text.includes("grade-indeterminate"), `${suite} names grade-indeterminate nowhere`);
        assert.ok(!/\bgradeCommand\b/.test(text), `${suite} reaches for the grade command nowhere`);
      }
    },
  },

  {
    name: "grade/01 an honest no-op is not a silent one",
    run: async () => {
      const fx = await makeGradeRepo();
      const declared = await makeGradeRepo();
      const runnerPath = await writeRunner(declared.repo, "empty.cjs", "process.stdout.write(\"TAP version 13\\n1..0\\n\");");
      const ranAndFoundNothing = await makeGradeRepo({
        rubric: { command: [process.execPath, runnerPath], report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const noRubric = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo));
        assert.match(noRubric.message, /No rubric is declared/, "it states that no rubric was declared");
        assert.match(noRubric.message, /work\.rubric/, "it states which key would declare one");

        // A READER CAN DISTINGUISH IT FROM A RUBRIC THAT RAN AND FOUND NOTHING TO REPORT.
        // Both are `indeterminate` — the CODE is what separates "we never looked" from "we
        // looked and there was nothing there", which is the whole of ADR-005 §3.
        const ranEmpty = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(ranAndFoundNothing.repo));
        assert.equal(ranEmpty.grade.verdict, "indeterminate", "guard: a runner that reported nothing is also indeterminate");
        assert.ok(!ranEmpty.grade.codes.includes("rubric-unconfigured"), "…but it carries a different code");
        assert.ok(ranEmpty.grade.codes.includes("report-vacuous") || ranEmpty.grade.codes.includes("report-missing"),
          "…one that says a report was looked for and found wanting");
        assert.notEqual(ranEmpty.grade.runner, null, "…and it reports a runner, where the no-op reports none");

        const rendered = getCommand("work:grade").cli.render(noRubric);
        assert.match(rendered, /work\.rubric/, "the human face names the key too — an honest no-op is not a silent one");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(declared.repo, { recursive: true, force: true });
        await rm(ranAndFoundNothing.repo, { recursive: true, force: true });
      }
    },
  },
];
