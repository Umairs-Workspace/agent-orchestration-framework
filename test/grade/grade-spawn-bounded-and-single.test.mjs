// Traceability wiring for milestone 54 / story 01, task `03_the-spawn-is-bounded-and-single`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/01_story_the-declared-rubric/tasks/03_the-spawn-is-bounded-and-single.feature
//
// THIS IS THE ONE IMPURE EDGE IN THE MILESTONE (ADR-003 §2), and it is the edge where a
// grader becomes a hazard: an unbounded child hangs the loop it was meant to bound; a
// half-captured child reports green while its reds go to a stream nobody read; a rubric that
// invokes aof forks a grader tree. All three are closed here.
//
// BOTH STREAMS, AND THE REASON IS MEASURED ON THIS VERY REPO. `scripts/test.mjs` writes
// `ok - <name>` to STDOUT and `not ok - <name>` to STDERR, so a stdout-only capture of a
// failing run of this repo's own suite reads as an ALL-GREEN report beside a non-zero exit —
// the milestone's own worst failure mode, reachable from its own runner.
import assert from "node:assert/strict";
import { rm, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { DEFAULT_HEARTBEAT_MS, DEFAULT_START_TO_CLOSE_MS } from "../../src/loop-bounds.mjs";
import { GRADE_REENTRANCY_ENV } from "../../src/commands/grade.mjs";
import { srcFilesContaining } from "../support/read-src-files.mjs";
import { makeGradeRepo, writeRunner, rubricFor, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A runner that BLOCKS on stdin before doing anything. With stdin piped-and-unwritten it
// would hang until the deadline; with stdin IGNORED it reads EOF and gets on with it.
const STDIN_RUNNER = `
const fs = require("node:fs");
let read;
try { read = { eof: true, text: fs.readFileSync(0, "utf8") }; } catch (error) { read = { eof: false, code: error.code }; }
fs.writeFileSync(process.env.AOF_STDIN_OUT, JSON.stringify(read), "utf8");
process.stdout.write("ok - a case that really ran\\n");
`;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// A runner that never terminates AND leaves a trace it is still running: the deadline's kill
// is otherwise only INFERRED from the call returning, and an inference is not an observation.
// ONE byte at STARTUP, before the interval, so "it was alive" is legible the instant node has
// finished booting rather than 25ms later — which is also what makes the boot cost MEASURABLE
// below (first byte == boot complete).
const NEVER_TERMINATES_NOISILY = `
const fs = require("node:fs");
fs.appendFileSync(process.env.AOF_ALIVE_OUT, "x");
setInterval(() => fs.appendFileSync(process.env.AOF_ALIVE_OUT, "x"), 25);
`;

// F-54-01-1. `spawnSync`'s timeout starts at the CALL, so node's own process creation is spent
// out of the deadline: on a loaded machine the child is force-killed BEFORE it executes a line,
// having written nothing, and the case's premise-guard ("the runner really was alive and really
// did write") goes red while every product assertion holds. Measured on this tree: at the
// previously pinned literal of 400ms, 4 of 8 concurrent runs of this lane were red — with the
// startup byte above already in place, which is why writing earlier is not the fix.
//
// A LARGER LITERAL IS NOT THE FIX EITHER; it only moves the race onto a slower machine. So the
// bound is MEASURED on the machine that is about to run the case, under the load it is under
// right now: spawn the same runner with no deadline at all, time how long until its first byte
// lands, and give the bounded run a generous multiple of that. The fixture still DECLARES the
// value and the product still RESOLVES it (69's `work.loop.startToCloseMs`, asserted below
// against `plan.deadlineMs`) — what changed is that the declared number is derived from an
// observation instead of chosen from thin air.
const BOOT_HEADROOM = 6;
const MIN_DEADLINE_MS = 400;

// A FUSE, not a deadline. Bounding the measurement at anything near the value it is measuring
// would beg the question; this is the "the machine is broken" limit, and blowing it is a loud
// red rather than the silent hang an unbounded poll would give a CI runner.
const BOOT_FUSE_MS = 30_000;

const measureBootMs = async (runnerPath, aliveOut) => {
  await writeFile(aliveOut, "", "utf8");
  const started = Date.now();
  const child = spawn(process.execPath, [runnerPath], {
    env: { ...process.env, AOF_ALIVE_OUT: aliveOut },
    stdio: "ignore",
  });
  const exited = new Promise((resolve) => { child.once("exit", resolve); });
  try {
    for (;;) {
      if ((await readFile(aliveOut, "utf8")).length > 0) return Date.now() - started;
      if (Date.now() - started > BOOT_FUSE_MS) {
        throw new Error(`the boot probe wrote nothing in ${BOOT_FUSE_MS}ms — node cannot start here`);
      }
      await sleep(10);
    }
  } finally {
    child.kill("SIGKILL");
    // AWAIT THE REAP. The probe holds `boot.log` open and appends every 25ms; on Windows the
    // fixture's `rm` would race that handle and fail with EPERM/EBUSY, turning a clean lane
    // into a cleanup flake — the same class of defect this whole fix exists to remove.
    await exited;
  }
};

// This repo's own shape: passes to stdout, failures to STDERR, and a non-zero exit.
const SPLIT_STREAM_RUNNER = `
process.stdout.write("ok - a case that passed\\n");
process.stdout.write("ok - a second case that passed\\n");
process.stderr.write("not ok - a case that failed on stderr\\n");
process.exitCode = 1;
`;

// A green REPORT beside a non-zero exit — the contradiction the exit veto exists for.
const GREEN_REPORT_NONZERO_EXIT = `
const fs = require("node:fs");
fs.writeFileSync(process.env.AOF_REPORT_PATH, "ok - one\\nok - two\\n", "utf8");
process.exitCode = 3;
`;

export const gradeSpawnBoundedAndSingleTests = [
  {
    name: "grade/03 a runner that reads stdin gets an end-of-file, not a hang",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "stdin.cjs", STDIN_RUNNER);
      const stdinOut = path.join(repo, "stdin.json");
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, runner], env: { AOF_STDIN_OUT: stdinOut }, report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const startedAt = Date.now();
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));
        const elapsed = Date.now() - startedAt;

        assert.equal(result.grade.runner.outcome, undefined, "guard: the record carries the OBSERVED runner (command/cwd/exit/duration), not the raw observation");
        // THE RUNNER OBSERVED END-OF-FILE ON STANDARD INPUT — read off the CHILD's own
        // report of what its read returned, never inferred from the fact that we got a
        // result back. A piped-and-unwritten stdin would have hung here instead.
        const seen = JSON.parse(await readFile(stdinOut, "utf8"));
        assert.equal(seen.eof, true, "the runner observes end-of-file on standard input");
        assert.equal(seen.text, "", "…an empty read, not an error and not a block");
        assert.equal(result.grade.cases.total, 1, "the run completed rather than waiting for input that never arrives");
        assert.equal(result.grade.verdict, "pass", "…and the grade was decided from what it emitted");
        assert.ok(elapsed < DEFAULT_START_TO_CLOSE_MS, "the grade is decided within the deadline");
        assert.ok(result.grade.runner.durationMs < DEFAULT_START_TO_CLOSE_MS, "…and the observed duration says so");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 both output streams are captured, so a red on stderr is not a green",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "split.cjs", SPLIT_STREAM_RUNNER);
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));

        assert.ok(result.grade.cases.failed > 0, "the observed failing-case count is greater than zero");
        assert.equal(result.grade.verdict, "fail", "the verdict reads fail");
        assert.notEqual(result.grade.verdict, "pass", "the verdict does not read pass");
        // A STDOUT-ONLY CAPTURE WOULD HAVE READ THIS AS ALL-GREEN. The failure the runner
        // wrote to STDERR is in the record's failures.
        assert.ok(
          result.grade.failures.some((failure) => failure.case.includes("a case that failed on stderr")),
          "the failure the runner wrote to stderr appears in the record's failures",
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 the exit status is read before the report is, and a non-zero exit is never overridden by a green report",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green-nonzero.cjs", GREEN_REPORT_NONZERO_EXIT);
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, runner], report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        // The runner writes a GREEN report at the declared path and still exits non-zero —
        // the contradiction the exit veto exists for. The path is only knowable once the
        // temp workspace exists, so the declared `env` is completed here.
        const ctx = await ctxFor(fx.repo);
        ctx.workspace.config.work.rubric.env = { AOF_REPORT_PATH: path.join(fx.repo, "report.tap") };

        const result = await invoke("work:grade", { ref: "03", run: true }, ctx);
        assert.notEqual(result.grade.verdict, "pass", "the verdict does not read pass");
        assert.equal(result.grade.runner.exit, 3, "the record reports the non-zero exit status that was observed");
        // THE REPORT'S OWN COUNTS ARE STILL REPORTED ALONGSIDE IT — the record says what was
        // seen; the verdict says what it was worth.
        assert.equal(result.grade.cases.total, 2, "the report's own counts are still reported alongside it");
        assert.equal(result.grade.cases.failed, 0, "…including that the report itself enumerated no red");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 the deadline force-kills, and the kill is reported as a timeout",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "forever.cjs", NEVER_TERMINATES_NOISILY);
      const aliveOut = path.join(repo, "alive.log");

      // The bound is short so the assertion is a second, not thirty minutes — but it must still
      // clear this machine's own process-creation cost, or the child never runs and the guard
      // below is measuring node's boot rather than the deadline's kill (F-54-01-1). Measured
      // here, under whatever load is present, and given headroom. THE VALUE IS STILL RESOLVED,
      // NEVER CHOSEN HERE — it comes from `work.loop.startToCloseMs`, 69's home.
      const bootMs = await measureBootMs(runner, path.join(repo, "boot.log"));
      const deadlineMs = Math.max(MIN_DEADLINE_MS, bootMs * BOOT_HEADROOM);

      await writeFile(aliveOut, "", "utf8");
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, runner], env: { AOF_ALIVE_OUT: aliveOut }, report: { format: "tap", path: "report.tap", floor: 1 } },
        loop: { startToCloseMs: deadlineMs },
      });
      try {
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));

        assert.equal(result.grade.verdict, "indeterminate", "the verdict reads indeterminate");
        assert.ok(result.grade.codes.includes("runner-timeout"), "the codes contain runner-timeout");
        assert.equal(result.plan.deadlineMs, deadlineMs, "the record reports the deadline that bound the run");
        assert.ok(Number.isFinite(result.grade.runner.durationMs), "…and the duration observed");
        assert.ok(result.grade.runner.durationMs >= deadlineMs, "…which reached the deadline");
        assert.match(result.detail ?? "", /deadline/, "the kill is reported as a timeout, in words");

        // NO PROCESS FROM THAT RUN IS STILL ALIVE AFTERWARDS — OBSERVED, not inferred from
        // the call having returned. The runner appends a byte every 25ms while it lives; if
        // the kill were a detach rather than a kill, the file would keep growing.
        const afterKill = (await readFile(aliveOut, "utf8")).length;
        assert.ok(afterKill > 0, "guard: the runner really was alive and really did write");
        await sleep(300);
        assert.equal((await readFile(aliveOut, "utf8")).length, afterKill, "no process from that run is still alive afterwards");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 [outline] the deadline is resolved, never chosen here (4 rows: one home, derived from two keys)",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      // 81/00 AMENDED WHICH BOUND THIS IS, AND NOTHING ELSE ABOUT THE PROPERTY. The deadline
      // is still RESOLVED and never chosen here; it is now `min(startToClose, heartbeat)`,
      // because a grade that outlasts the window supervising the attempt is reaped as a
      // stranded run rather than reported. Two of the three rows move to the heartbeat as a
      // result — which is precisely the defect: they used to resolve THIRTY minutes under a
      // FIFTEEN minute window, twice the bound they had to survive.
      const rows = [
        { row: "no loop bound at all", loop: null, deadline: DEFAULT_HEARTBEAT_MS },
        { row: "a start-to-close bound of its own, under the window", loop: { startToCloseMs: 90_000 }, deadline: 90_000 },
        { row: "a start-to-close bound that is not a number", loop: { startToCloseMs: "soon" }, deadline: DEFAULT_HEARTBEAT_MS },
        // THE DEFAULT PAIR, STATED. A default start-to-close is twice the default heartbeat,
        // so the derivation is the thing being read and not an accident of equal numbers.
        { row: "the declared bounds are the two defaults", loop: null, deadline: Math.min(DEFAULT_START_TO_CLOSE_MS, DEFAULT_HEARTBEAT_MS) },
      ];
      const fixtures = [];
      try {
        for (const { row, loop, deadline } of rows) {
          const fx = await makeGradeRepo({ rubric: rubricFor(runner), loop });
          fixtures.push(fx.repo);
          const spawn = countingSpawn();
          const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo, { spawnRubric: spawn }));
          assert.equal(result.plan.deadlineMs, deadline, `[${row}] the plan reports the deadline it will enforce`);
          assert.equal(spawn.calls.length, 0, `[${row}] …read from the plan, with nothing run`);
        }
        // THAT VALUE WAS RESOLVED FROM THE LOOP-BOUNDS HOME rather than from a literal in
        // the grade path: the grade module declares neither the default nor a resolver.
        const grade = await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8");
        assert.ok(grade.includes('from "../loop-bounds.mjs"'), "the grade path resolves the deadline through the loop-bounds home");
        assert.ok(!/30\s*\*\s*60\s*\*\s*1000|1_?800_?000/.test(grade), "…and declares no default of its own");
        assert.ok(!/DEFAULT_[A-Z_]*(TIMEOUT|DEADLINE|START_TO_CLOSE)/.test(grade), "…nor a second name for one");
      } finally {
        await rm(repo, { recursive: true, force: true });
        for (const dir of fixtures) await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 no second home for the bound is opened",
    run: async () => {
      // EXACTLY ONE MODULE DECLARES the runner deadline's default and its resolver.
      const declaringDefault = await srcFilesContaining(repoRoot, "DEFAULT_START_TO_CLOSE_MS =");
      // ONE HOME, spelled as the floor plus a declared ceiling — never as a one-member census
      // (FF-11902): the module is named AMONG what the sweep found.
      assert.ok(declaringDefault.length >= 1, "the sweep of src/ found no module declaring the runner deadline's default");
      assert.ok(declaringDefault.length <= 1, `exactly one module declares the runner deadline's default — found: ${declaringDefault.join(", ")}`);
      assert.equal(declaringDefault[0], "loop-bounds.mjs", "…and it is the bounds module");
      const declaringResolver = await srcFilesContaining(repoRoot, "export const resolveStartToCloseMs");
      assert.ok(declaringResolver.length >= 1, "…the sweep found a module declaring its resolver");
      assert.ok(declaringResolver.length <= 1, `…and exactly one declares its resolver — found: ${declaringResolver.join(", ")}`);
      assert.equal(declaringResolver[0], "loop-bounds.mjs", "…the same bounds module");

      // 54 ENFORCES A BOUND AND CHOOSES NONE. The two neighbouring caps are untouched:
      // `acd-loop-cap-single-home` and `69/ADR-001`'s non-annexation rule remain the
      // authority, and neither key was moved into the grade's path.
      const grade = await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8");
      assert.ok(!grade.includes("work.dispatch.concurrency") && !grade.includes("dispatch?.concurrency"), "work.dispatch.concurrency still resolves from its existing single home");
      assert.ok(!grade.includes("maxAttempts"), "work.autonomous.maxAttempts still resolves from its existing closed reader set");
    },
  },

  {
    name: "grade/03 a runner that cannot be launched at all is reported as such",
    run: async () => {
      const fx = await makeGradeRepo({
        rubric: { command: ["aof-no-such-program-exists-anywhere", "--please"], report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo));
        assert.equal(result.grade.verdict, "indeterminate", "the verdict reads indeterminate");
        assert.ok(result.grade.codes.includes("runner-spawn-failed"), "the codes contain runner-spawn-failed");
        assert.deepEqual(result.grade.runner.command, ["aof-no-such-program-exists-anywhere", "--please"], "the record reports the command that was attempted");
        // A LAUNCH FAILURE AND A RUNNER THAT RAN AND FAILED ARE DIFFERENT ANSWERS.
        assert.match(result.message, /could not be launched/, "the message distinguishes a launch failure from a runner that ran and failed");

        // …AND A RUNNER THAT RAN AND OUT-TALKED THE CAPTURE CEILING IS THE SECOND KIND, not
        // the first. Found at this story's own structural review: `spawnSync` reports an
        // ENOBUFS overflow through the SAME `result.error` channel a failed launch uses, so
        // the obvious reading ("an error means it never started") would have told a repo
        // whose suite is merely chatty that its runner could not be launched. The child ran.
        // The truncated text is discarded rather than graded — a report cut off mid-stream
        // is the vacuous green this milestone exists to refuse.
        const overflowed = await invoke(
          "work:grade",
          { ref: "03", run: true },
          await ctxFor(fx.repo, {
            spawnRubric: () => ({ error: Object.assign(new Error("stdout maxBuffer exceeded"), { code: "ENOBUFS" }), status: null, stdout: "ok - a truncated gree", stderr: "" }),
          }),
        );
        assert.ok(!/could not be launched/.test(overflowed.detail ?? ""), "a capture overflow is NOT reported as a launch failure");
        assert.match(overflowed.detail ?? "", /RAN/, "…it is reported as a runner that ran");
        assert.equal(overflowed.grade.verdict, "indeterminate", "…and the truncated capture is never graded as evidence");
        assert.ok(overflowed.grade.codes.includes("report-missing"), "…the honest code being that no readable report was found");
        assert.equal(overflowed.grade.cases.total, 0, "…with nothing counted from the text that was cut off");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 a grade cannot re-enter itself",
    run: async () => {
      const { repo } = await makeGradeRepo();
      // A rubric that INVOKES THE GRADE. This repo is exactly such a project: bare `aof` on
      // PATH symlinks into the working tree, so a rubric calling `aof` would fork a grader
      // tree without a structural refusal.
      const inner = await writeRunner(repo, "reenter.cjs", `
const { spawnSync } = require("node:child_process");
const result = spawnSync(process.argv[0], [${JSON.stringify(path.join(repoRoot, "bin", "aof.mjs"))}, "work", "grade", "03", "--run", "--json"], {
  cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_NO_WARNINGS: "1" },
});
require("node:fs").writeFileSync(process.env.AOF_INNER_OUT, (result.stdout ?? "") + "\\n---\\n" + (result.stderr ?? ""), "utf8");
process.stdout.write("ok - the outer runner ran\\n");
`);
      const innerOut = path.join(repo, "inner.json");
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, inner], env: { AOF_INNER_OUT: innerOut }, report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const spawn = countingSpawn();
        await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
        assert.equal(spawn.calls.length, 1, "the outer run launches exactly one child");

        const innerText = await readFile(innerOut, "utf8");
        const innerJson = JSON.parse(innerText.split("\n---\n")[0]);
        assert.equal(innerJson.launched, 0, "the inner invocation refuses rather than launching a further child");
        assert.ok(innerJson.grade.codes.includes("runner-spawn-failed"), "the inner refusal reports runner-spawn-failed");
        // THE NUMBER OF PROCESSES LAUNCHED IN TOTAL IS BOUNDED AND DOES NOT GROW WITH THE
        // DEPTH ATTEMPTED: the outer spawned one, the inner spawned none, and a third level
        // was therefore never reachable.
        assert.match(innerJson.detail ?? "", new RegExp(GRADE_REENTRANCY_ENV), "…and it says why");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 the stamp is set on the child, and only on the child",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const stampOut = path.join(repo, "stamp.json");
      const runner = await writeRunner(repo, "stamp.cjs", `
require("node:fs").writeFileSync(process.env.AOF_STAMP_OUT, JSON.stringify({ stamp: process.env.${GRADE_REENTRANCY_ENV} ?? null }), "utf8");
process.stdout.write("ok - one\\n");
`);
      const fx = await makeGradeRepo({
        rubric: { command: [process.execPath, runner], env: { AOF_STAMP_OUT: stampOut }, report: { format: "tap", path: "report.tap", floor: 1 } },
      });
      try {
        const before = process.env[GRADE_REENTRANCY_ENV];
        const ctx = await ctxFor(fx.repo);
        await invoke("work:grade", { ref: "03", run: true }, ctx);

        const seen = JSON.parse(await readFile(stampOut, "utf8"));
        assert.equal(seen.stamp, "1", "the child observes the re-entrancy stamp in its environment");
        assert.equal(process.env[GRADE_REENTRANCY_ENV], before, "the invoking process's own environment is unchanged after the run");

        // A SUBSEQUENT `--run` FROM THAT SAME INVOKING PROCESS IS NOT REFUSED — the stamp
        // guards recursion, never repetition.
        const again = await invoke("work:grade", { ref: "03", run: true }, ctx);
        assert.equal(again.launched, 1, "a subsequent --run from that same invoking process is not refused");
        assert.equal(again.grade.verdict, "pass", "…and it graded normally");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/03 one `--run` is one spawn, whatever the rubric reports",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const outcomes = [
        { row: "passes", body: 'process.stdout.write("ok - one\\n");', loop: null, verdict: "pass" },
        { row: "fails", body: 'process.stdout.write("not ok - one\\n"); process.exitCode = 1;', loop: null, verdict: "fail" },
        { row: "times out", body: "setInterval(() => {}, 1000);", loop: { startToCloseMs: 300 }, verdict: "indeterminate" },
      ];
      const fixtures = [];
      try {
        for (const { row, body, loop, verdict } of outcomes) {
          const runner = await writeRunner(repo, `outcome-${row.replace(/\s+/g, "-")}.cjs`, body);
          const fx = await makeGradeRepo({ rubric: rubricFor(runner), loop });
          fixtures.push(fx.repo);
          const spawn = countingSpawn();
          const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
          assert.equal(spawn.calls.length, 1, `[${row}] exactly one process is launched`);
          assert.equal(result.launched, 1, `[${row}] …and the record says so`);
          assert.equal(result.grade.verdict, verdict, `[${row}] guard: the run really took that outcome`);
        }
        // NO RETRY OF THE RUNNER IS ATTEMPTED INSIDE A SINGLE GRADE — asserted structurally
        // too, because a retry loop is the kind of thing a later edit adds without noticing.
        const grade = await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8");
        const spawnCalls = grade.match(/\bspawn\(/g) ?? [];
        assert.equal(spawnCalls.length, 1, "the grade path calls its spawn exactly once, in one place");
      } finally {
        await rm(repo, { recursive: true, force: true });
        for (const dir of fixtures) await rm(dir, { recursive: true, force: true });
      }
    },
  },
];
