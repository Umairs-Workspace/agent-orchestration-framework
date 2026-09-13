// Traceability wiring for milestone 54 / story 00, task `03_a-skipped-case-is-not-evidence`
// (`@bug @finding-F-54-00-2`).
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/00_story_the-grade-record/tasks/03_a-skipped-case-is-not-evidence.feature
// against the LOCKED surface: `compileGrade` in ../src/work/grade.mjs.
//
// THE DEFECT THIS LANE PINS WAS MEASURED, NOT IMAGINED. Raised at 54/00's structural review
// and reproduced at 54/00's verify through the shipped compiler: four cases each carrying
// `# SKIP`, a clean exit and a declared `floor: 4` yielded `verdict: "pass"`, `codes: []`,
// `cases: {total: 4, failed: 0, skipped: 4}`. Nothing executed, and the grade said `pass` —
// milestone 54's own thesis broken inside the module built to enforce it. The compiler
// conformed to ADR-005 §2(c) EXACTLY as written (`total >= floor`, where `total` counts
// skips), so the fix is that clause's amendment of 2026-08-22: the measure is the cases that
// RAN, `total - skipped`, and the ratchet's bar is drawn the same way.
//
// THE SKIP MARKER IS THE PRODUCER'S OWN, NOT THIS AUTHOR'S BELIEF ABOUT IT (`m38/ADR-008`).
// The synthetic reports below carry the directive exactly as the committed capture
// `node-skipped.tap` carries it, and the first case here drives that capture through the
// real compiler to prove the two agree — so a dialect drift breaks this lane rather than
// silently making every count below meaningless.
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

// The directive verbatim from `node-skipped.tap`, so the reports below are the producer's
// shape rather than a specimen of it.
const SKIP_DIRECTIVE = "# SKIP no rubric declared on this platform";

// `total` named cases of which the first `skipped` carry the skip directive and the rest pass.
const mixed = (total, skipped) =>
  Array.from({ length: total }, (_, index) =>
    index < skipped ? `ok - case ${index + 1} ${SKIP_DIRECTIVE}` : `ok - case ${index + 1}`
  ).join("\n") + "\n";

// A prior grade for the ratchet, carrying its OWN skipped count — the whole point of the
// second half of the amendment.
const prior = (verdict, total, skipped = 0, ref = "54/00") => ({ ref, verdict, cases: { total, failed: 0, skipped } });

const grade = ({ floor = null, report, exit = 0, history = [] }) =>
  compileGrade({ ref: "54/00", gradedAt: "2026-08-22T00:00:00.000Z", rubric: rubric(floor), runner: runner(exit), report: present(report), history });

// Scenario Outline: the floor is measured against what ran, not against what was enumerated.
const FLOOR_ROWS = [
  { total: 3, skipped: 0, verdict: "pass" },
  { total: 4, skipped: 1, verdict: "pass" },
  { total: 3, skipped: 1, verdict: "indeterminate" },
  { total: 3, skipped: 3, verdict: "indeterminate" },
];

export const gradeSkippedIsNotEvidenceTests = [
  {
    name: "54/00 skipped: the skip directive driven below is the one the COMMITTED capture carries, through the real compiler",
    run: () => {
      // The capture enumerates two cases, one run and one skipped. It is graded here so the
      // marker, the count and the status all come from a real `node --test` run.
      const fromCapture = grade({ floor: null, report: capture("node-skipped.tap") });
      assert.equal(fromCapture.cases.total, 2, "the capture enumerates two cases");
      assert.equal(fromCapture.cases.skipped, 1, "…one of which the producer marked skipped");
      assert.ok(capture("node-skipped.tap").includes("# SKIP"), "the capture carries the directive this lane synthesises");
      // One case actually ran, so it clears the always-a-case-that-ran floor.
      assert.equal(fromCapture.verdict, "pass", "one case that RAN is evidence, and the skip beside it is not");
    },
  },

  {
    name: "54/00 skipped: THE MEASURED CASE — four cases, every one skipped, floor four, exit zero → `indeterminate`",
    run: () => {
      const result = grade({ floor: 4, report: mixed(4, 4) });
      assert.equal(result.verdict, "indeterminate", "nothing executed, so nothing was verified");
      assert.ok(result.codes.includes("report-vacuous"), "the report is vacuous AS EVIDENCE");
      assert.notEqual(result.verdict, "pass", "the shape measured before the amendment is refused");
      // §4 is untouched: the counts are still the OBSERVED ones.
      assert.deepEqual(result.cases, { total: 4, failed: 0, skipped: 4 }, "`cases` still reports what was seen");
    },
  },

  {
    name: "54/00 skipped: with NO declared floor, a report of nothing but skips still cannot pass",
    run: () => {
      const result = grade({ floor: null, report: mixed(2, 2) });
      assert.equal(result.verdict, "indeterminate", "the always-a-case-that-ran floor needs no configuration");
      assert.ok(result.codes.includes("report-vacuous"));
    },
  },

  ...FLOOR_ROWS.map((row) => ({
    name: `54/00 skipped: floor of three over ${row.total} enumerated of which ${row.skipped} skipped → \`${row.verdict}\``,
    run: () => {
      const result = grade({ floor: 3, report: mixed(row.total, row.skipped) });
      assert.equal(result.verdict, row.verdict, `${row.total} enumerated, ${row.skipped} skipped, ${row.total - row.skipped} ran against a floor of three`);
      assert.equal(result.cases.total, row.total, "the enumerated total is reported as observed either way");
      assert.equal(result.cases.skipped, row.skipped, "…and so is the skipped count");
    },
  })),

  {
    name: "54/00 skipped: a skip does not mask a red — a reported failure is still the verdict",
    run: () => {
      const report = ["not ok - the case that failed", ...Array.from({ length: 3 }, (_, i) => `ok - case ${i + 1} ${SKIP_DIRECTIVE}`)].join("\n") + "\n";
      const result = grade({ floor: 10, report });
      assert.equal(result.verdict, "fail", "a reported red precedes every evidence check (ADR-005 §2, step 5)");
      assert.ok(result.codes.includes("case-failed"));
      assert.ok(!result.codes.includes("report-vacuous"), "the verdict is the reported red, not the missing evidence");
    },
  },

  {
    name: "54/00 skipped: the ratchet's bar is drawn on the SAME measure it is compared against",
    run: () => {
      // A suite that legitimately skips ten of forty must not set a bar of forty and then
      // refuse its own healthy re-run — the bug available if the two measures diverge.
      const result = grade({ floor: null, report: mixed(40, 10), history: [prior("pass", 40, 10)] });
      assert.equal(result.verdict, "pass", "thirty ran last time and thirty ran this time");
      assert.deepEqual([...result.codes], [], "…and no code is recorded for a healthy re-run");
    },
  },

  {
    name: "54/00 skipped: a bar from a prior pass still refuses a run that SKIPPED its way to the count",
    run: () => {
      const result = grade({ floor: null, report: mixed(40, 39), history: [prior("pass", 40, 0)] });
      assert.equal(result.verdict, "indeterminate", "forty enumerated, one ran, against a bar of forty that ran");
      assert.ok(result.codes.includes("report-vacuous"));
      assert.equal(result.cases.total, 40, "the record still shows the forty the runner enumerated");
    },
  },
];
