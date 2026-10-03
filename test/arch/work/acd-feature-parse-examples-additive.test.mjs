import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseFeature } from "@aof/work/feature-parse";
import { featureFiles, frozenView, loadPreExamplesParser } from "../../../packages/work/test/support/feature-parse-pre-examples.mjs";

// FF-5704 — the parser's additive keys leave every pre-existing key and value as it was. Since
// milestone 135 (ADR-003) the additive family includes the `Rule:` grouping: `scenarios[].rule`,
// `rules`, `examples[].columns` and `examples[].cells` are removed with `examples` before the
// comparison, and `verification`/`lane` are compared only where no tagged rule is in scope (the
// frozen parser leaks a rule's tag onto the next scenario, which is the defect 135 fixed).

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
        const { current, legacy } = frozenView(parsed, legacyParse(source));
        assert.deepEqual(current, legacy, file);
        for (const scenario of parsed.scenarios) {
          assert.ok(Array.isArray(scenario.examples), `${file}: examples array`);
          scenarios += 1;
          blocks += scenario.examples.length;
        }
      }
      assert.ok(files.length > 600 && scenarios > 1000 && blocks > 0, "fitness scan reaches real files, scenarios, and Examples blocks");

      for (const file of ["packages/core/src/application/bindings/work.mjs", "packages/core/src/application/bindings/commands/tasks.mjs", "packages/work/src/doctor/rubric.mjs"]) {
        const source = await readFile(file, "utf8");
        assert.doesNotMatch(source, /(?:\.examples\b|\[\s*["']examples["']\s*\])/, `${file} remains unaware of the additive key`);
      }
    },
  },
];
