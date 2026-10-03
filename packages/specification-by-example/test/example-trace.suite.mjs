// Traceability wiring for milestone 135 / story 04 — an agreed example cannot fall out.
//
// Covers, at the lane's own function, EVERY @executable scenario in
//   tasks/00_an-agreed-example-resolves-by-its-id-inside-its-rule.feature
// and the id readers `map.mjs` exports for it (ADR-004 §1). The same cases are driven through the
// real CLI (`aof work doctor`, `aof work continue`) in `test/examples/doctor-examples-lane.test.mjs`
// and `test/examples/continue-door-examples.test.mjs`, which import this file's fixture builders so
// the two levels judge one contract.
//
// The lane is built from the package's own factory with the gate resolved from `work.examples`, and
// is handed literal rows whose story dir names a directory that does not exist: the trace reads
// only the row's `featureTexts`, through the one feature parser. node:assert/strict, `{ name, run }`
// shape, one test object per @executable scenario, Scenario Outline rows folded into one entry.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { createDoctorExamples } from "@aof/specification-by-example/doctor-lane";
import {
  EXAMPLE_COLUMN,
  groupRuleId,
  parseExampleMap,
  rowExampleId,
  scenarioExampleId,
} from "@aof/specification-by-example/map";

const ON = Object.freeze({ work: { examples: { enabled: true } } });
const GHOST = path.join(os.tmpdir(), "aof-example-trace-no-such-dir", "2_story_the-gate");
const { examplesFindings, examplesGroup } = createDoctorExamples({
  examplesEnabledFromConfig: (config) => config?.work?.examples?.enabled === true,
});

// ── the fixture: story 7/2's map ─────────────────────────────────────────────────────────────────
// Rule R1 holds E1 [proposed], E2 [confirmed] and E3 [stated Q1], with Q1 answered; every claim is
// anchored by an answer record. `extraRules` appends further map rules (task 01's R2 / E4).
export const RULE_1 = "R1 · A member may hold at most five loans";
export const RULE_2 = "R2 · An overdue loan blocks a new one";
export const E2_NAME = "E2 · a sixth loan is refused while five are out";
export const E3_NAME = "E3 · a swap at the desk is issued";
export const traceMap = ({ e1 = "proposed", e2 = "confirmed", e3 = "stated Q1", extraRules = [] } = {}) => [
  "# 7/2 · the map",
  "",
  `## ${RULE_1}`,
  `- E1 · a fourth loan is issued [${e1}]`,
  `- ${E2_NAME} [${e2}]`,
  `- ${E3_NAME} [${e3}]`,
  ...extraRules.flat(),
  "",
  "## Questions",
  "- Q1 · business · answered · may a member swap a loan at the desk?",
].join("\n") + "\n";
export const R2_WITH_E4 = ["", `## ${RULE_2}`, "- E4 · an overdue loan blocks a new loan [confirmed]"];
export const TRACE_TOKENS = ["7/2 E2", "7/2 Q1", "7/2 E4"];
const AT = "2026-10-03T10:00:00.000Z";
export const traceAnswers = (tokens = TRACE_TOKENS) => tokens.map((token) => ({
  token, question: `${token} · agreed?`, answer: "Yes.", toolUseId: `toolu_${token.replace(/\W/g, "")}`, sessionId: "sess-1", at: AT, entrypoint: "cli",
}));

// ── the contract, written block by block ─────────────────────────────────────────────────────────
export const scenario = (name, step = "Given a member holding loans") => [
  `    Scenario: ${name}`, `      ${step}`, "      When they ask for another", "      Then the desk decides", "",
];
export const outline = (name, column, ...ids) => [
  `    Scenario Outline: ${name}`, "      Given a member holding <loans> loans", "      Then the desk decides", "",
  "      Examples:", `        | ${column} | loans |`, ...ids.map((id) => `        | ${id} | 5 |`), "",
];
export const rule = (title, ...blocks) => [`  Rule: ${title}`, "", ...blocks.flat()];
export const featureText = (title, ...blocks) => ["@executable", `Feature: ${title}`, "", ...blocks.flat()].join("\n") + "\n";
export const contract = (...blocks) => ({ "tasks/00_lending.feature": featureText("lending", ...blocks) });

// The fixture's whole contract: E2 headlines rule R1 and an outline under R1 carries E3 in a row.
export const FULL_CONTRACT = contract(rule(RULE_1, scenario(E2_NAME), outline("a member at the limit", EXAMPLE_COLUMN, "E3")));

const judge = ({ featureTexts, status = "in-progress", map = traceMap(), answers = traceAnswers() }) =>
  examplesFindings({ ref: "7/2", status, dir: GHOST, text: map, answers, featureTexts });
const untraced = (findings) => findings.filter((finding) => finding.code === "example-untraced");
const idsOf = (findings) => untraced(findings).map((finding) => /^7\/2: (E\d+) /.exec(finding.message)?.[1]);

export const exampleTraceTests = [
  {
    name: "sbe/135-04 00 the id readers read the declared head form exactly (outline: 13 rows)",
    run: () => {
      const rows = [
        [groupRuleId, "R1 · A member may hold at most five loans", "R1"],
        [groupRuleId, "R12 · twelve", "R12"],
        [groupRuleId, "A member may hold at most five loans", null],
        [groupRuleId, "Rule R1 · not at the head", null],
        [groupRuleId, "R0 · zero is no id", null],
        [scenarioExampleId, E2_NAME, "E2"],
        [scenarioExampleId, "E20 · twenty", "E20"],
        [scenarioExampleId, "Refuse E2 · not at the head", null],
        [scenarioExampleId, "E2 a sixth loan (no separator)", null],
        [rowExampleId, "E2", "E2"],
        [rowExampleId, "E02", null],
        [rowExampleId, "E2 ", null],
        [rowExampleId, null, null],
      ];
      for (const [reader, input, expected] of rows) assert.equal(reader(input), expected, `${reader.name}(${JSON.stringify(input)})`);
      assert.equal(EXAMPLE_COLUMN, "example");
    },
  },
  {
    name: "sbe/135-04 00 E1 · a confirmed example carried by a headline scenario under its rule resolves",
    run: () => {
      const findings = judge({ featureTexts: FULL_CONTRACT });
      assert.deepEqual(untraced(findings), []);
      // Non-vacuity: the same contract with E2's scenario renamed is reported.
      assert.deepEqual(idsOf(judge({ featureTexts: contract(rule(RULE_1, scenario("a sixth loan is refused"), outline("at the limit", EXAMPLE_COLUMN, "E3"))) })), ["E2"]);
    },
  },
  {
    name: "sbe/135-04 00 E2 · deleting the scenario that carries a confirmed example turns the doctor red and names it",
    run: () => {
      const findings = untraced(judge({ featureTexts: contract(rule(RULE_1, outline("a member at the limit", EXAMPLE_COLUMN, "E3"))) }));
      assert.equal(findings.length, 1);
      const [finding] = findings;
      assert.equal(finding.severity, "error");
      for (const word of ["7/2", "E2", "confirmed", "R1"]) assert.ok(finding.message.includes(word), `names ${word}: ${finding.message}`);
      assert.equal(finding.path, path.join(GHOST, "EXAMPLES.md"));
    },
  },
  {
    name: "sbe/135-04 00 E3 · an agreed example resolves through either carrier, under its rule (outline: 4 rows)",
    run: () => {
      // Each row carries ONE id; the other agreed example is carried by its scenario so only the row's
      // own example is in question.
      const rows = [
        ["E2", scenario(E2_NAME), scenario(E3_NAME)],
        ["E2", outline("by row", EXAMPLE_COLUMN, "E2"), scenario(E3_NAME)],
        ["E3", scenario(E3_NAME), scenario(E2_NAME)],
        ["E3", outline("by row", EXAMPLE_COLUMN, "E3"), scenario(E2_NAME)],
      ];
      for (const [id, carrier, other] of rows) {
        assert.deepEqual(idsOf(judge({ featureTexts: contract(rule(RULE_1, carrier, other)) })), [], `${id} through ${carrier[0].trim()}`);
        // Non-vacuity: without the carrier the example is reported.
        assert.deepEqual(idsOf(judge({ featureTexts: contract(rule(RULE_1, other)) })), [id], `${id} without its carrier`);
      }
    },
  },
  {
    name: "sbe/135-04 00 E4 · an id only counts in its exact form and its own rule's group (outline: 6 rows)",
    run: () => {
      const e3 = rule(RULE_1, scenario(E3_NAME));
      const rows = [
        ["under R2", [e3, rule("R2 · An overdue loan blocks …", scenario(E2_NAME))], "found under rule R2"],
        ["under an unnamed rule", [e3, rule("a rule titled with no rule id", scenario(E2_NAME))], "found outside rule R1"],
        ["id not at the head", [rule(RULE_1, scenario(E3_NAME), scenario("Refuse E2 · a sixth loan"))], null],
        ["E20", [rule(RULE_1, scenario(E3_NAME), scenario("E20 · twenty"))], null],
        ["a column headed case", [rule(RULE_1, scenario(E3_NAME), outline("by row", "case", "E2"))], null],
        ["a step's text", [rule(RULE_1, scenario(E3_NAME), scenario("a member asks", "Given example E2 holds"))], null],
      ];
      for (const [label, blocks, saying] of rows) {
        const findings = untraced(judge({ featureTexts: contract(...blocks) }));
        assert.deepEqual(idsOf(findings), ["E2"], label);
        if (saying) assert.ok(findings[0].message.includes(saying), `${label}: ${findings[0].message}`);
        else assert.equal(findings[0].message.includes("found"), false, `${label}: the plain message — ${findings[0].message}`);
      }
    },
  },
  {
    name: "sbe/135-04 00 in a feature-per-rule contract the feature is the group",
    run: () => {
      const featureTexts = { "tasks/00_r1.feature": featureText(RULE_1, scenario(E2_NAME), scenario(E3_NAME)) };
      assert.equal(featureTexts["tasks/00_r1.feature"].includes("Rule:"), false, "no Rule: line");
      assert.deepEqual(idsOf(judge({ featureTexts })), []);
      // Non-vacuity: the feature titled with no rule id holds the same scenarios and is not traced
      // at all, while a feature titled for R2 reports both as found under R2.
      const r2 = untraced(judge({ featureTexts: { "tasks/00_r2.feature": featureText(RULE_2, scenario(E2_NAME), scenario(E3_NAME)) } }));
      assert.deepEqual(r2.map((finding) => finding.message.includes("found under rule R2")), [true, true]);
    },
  },
  {
    name: "sbe/135-04 00 the finding follows the acceptance horizon (outline: 3 statuses)",
    run: () => {
      for (const [status, severity] of [["in-progress", "error"], ["in-review", "error"], ["done", "warn"]]) {
        const findings = untraced(judge({ status, featureTexts: contract(rule(RULE_1, scenario(E3_NAME))) }));
        assert.deepEqual(findings.map((finding) => finding.severity), [severity], status);
      }
    },
  },
  {
    name: "sbe/135-04 00 E5 · a proposed example carried nowhere is not reported",
    run: () => {
      const findings = judge({ featureTexts: FULL_CONTRACT });
      assert.equal(untraced(findings).some((finding) => finding.message.includes("E1")), false);
      assert.ok(parseExampleMap(traceMap()).rules[0].examples.some((example) => example.id === "E1" && example.provenance === "proposed"), "E1 is proposed in the fixture");
      // Non-vacuity: E1 made confirmed (and anchored) is reported.
      const confirmed = judge({ featureTexts: FULL_CONTRACT, map: traceMap({ e1: "confirmed" }), answers: traceAnswers([...TRACE_TOKENS, "7/2 E1"]) });
      assert.deepEqual(idsOf(confirmed), ["E1"]);
    },
  },
  {
    name: "sbe/135-04 00 one finding per untraced agreed example, in map order",
    run: () => {
      const findings = judge({ featureTexts: contract(rule(RULE_1, scenario("a member asks"))) });
      assert.deepEqual(idsOf(findings), ["E2", "E3"]);
      assert.deepEqual(untraced(findings).map((finding) => finding.message.includes("stated Q1")), [false, true], "E3's provenance is named as stated Q1");
    },
  },
  {
    name: "sbe/135-04 00 the lane passes a story row's featureTexts to the trace",
    run: () => {
      const row = (featureTexts) => ({ ref: "7/2", type: "story", dir: GHOST, meta: { status: "in-progress" }, featureTexts, extensions: { examples: { text: traceMap(), answers: traceAnswers() } } });
      assert.deepEqual(examplesGroup({ items: [row(FULL_CONTRACT)] }, { config: ON }), []);
      const red = examplesGroup({ items: [row(contract(rule(RULE_1, scenario(E3_NAME))))] }, { config: ON });
      assert.deepEqual(red.map((finding) => finding.code), ["example-untraced"]);
      assert.deepEqual(examplesGroup({ items: [row(contract(rule(RULE_1, scenario(E3_NAME))))] }, { config: {} }), [], "gate off");
    },
  },
];
