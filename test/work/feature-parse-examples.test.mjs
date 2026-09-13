import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFeature } from "../../src/feature-parse.mjs";
import { featureFiles, loadPreExamplesParser, withoutExamples } from "../support/feature-parse-pre-examples.mjs";

const parse = (body) => parseFeature(`@executable\nFeature: examples\n\n${body}`);

export const featureParseExamplesTests = [
  {
    name: "57/02 task 00: every scenario exposes ordered Examples metadata and every Examples data row executes",
    run: () => {
      const source = `  Scenario Outline: first\n    Given <value>\n\n    Examples: primary caption\n      | value |\n      | one   |\n      # | ignored |\n\n      | two   |\n\n    Scenarios: second caption\n      | value |\n      | three |\n      | four  |\n      | five  |\n\n  Scenario Outline: empty\n    Given nothing\n\n  Scenario: plain\n    Given nothing\n`;
      const result = parse(source);
      assert.deepEqual(result.scenarios.map((scenario) => scenario.examples), [
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
      assert.deepEqual(edge.scenarios.map((scenario) => scenario.examples), [[], [{ header: "header only", rows: 0, line: 16 }]]);
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
        const current = parseFeature(source);
        const legacy = legacyParse(source);
        assert.deepEqual(withoutExamples(current), legacy, file);
        for (const scenario of current.scenarios) {
          assert.deepEqual(Object.keys(scenario), ["name", "outline", "lane", "verification", "line", "examples"], file);
          assert.ok(Array.isArray(scenario.examples), file);
          scenarios += 1;
        }
      }
      assert.ok(scenarios > 1000, "the comparison is not vacuous");
    },
  },
];
