// test/support/loop-grade-fixture.mjs — the fixture builder milestone 54 / story 03's four
// behavioural suites share: a REAL loop over a REAL work stream, whose `work.rubric` is
// declared and whose one spawn is a stub the test drives cycle by cycle.
//
// ONE builder, four consumers. The four task contracts all turn on the same three knobs —
// what the runner emitted, on which cycle, and whether a rubric was declared at all — and a
// fixture each file re-derived would drift on exactly the knob that matters.
//
// WHY THE SPAWN IS STUBBED AND THE REST IS REAL. 54/01 already proved the spawn itself
// against live child processes (`grade-spawn-bounded-and-single`), under FF-5406's
// one-bounded-shell-free-site guard; what THIS story owns is what the loop does with the
// answer. So everything between the declaration and the loop's act is the shipped code —
// `work:grade`'s registered command, `compileGrade`'s verdict rules, the real run store, the
// real transition seam — and only the child process is replaced, by the same `ctx.spawnRubric`
// seam 54/01's suites inject through. A test that re-ran this repo's suite per cycle would
// take minutes and prove nothing extra.
import path from "node:path";

import { loopFixture } from "../loop/loop-command-probe.test.mjs";
import { createFakePtySpawn, createFakeWhich } from "./mesh-worker-terminal-fixture.mjs";

// ---------------------------------------------------------------- the runner's output ----
//
// TAP, as the two producers this repo has actually emit it (54/00's captures are the
// authority on the format; these are the shapes needed to reach each verdict).

/** A green run: `total` cases, all passing. */
export const passingTap = (names = ["alpha", "beta"]) =>
  `TAP version 13\n${names.map((name, index) => `ok ${index + 1} - ${name}`).join("\n")}\n1..${names.length}\n`;

/**
 * A red run: every name in `failing` reports `not ok`, each carrying the runner's own
 * diagnostic block, which is what `normaliseTap` lifts verbatim into `failures[].message`.
 */
export const failingTap = (failing = [["beta", "beta did not close"]], passing = ["alpha"]) => {
  const lines = ["TAP version 13"];
  let ordinal = 0;
  for (const name of passing) lines.push(`ok ${++ordinal} - ${name}`);
  for (const [name, message] of failing) {
    lines.push(`not ok ${++ordinal} - ${name}`, "  ---", `  error: '${message}'`, "  ...");
  }
  lines.push(`1..${ordinal}`);
  return `${lines.join("\n")}\n`;
};

/** A document that parses and enumerates nothing — `report-vacuous`, not `report-missing`. */
export const emptyTap = () => "TAP version 13\n1..0\n";

/** Text carrying no TAP structural element at all — `report-unreadable`. */
export const notTap = () => "the runner exploded before it could say anything\n";

// ---------------------------------------------------------------- the spawn outcomes ----
//
// Each answers the `spawnSync` shape the shipped `runRubric` reads: a status, the two
// captured streams, and the `error`/`signal` channel that carries the three ways a spawn can
// END. They are named for the GRADE CODE they reach, so a fixture reads as the contract does.

export const emits = (text, status = 0) => ({ status, stdout: text, stderr: "", error: null, signal: null });
export const emitsFailing = (...args) => emits(failingTap(...args), 1);
export const emitsPassing = (...args) => emits(passingTap(...args), 0);
export const timesOut = () => ({ status: null, stdout: "", stderr: "", error: Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }), signal: "SIGKILL" });
export const cannotLaunch = () => ({ status: null, stdout: "", stderr: "", error: Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }), signal: null });
export const emitsNothing = () => emits("", 0);
export const emitsUnreadable = () => emits(notTap(), 0);
export const emitsVacuous = () => emits(emptyTap(), 0);

/** The outcome each `indeterminate` GRADE_CODE is reached by, for the routing outline. */
export const INDETERMINATE_OUTCOMES = Object.freeze({
  "runner-timeout": timesOut,
  "runner-spawn-failed": cannotLaunch,
  "report-missing": emitsNothing,
  "report-unreadable": emitsUnreadable,
  "report-vacuous": emitsVacuous,
});

// ---------------------------------------------------------------- the fixture ----

/**
 * A recording `spawnRubric`. `plan` is either one outcome (every cycle answers the same) or
 * an array read cycle by cycle, the last entry repeating once the array runs out — so a
 * three-cycle contract states three answers and a steady-state one states one.
 *
 * `calls` is the OBSERVED launch count: "the runner was asked exactly once per cycle" is an
 * observation here, never an inference from the code.
 *
 * THE BASELINE COMES FIRST (2026-09-12). A story is graded on the DELTA from a baseline the
 * shell measures before the story's first `continue` drive — one extra spawn per story lineage,
 * ahead of every cycle's grade. `baseline` is that first answer: a CLEAN tree by default, so a
 * `plan` written as "the grade says X" still means exactly that (nothing is inherited and the
 * grade is the whole delta). A contract about inheritance states its own baseline; `null`
 * declares none, for a fixture whose lineage already carries one on its records.
 */
export function stubRubric(plan, { baseline = emitsPassing() } = {}) {
  const calls = [];
  const answers = [...(baseline == null ? [] : [baseline]), ...(Array.isArray(plan) ? plan : [plan])];
  const spawn = (program, args, options) => {
    const at = calls.length;
    calls.push({ program, args, options });
    const answer = answers[Math.min(at, answers.length - 1)];
    return typeof answer === "function" ? answer(at) : answer;
  };
  spawn.calls = calls;
  return spawn;
}

/**
 * `loopFixture` with a declared `work.rubric`. The declaration is the ORDINARY one from
 * ADR-004: an argv ARRAY (never a shell string), a declared report format/path/floor, and no
 * `args.ref` — the runner runs whole, by the declaration's own choice.
 *
 * `rubric: null` declares none, which is the no-regression case and the one ADR-002 §3 is
 * about; it is the same object `loopFixture` returns today, unmodified.
 */
export async function gradingFixture({ rubric = {}, ...options } = {}) {
  const fx = await loopFixture(options);
  if (rubric != null) {
    fx.workspace.config.work.rubric = {
      command: [process.execPath, path.join(fx.projectRoot, "runner.cjs")],
      report: { format: "tap", path: "report.tap", floor: 1 },
      ...rubric,
    };
  }
  return fx;
}

/**
 * The loop context for one run: the fixture's own, plus the session driver, the capturing
 * report and the stubbed rubric spawn.
 */
export function gradingCtx(fx, { driver, report, spawn } = {}) {
  return {
    ...fx.ctx,
    ...(driver == null ? {} : { agentSessionDriverOptions: driver.options }),
    ...(report == null ? {} : { report }),
    ...(spawn == null ? {} : { spawnRubric: spawn }),
  };
}

/**
 * A session driver whose phase OUTCOMES are scripted, so a build can be made to fail once and
 * succeed on the retry — the shape `loop-command-stops` drives its attempt-lineage cases with.
 * Anything past the script completes.
 */
export function scriptedDriver(outcomes, { onCommand } = {}) {
  const scripted = [...outcomes];
  const typed = [];
  const waiting = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk }) {
      const input = chunk.replace(/[\r\n]+$/u, "");
      typed.push(input);
      onCommand?.(input.split("\n\n")[0]);
      waiting.shift()?.(scripted.shift() ?? { outcome: "done" });
    },
  });
  return {
    typed,
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${fake.spawnCalls.length}`,
      watchTranscriptCompletion: async () => await new Promise((resolve) => { waiting.push(resolve); }),
      commandDelayMs: 0,
    },
  };
}

// ---------------------------------------------------------------- the observations ----

/**
 * A capturing report. The loop's rungs announce themselves on the OPERATOR'S OWN report line
 * (`53/ADR-016`, and 54/02's recorded decision to widen a surface a human also reads rather
 * than add a seam only a test uses), so "which rung answered, and what it said" is read off
 * the same line an operator reads.
 */
export function capturingReport() {
  const lines = [];
  const report = (line) => { lines.push(String(line)); };
  report.lines = lines;
  /** The rung names, in the order they announced themselves. */
  report.gates = () => lines.filter((line) => line.startsWith("Gate ")).map((line) => line.split(" ")[1]);
  /** The `Gate work:grade …` lines only. */
  report.gradeLines = () => lines.filter((line) => line.startsWith("Gate work:grade "));
  return report;
}

/**
 * The `findings=` detail off a halt's report line, parsed back to structure.
 *
 * `reportFacts` renders details as `key=<JSON>` joined by `"; "` and terminated by `"."`, and
 * `findings` is the LAST key at every site that carries one — so the value is everything from
 * `findings=` to the final period. Splitting on `"; "` instead would cut the JSON itself.
 */
export function findingsFrom(line) {
  const at = String(line ?? "").indexOf("findings=");
  if (at < 0) return null;
  const json = String(line).slice(at + "findings=".length).replace(/\.$/u, "");
  return JSON.parse(json);
}

/** The last line of a report — the halt/act line every run ends on. */
export const lastLine = (report) => report.lines.at(-1) ?? "";
