// Fitness function FF-16503 for milestone 165 / ADR-005:
// "The package writer yields identical bytes for an identical file map, whatever order
//  the map was given in, and imports only `node:` built-ins."
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipStored } from "../../../packages/core/src/planning/stored-zip.mjs";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";

const writerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "core", "src", "planning", "stored-zip.mjs"
);

export const archTests = [
  {
    name: "arch/FF-16503: an identical file map gives identical bytes, whatever order it was given in",
    run: () => {
      const entries = [["skills/b/SKILL.md", "b"], [".claude-plugin/plugin.json", "{}\n"], ["a.md", Buffer.from([0, 1, 2])], ["skills/a/SKILL.md", "ä"]];
      const forward = zipStored(Object.fromEntries(entries));
      const reverse = zipStored(Object.fromEntries([...entries].reverse()));
      assert.ok(forward.equals(reverse), "order of the map does not change the bytes");
      assert.ok(forward.equals(zipStored(Object.fromEntries(entries))), "a second run gives the same bytes");
    }
  },
  {
    name: "arch/FF-16503: the package writer imports only node: built-ins",
    run: async () => {
      const source = await readFile(writerPath, "utf8");
      const specifiers = importSpecifiers(source).map((entry) => entry.specifier);
      assert.ok(specifiers.length > 0, "the writer's imports were found");
      assert.deepEqual(computedDynamicImports(source), [], "the writer computes no import specifier");
      for (const specifier of specifiers) {
        assert.ok(specifier.startsWith("node:"), `${specifier} is not a node: built-in`);
      }
    }
  }
];
