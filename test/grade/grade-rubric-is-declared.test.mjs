// Traceability wiring for milestone 54 / story 01, task `00_the-rubric-is-declared`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/01_story_the-declared-rubric/tasks/00_the-rubric-is-declared.feature
// against the REAL registry (`invoke("work:grade", …)`) over real temp workspaces.
//
// THE DISTINCTION THIS FILE DEFENDS: aof runs precisely what the project DECLARED. It does
// not know that this repo's suite must run under `AOF_GLOBAL_HOME`, that
// `global-work-propagation` cannot bind a port a live daemon holds, or that the full suite is
// unsafe on the control node — and must not guess. Every assertion below is a way of asking
// "did anything between the declaration and the child change it?".
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { invoke, getCommand } from "../../src/command-core.mjs";
import { makeGradeRepo, writeRunner, rubricFor, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";

// A runner that reports its own argv and environment as TAP, so "what actually reached the
// child" is READ OFF THE CHILD rather than inferred from what we passed to the spawn.
const ECHO_RUNNER = `
const argv = process.argv.slice(2);
const seen = { argv, env: process.env };
require("node:fs").writeFileSync(process.env.AOF_ECHO_OUT, JSON.stringify(seen), "utf8");
process.stdout.write("ok - a case that really ran\\n");
`;

// A declaration that is PRESENT and cannot carry a run. The four rows of the outline.
const UNUSABLE = [
  { row: "a single string rather than an array", command: "node scripts/test.mjs" },
  { row: "an empty array", command: [] },
  { row: "an array whose first element is not a program", command: ["", "scripts/test.mjs"] },
  { row: "absent, while other `work.rubric` keys are set", command: undefined },
];

async function echoFixture() {
  const { repo } = await makeGradeRepo();
  const runner = await writeRunner(repo, "echo.cjs", ECHO_RUNNER);
  return { repo, runner, echoOut: path.join(repo, "echo.json") };
}

export const gradeRubricIsDeclaredTests = [
  {
    name: "grade/00 the declared argv is what runs, element for element — nothing split, joined or re-quoted",
    run: async () => {
      const { repo, runner, echoOut } = await echoFixture();
      // Arguments chosen so a shell — or any re-quoting — would be VISIBLE: a space, a
      // quote and a bare hyphen-flag that a splitter would tear in two.
      const declared = [process.execPath, runner, "--scope", "a b", "'quoted'", "-x"];
      const fx = await makeGradeRepo({
        rubric: { command: declared, env: { AOF_ECHO_OUT: echoOut }, report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
        assert.equal(spawn.calls.length, 1, "exactly one process is launched");

        const [call] = spawn.calls;
        assert.deepEqual([call.program, ...call.args], declared, "the process launched is that program with exactly those arguments, in that order");
        assert.deepEqual(result.grade.runner.command, declared, "the record reports the command that was actually run");

        // …and the CHILD agrees. No element was split, joined or re-quoted on the way.
        const seen = JSON.parse(await readFile(echoOut, "utf8"));
        assert.deepEqual(seen.argv, declared.slice(2), "the child observed the declared arguments verbatim");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 an argument that looks like shell is an argument, not shell",
    run: async () => {
      const { repo, runner, echoOut } = await echoFixture();
      try {
        // Every metacharacter that would mean something to a shell, in ONE argument.
        const hostile = "a > b | c ; d && e $(f) `g` *";
        const rubric = { command: [process.execPath, runner, hostile], env: { AOF_ECHO_OUT: echoOut }, report: { format: "tap", path: "report.tap", floor: 1 } };
        const fx = await makeGradeRepo({ rubric });
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));

        const seen = JSON.parse(await readFile(echoOut, "utf8"));
        assert.deepEqual(seen.argv, [hostile], "that argument reaches the runner as ONE argument, its characters verbatim");
        assert.ok(!existsSync(path.join(fx.repo, "b")), "nothing in it was interpreted as a redirection");

        // The grade came from the REPORT, not from a shell's exit status: the runner wrote
        // one passing case and exited 0, and the verdict reads that.
        assert.equal(result.grade.verdict, "pass", "the grade is decided by the report the runner wrote");
        assert.equal(result.grade.cases.total, 1, "…which enumerated exactly the one case it emitted");
        await rm(fx.repo, { recursive: true, force: true });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 [outline] a declaration that cannot carry a run is refused, and refusing is not proceeding (4 rows)",
    run: async () => {
      for (const { row, command } of UNUSABLE) {
        const rubric = { report: { format: "tap", path: "report.tap", floor: 1 } };
        if (command !== undefined) rubric.command = command;
        const fx = await makeGradeRepo({ rubric });
        try {
          const spawn = countingSpawn();
          const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));

          assert.equal(result.grade.verdict, "indeterminate", `[${row}] the verdict reads indeterminate`);
          assert.ok(result.grade.codes.includes("runner-spawn-failed"), `[${row}] the codes contain runner-spawn-failed`);
          // THE WHOLE POINT OF THE ROW. `rubric-unconfigured` PROCEEDS (ADR-007 §3); this
          // HALTS. Routing a mis-typed declaration to the proceeding code would silently
          // swallow it — a project that TRIED to declare a rubric would meet the same
          // behaviour as one that never tried.
          assert.ok(!result.grade.codes.includes("rubric-unconfigured"), `[${row}] the codes do NOT contain rubric-unconfigured`);
          assert.equal(spawn.calls.length, 0, `[${row}] no process was launched`);
          assert.equal(result.launched, 0, `[${row}] …and the record says so`);
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },

  {
    name: "grade/00 scope is declared, and an absent scope runs the suite whole KNOWINGLY",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) }); // no args.ref
      try {
        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo));
        assert.deepEqual(result.plan.command, [process.execPath, runner], "the planned argv carries no scope argument");
        assert.equal(result.plan.scope, null, "…and no scope was planned at all");
        assert.equal(result.plan.whole, true, "the plan states that the runner will run whole");
        // A READER CAN TELL WHOSE CHOICE IT WAS. `whole` is reported as a fact about the
        // DECLARATION, and the render says so in words rather than leaving a silence.
        const rendered = getCommand("work:grade").cli.render(result);
        assert.match(rendered, /whole — the declaration sets no `args\.ref`/, "the whole-suite run reads as the declaration's choice rather than aof's");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 a declared scope flag carries the item's own ref, exactly once, and only the ref changes between items",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner, { args: { ref: "--scope" } }) });
      try {
        const ctx = await ctxFor(fx.repo);
        const milestone = await invoke("work:grade", { ref: "03" }, ctx);
        assert.deepEqual(milestone.plan.command, [process.execPath, runner, "--scope", "03"], "the planned argv carries that flag followed by the item's ref");
        assert.equal(milestone.plan.command.filter((element) => element === "--scope").length, 1, "the flag appears exactly once");

        const story = await invoke("work:grade", { ref: "03/00" }, ctx);
        assert.deepEqual(story.plan.command, [process.execPath, runner, "--scope", "03/00"], "planning the same rubric for a different item changes ONLY the ref that follows it");
        assert.deepEqual(
          milestone.plan.command.slice(0, -1),
          story.plan.command.slice(0, -1),
          "…every element before the ref is identical",
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 the declared environment reaches the runner, overrides the ambient one, and aof adds exactly one variable of its own",
    run: async () => {
      const { repo, runner, echoOut } = await echoFixture();
      try {
        const rubric = {
          command: [process.execPath, runner],
          env: { AOF_ECHO_OUT: echoOut, AOF_GRADE_FIXTURE: "declared" },
          report: { format: "tap", path: "report.tap", floor: 1 },
        };
        const fx = await makeGradeRepo({ rubric });
        // An ambient environment carrying (a) a variable the declaration ALSO sets, and
        // (b) one it does not — so both halves of the overlay rule are observable.
        const ambient = { ...process.env, AOF_GRADE_FIXTURE: "ambient", AOF_GRADE_AMBIENT_ONLY: "kept" };
        await invoke("work:grade", { ref: "03", run: true, env: ambient }, await ctxFor(fx.repo));

        const seen = JSON.parse(await readFile(echoOut, "utf8"));
        assert.equal(seen.env.AOF_GRADE_FIXTURE, "declared", "a variable of the same name already in the ambient environment is OVERRIDDEN by the declared one");
        assert.equal(seen.env.AOF_GRADE_AMBIENT_ONLY, "kept", "the ambient environment is otherwise still visible to the runner");
        assert.equal(seen.env.AOF_ECHO_OUT, echoOut, "the runner observes the declared variable with the declared value");

        // THE ONE VARIABLE AOF CONTRIBUTED. Everything else in the child came from the
        // ambient environment or from the declaration — a child with an emptied environment
        // could not resolve `node` at all, which is why inheritance is the rule and
        // "aof invents nothing" is what §2 actually forbids.
        const declaredNames = new Set(Object.keys(rubric.env));
        const ambientNames = new Set(Object.keys(ambient));
        const contributed = Object.keys(seen.env).filter((name) => !declaredNames.has(name) && !ambientNames.has(name));
        assert.deepEqual(contributed, ["AOF_GRADE_RUNNING"], "the ONLY variable aof contributed that the project did not declare is the re-entrancy stamp");
        await rm(fx.repo, { recursive: true, force: true });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 the report declaration says where, in what format and how little is too little — and planning touches that path in no way",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, runner], report: { format: "tap", path: "out/report.tap", floor: 7 } },
      });
      try {
        const reportPath = path.join(fx.repo, "out", "report.tap");
        assert.equal(existsSync(reportPath), false, "guard: nothing exists at the declared path before planning");

        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo));
        assert.equal(result.plan.report.format, "tap", "the plan names the format the report will be read in");
        assert.equal(result.plan.report.path, reportPath, "the plan names the ABSOLUTE path, resolved from the workspace root");
        assert.ok(path.isAbsolute(result.plan.report.path), "…absolute, not relative to whatever cwd the reader happened to have");
        assert.equal(result.floor, 7, "the plan names the floor the observed case count must reach");

        // PLANNING CREATES, READS AND DELETES NOTHING AT THAT PATH. A planner that stat'd
        // it would make the read face's "executes nothing" a half-truth.
        assert.equal(existsSync(reportPath), false, "planning created nothing at that path");
        assert.equal(existsSync(path.dirname(reportPath)), false, "…not even its directory");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 `work.controls.runners` keeps its meaning, its readers and its findings",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      // The SAME stream, twice: once with no rubric, once with one. `work.controls` is set
      // by NEITHER — this repo sets none either, and `control-runner-unchecked` is what the
      // controls lane reports live today. Declaring a rubric must leave that untouched.
      const before = await makeGradeRepo({ fitnessRegister: true });
      const after = await makeGradeRepo({ rubric: rubricFor(runner), fitnessRegister: true });
      try {
        const findingsBefore = (await invoke("work:doctor", {}, await ctxFor(before.repo))).findings;
        const findingsAfter = (await invoke("work:doctor", {}, await ctxFor(after.repo))).findings;

        const codesOf = (findings) => findings.map((finding) => finding.code).sort();
        assert.deepEqual(codesOf(findingsAfter), codesOf(findingsBefore), "its findings are the same findings it reported before the rubric was declared");
        assert.ok(codesOf(findingsAfter).includes("control-runner-unchecked"), "the controls lane still reports control-runner-unchecked");

        // NO FINDING TREATS A `work.rubric` ENTRY AS A FILE TO OPEN. Leg B opens each
        // `work.controls.runners` entry AS A FILE; overloading the key would have broken it,
        // and the separate subtree is precisely what keeps it whole.
        const runnerArgv = rubricFor(runner).command;
        for (const finding of findingsAfter) {
          for (const element of runnerArgv) {
            assert.ok(!String(finding.path ?? "").includes(element), `no finding treats the rubric entry ${element} as a file to open`);
          }
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(before.repo, { recursive: true, force: true });
        await rm(after.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/00 the two keys are read apart, and neither is derived from the other",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const rubric = rubricFor(runner);
      // A project declaring BOTH. `work.controls.runners` names a real file in the fixture,
      // so the controls lane has something to open and its answer is observable.
      const controls = { runners: ["test/arch/fixture-control.test.mjs"] };
      const both = await makeGradeRepo({ rubric, controls, fitnessRegister: true });
      const rubricOnly = await makeGradeRepo({ rubric, fitnessRegister: true });
      const controlsOnly = await makeGradeRepo({ controls, fitnessRegister: true });
      try {
        const codesOf = async (root) => (await invoke("work:doctor", {}, await ctxFor(root))).findings.map((finding) => finding.code).sort();

        const bothCodes = await codesOf(both.repo);
        // The controls lane reports over the `work.controls.runners` entries ONLY: removing
        // the rubric leaves its answer unchanged.
        assert.deepEqual(await codesOf(controlsOnly.repo), bothCodes, "removing the rubric leaves the controls answer unchanged");

        const plan = (await invoke("work:grade", { ref: "03" }, await ctxFor(both.repo))).plan;
        const planWithoutControls = (await invoke("work:grade", { ref: "03" }, await ctxFor(rubricOnly.repo))).plan;
        // The plan is built from the `work.rubric` entries only: removing the controls key
        // leaves the plan byte-identical but for the workspace root it resolved against.
        assert.deepEqual(plan.command, planWithoutControls.command, "the plan is built from the work.rubric entries only");
        assert.deepEqual(plan.scope, planWithoutControls.scope, "…and removing work.controls changes nothing in it");
        assert.equal(plan.report.format, planWithoutControls.report.format, "…nor in its report declaration");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(both.repo, { recursive: true, force: true });
        await rm(rubricOnly.repo, { recursive: true, force: true });
        await rm(controlsOnly.repo, { recursive: true, force: true });
      }
    },
  },
];
