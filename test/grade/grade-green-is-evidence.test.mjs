// Traceability wiring for milestone 54 / story 00, task `01_green-is-positive-evidence`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/00_story_the-grade-record/tasks/01_green-is-positive-evidence.feature
// against the LOCKED surface: `compileGrade` in ../src/work/grade.mjs.
//
// THE MEASURED CASE IS DRIVEN FROM ITS REAL CAPTURE, not from a specimen of it. At HEAD,
// `node --test test/arch/audit/acd-controls-never-execute.test.mjs` reports one case, one pass and
// exit 0 against a file declaring FOUR real arch-tests — none of which ran. That run is
// committed at test/fixtures/rubric-reports/node-vacuous.tap and the floor scenario below
// grades it, so "the floor catches the measured case" is a fact this suite re-checks rather
// than a claim its author made once.
//
// `pass` is a claim paid for in FOUR pieces, all of them (ADR-005 §2): (a) the declared
// report EXISTS; (b) it PARSES in its declared format; (c) it enumerates NAMED cases,
// total > 0 and total >= floor; (d) every case CARRIES a status. The exit status is checked
// FIRST (`m11/R2`) and then discarded as insufficient: it can VETO a pass and can never buy
// one.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileGrade } from "../../src/work/grade.mjs";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "rubric-reports");
const capture = (name) => readFileSync(path.join(fixturesDir, name), "utf8");

const rubric = (floor = null) => ({ report: { format: "tap", path: "report.tap", floor } });
const runner = (exit = 0) => ({ command: ["node", "scripts/test.mjs"], cwd: "/repo", exit, durationMs: 900, outcome: "completed" });
const present = (text) => ({ present: true, text });

// Four named, passing cases in this repo's own dialect — enough evidence to clear a floor of
// four, so a scenario that lowers the evidence is lowering the only thing.
const FOUR_GREEN = ["ok - the first control", "ok - the second control", "ok - the third control", "ok - the fourth control"].join("\n") + "\n";
const ONE_GREEN = "ok - the only case that ran\n";

// A prior grade for the ratchet. `ref` is carried because the ratchet is scoped to the item
// STRUCTURALLY — the compiler filters, rather than trusting the history to arrive scoped.
const prior = (verdict, total, ref = "54/00") => ({ ref, verdict, cases: { total, failed: 0, skipped: 0 } });

// The four pieces of evidence, removed one at a time.
const DEFECTS = [
  { defect: "is absent from disk at its declared path", code: "report-missing", verdict: "indeterminate", report: { present: false, text: null } },
  { defect: "is present but does not parse in its declared format", code: "report-unreadable", verdict: "indeterminate", report: present('<html><body>all good</body></html>') },
  { defect: "parses but enumerates no named case at all", code: "report-vacuous", verdict: "indeterminate", report: present("TAP version 13\n1..0\n") },
  // A case ANNOUNCED and never resolved — the shape a killed runner really leaves behind,
  // taken from the committed truncated capture rather than imagined.
  { defect: "enumerates named cases of which one carries no status", code: "report-vacuous", verdict: "indeterminate", report: () => present(capture("node-truncated.tap")) },
];

// Scenario Outline: what the ratchet measures against.
const RATCHET_ROWS = [
  { history: "no recorded grade at all", entries: [], observed: 1, verdict: "pass" },
  { history: "a `pass` observing 40 cases", entries: [prior("pass", 40)], observed: 40, verdict: "pass" },
  { history: "a `pass` observing 40 cases", entries: [prior("pass", 40)], observed: 1, verdict: "indeterminate" },
  { history: "a `fail` observing 40 cases", entries: [prior("fail", 40)], observed: 1, verdict: "pass" },
  { history: "an `indeterminate` observing 40 cases", entries: [prior("indeterminate", 40)], observed: 1, verdict: "pass" },
];

const greenReport = (count) => Array.from({ length: count }, (_, index) => `ok - case ${index + 1}`).join("\n") + "\n";

export const gradeGreenIsEvidenceTests = [
  // Scenario: the complete case — four pieces of evidence and a clean exit.
  {
    name: "54/00 evidence: four pieces and a clean exit → `pass`, no codes, and the observed total",
    run: () => {
      const grade = compileGrade({ ref: "54/00", rubric: rubric(4), runner: runner(0), report: present(FOUR_GREEN) });
      assert.equal(grade.verdict, "pass");
      assert.deepEqual([...grade.codes], []);
      assert.equal(grade.cases.total, 4);
      assert.equal(grade.cases.failed, 0);
    },
  },

  // Scenario Outline: remove exactly one piece of evidence and the pass is gone.
  ...DEFECTS.map((row) => ({
    name: `54/00 evidence: a declared report that ${row.defect} → \`${row.code}\` at \`${row.verdict}\``,
    run: () => {
      const report = typeof row.report === "function" ? row.report() : row.report;
      const grade = compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(0), report });
      assert.equal(grade.verdict, row.verdict);
      assert.ok(grade.codes.includes(row.code), `codes ${JSON.stringify(grade.codes)} contain ${row.code}`);
      assert.notEqual(grade.verdict, "pass");
    },
  })),

  // Scenario: an exit code of zero is not evidence of anything.
  {
    name: "54/00 evidence: an exit code of zero buys nothing — no report at its declared path is `indeterminate`, with the zero exit still reported",
    run: () => {
      const grade = compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(0), report: { present: false, text: null } });
      assert.equal(grade.verdict, "indeterminate");
      assert.equal(grade.runner.exit, 0, "the record reports the exit status as zero");
      assert.ok(grade.codes.includes("report-missing"));
      // No code path derived `pass` from that exit status: the ONLY difference between this
      // grade and a passing one is the report, and supplying it is what buys the pass.
      assert.equal(compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(0), report: present(ONE_GREEN) }).verdict, "pass");
    },
  },

  // Scenario: a non-zero exit vetoes a pass even when the report shows no red. Driven from
  // the REAL capture of that shape: this repo's runner writes `ok - <name>` to stdout and
  // `not ok - <name>` to stderr, so a stdout-only capture of a failing run is an all-green
  // text beside a non-zero exit, exactly.
  {
    name: "54/00 evidence: a non-zero exit vetoes a pass even when the report shows no red (the real stdout-only capture)",
    run: () => {
      const text = capture("repo-failing-stdout.out");
      assert.equal(/^not ok/m.test(text), false, "non-vacuity: the capture really does show no red — its reds went to stderr");
      const grade = compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(1), report: present(text) });
      assert.equal(grade.verdict, "indeterminate");
      assert.ok(grade.codes.includes("report-vacuous"));
      assert.equal(grade.runner.exit, 1, "the record reports the real non-zero exit status");
      assert.equal(grade.cases.total, 2, "the report's passing cases are still enumerated in `cases`");
      assert.equal(grade.cases.failed, 0, "…and no failing case was invented for the exit");
    },
  },

  // Scenario: a reported red is a red whatever the exit status said.
  {
    name: "54/00 evidence: a reported red is `fail` whether the runner exited zero or non-zero",
    run: () => {
      const report = present("ok - a case that ran\nnot ok - a case that reported red\n");
      const zero = compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(0), report });
      assert.equal(zero.verdict, "fail");
      assert.ok(zero.codes.includes("case-failed"));
      const nonZero = compileGrade({ ref: "54/00", rubric: rubric(), runner: runner(1), report });
      assert.equal(nonZero.verdict, "fail", "the same verdict is reached when the runner exited non-zero");
      assert.deepEqual([...nonZero.codes], [...zero.codes]);
    },
  },

  // Scenario: the declared floor is the primary defence, and it catches the measured case.
  {
    name: "54/00 evidence: a declared floor of four refuses the MEASURED one-case run (node-vacuous.tap), reporting the observed total of one",
    run: () => {
      const text = capture("node-vacuous.tap");
      const grade = compileGrade({ ref: "54/00", rubric: rubric(4), runner: runner(0), report: present(text) });
      assert.equal(grade.cases.total, 1, "the runner reported ONE case for a file declaring four");
      assert.equal(grade.cases.failed, 0, "…and it reported no red at all — which is exactly the danger");
      assert.equal(grade.verdict, "indeterminate");
      assert.ok(grade.codes.includes("report-vacuous"));
      assert.equal(grade.report.floor, 4, "the record names the floor that was declared");
    },
  },

  // Scenario: with no declared floor the evidence floor is still a case that ran.
  {
    name: "54/00 evidence: with no declared floor, zero cases is still `report-vacuous` — and one case is not refused on the floor",
    run: () => {
      const empty = compileGrade({ ref: "54/00", rubric: rubric(null), runner: runner(0), report: present("TAP version 13\n1..0\n") });
      assert.ok(empty.codes.includes("report-vacuous"));
      const one = compileGrade({ ref: "54/00", rubric: rubric(null), runner: runner(0), report: present(ONE_GREEN) });
      assert.equal(one.verdict, "pass", "a report enumerating one named, passing case is not refused on the floor");
      assert.equal(one.report.floor, null, "…and the record says what was declared: nothing");
    },
  },

  // Scenario: the ratchet is the backstop, and it needs no configuration.
  {
    name: "54/00 evidence: a prior `pass` observing forty cases refuses a one-case report with NO floor configured",
    run: () => {
      const grade = compileGrade({
        ref: "54/00",
        rubric: rubric(null),
        runner: runner(0),
        report: present(ONE_GREEN),
        history: [prior("pass", 40)],
      });
      assert.equal(grade.verdict, "indeterminate");
      assert.ok(grade.codes.includes("report-vacuous"));
      // The backstop is what moved it: the same grade with no history passes.
      assert.equal(compileGrade({ ref: "54/00", rubric: rubric(null), runner: runner(0), report: present(ONE_GREEN) }).verdict, "pass");
    },
  },

  // Scenario Outline: what the ratchet measures against — only a recorded pass raises the bar.
  ...RATCHET_ROWS.map((row, index) => ({
    name: `54/00 evidence: ratchet row ${index} — history of ${row.history}, observing ${row.observed} → \`${row.verdict}\``,
    run: () => {
      const grade = compileGrade({
        ref: "54/00",
        rubric: rubric(null),
        runner: runner(0),
        report: present(greenReport(row.observed)),
        history: row.entries,
      });
      assert.equal(grade.cases.total, row.observed, "non-vacuity: the report really enumerated what the row says");
      assert.equal(grade.verdict, row.verdict);
    },
  })),

  // Scenario: the ratchet is scoped to the item, never to the stream.
  {
    name: "54/00 evidence: another item's recorded `pass` neither raises nor lowers this item's floor",
    run: () => {
      const grade = compileGrade({
        ref: "54/00",
        rubric: rubric(null),
        runner: runner(0),
        report: present(ONE_GREEN),
        // A recorded pass observing forty cases — for a DIFFERENT item — and no recorded
        // grade for the item being graded. The history is handed over UNSCOPED on purpose:
        // the compiler filters by ref, so this property does not depend on a caller's
        // manners.
        history: [prior("pass", 40, "54/01")],
      });
      assert.equal(grade.verdict, "pass");
      // …and the same history, re-tagged to THIS item, does refuse it — which is what makes
      // the scoping the cause rather than the history being ignored altogether.
      const scoped = compileGrade({
        ref: "54/00",
        rubric: rubric(null),
        runner: runner(0),
        report: present(ONE_GREEN),
        history: [prior("pass", 40, "54/00")],
      });
      assert.equal(scoped.verdict, "indeterminate");
    },
  },
];
