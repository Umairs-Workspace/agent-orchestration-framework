// Fitness function: acd-golden-normaliser-closed (FF-20301, 203/ADR-002 §1, §2, §6).
//
//   "The normaliser's rules are closed. `test/support/golden/normalise.mjs` exports exactly `eol`,
//    `temp-paths`, `instants`, `hashes`, `version` and `build-id`, in that order. In
//    comment-stripped source, no other module under `test/support/golden/` calls `replace` or
//    `replaceAll` on captured content."
//
// WHY THIS EXISTS. A golden suite that goes red on an unstable render has two cheap ways back to
// green: fix the render, or teach the normaliser to look away. The second is a green suite over an
// unstable product, and it is always the shorter diff. So the list is closed, a seventh rule needs
// a superseding ADR, and a rewrite cannot hide in a sibling module instead: the harness, the store,
// the writer, the diff and the lane registry rewrite nothing. The rule is stated over every
// `replace` call in those modules, not only calls on captured content, because "is this captured
// content?" is a judgement a regex cannot make and a reviewer should not have to.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { RULES } from "../../support/golden/normalise.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const GOLDEN_SUPPORT = "test/support/golden";
const NORMALISER = "normalise.mjs";
const CLOSED_LIST = ["eol", "temp-paths", "instants", "hashes", "version", "build-id"];

// A `.replace(` or `.replaceAll(` call, in comment-stripped source.
const REWRITE = /\.replace(?:All)?\s*\(/u;

export function rewritingModules(sources) {
  return sources.filter(({ source }) => REWRITE.test(stripComments(source))).map(({ file }) => file);
}

function siblingSources() {
  return readdirSync(path.join(repoRoot, GOLDEN_SUPPORT))
    .filter((name) => name.endsWith(".mjs") && name !== NORMALISER)
    .sort()
    .map((name) => ({ file: `${GOLDEN_SUPPORT}/${name}`, source: readFileSync(path.join(repoRoot, GOLDEN_SUPPORT, name), "utf8") }));
}

export const archTests = [
  {
    name: "arch/203 FF-20301: the normaliser's rule list is exactly eol, temp-paths, instants, hashes, version and build-id, in that order, and frozen",
    run: async () => {
      assert.deepEqual(RULES.map((rule) => rule.id), CLOSED_LIST, "a seventh rule, or a reordering, needs a superseding ADR (203/ADR-002 §6)");
      assert.ok(Object.isFrozen(RULES), "the exported list is frozen, so no importer can push a rule into it at run time");
      for (const rule of RULES) assert.ok(Object.isFrozen(rule), `rule ${rule.id} is frozen`);
    },
  },
  {
    name: "arch/203 FF-20301: no module under test/support/golden/ other than normalise.mjs calls replace or replaceAll",
    run: async () => {
      const sources = siblingSources();
      assert.ok(sources.length >= 5, `non-vacuity: ${sources.length} sibling modules were read (harness, store, writer, diff, lanes)`);
      assert.deepEqual(rewritingModules(sources), [], "captured content is rewritten in normalise.mjs and nowhere else (203/ADR-002 §1)");
    },
  },
  {
    name: "arch/203 FF-20301: the detector fires on a planted rewrite in a sibling, and ignores one that is only mentioned in a comment",
    run: async () => {
      const planted = [
        { file: `${GOLDEN_SUPPORT}/harness.mjs`, source: "export const tidy = (text) => text.replaceAll(\"\\\\\", \"/\");\n" },
        { file: `${GOLDEN_SUPPORT}/baseline-store.mjs`, source: "// a comment may say text.replace(x, y) and rewrite nothing\nexport const x = 1;\n" },
      ];
      assert.deepEqual(rewritingModules(planted), [`${GOLDEN_SUPPORT}/harness.mjs`]);
    },
  },
];
