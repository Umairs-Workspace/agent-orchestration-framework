// Traceability wiring for milestone 54 / story 00, task `00_the-frozen-vocabularies`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/00_story_the-grade-record/tasks/00_the-frozen-vocabularies.feature
// against the LOCKED surface: `compileGrade`, `GRADE_VERDICTS` and `GRADE_CODES` in
// ../src/work/grade.mjs.
//
// THIS IS THE BEHAVIOURAL HALF; FF-5403 (test/arch/grade/acd-grade-record-envelope.test.mjs) is
// the structural one, and they must not be confused. The arch-test asserts that the sets
// are frozen, set-equal to the nine, and that the record's key set is exact. THIS file
// asserts what the arch-test cannot: what PRODUCES each member, and what each one does to
// the verdict — `m20/R2`'s rule that *a frozen and classified key with no writer is a
// contract hole*, and 66's non-vacuity rule that every one of the nine be reachable by a
// fixture or it is frozen and dead.
//
// OWNERSHIP, so no reviewer mistakes an inert rule for a missing one: 54/00 is a pure leaf.
// It COMPILES a record from observations handed to it. The impure edge that gathers them is
// 54/01 and the code that produces the two advisory observations is 54/04's join lane. What
// is proven here is that every member of the vocabulary has a DEFINED EFFECT on the
// verdict — including the two whose effect is deliberately nothing.
import assert from "node:assert/strict";
import { compileGrade, GRADE_CODES, GRADE_VERDICTS } from "../../src/work/grade.mjs";

// A rubric declaring a TAP report — the configured baseline every observation below varies
// from in exactly one respect.
const RUBRIC = { report: { format: "tap", path: "report.tap", floor: null } };

const COMPLETED = { command: ["node", "scripts/test.mjs"], cwd: "/repo", exit: 0, durationMs: 1234, outcome: "completed" };

const present = (text) => ({ present: true, text });

// A one-case, all-green TAP report in this repo's own dialect — enough evidence to pass, so
// that a scenario removing ONE thing is removing the only thing.
const GREEN = "ok - a case that really ran\n";

// The nine codes, each with the observation that produces it and the verdict it settles.
// The table IS the Examples block of the two outlines, kept in one place because the
// advisory rows are the same vocabulary asked a second question.
const PRODUCERS = [
  {
    observation: "a project that declares no `work.rubric` at all",
    code: "rubric-unconfigured",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: null }),
  },
  {
    observation: "a runner observation reporting that the process never started",
    code: "runner-spawn-failed",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: { ...COMPLETED, exit: null, outcome: "spawn-failed" } }),
  },
  {
    observation: "a runner observation reporting that the deadline elapsed and it was killed",
    code: "runner-timeout",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: { ...COMPLETED, exit: null, outcome: "timed-out" } }),
  },
  {
    observation: "a completed runner whose declared report is absent from disk",
    code: "report-missing",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: { present: false, text: null } }),
  },
  {
    observation: "a report present on disk that does not parse in its declared format",
    code: "report-unreadable",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present('{"suites":[],"total":0}') }),
  },
  {
    observation: "a report that parses but enumerates no named case",
    code: "report-vacuous",
    verdict: "indeterminate",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("TAP version 13\n1..0\n") }),
  },
  {
    observation: "a report enumerating at least one case whose status is a failing one",
    code: "case-failed",
    verdict: "fail",
    build: () => ({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("not ok - a case that reported red\n") }),
  },
];

const ADVISORIES = [
  { advisory: "an enumerated case that names no `@executable` scenario", code: "case-unjoined", join: { unjoinedCases: ["a case that really ran"], unjoinedScenarios: [] } },
  { advisory: "an `@executable` scenario that no enumerated case names", code: "scenario-unjoined", join: { unjoinedCases: [], unjoinedScenarios: ["a scenario nothing named"] } },
];

export const gradeRecordVocabulariesTests = [
  // Scenario Outline: every code in the frozen nine has a producing observation and a
  // settled verdict — the seven verdict-moving rows.
  ...PRODUCERS.map((row) => ({
    name: `54/00 vocabularies: ${row.observation} → \`${row.code}\` at \`${row.verdict}\``,
    run: () => {
      const grade = compileGrade(row.build());
      assert.ok(grade.codes.includes(row.code), `codes ${JSON.stringify(grade.codes)} contain ${row.code}`);
      assert.equal(grade.verdict, row.verdict);
    },
  })),

  // Scenario Outline: the two advisory codes are recorded and change nothing.
  ...ADVISORIES.map((row) => ({
    name: `54/00 vocabularies: ${row.advisory} → \`${row.code}\`, and the verdict stays \`pass\``,
    run: () => {
      const grade = compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present(GREEN), join: row.join });
      assert.ok(grade.codes.includes(row.code), `codes ${JSON.stringify(grade.codes)} contain ${row.code}`);
      assert.equal(grade.verdict, "pass");
      // …and the SAME evidence with no join at all still passes: the advisory is what was
      // added, so the advisory is what is being measured.
      assert.equal(compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present(GREEN) }).verdict, "pass");
    },
  })),

  {
    name: "54/00 vocabularies: NON-VACUITY — all nine codes are reachable, and the fixtures above reach every one",
    run: () => {
      const reached = new Set();
      for (const row of PRODUCERS) for (const code of compileGrade(row.build()).codes) reached.add(code);
      for (const row of ADVISORIES) {
        for (const code of compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present(GREEN), join: row.join }).codes) reached.add(code);
      }
      assert.deepEqual(
        [...reached].sort(),
        [...GRADE_CODES].sort(),
        "every one of the nine is reachable by a fixture, or it is frozen and dead (66's non-vacuity rule)",
      );
      // …and every verdict the table settles on is a member of the closed triple.
      for (const row of PRODUCERS) assert.ok(GRADE_VERDICTS.includes(row.verdict));
    },
  },

  // Scenario: an advisory code does not rescue a failing grade either.
  {
    name: "54/00 vocabularies: an advisory code does not rescue a failing grade — `fail`, carrying both codes",
    run: () => {
      const grade = compileGrade({
        ref: "54/00",
        rubric: RUBRIC,
        runner: COMPLETED,
        report: present("not ok - a case that reported red\n"),
        join: { unjoinedCases: ["a case that reported red"], unjoinedScenarios: [] },
      });
      assert.equal(grade.verdict, "fail");
      assert.ok(grade.codes.includes("case-failed"));
      assert.ok(grade.codes.includes("case-unjoined"));
    },
  },

  // Scenario: codes are reported in the vocabulary's own frozen order, not in the order
  // observed.
  {
    name: "54/00 vocabularies: codes appear in `GRADE_CODES`' own order, and two grades with the same set report identically",
    run: () => {
      // The advisory observation arrives FIRST and the failing case second; `case-failed`
      // precedes both advisories in the vocabulary, so an observation-ordered list would
      // put them the other way round.
      const grade = compileGrade({
        ref: "54/00",
        rubric: RUBRIC,
        runner: COMPLETED,
        report: present("not ok - a red\n"),
        join: { unjoinedCases: ["a red"], unjoinedScenarios: ["a scenario nothing named"] },
      });
      assert.deepEqual(grade.codes, ["case-failed", "case-unjoined", "scenario-unjoined"]);
      const positions = grade.codes.map((code) => GRADE_CODES.indexOf(code));
      assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "the reported order IS the vocabulary's order");

      // Two grades carrying the same set of codes report them identically, whatever order
      // the observations arrived in: the second builds the same set from a different
      // observation order (the scenario advisory first).
      const other = compileGrade({
        ref: "54/00",
        rubric: RUBRIC,
        runner: COMPLETED,
        report: present("not ok - a different red\n"),
        join: { unjoinedScenarios: ["a scenario nothing named"], unjoinedCases: ["a different red"] },
      });
      assert.deepEqual(other.codes, grade.codes);
    },
  },

  // Scenario: the observed counts are always reported, including when there was nothing to
  // count.
  {
    name: "54/00 vocabularies: an unconfigured project still reports zero counts, and `runner`/`report` read null",
    run: () => {
      const grade = compileGrade({ ref: "54/00", rubric: null });
      assert.deepEqual(Object.keys(grade.cases).sort(), ["failed", "skipped", "total"]);
      assert.equal(grade.cases.total, 0);
      assert.equal(grade.cases.failed, 0);
      assert.equal(grade.cases.skipped, 0);
      // Zero rather than ABSENT — the distinction the scenario names.
      for (const key of ["total", "failed", "skipped"]) {
        assert.ok(Object.prototype.hasOwnProperty.call(grade.cases, key), `\`cases.${key}\` is present, not absent`);
      }
      assert.equal(grade.runner, null, "nothing was run");
      assert.equal(grade.report, null, "nothing was read");
    },
  },

  // Scenario: a run that happened is reported verbatim, whatever the verdict.
  {
    name: "54/00 vocabularies: a run that happened is reported verbatim — command, cwd, exit and duration, observed not re-derived",
    run: () => {
      const runner = { command: ["node", "scripts/test.mjs", "--scope", "54/00"], cwd: "/repo/worktrees/54-00", exit: 3, durationMs: 8_421, outcome: "completed" };
      const grade = compileGrade({ ref: "54/00", rubric: RUBRIC, runner, report: present(GREEN) });
      assert.deepEqual(grade.runner, { command: runner.command, cwd: runner.cwd, exit: 3, durationMs: 8_421 });
      // The verdict here is NOT `pass` (the non-zero exit vetoes it), and the runner leg is
      // unchanged by that — the values are the observed ones, not values re-derived from
      // the verdict.
      assert.notEqual(grade.verdict, "pass");
      const passing = compileGrade({ ref: "54/00", rubric: RUBRIC, runner: { ...runner, exit: 0 }, report: present(GREEN) });
      assert.equal(passing.verdict, "pass");
      assert.deepEqual(
        { ...passing.runner, exit: 3 },
        grade.runner,
        "the runner leg differs between the two grades ONLY in the exit status that was actually observed",
      );
    },
  },

  // Scenario: no join is performed at this layer, and none is guessed.
  {
    name: "54/00 vocabularies: with no join observation the failure carries the emitted identity and message, `scenario` null, and neither advisory appears",
    run: () => {
      const grade = compileGrade({
        ref: "54/00",
        rubric: RUBRIC,
        runner: { ...COMPLETED, exit: 1 },
        report: present("not ok - the runner's own case name\n  the runner's own message\n"),
      });
      assert.equal(grade.failures.length, 1);
      assert.equal(grade.failures[0].case, "the runner's own case name");
      assert.equal(grade.failures[0].message, "  the runner's own message");
      assert.equal(grade.failures[0].scenario, null, "no join is performed at this layer");
      assert.equal(grade.codes.includes("case-unjoined"), false, "an ABSENT join is not an unjoined one");
      assert.equal(grade.codes.includes("scenario-unjoined"), false);
    },
  },
];
