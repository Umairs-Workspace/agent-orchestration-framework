// Fitness function FF-16801 for milestone 168 / ADR-002 — "THE TYPE → RECORD-DOC MAP HAS ONE HOME."
//
// Four modules spelled the map before 168: `recordDoc` (records.mjs), `recordDocFor`
// (doctor/coherence.mjs), the doctor snapshot's own `recordDoc` (doctor/index.mjs) and the ratchet's
// `recordName`. Adding a type to four copies is how they drift, so the map moved to the pure identity
// leaf and every lane imports it. This control holds that no other `packages/` source maps an item
// type to its record-doc filename again.
//
// HOW IT IS BUILT:
//   · the two shapes the four copies took are the two patterns — a type comparison followed by a
//     record-doc literal (`type === "story" ? "STORY.md"`, `if (item.type === "spike") return
//     "SPIKE.md"`), and an object entry (`story: "STORY.md"`). A list value (`chore: ["CHORE.md"]`,
//     the scaffold's set of files to WRITE) is not a record-doc map and is not matched, and an object
//     counts only when it maps two or more types — one `story:` key is some other map.
//   · COMMENT-STRIPPED through the one home (`test/support/source-slice.mjs`), because the history
//     of the four copies is written in comments that must not trip the sweep.
//   · NON-VACUOUS: the home itself is shown to match the entry pattern once per type, and each
//     pattern is shown to catch the copy it exists to forbid.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECORD_DOC_BY_TYPE } from "@aof/work/identity";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const HOME = "packages/work/src/identity.mjs";
const TYPES = "milestone|story|uat|spike|chore|prototype";
const DOCS = "SPEC|STORY|SESSION|SPIKE|CHORE|PROTOTYPE";
const PATTERNS = Object.freeze([
  ["a type comparison answering a record doc", new RegExp(`type\\s*===\\s*["'](?:${TYPES})["'][^;{}]{0,80}?["'](?:${DOCS})\\.md["']`, "u")],
  ["an object entry mapping a type to a record doc", new RegExp(`\\b(?:${TYPES})\\s*:\\s*["'](?:${DOCS})\\.md["']`, "gu")],
]);

export const archTests = [
  {
    name: "arch/FF-16801 (acd-record-doc-map-one-home): RECORD_DOC_BY_TYPE in the identity leaf is the only type → record-doc map under packages/",
    run: async () => {
      // The home answers every governed type and the prototype, and nothing else.
      assert.deepEqual(
        Object.keys(RECORD_DOC_BY_TYPE).sort(),
        ["chore", "milestone", "prototype", "spike", "story", "uat"],
        "the map names every type that carries a record doc",
      );
      assert.ok(Object.isFrozen(RECORD_DOC_BY_TYPE), "the map is frozen");

      // Non-vacuity: each pattern catches the copy it forbids, and the home matches the entry pattern.
      assert.match('item.type === "spike" ? "SPIKE.md" : null', PATTERNS[0][1]);
      assert.match('if (item.type === "chore") return "CHORE.md";', PATTERNS[0][1]);
      const home = stripComments(await readFile(path.join(repoRoot, HOME), "utf8"));
      assert.equal(home.match(PATTERNS[1][1])?.length, 6, `non-vacuity: ${HOME} spells the six entries the entry pattern matches`);

      const files = (await readRuntimeFiles(repoRoot, { runtime: "node" }))
        .filter(({ rel }) => rel.startsWith("packages/") && rel.endsWith(".mjs") && rel !== HOME);
      assert.ok(files.length > 100, `non-vacuity: the sweep reads the packages' sources — found ${files.length}`);
      const offenders = [];
      for (const { rel, path: file } of files) {
        const source = stripComments(await readFile(file, "utf8"));
        if (PATTERNS[0][1].test(source)) offenders.push(`${rel} (${PATTERNS[0][0]})`);
        // An object is a type map when it maps at least TWO types to record docs: one `story:` key
        // alone is a different map that happens to name a story's doc (phase-brief's section sources).
        if ((source.match(PATTERNS[1][1])?.length ?? 0) >= 2) offenders.push(`${rel} (${PATTERNS[1][0]})`);
      }
      assert.deepEqual(offenders, [], `the type → record-doc map is declared only in ${HOME} (168/ADR-002) — import RECORD_DOC_BY_TYPE instead: ${offenders.join("; ")}`);
    },
  },
];
