import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFeature } from "../../../src/feature-parse.mjs";
import { featureFiles, loadPreExamplesParser, withoutExamples } from "../../support/feature-parse-pre-examples.mjs";

export const archTests = [
  {
    name: "FF-5704: Examples metadata is additive across the whole governed parser family",
    run: async () => {
      const legacyParse = await loadPreExamplesParser();
      const files = await featureFiles();
      let scenarios = 0;
      let blocks = 0;
      for (const file of files) {
        const source = await readFile(file, "utf8");
        const parsed = parseFeature(source);
        assert.deepEqual(withoutExamples(parsed), legacyParse(source), file);
        for (const scenario of parsed.scenarios) {
          assert.ok(Array.isArray(scenario.examples), `${file}: examples array`);
          scenarios += 1;
          blocks += scenario.examples.length;
        }
      }
      assert.ok(files.length > 600 && scenarios > 1000 && blocks > 0, "fitness scan reaches real files, scenarios, and Examples blocks");

      for (const file of ["src/work.mjs", "src/commands/tasks.mjs", "src/work/doctor-rubric.mjs"]) {
        const source = await readFile(file, "utf8");
        assert.doesNotMatch(source, /(?:\.examples\b|\[\s*["']examples["']\s*\])/, `${file} remains unaware of the additive key`);
      }
    },
  },
];
