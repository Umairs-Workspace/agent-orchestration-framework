// Traceability wiring for story 81, task `00_the-grade-waits-without-blocking`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/81_story_bounds-under-a-real-grader/tasks/00_the-grade-waits-without-blocking.feature
//
// THE HEADLINE, ROUTED THREE TIMES AND REFUSED THREE TIMES. `commands/grade.mjs` spawned the
// declared rubric with `spawnSync`, and `work:grade` is rung 3 of `GATE_ORDER` — so for the
// whole time a rubric ran, the process running the loop was STOPPED. `69/ADR-002`'s heartbeat
// window is fifteen minutes and its stated terminal behaviour is *"kill the attempt and retry
// it"*, so a healthy grade outlasting the window is reaped as a stranded run. And the grade
// resolved `startToClose` — THIRTY minutes, twice the window it had to survive, which is the
// second half of the fault and is invisible from this repo's 7.8x margin.
//
// THE SPAWN IS REAL IN THIS FILE, AND THAT IS THE POINT. Every other grade suite injects
// `ctx.spawnRubric`, which is right for asserting what the loop does with an answer — but a
// stub is synchronous, so a stubbed spawn cannot tell a blocking runner from a non-blocking
// one. The liveness scenarios below therefore drive REAL child processes and observe the
// test's own event loop turning while the runner works: a callback that fires during the
// grade is an observation `spawnSync` makes impossible, not an inference from the source.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import {
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_START_TO_CLOSE_MS,
  gradeDeadlineFromConfig,
} from "../../src/loop-bounds.mjs";
import { rubricSpawnOptions, spawnRubricAsync, GRADE_REENTRANCY_ENV } from "../../src/commands/grade.mjs";
import { readSrcFiles } from "../support/read-src-files.mjs";
import { makeGradeRepo, writeRunner, rubricFor, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";
import { completingDriver, loopFixture, replaceStatus } from "../loop/loop-command-probe.test.mjs";
import { capturingReport, emitsPassing, gradingCtx, stubRubric } from "../support/loop-grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------- the runners ----
//
// Written with `console.log` rather than `process.stdout.write("…\n")` so no runner body
// carries an escape that has to survive being embedded in a template literal — the shape of
// the report is the contract here, not the cleverness of the fixture.

/** Writes a start marker, waits, then writes a done marker and a passing case. */
const SLOW_RUNNER = `
const fs = require("node:fs");
fs.writeFileSync(process.env.AOF_START_OUT, "started", "utf8");
setTimeout(() => {
  fs.writeFileSync(process.env.AOF_DONE_OUT, "finished", "utf8");
  console.log("ok - a case that really ran");
}, Number(process.env.AOF_SLEEP_MS));
`;

/** Writes a start marker and then never terminates — the deadline's kill is the only exit. */
const NEVER_TERMINATES = `
const fs = require("node:fs");
fs.writeFileSync(process.env.AOF_START_OUT, "started", "utf8");
setInterval(() => {}, 1000);
`;

/** Reports the argv it actually received, element for element. */
const ARGV_RUNNER = `
const fs = require("node:fs");
fs.writeFileSync(process.env.AOF_ARGV_OUT, JSON.stringify(process.argv.slice(2)), "utf8");
console.log("ok - one");
`;

/** BLOCKS on stdin. With stdin piped-and-unwritten it hangs; with stdin IGNORED it reads EOF. */
const STDIN_RUNNER = `
const fs = require("node:fs");
let read;
try { read = { eof: true, text: fs.readFileSync(0, "utf8") }; } catch (error) { read = { eof: false, code: error.code }; }
fs.writeFileSync(process.env.AOF_STDIN_OUT, JSON.stringify(read), "utf8");
console.log("ok - a case that really ran");
`;

/** A green case on stdout and a red one on STDERR — this repo's own runner's shape. */
const SPLIT_STREAM_RUNNER = `
console.log("ok - a green case");
console.error("not ok - a case that failed on stderr");
`;

/** Reports the re-entrancy stamp as the child observed it. */
const STAMP_RUNNER = `
const fs = require("node:fs");
fs.writeFileSync(process.env.AOF_STAMP_OUT, String(process.env.${GRADE_REENTRANCY_ENV}), "utf8");
console.log("ok - one");
`;

/** Emits far more than the ceiling it is given, so the capture overflows. */
const LOUD_RUNNER = `
for (let index = 0; index < 400; index += 1) console.log("ok - " + index + " " + "x".repeat(200));
`;

/**
 * Emits 600 THREE-BYTE characters: 1800 bytes, 600 characters. It overflows a 1024-BYTE
 * ceiling and does not overflow a 1024-CHARACTER one, which is what makes the two countings
 * distinguishable rather than a matter of taste.
 */
const WIDE_RUNNER = `
process.stdout.write("\\u4e2d".repeat(600));
`;

/** The driver used wherever the loop must run past the build rather than stop before it. */
const completingThrough = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

/**
 * A loop fixture whose rubric is a REAL runner and whose loop bounds are the ones the case
 * declares. `gradingFixture` cannot serve here: it exists to pair a declaration with a
 * STUBBED spawn, and these cases are about the spawn itself.
 */
async function realRunnerLoopFixture({ runnerBody, env = {}, loop = {}, ...options }) {
  const fx = await loopFixture(options);
  const runner = await writeRunner(fx.projectRoot, "runner.cjs", runnerBody);
  fx.workspace.config.work.rubric = {
    command: [process.execPath, runner],
    report: { format: "tap", path: "report.tap", floor: 1 },
    env,
  };
  fx.workspace.config.work.loop = { ...(fx.workspace.config.work.loop ?? {}), ...loop };
  return fx;
}

export const gradeWaitsWithoutBlockingTests = [
  // ============================================================ LIVENESS ============
  {
    name: "81/00 the loop stays responsive for as long as the runner works — an operator interrupt is observed mid-grade",
    run: async () => {
      const fx = await realRunnerLoopFixture({ cap: 2, reviewRounds: 9, runnerBody: SLOW_RUNNER });
      const startMarker = path.join(fx.projectRoot, "runner-started");
      const doneMarker = path.join(fx.projectRoot, "runner-finished");
      fx.workspace.config.work.rubric.env = {
        AOF_START_OUT: startMarker,
        AOF_DONE_OUT: doneMarker,
        AOF_SLEEP_MS: "1500",
      };

      // THE INTERRUPT IS FIRED FROM THIS PROCESS'S OWN EVENT LOOP, WHILE THE RUNNER WORKS.
      // That is the whole assertion: under `spawnSync` this interval could not tick at all
      // between the launch and the child's exit, so `firedWhileRunning` would stay false and
      // the case would go red — which is precisely the fault, made observable.
      let firedWhileRunning = false;
      const armed = setInterval(() => {
        if (!existsSync(startMarker) || existsSync(doneMarker)) return;
        firedWhileRunning = true;
        clearInterval(armed);
        process.emit("SIGINT");
      }, 10);

      try {
        const driver = completingThrough(fx);
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: driver.options,
          report: capturingReport(),
        });

        assert.equal(firedWhileRunning, true, "a callback in this process ran WHILE the runner was working — the spawn did not stop the event loop");
        assert.equal(existsSync(startMarker), true, "guard: the runner really did start");
        assert.equal(state.act.act, "halt", "the loop halted");
        assert.equal(state.act.stop, "operator-interrupt", "…on operator-interrupt");
        assert.equal(state.act.ref, "03/01", "…naming the item it was grading");
      } finally {
        clearInterval(armed);
        process.removeAllListeners("SIGINT");
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/00 a timer scheduled before the grade fires while the grade is still waiting, and before the runner exits",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "slow.cjs", SLOW_RUNNER);
      const startMarker = path.join(repo, "started");
      const doneMarker = path.join(repo, "finished");
      const fx = await makeGradeRepo({
        rubric: rubricFor(runner, {
          env: { AOF_START_OUT: startMarker, AOF_DONE_OUT: doneMarker, AOF_SLEEP_MS: "1200" },
        }),
      });
      try {
        // SCHEDULED BEFORE THE GRADE, TO FIRE SOONER THAN THE RUNNER WILL FINISH.
        let firedAt = null;
        let doneWhenFired = null;
        const timer = setTimeout(() => {
          firedAt = Date.now();
          doneWhenFired = existsSync(doneMarker);
        }, 150);

        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));
        const returnedAt = Date.now();
        clearTimeout(timer);

        assert.equal(result.grade.verdict, "pass", "guard: the runner really ran and really reported");
        assert.equal(existsSync(doneMarker), true, "guard: the runner really did finish");
        assert.notEqual(firedAt, null, "the callback fired at all — under a blocking spawn it could not have");
        assert.ok(firedAt < returnedAt, "…by the time the grade returned, that callback had fired");
        assert.equal(doneWhenFired, false, "…and it fired BEFORE the runner exited");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  // ============================================================ THE DEADLINE ============
  {
    name: "81/00 [outline] the deadline is derived from the two bounds and never exceeds the liveness window (4 rows)",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'console.log("ok - one");');
      // The four rows of the contract's Examples table, verbatim.
      const rows = [
        { startToClose: 1_800_000, heartbeat: 900_000, deadline: 900_000 },
        { startToClose: 900_000, heartbeat: 1_800_000, deadline: 900_000 },
        { startToClose: 600_000, heartbeat: 900_000, deadline: 600_000 },
        { startToClose: 900_000, heartbeat: 900_000, deadline: 900_000 },
      ];
      const fixtures = [];
      try {
        for (const { startToClose, heartbeat, deadline } of rows) {
          const label = `${startToClose}/${heartbeat}`;
          const fx = await makeGradeRepo({
            rubric: rubricFor(runner),
            loop: { startToCloseMs: startToClose, heartbeatMs: heartbeat },
          });
          fixtures.push(fx.repo);
          // A STUB: these rows are about the PLAN and the value the spawn is HANDED, never
          // about a run. The liveness cases above are where the real runner launches.
          const spawn = countingSpawn(() => ({ status: 0, stdout: "ok - one\n", stderr: "", error: null, signal: null }));
          const ctx = await ctxFor(fx.repo, { spawnRubric: spawn });

          // THE PLAN'S DEADLINE.
          const planned = await invoke("work:grade", { ref: "03" }, ctx);
          assert.equal(planned.plan.deadlineMs, deadline, `[${label}] the plan's deadline is the derived one`);
          // …AND THE SAME NUMBER RESOLVED STRAIGHT FROM THE HOME, so the plan is not the only
          // witness to a derivation the home is supposed to own.
          assert.equal(gradeDeadlineFromConfig(ctx.workspace), deadline, `[${label}] …and the home derives it`);

          // AND THE DEADLINE IS THE VALUE THE SPAWN IS GIVEN — read off the options the
          // spawn seam actually received, never off the plan a second time.
          await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
          assert.equal(spawn.calls.length, 1, `[${label}] exactly one launch`);
          assert.equal(spawn.calls[0].options.timeout, deadline, `[${label}] the deadline is the value the spawn is given`);
        }
        // THE DEFAULT PAIR IS THE FAULT'S OWN SHAPE: thirty minutes under a fifteen minute
        // window. Stated so the derivation is read rather than inferred from equal numbers.
        assert.equal(DEFAULT_START_TO_CLOSE_MS, 2 * DEFAULT_HEARTBEAT_MS, "guard: the default attempt bound really is twice the default window");
      } finally {
        await rm(repo, { recursive: true, force: true });
        for (const dir of fixtures) await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "81/00 the deadline resolves through 69's one home, and the grade path declares none of its own",
    run: async () => {
      const code = (await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8"))
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      assert.match(code, /from "\.\.\/loop-bounds\.mjs"/, "it resolves its deadline through src/loop-bounds.mjs");
      // THE GUARD THAT PINNED THE OLD RESOLVER BY NAME NOW PINS THE NEW ONE.
      assert.match(code, /gradeDeadlineFromConfig/, "…by the derived resolver's name");
      assert.ok(!code.includes("startToCloseFromConfig"), "…and no longer by the unclamped one it used to");
      assert.ok(!/\btimeout\s*[:=]\s*\d/.test(code), "it hard-codes no timeout value");
      assert.ok(!code.includes("work.loop.startToCloseMs"), "it does not read 69's start-to-close key behind its resolver");
      assert.ok(!code.includes("work.loop.heartbeatMs"), "…nor its heartbeat key");

      // NO NEW `work.loop.*` KEY IS DECLARED, so the tuner's declared ranges are unchanged.
      // Asserted over the registries themselves rather than over prose about them.
      const bounds = await import("../../src/loop-bounds.mjs");
      assert.deepEqual(
        [...bounds.LOOP_BOUND_CONFIG_KEYS].sort(),
        [...bounds.LOOP_BOUND_VALUE_KEYS].sort(),
        "the two registries still name the same keys",
      );
      for (const registry of [bounds.LOOP_BOUND_CONFIG_RESOLVERS, bounds.LOOP_BOUND_VALUE_RESOLVERS]) {
        assert.ok(
          !Object.keys(registry).some((key) => /grade/iu.test(key)),
          "no grade-specific knob was coined — the remedy is the existing work.loop.heartbeatMs",
        );
      }
      // …AND THE DERIVATION IS NOT ITSELF A KEY. A key resolving to two bounds would make
      // every step on it compound BY CONSTRUCTION (`61/ADR-001 §4`); a derivation over two
      // keys is not a knob and never reaches the probe.
      assert.equal(bounds.rangeProbe("work.loop.gradeDeadlineMs", 1000).code, bounds.NO_DECLARED_RANGE, "the derivation declares no range because it declares no key");
      assert.equal(typeof bounds.gradeDeadlineFromConfig, "function", "…it is a derivation, and it lives in the one home");
    },
  },

  {
    name: "81/00 a runner that outlasts the derived deadline is killed and graded, not reaped",
    run: async () => {
      // THE WINDOW IS THE FIXTURE'S OWN, declared under the attempt bound exactly as a
      // consumer repository with a slow suite would meet it. No production number is moved.
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "forever.cjs", NEVER_TERMINATES);
      const startMarker = path.join(repo, "started");
      const fx = await makeGradeRepo({
        rubric: rubricFor(runner, { env: { AOF_START_OUT: startMarker } }),
        loop: { startToCloseMs: 600_000, heartbeatMs: 500 },
      });
      try {
        const ctx = await ctxFor(fx.repo);
        assert.equal(gradeDeadlineFromConfig(ctx.workspace), 500, "guard: the derived deadline is the window, not the attempt bound");

        const result = await invoke("work:grade", { ref: "03", run: true }, ctx);

        assert.equal(existsSync(startMarker), true, "guard: the runner really was alive");
        assert.equal(result.launched, 1, "guard: it really was launched");
        // FORCE-KILLED, AND GRADED. The record's `runner` envelope is the frozen four
        // (FF-5403) and carries no `outcome`, so the kill is read off the facts it does
        // carry: a runner that never terminates came back with NO exit status, in about the
        // deadline it was given rather than never.
        assert.equal(result.grade.runner.exit, null, "the runner was killed rather than left to exit");
        assert.ok(result.grade.runner.durationMs < 60_000, "…and it was killed at its deadline, not left running");
        assert.equal(result.grade.verdict, "indeterminate", "the verdict is indeterminate");
        assert.ok(result.grade.codes.includes("runner-timeout"), "…carrying the code runner-timeout");
        // THE DETAIL NAMES THE DEADLINE IT EXCEEDED.
        assert.match(String(result.detail), /500/u, "the reported detail names the deadline the runner exceeded");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "81/00 that timeout reaches the loop as a named halt, and leaves no run to be reclaimed as stranded",
    run: async () => {
      const fx = await realRunnerLoopFixture({
        cap: 2,
        reviewRounds: 9,
        runnerBody: NEVER_TERMINATES,
        loop: { startToCloseMs: 600_000, heartbeatMs: 500 },
      });
      fx.workspace.config.work.rubric.env = { AOF_START_OUT: path.join(fx.projectRoot, "started") };
      try {
        const driver = completingThrough(fx);
        const report = capturingReport();
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: driver.options,
          report,
        });

        assert.equal(state.act.act, "halt", "the loop halted");
        assert.equal(state.act.stop, "grade-indeterminate", "…on grade-indeterminate");
        assert.equal(state.act.producer, "work:grade:runner-timeout", "…naming work:grade:runner-timeout as the producer");
        // A LEGIBLE HALT, NOT A SILENT REAP. The cost this task takes deliberately.
        assert.match(report.lines.join("\n"), /runner-timeout/u, "the operator's report line names the code");

        // AND NOTHING IS LEFT `running` FOR THE STALE SWEEP TO RECLAIM.
        const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
        assert.ok(runs.length > 0, "guard: the loop really minted a run");
        assert.deepEqual(runs.filter((run) => run.state === "running"), [], "no run is left running to be reclaimed as stranded");
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ============================================================ THE GUARDS ============
  {
    name: "81/00 [outline] the guards the blocking spawn used to give for free still hold on the async one (6 rows)",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const repos = [];
      const run = async (name, body, extra) => {
        const runner = await writeRunner(repo, name, body);
        const fx = await makeGradeRepo({ rubric: rubricFor(runner, extra) });
        repos.push(fx.repo);
        // NO STUB. These rows are about the spawn ITSELF, so the shipped async runner is
        // what launches — a counting stub delegates to `spawnSync`, which would prove every
        // guard on precisely the spawn this task replaced.
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));
        return { result, repo: fx.repo };
      };
      try {
        // ROW 1 — no shell interprets the declared argv, and each element reaches the child
        // verbatim. The metacharacters are the test: a shell would split, glob or redirect.
        const argvOut = path.join(repo, "argv.json");
        const hostile = ["a b & c", "$HOME", "*.mjs", ">out.txt"];
        const argvRunner = await writeRunner(repo, "argv.cjs", ARGV_RUNNER);
        const argvFx = await makeGradeRepo({
          rubric: {
            command: [process.execPath, argvRunner, ...hostile],
            report: { format: "tap", path: "report.tap", floor: 1 },
            env: { AOF_ARGV_OUT: argvOut },
          },
        });
        repos.push(argvFx.repo);
        await invoke("work:grade", { ref: "03", run: true }, await ctxFor(argvFx.repo));
        assert.deepEqual(JSON.parse(readFileSync(argvOut, "utf8")), hostile, "[no shell] each argv element reaches the child verbatim");

        // ROW 2 — a runner that reads standard input observes end-of-input rather than blocking.
        const stdinOut = path.join(repo, "stdin.json");
        const stdin = await run("stdin.cjs", STDIN_RUNNER, { env: { AOF_STDIN_OUT: stdinOut } });
        assert.deepEqual(JSON.parse(readFileSync(stdinOut, "utf8")), { eof: true, text: "" }, "[stdin] the runner read end-of-input rather than hanging");
        assert.equal(stdin.result.grade.verdict, "pass", "[stdin] …and went on to report");

        // ROW 3 — both standard output and standard error are captured.
        const split = await run("split.cjs", SPLIT_STREAM_RUNNER);
        assert.equal(split.result.grade.verdict, "fail", "[both streams] a red on stderr is not a green");
        assert.ok(
          split.result.grade.failures.some((failure) => String(failure.case).includes("a case that failed on stderr")),
          "[both streams] the failure written to stderr is in the record",
        );

        // ROW 4 — output beyond the capture ceiling is discarded rather than graded. Asserted
        // at the spawn's own door with the ceiling handed in: driving a 32MB child would
        // measure the machine rather than the guard.
        const loudRunner = await writeRunner(repo, "loud.cjs", LOUD_RUNNER);
        const overflowed = await spawnRubricAsync(process.execPath, [loudRunner], {
          ...rubricSpawnOptions({ cwd: repo, env: process.env, deadlineMs: 30_000 }),
          maxBuffer: 1024,
        });
        assert.equal(overflowed.error?.code, "ENOBUFS", "[capture ceiling] a child that out-talks the ceiling is reported as an overflow");
        assert.notEqual(overflowed.error?.code, "ETIMEDOUT", "…and never mistaken for a deadline, though both force-kill");
        // …AND THE TRUNCATED TEXT IS NOT GRADED. `runRubric` discards it; the record that
        // comes back names no case it half-read.
        const fitting = await spawnRubricAsync(process.execPath, [loudRunner], rubricSpawnOptions({ cwd: repo, env: process.env, deadlineMs: 30_000 }));
        assert.equal(fitting.error, null, "guard: the same runner under the real ceiling does not overflow");

        // …AND THE CEILING IS COUNTED IN BYTES, AS ITS NAME SAYS AND AS `spawnSync`'s
        // `maxBuffer` did. Review finding: the first async runner decoded each chunk before
        // counting it, which made the budget UTF-16 CODE UNITS — so a multi-byte report was
        // silently allowed several times the declared ceiling. This runner emits 600
        // three-byte characters: 1800 BYTES but only 600 characters, so it overflows a
        // 1024-byte ceiling and does NOT overflow a 1024-character one.
        const wideRunner = await writeRunner(repo, "wide.cjs", WIDE_RUNNER);
        const wide = await spawnRubricAsync(process.execPath, [wideRunner], {
          ...rubricSpawnOptions({ cwd: repo, env: process.env, deadlineMs: 30_000 }),
          maxBuffer: 1024,
        });
        assert.equal(wide.error?.code, "ENOBUFS", "[capture ceiling] the ceiling is counted in BYTES, not in characters");

        // And a multi-byte character SPLIT ACROSS A CHUNK BOUNDARY still decodes whole —
        // the concatenation is decoded once, rather than each chunk being decoded where the
        // kernel happened to divide it.
        const under = await spawnRubricAsync(process.execPath, [wideRunner], rubricSpawnOptions({ cwd: repo, env: process.env, deadlineMs: 30_000 }));
        assert.equal(under.error, null, "guard: under the real ceiling the same runner does not overflow");
        assert.ok(!under.stdout.includes("�"), "…and no character was mangled at a chunk boundary");

        // ROW 5 — the re-entrancy stamp is set in the child's environment.
        const stampOut = path.join(repo, "stamp.txt");
        await run("stamp.cjs", STAMP_RUNNER, { env: { AOF_STAMP_OUT: stampOut } });
        assert.equal(readFileSync(stampOut, "utf8"), "1", "[stamp] the child observed the re-entrancy stamp");

        // ROW 6 — exactly one `--run` performs exactly one launch.
        const once = await run("green.cjs", 'console.log("ok - one");');
        assert.equal(once.result.launched, 1, "[one launch] one --run performs exactly one launch");
        assert.equal(once.result.grade.verdict, "pass", "…and that one launch is what produced the record");
      } finally {
        await rm(repo, { recursive: true, force: true });
        for (const dir of repos) await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    // REVIEW FINDING (structural lane): the async runner stops an OVER-TALKING child with
    // `SIGKILL` too, and the classification read `signal === "SIGKILL"` as a deadline BEFORE
    // it looked at `ENOBUFS`. Under `spawnSync` the two were distinguishable for free — its
    // buffer kill used `SIGTERM` — so the ordering only became load-bearing when the spawn
    // became asynchronous, and nothing measured it. A runner that ran to its ceiling and one
    // that outlasted its deadline are DIFFERENT ANSWERS, and conflating them is exactly the
    // class of lie a grade must not tell.
    name: "81/00 a child killed at the capture ceiling is not reported as a child killed at its deadline",
    run: async () => {
      const fx = await makeGradeRepo({ rubric: rubricFor("/does/not/matter") });
      try {
        // The shape the async runner answers with when a child out-talks the ceiling: no
        // status, an `ENOBUFS` error, and the SIGKILL it was stopped with.
        const overflowed = () => ({
          status: null,
          stdout: "",
          stderr: "",
          error: Object.assign(new Error("the runner emitted more than the capture ceiling"), { code: "ENOBUFS" }),
          signal: "SIGKILL",
        });
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: countingSpawn(overflowed) }));

        assert.ok(!result.grade.codes.includes("runner-timeout"), "an overflow is not reported as a deadline");
        assert.match(String(result.detail), /capture ceiling/u, "…it is reported as what it was");
        assert.equal(result.grade.verdict, "indeterminate", "…and it still tells us nothing about the item");

        // AND THE DEADLINE IS STILL REPORTED AS A DEADLINE. The pair is asserted together so
        // neither can be satisfied by collapsing both onto one answer.
        const timedOut = () => ({
          status: null,
          stdout: "",
          stderr: "",
          error: Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }),
          signal: "SIGKILL",
        });
        const late = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: countingSpawn(timedOut) }));
        assert.ok(late.grade.codes.includes("runner-timeout"), "a deadline is still reported as a deadline");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "81/00 exactly one module still spawns the declared rubric, and the pure leaf still spawns nothing",
    run: async () => {
      const strip = (text) => text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const spawners = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const code = strip(await readFile(file.path, "utf8"));
        const readsTheRubric = /work\?\.rubric|work\.rubric|RUBRIC_CONFIG_KEY/.test(code);
        const spawns = /\bspawnSync\s*\(|\bspawn\w*\s*\(|\bexecFile|\bexec\s*\(/.test(code);
        if (readsTheRubric && spawns) spawners.push(file.rel);
      }
      assert.deepEqual(spawners, ["commands/grade.mjs"], "exactly one module spawns the declared rubric argv, and it is the registered grade command");

      // THE PURE LEAF IS UNTOUCHED — no child process facility, no clock (FF-5406).
      const leaf = strip(await readFile(path.join(repoRoot, "src", "work", "grade.mjs"), "utf8"));
      for (const forbidden of ["node:child_process", "spawnSync", "spawn(", "Date.now(", "new Date("]) {
        assert.ok(!leaf.includes(forbidden), `src/work/grade.mjs imports no child-process facility and reads no clock (found ${forbidden})`);
      }

      // THE READ FACE STILL LAUNCHES NOTHING WITHOUT `--run`.
      const fx = await makeGradeRepo({ rubric: rubricFor(path.join(repoRoot, "nowhere.cjs")) });
      try {
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo, { spawnRubric: spawn }));
        assert.equal(spawn.calls.length, 0, "the bare face launches nothing");
        assert.equal(result.launched, 0, "…and says so");
        assert.equal(result.ran, false, "…and reports that it did not run");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "81/00 a repository that declares no rubric is unchanged, byte for byte",
    run: async () => {
      const fx = await loopFixture({ cap: 2, reviewRounds: 9 });
      try {
        const driver = completingThrough(fx);
        const report = capturingReport();
        const spawn = stubRubric(emitsPassing());
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));

        assert.equal(spawn.calls.length, 0, "nothing is launched");
        assert.deepEqual(report.gradeLines(), [], "…and no deadline is resolved for a runner, because no rung announces itself");

        // THE GRADE STILL ANSWERS `indeterminate` / `rubric-unconfigured` AT ITS OWN DOOR.
        const answer = await invoke("work:grade", { ref: "03/01", run: true }, fx.ctx);
        assert.equal(answer.grade.verdict, "indeterminate");
        assert.deepEqual(answer.grade.codes, ["rubric-unconfigured"]);
        assert.equal(answer.launched, 0);

        // AND THE LOOP PROCEEDS EXACTLY AS IT DOES TODAY.
        assert.equal(state.state, "done", "the loop proceeds exactly as it does today");
        for (const row of state.driven) {
          assert.deepEqual(
            Object.keys(row),
            ["ref", "phase", "runId", "outcome", "attempt", "cycle"],
            "an unconfigured repository's driven row carries exactly the keys it carries today",
          );
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
];
