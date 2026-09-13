// FF-5403 (milestone 54 / ADR-005 §3-§4, ADR-006) — THE GRADE RECORD IS A FROZEN,
// PRODUCER-BACKED, NON-VACUOUS CONTRACT.
//
// "`GRADE_CODES` is frozen and set-equal to the nine of ADR-005 §3; every one of the nine is
//  reachable by a fixture; the record's key set is exact; and the two advisory codes never
//  move the verdict."
//
// `m20/R2` IS THE RULE THIS ENFORCES: *a frozen and classified key with no writer is a
// contract hole.* A frozen vocabulary whose members nothing produces is not a contract, it
// is a list — so lane (c) below reaches every one of the nine through the REAL compiler,
// self-contained in this file (`m47/R8`: a gate's non-vacuity proof must be self-contained
// and reachable), rather than trusting the behavioural suite to have covered them.
//
// THE DIVISION OF LABOUR, so no reviewer mistakes an inert rule for a missing one: this file
// is the STRUCTURAL half — the sets are frozen, set-equal and exactly keyed. The BEHAVIOURAL
// half — which observation produces each code, and what it does to the verdict — is
// test/grade/grade-record-vocabularies.test.mjs. Neither subsumes the other.
import assert from "node:assert/strict";
import { compileGrade, ADVISORY_CODES, CASE_STATUSES, GRADE_CODES, GRADE_VERDICTS } from "../../../src/work/grade.mjs";

// ADR-005 §3's nine, PINNED HERE as a literal. This is the one place the vocabulary is
// written out a second time on purpose: a set-equality gate whose expectation is imported
// from the thing it guards asserts nothing at all.
const THE_NINE = [
  "rubric-unconfigured",
  "runner-spawn-failed",
  "runner-timeout",
  "report-missing",
  "report-unreadable",
  "report-vacuous",
  "case-failed",
  "case-unjoined",
  "scenario-unjoined",
];

// ADR-005 §4's record, keyed exactly, with 55/ADR-003's additive provenance stamp.
const RECORD_KEYS = ["ref", "verdict", "codes", "runner", "report", "cases", "failures", "gradedAt", "provenance"];
const RUNNER_KEYS = ["command", "cwd", "exit", "durationMs"];
const REPORT_KEYS = ["format", "path", "floor"];
const CASES_KEYS = ["total", "failed", "skipped"];
const FAILURE_KEYS = ["case", "message", "scenario"];

const RUBRIC = { report: { format: "tap", path: "report.tap", floor: null } };
const COMPLETED = { command: ["node", "scripts/test.mjs"], cwd: "/repo", exit: 0, durationMs: 12, outcome: "completed" };
const present = (text) => ({ present: true, text });

// One observation per code — the fixtures that make the vocabulary non-vacuous. Kept HERE,
// in the gate, so the gate's own proof does not depend on another file continuing to exist.
const FIXTURES = {
  "rubric-unconfigured": { ref: "54/00", rubric: null },
  "runner-spawn-failed": { ref: "54/00", rubric: RUBRIC, runner: { ...COMPLETED, exit: null, outcome: "spawn-failed" } },
  "runner-timeout": { ref: "54/00", rubric: RUBRIC, runner: { ...COMPLETED, exit: null, outcome: "timed-out" } },
  "report-missing": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: { present: false, text: null } },
  "report-unreadable": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("<html>fine</html>") },
  "report-vacuous": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("TAP version 13\n1..0\n") },
  "case-failed": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("not ok - a red\n") },
  "case-unjoined": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n"), join: { unjoinedCases: ["a case"], unjoinedScenarios: [] } },
  "scenario-unjoined": { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n"), join: { unjoinedCases: [], unjoinedScenarios: ["a scenario"] } },
};

// Every distinct shape the record can take — one per branch of the compiler, so the key-set
// lane is a property of the RECORD and not of one lucky path through it.
const EVERY_SHAPE = () => [
  ["unconfigured", compileGrade(FIXTURES["rubric-unconfigured"])],
  ["spawn-failed", compileGrade(FIXTURES["runner-spawn-failed"])],
  ["timed-out", compileGrade(FIXTURES["runner-timeout"])],
  ["report-missing", compileGrade(FIXTURES["report-missing"])],
  ["report-unreadable", compileGrade(FIXTURES["report-unreadable"])],
  ["report-vacuous", compileGrade(FIXTURES["report-vacuous"])],
  ["fail", compileGrade(FIXTURES["case-failed"])],
  ["pass", compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n") })],
  ["pass with advisories", compileGrade(FIXTURES["case-unjoined"])],
  ["no observation at all", compileGrade()],
];

export const archTests = [
  {
    name: "arch/FF-5403: `GRADE_CODES` is FROZEN and SET-EQUAL to ADR-005 §3's nine, in its own declared order",
    run: () => {
      assert.ok(Object.isFrozen(GRADE_CODES), "the code set is frozen");
      assert.equal(GRADE_CODES.length, 9, "exactly nine");
      assert.deepEqual([...GRADE_CODES].sort(), [...THE_NINE].sort(), "set-equal to the nine — a tenth code is an ADR-level act");
      assert.deepEqual([...GRADE_CODES], THE_NINE, "…and the ORDER is the contract too, because codes are reported in it");
      assert.throws(() => {
        GRADE_CODES.push("probably-fine");
      }, "a frozen array refuses a tenth code");
      // The two advisory members are NAMED, not "the last two".
      assert.ok(Object.isFrozen(ADVISORY_CODES));
      assert.deepEqual([...ADVISORY_CODES], ["case-unjoined", "scenario-unjoined"]);
      for (const code of ADVISORY_CODES) assert.ok(GRADE_CODES.includes(code), `\`${code}\` is one of the nine`);
      // …and the case statuses are a closed set too, with `null` deliberately NOT a member:
      // a case with no status is not a passing case, and making its absence a value would
      // let it be treated as one.
      assert.ok(Object.isFrozen(CASE_STATUSES));
      assert.deepEqual([...CASE_STATUSES], ["passed", "failed", "skipped"]);
      assert.equal(CASE_STATUSES.includes(null), false);
    },
  },

  {
    name: "arch/FF-5403: NON-VACUITY — every one of the nine is REACHABLE, each through the real compiler, from a fixture held here",
    run: () => {
      assert.deepEqual(Object.keys(FIXTURES).sort(), [...THE_NINE].sort(), "there is a fixture for each of the nine, and no fixture for anything else");
      const unreachable = [];
      for (const code of THE_NINE) {
        const grade = compileGrade(FIXTURES[code]);
        if (!grade.codes.includes(code)) unreachable.push({ code, got: [...grade.codes], verdict: grade.verdict });
      }
      assert.deepEqual(unreachable, [], "a frozen and classified code with no writer is a contract hole (`m20/R2`)");
      // The proof is self-contained: it did not consult the behavioural suite, and it fails
      // if the compiler stops producing a member rather than if a test file is deleted.
    },
  },

  {
    name: "arch/FF-5403: the record's key set is EXACT on every branch — no shape adds, drops or reorders a key",
    run: () => {
      for (const [label, grade] of EVERY_SHAPE()) {
        assert.deepEqual(Object.keys(grade), RECORD_KEYS, `${label}: the record's key set is exact and ordered`);
        assert.ok(GRADE_VERDICTS.includes(grade.verdict), `${label}: the verdict is a member of the closed triple`);
        assert.deepEqual(Object.keys(grade.cases), CASES_KEYS, `${label}: \`cases\` is exactly keyed`);
        for (const key of CASES_KEYS) assert.equal(typeof grade.cases[key], "number", `${label}: \`cases.${key}\` is always a number, never absent`);
        if (grade.runner != null) assert.deepEqual(Object.keys(grade.runner), RUNNER_KEYS, `${label}: \`runner\` is exactly keyed`);
        if (grade.report != null) assert.deepEqual(Object.keys(grade.report), REPORT_KEYS, `${label}: \`report\` is exactly keyed`);
        assert.ok(Array.isArray(grade.failures), `${label}: \`failures\` is always an array`);
        for (const failure of grade.failures) assert.deepEqual(Object.keys(failure), FAILURE_KEYS, `${label}: a failure entry is exactly keyed`);
        for (const code of grade.codes) assert.ok(GRADE_CODES.includes(code), `${label}: \`${code}\` is a member of the frozen nine`);
      }
    },
  },

  {
    name: "arch/FF-5403: the record's JSON is the contract — it round-trips, and carries nothing a reader cannot serialise",
    run: () => {
      for (const [label, grade] of EVERY_SHAPE()) {
        const roundTripped = JSON.parse(JSON.stringify(grade));
        assert.deepEqual(Object.keys(roundTripped), RECORD_KEYS, `${label}: the key set survives JSON`);
        assert.deepEqual(roundTripped.codes, [...grade.codes], `${label}: the codes survive`);
        assert.equal(roundTripped.verdict, grade.verdict);
        assert.deepEqual(roundTripped.cases, grade.cases);
      }
    },
  },

  {
    name: "arch/FF-5403: the two advisory codes NEVER move the verdict — over every branch, with each advisory and with both",
    run: () => {
      const JOINS = [
        ["no join", null],
        ["case-unjoined", { unjoinedCases: ["a case"], unjoinedScenarios: [] }],
        ["scenario-unjoined", { unjoinedCases: [], unjoinedScenarios: ["a scenario"] }],
        ["both", { unjoinedCases: ["a case"], unjoinedScenarios: ["a scenario"] }],
        ["an EMPTY join observation", { unjoinedCases: [], unjoinedScenarios: [] }],
      ];
      // Every non-advisory fixture, re-graded under each join. The verdict must be a
      // function of the evidence alone.
      const subjects = THE_NINE.filter((code) => !ADVISORY_CODES.includes(code)).map((code) => [code, FIXTURES[code]]);
      subjects.push(["pass", { ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n") }]);

      for (const [label, observation] of subjects) {
        const baseline = compileGrade({ ...observation, join: null });
        for (const [joinLabel, join] of JOINS) {
          const graded = compileGrade({ ...observation, join });
          assert.equal(graded.verdict, baseline.verdict, `${label} + ${joinLabel}: the advisory moved the verdict, and it must not`);
          // The non-advisory codes are unchanged too — an advisory adds, and never displaces.
          assert.deepEqual(
            graded.codes.filter((code) => !ADVISORY_CODES.includes(code)),
            [...baseline.codes].filter((code) => !ADVISORY_CODES.includes(code)),
            `${label} + ${joinLabel}: the substantive codes are unchanged`,
          );
        }
      }
      // NON-VACUITY: the advisories really do reach the record when observed — otherwise
      // "they never move the verdict" would be true of a code that is never emitted.
      const withBoth = compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n"), join: { unjoinedCases: ["a case"], unjoinedScenarios: ["a scenario"] } });
      assert.deepEqual([...withBoth.codes], ["case-unjoined", "scenario-unjoined"]);
      assert.equal(withBoth.verdict, "pass");
      // …and an EMPTY join observation emits neither: an absent join is not an unjoined one.
      assert.deepEqual([...compileGrade({ ref: "54/00", rubric: RUBRIC, runner: COMPLETED, report: present("ok - a case\n"), join: { unjoinedCases: [], unjoinedScenarios: [] } }).codes], []);
    },
  },

  {
    name: "arch/FF-5403: codes are reported in the vocabulary's own order and never twice, however the observations arrived",
    run: () => {
      for (const [label, grade] of EVERY_SHAPE()) {
        const positions = grade.codes.map((code) => GRADE_CODES.indexOf(code));
        assert.deepEqual(positions, [...positions].sort((a, b) => a - b), `${label}: reported in GRADE_CODES' own order`);
        assert.equal(new Set(grade.codes).size, grade.codes.length, `${label}: no code is reported twice`);
        assert.ok(Object.isFrozen(grade.codes), `${label}: the reported list is frozen — a reader cannot append to the contract`);
      }
    },
  },
];
