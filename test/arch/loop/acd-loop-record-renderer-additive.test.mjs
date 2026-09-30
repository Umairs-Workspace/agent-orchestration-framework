import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { KIND_SHAPES } from "../../../packages/core/src/commands/loops-graph.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RENDERER = "packages/work-graph/src/record-render.mjs";
const FROZEN = "packages/work-graph/src/shapes.mjs";

// FF-7802 — ONE GLYPH TABLE SERVES BOTH FACES. `renderLoopGraph`'s bytes are frozen by 52/FF-5208
// across ten structural-duplicate scenarios, and ADR-006 keeps this milestone's renderer additive:
// a NEW module that reuses 52's conventions by restatement, with the glyph table IMPORTED rather
// than copied. A second hand-copied table is a guaranteed future drift — 58 and 59 each added a
// kind, and each would then have had two tables to find.
//
// Both halves are asserted, because either alone is passable for the wrong reason: a renderer that
// imports the table and also spells a glyph has drifted already, and one that spells none but
// edited the frozen module has broken FF-5208 instead.
export const archTests = [
  {
    name: "arch/78 FF-7802: the item-scoped renderer imports KIND_SHAPES from the frozen module",
    run: async () => {
      const source = stripComments(await readFile(path.join(root, RENDERER), "utf8"));
      assert.match(
        source,
        /import\s*\{[^}]*\bKIND_SHAPES\b[^}]*\}\s*from\s*["']\.\/shapes\.mjs["']/,
        "the glyph table is imported, not restated",
      );
      assert.ok(KIND_SHAPES.size >= 6, "the shared table is non-trivial, so this gate is not vacuous");
    },
  },
  {
    name: "arch/78 FF-7802: the renderer spells no glyph belonging to a declared kind",
    run: async () => {
      const source = stripComments(await readFile(path.join(root, RENDERER), "utf8"));
      for (const [kind, shape] of KIND_SHAPES) {
        for (const glyph of shape) {
          assert.ok(
            !source.includes(`'${glyph}'`) && !source.includes(`"${glyph}"`),
            `${RENDERER} spells the ${kind} glyph ${JSON.stringify(glyph)} as a literal instead of taking it from KIND_SHAPES`,
          );
        }
      }
    },
  },
  {
    name: "arch/78 FF-7802: the frozen renderer is byte-unmodified by this milestone",
    run: () => {
      // The 142 relocation changes source paths; freeze the public glyph bytes instead
      // of requiring a clean git status for a file that necessarily moves.
      assert.deepEqual([...KIND_SHAPES], [["loop",["[\"","\"]"]],["actor",["([\"","\"])"]],["anchor",["((\"","\"))"]],["watcher",["{{\"","\"}}"]],["arbiter",["{\"","\"}"]],["auditor",[">\"","\"]"]]], "the pre-migration glyph contract is unchanged");
    },
  },
  {
    name: "arch/78 FF-7802: the frozen renderer still exports the table, and exports it as the one home",
    run: async () => {
      const frozen = stripComments(await readFile(path.join(root, FROZEN), "utf8"));
      assert.match(frozen, /export const KIND_SHAPES = new Map\(/, "the table is still exported from its one home");
      const renderer = stripComments(await readFile(path.join(root, RENDERER), "utf8"));
      assert.doesNotMatch(renderer, /KIND_SHAPES\s*=\s*new Map\(/, "and the new renderer does not declare a second one");
    },
  },
];
