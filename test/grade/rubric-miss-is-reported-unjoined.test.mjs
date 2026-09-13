// Traceability wiring for milestone 54 / story 04, task `01_a-miss-is-reported-unjoined`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/04_story_scenario-traceability/tasks/01_a-miss-is-reported-unjoined.feature
//
// A FALLBACK THAT GUESSES IS WORSE THAN A GAP. When the declared join does not resolve, the
// lane says so and stops: a case naming no scenario is `case-unjoined`, an `@executable`
// scenario named by no case is `scenario-unjoined`, and both are ADVISORY.
//
// BOTH LEGS REPORT AT `warn`, DELIBERATELY, AND THIS DEPARTS FROM THE HORIZON ON PURPOSE.
// `severityFor` would render an open item's finding at `error`, and measured at refine ~75%
// of this tree's 4,290 `@executable` scenarios would report `scenario-unjoined` ON ARRIVAL.
// An `error` would be a wall of inherited red — the pathology chore 64 exists to clean up.
import assert from "node:assert/strict";
import path from "node:path";

import { rubricTraceabilityGroup, RUBRIC_FINDING_CODES } from "../../src/work/doctor-rubric.mjs";
import { compileGrade } from "../../src/work/grade.mjs";
import { admittedDoctorFindings, DOCTOR_GATE_CODES } from "../../src/commands/loop.mjs";
import { CONTROL_FINDING_CODES } from "../../src/work/doctor-controls.mjs";

function feature(scenarios) {
  return `@executable\nFeature: F\n${scenarios.map((name) => `\n  Scenario: ${name}\n    Given a\n    When b\n    Then c\n`).join("")}`;
}

function snapshotOf({ ref = "03/00", status = "in-progress", scenarios = [], report = "", present = true } = {}) {
  return {
    items: [{
      ref,
      dir: path.join("no-such-root-ff5408", "item"),
      meta: { status },
      status,
      featureTexts: scenarios.length === 0 ? {} : { "tasks/00.feature": feature(scenarios) },
    }],
    rubricReport: { path: path.join("no-such-root-ff5408", "report.tap"), format: "tap", present, text: present ? report : null },
  };
}

const byCode = (findings, code) => findings.filter((finding) => finding.code === code);

export const rubricMissIsReportedUnjoinedTests = [
  {
    name: "rubric/01 a case naming no scenario is reported unjoined, and nothing is guessed",
    run: () => {
      const findings = rubricTraceabilityGroup(snapshotOf({
        scenarios: ["the only scenario"],
        report: "ok - the only scenario\nok - a case from somewhere else\n",
      }));
      const misses = byCode(findings, "case-unjoined");
      assert.equal(misses.length, 1, "the lane reports case-unjoined for that case");
      assert.match(misses[0].message, /"a case from somewhere else"/, "the finding names the case as the runner emitted it");
      assert.match(misses[0].message, /nothing was guessed/i, "…and says explicitly that nothing was guessed about which scenario it might have meant");
      assert.ok(!misses[0].message.includes("the only scenario"), "no scenario is offered as a candidate");
    },
  },

  {
    name: "rubric/01 a scenario named by no case is reported unjoined, naming the scenario and the file",
    run: () => {
      const findings = rubricTraceabilityGroup(snapshotOf({
        scenarios: ["the first", "the second"],
        report: "ok - unit: the first\n",
      }));
      const misses = byCode(findings, "scenario-unjoined");
      assert.equal(misses.length, 1, "the lane reports scenario-unjoined for the second scenario");
      assert.match(misses[0].message, /"the second"/, "the finding names the scenario");
      assert.match(misses[0].path, /tasks[\\/]00\.feature$/, "…and the file that declares it");
    },
  },

  {
    name: "rubric/01 [outline] both legs report at warn, on open and closed items alike (6 rows)",
    run: () => {
      for (const status of ["not-started", "in-progress", "done"]) {
        // `scenario-unjoined` — a scenario no case names.
        const scenarioMiss = rubricTraceabilityGroup(snapshotOf({ status, scenarios: ["never named"], report: "ok - unrelated\n" }));
        for (const finding of byCode(scenarioMiss, "scenario-unjoined")) {
          assert.equal(finding.severity, "warn", `[${status}/scenario-unjoined] the finding's severity reads warn`);
        }
        assert.equal(byCode(scenarioMiss, "scenario-unjoined").length, 1, `[${status}] guard: the miss really was produced`);
        // `case-unjoined` — a case naming no scenario.
        for (const finding of byCode(scenarioMiss, "case-unjoined")) {
          assert.equal(finding.severity, "warn", `[${status}/case-unjoined] the finding's severity reads warn`);
        }
        assert.equal(byCode(scenarioMiss, "case-unjoined").length, 1, `[${status}] guard: the case miss really was produced`);
      }
      // THE SEVERITY DOES NOT MOVE WITH THE HORIZON — the same three statuses that make
      // `severityFor` answer `error`, `error` and `warn` all answer `warn` here.
      const severities = new Set();
      for (const status of ["not-started", "in-progress", "done"]) {
        for (const finding of rubricTraceabilityGroup(snapshotOf({ status, scenarios: ["x"], report: "ok - y\n" }))) {
          severities.add(finding.severity);
        }
      }
      assert.deepEqual([...severities], ["warn"], "every finding this lane emits is a warn, at every status");
    },
  },

  {
    name: "rubric/01 an advisory miss never moves a grade's verdict",
    run: () => {
      // 54/00's pure compiler is where the advisory rule LIVES; this asserts the join
      // observation this lane produces flows through it without moving anything.
      const observation = {
        ref: "03/00",
        gradedAt: "2026-08-23T00:00:00.000Z",
        rubric: { report: { format: "tap", path: "report.tap", floor: 1 } },
        runner: { command: ["node", "r"], cwd: "/repo", exit: 0, durationMs: 1, outcome: "completed" },
        report: { present: true, text: "ok - one\nok - two\n" },
      };
      const clean = compileGrade(observation);
      assert.equal(clean.verdict, "pass", "guard: every enumerated case passed");

      const withAdvisory = compileGrade({
        ...observation,
        join: { unjoinedCases: [{ name: "a case that joins no scenario" }], unjoinedScenarios: [] },
      });
      assert.equal(withAdvisory.verdict, "pass", "its verdict reads pass");
      assert.ok(withAdvisory.codes.includes("case-unjoined"), "the advisory code is reported beside it");
      assert.equal(withAdvisory.verdict, clean.verdict, "the verdict was not changed by the advisory code");
      assert.deepEqual(withAdvisory.cases, clean.cases, "…nor were the counts");
    },
  },

  {
    name: "rubric/01 an advisory miss never gates the loop, and the admitted set comes from a different frozen array",
    run: () => {
      const findings = rubricTraceabilityGroup(snapshotOf({
        scenarios: ["never named"],
        report: "ok - a case that joins nothing\n",
      }));
      assert.deepEqual(
        findings.map((finding) => finding.code).sort(),
        ["case-unjoined", "scenario-unjoined"],
        "guard: the story really carries both a case-unjoined and a scenario-unjoined finding",
      );
      // THE GATE ADMITS NOTHING. Not because the severities happen to be warns, but because
      // these codes are not members of the array the admitted set is derived from — which is
      // the structural version of the claim.
      assert.deepEqual(admittedDoctorFindings(findings), [], "the gate admits nothing");
      for (const finding of findings) {
        assert.deepEqual(admittedDoctorFindings([{ ...finding, severity: "error" }]), [], "…and would admit nothing even at error");
      }
      // THE ADMITTED SET IS DERIVED FROM A DIFFERENT FROZEN ARRAY THAN THIS LANE'S CODES.
      for (const code of RUBRIC_FINDING_CODES) {
        assert.ok(!CONTROL_FINDING_CODES.includes(code), `${code} is not a member of CONTROL_FINDING_CODES`);
        assert.ok(!DOCTOR_GATE_CODES.includes(code), `…so ${code} cannot reach the gate's admitted set`);
      }
    },
  },

  {
    name: "rubric/01 a complete join reports nothing, and the silence means the join resolved",
    run: () => {
      const findings = rubricTraceabilityGroup(snapshotOf({
        scenarios: ["the first", "the second"],
        report: "ok - unit: the first\nok - unit: the second\n",
      }));
      assert.deepEqual(findings, [], "the lane reports nothing");

      // THE SILENCE MEANS THE JOIN RESOLVED, NOT THAT THE LANE WAS SKIPPED — the same item
      // with the report absent is LOUD, which is what distinguishes the two silences.
      const skipped = rubricTraceabilityGroup(snapshotOf({ scenarios: ["the first", "the second"], present: false }));
      assert.deepEqual(skipped.map((finding) => finding.code), ["rubric-join-unchecked"], "a lane that could not run says so instead of falling silent");
    },
  },

  {
    name: "rubric/01 an item with no `@executable` scenario reports no scenario miss, and the case is still reported",
    run: () => {
      // All-`@manual` scenarios: nothing is offered to the join, so there is no scenario miss
      // to report — but a case that names none of them is still an unjoined case, reported
      // against the item that has scenarios to be named after.
      const manualOnly = {
        items: [
          {
            ref: "03/00",
            dir: path.join("no-such-root-ff5408", "manual"),
            featureTexts: { "tasks/00.feature": "@manual\nFeature: F\n\n  Scenario: a manual one\n    Given a\n    When b\n    Then c\n" },
          },
          {
            ref: "03/01",
            dir: path.join("no-such-root-ff5408", "exec"),
            featureTexts: { "tasks/00.feature": feature(["an executable one"]) },
          },
        ],
        rubricReport: { path: "r", format: "tap", present: true, text: "ok - unit: an executable one\nok - names nothing at all\n" },
      };
      const findings = rubricTraceabilityGroup(manualOnly);
      const forManual = findings.filter((finding) => finding.message.startsWith("03/00:"));
      assert.deepEqual(byCode(forManual, "scenario-unjoined"), [], "no scenario-unjoined finding is reported for the all-@manual item");
      assert.deepEqual(forManual, [], "…and the manual item contributes nothing at all");

      const forExecutable = findings.filter((finding) => finding.message.startsWith("03/01:"));
      assert.deepEqual(byCode(forExecutable, "case-unjoined").length, 1, "the case is still reported case-unjoined");
      assert.match(byCode(forExecutable, "case-unjoined")[0].message, /"names nothing at all"/, "…by the name the runner emitted");
    },
  },
];
