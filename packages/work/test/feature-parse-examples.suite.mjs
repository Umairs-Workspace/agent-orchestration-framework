import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFeature } from "@aof/work/feature-parse";
import { featureFiles, frozenView, loadPreExamplesParser } from "./support/feature-parse-pre-examples.mjs";

const parse = (body) => parseFeature(`@executable\nFeature: examples\n\n${body}`);
// 57/02 pinned an Examples block's first three keys; 135/02 adds `columns` and `cells` beside them.
const metadata = ({ header, rows, line }) => ({ header, rows, line });

// milestone 135 / story 02 — THE FEATURE USED BELOW, in the task's words: a feature named "loans",
// holding S0 outside any rule, then rule R1 with S1 and S2, then rule R2 (tagged) with a one-step
// Background and S3 and S4.
const R1 = "R1 · A member may hold at most five loans";
const R2 = "R2 · An overdue loan blocks new loans";
function loans({ featureTag = "@executable", ruleTag = "@manual" } = {}) {
  return [
    ...(featureTag ? [featureTag] : []),
    "Feature: loans",
    "",
    "  Scenario: S0",
    "    Given a member",
    "",
    `  Rule: ${R1}`,
    "",
    "    Scenario: S1",
    "      Given a member with four loans",
    "",
    "    Scenario: S2",
    "      Given a member with five loans",
    "",
    ...(ruleTag ? [`  ${ruleTag}`] : []),
    `  Rule: ${R2}`,
    "",
    "    Background:",
    "      Given a library",
    "",
    "    Scenario: S3",
    "      Given an overdue loan",
    "",
    "    Scenario: S4",
    "      Given a loan a day overdue",
    "",
  ].join("\n");
}
const lineOf = (text, needle) => text.split("\n").findIndex((line) => line.includes(needle)) + 1;
const scenarioNamed = (parsed, name) => parsed.scenarios.find((scenario) => scenario.name === name);

export const featureParseExamplesTests = [
  {
    name: "57/02 task 00: every scenario exposes ordered Examples metadata and every Examples data row executes",
    run: () => {
      const source = `  Scenario Outline: first\n    Given <value>\n\n    Examples: primary caption\n      | value |\n      | one   |\n      # | ignored |\n\n      | two   |\n\n    Scenarios: second caption\n      | value |\n      | three |\n      | four  |\n      | five  |\n\n  Scenario Outline: empty\n    Given nothing\n\n  Scenario: plain\n    Given nothing\n`;
      const result = parse(source);
      assert.deepEqual(result.scenarios.map((scenario) => scenario.examples.map(metadata)), [
        [
          { header: "primary caption", rows: 2, line: 7 },
          { header: "second caption", rows: 3, line: 14 },
        ],
        [],
        [],
      ]);

      // Explicitly execute each Examples row: the metadata must enumerate the same
      // five substitutions a runner would execute, never the column headers.
      const executed = [];
      for (const block of result.scenarios[0].examples) {
        for (let row = 0; row < block.rows; row += 1) executed.push(`${block.header}:${row + 1}`);
      }
      assert.deepEqual(executed, ["primary caption:1", "primary caption:2", "second caption:1", "second caption:2", "second caption:3"]);

      const edge = parse(`  | orphan |\n  Examples: outside\n    | h |\n    | x |\n\n  Scenario: not an outline\n    Examples: ignored\n      | h |\n      | x |\n\n  Scenario Outline: malformed and bounded\n    Given x\n    Examples: header only\n      | h |\n    Then table is closed\n      | not a row |\n    \"\"\"\n    Examples: docstring data\n      | also not a row |\n    \"\"\"\n`);
      assert.deepEqual(edge.scenarios.map((scenario) => scenario.examples.map(metadata)), [[], [{ header: "header only", rows: 0, line: 16 }]]);
    },
  },
  {
    name: "57/02 task 01: the existing parser contract and litmus verdict are byte-identical over the governed corpus",
    run: async () => {
      const legacyParse = await loadPreExamplesParser();
      const files = await featureFiles();
      assert.ok(files.length > 600, "the whole governed feature corpus is exercised");
      let scenarios = 0;
      for (const file of files) {
        const source = await readFile(file, "utf8");
        const parsed = parseFeature(source);
        const { current, legacy } = frozenView(parsed, legacyParse(source));
        assert.deepEqual(current, legacy, file);
        for (const scenario of parsed.scenarios) {
          // 135/02 (ADR-003 §1) adds `rule` after 57/02's `examples`; nothing before it moves.
          assert.deepEqual(Object.keys(scenario), ["name", "outline", "lane", "verification", "line", "examples", "rule"], file);
          assert.ok(Array.isArray(scenario.examples), file);
          scenarios += 1;
        }
      }
      assert.ok(scenarios > 1000, "the comparison is not vacuous");
    },
  },

  // ══ 135/02 · 00_a-scenario-knows-its-rule-and-a-rule-owns-its-tags.feature ══
  {
    name: "135/02 00 each scenario reports the rule it sits under (outline: 5 scenarios)",
    run: () => {
      const text = loans();
      const parsed = parseFeature(text);
      const r1 = { name: R1, line: lineOf(text, `Rule: ${R1}`) };
      const r2 = { name: R2, line: lineOf(text, `Rule: ${R2}`) };
      for (const [scenario, rule] of [["S0", null], ["S1", r1], ["S2", r1], ["S3", r2], ["S4", r2]]) {
        assert.deepEqual(scenarioNamed(parsed, scenario).rule, rule, scenario);
      }
    },
  },
  {
    name: "135/02 00 the parse lists the feature's rules in file order with their own tags",
    run: () => {
      const text = loans();
      const { rules } = parseFeature(text);
      assert.equal(rules.length, 2);
      assert.deepEqual(rules[0], { name: R1, line: lineOf(text, `Rule: ${R1}`), tags: [] });
      assert.deepEqual(rules[1], { name: R2, line: lineOf(text, `Rule: ${R2}`), tags: ["@manual"] });
      // A scenario's rule is a copy: it carries no tags and does not alias the list entry.
      const s3 = scenarioNamed(parseFeature(text), "S3");
      assert.deepEqual(Object.keys(s3.rule), ["name", "line"]);
    },
  },
  {
    name: "135/02 00 a rule's tags apply to every scenario in the rule and to no other (outline: 6 rows)",
    run: () => {
      const rows = [
        ["@executable", "@manual", "S1", ["@executable"], "executable"],
        ["@executable", "@manual", "S3", ["@executable", "@manual"], null],
        ["@executable", "@manual", "S4", ["@executable", "@manual"], null],
        [null, "@manual", "S0", [], null],
        [null, "@manual", "S3", ["@manual"], "manual"],
        [null, "@manual", "S4", ["@manual"], "manual"],
      ];
      for (const [featureTag, ruleTag, scenario, verification, lane] of rows) {
        const found = scenarioNamed(parseFeature(loans({ featureTag, ruleTag })), scenario);
        assert.deepEqual(found.verification, verification, `${featureTag} / ${scenario}`);
        assert.equal(found.lane, lane, `${featureTag} / ${scenario}`);
      }
    },
  },
  {
    name: "135/02 00 a tag above a rule is listed once among the feature's tags",
    run: () => {
      const text = loans();
      const manual = parseFeature(text).tags.filter((entry) => entry.tag === "@manual");
      assert.deepEqual(manual, [{ tag: "@manual", line: lineOf(text, `Rule: ${R2}`) - 1 }]);
    },
  },
  {
    name: "135/02 00 a feature with no Rule parses as it did before",
    run: async () => {
      const legacyParse = await loadPreExamplesParser();
      let compared = 0;
      for (const file of await featureFiles()) {
        const source = await readFile(file, "utf8");
        if (/^\s*Rule:/m.test(source)) continue;
        const parsed = parseFeature(source);
        assert.ok(parsed.scenarios.every((scenario) => scenario.rule === null), file);
        assert.deepEqual(parsed.rules, [], file);
        const { current, legacy } = frozenView(parsed, legacyParse(source));
        assert.deepEqual(current, legacy, file);
        compared += 1;
      }
      assert.ok(compared > 600, `non-vacuity: ${compared} rule-free features compared`);
    },
  },

  // ══ 135/02 · 01_example-is-a-scenario-and-a-row-keeps-its-cells.feature ══
  {
    name: "135/02 01 an Example line is a scenario wherever a Scenario line would be (outline: 4 positions)",
    run: () => {
      const E4 = "E4 · a loan a day overdue blocks the next";
      const example = [`    Example: ${E4}`, "      Given a loan a day overdue", "      When the member asks for another", "      Then it is refused"];
      const background = ["    Background:", "      Given a library", ""];
      const positions = [
        ["at feature level", example],
        ["under a Rule", [`  Rule: ${R2}`, "", ...example]],
        ["under a Rule, after a Background", [`  Rule: ${R2}`, "", ...background, ...example]],
        ["at feature level, after a Background", [...background, ...example]],
      ];
      for (const [position, body] of positions) {
        const parsed = parseFeature(["@manual", "Feature: loans", "", ...body, ""].join("\n"));
        assert.equal(parsed.scenarios.length, 1, position);
        const [scenario] = parsed.scenarios;
        assert.equal(scenario.name, E4, position);
        assert.equal(scenario.outline, false, position);
        assert.equal(scenario.lane, "manual", `${position}: the lane comes from the tags in scope`);
        assert.deepEqual(parsed.structural, [], position);
      }
    },
  },
  {
    name: "135/02 01 an Example's steps are no longer read as the Background's",
    run: () => {
      const text = ["@executable", "Feature: loans", "", `  Rule: ${R2}`, "", "    Background:", "      Given a library", "", "    Example: E4 · overdue", "      Given a loan a day overdue", "      When the member asks", "      Then it is refused", ""].join("\n");
      const parsed = parseFeature(text);
      assert.deepEqual(parsed.scenarios.map(({ name, line }) => ({ name, line })), [{ name: "E4 · overdue", line: lineOf(text, "Example: E4") }]);
      assert.deepEqual(parsed.scenarios.filter((scenario) => scenario.rule?.name === R2).map((scenario) => scenario.name), ["E4 · overdue"]);
    },
  },
  {
    name: "135/02 01 an Examples block reports its column names and every row's cells",
    run: () => {
      const [block] = parse("  Scenario Outline: held\n    Given <held>\n\n    Examples:\n      | example | held | outcome |\n      | E1      | 4    | issued  |\n      |         | 0    | issued  |\n").scenarios[0].examples;
      assert.deepEqual(block.columns, ["example", "held", "outcome"]);
      assert.deepEqual(block.cells, [["E1", "4", "issued"], ["", "0", "issued"]]);
      assert.equal(block.rows, 2);
    },
  },
  {
    name: "135/02 01 cells are trimmed and an empty cell is kept (outline: 3 rows)",
    run: () => {
      for (const [row, cells] of [["| x | y |", ["x", "y"]], ["|x|y|", ["x", "y"]], ["|  | y |", ["", "y"]]]) {
        const [block] = parse(`  Scenario Outline: o\n    Given <a>\n\n    Examples:\n      | a | b |\n      ${row}\n`).scenarios[0].examples;
        assert.deepEqual(block.cells, [cells], row);
      }
      // `\|` is a literal pipe inside a cell, as this task's own Examples table writes it.
      const [escaped] = parse("  Scenario Outline: o\n    Given <a>\n\n    Examples:\n      | row |\n      | \\| x \\| |\n").scenarios[0].examples;
      assert.deepEqual(escaped.cells, [["| x |"]]);
    },
  },
  {
    name: "135/02 01 an Examples block with only a header has columns and no cells",
    run: () => {
      const [block] = parse("  Scenario Outline: o\n    Given <example>\n\n    Examples:\n      | example | held |\n").scenarios[0].examples;
      assert.deepEqual(block.columns, ["example", "held"]);
      assert.deepEqual(block.cells, []);
      assert.equal(block.rows, 0);
    },
  },
];
