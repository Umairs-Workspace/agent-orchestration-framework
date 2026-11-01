// FF-17903 (milestone 179 / ADR-006 §1–§2) — THE PEDAGOGY HAS ONE HOME.
//
// "Every `STAGES`, `HELP_LADDER` and `TRAPS` entry appears in `teach.md`. No other bundle asset names
//  `Forming` or `Dislodging`, the two trap names that are not ordinary words."
//
// Why it matters: the stages, the rungs and the traps are named once, in `@aof/learning/vocabulary`,
// so milestone 180's checks read the words the teaching prompt teaches with. `teach.md` is
// hand-written prose rather than a render of the lists (ADR-006 §2), so this control is what stops
// the two drifting: a rung dropped from the prompt, or a trap spelt into a second prompt that the
// lists do not govern, fails here.
//
// Filed under test/arch/command, not test/arch/bundle as ADR-006's fitness table first named it:
// FF-12405 leg 10 holds test/arch/bundle at a ceiling that may only fall, and FF-17902 took this
// directory for the same reason.
//
// An entry is matched as a whole phrase, case-insensitively, on word boundaries: "implement" is a
// stage name and a common word, and must not be satisfied by "implementation" alone.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STAGES, HELP_LADDER, TRAPS } from "@aof/learning/vocabulary";
import { assetPath, packageAssetClass } from "../../../packages/core/src/asset-base.mjs";
import { INTEGRATIONS } from "../../../packages/core/src/integrations.mjs";
import { PRACTICES } from "../../../packages/core/src/practices.mjs";
import { moduleReferences } from "../../../scripts/workspace-boundaries.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEARNING = path.join(repoRoot, "packages", "learning");
const TEACH = path.join(LEARNING, "assets", "commands", "teach.md");
// The two trap names no other prompt has a reason to spell (ADR-006 §2).
const DISTINCTIVE = Object.freeze(["Forming", "Dislodging"]);

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const phrase = (entry) => new RegExp(`\\b${escape(entry).replace(/ /gu, "\\s+")}\\b`, "iu");

// Every vocabulary entry the prompt does not spell.
export function missingEntries(text, { stages = STAGES, ladder = HELP_LADDER, traps = TRAPS } = {}) {
  const entries = [
    ...stages.map((entry) => ["STAGES", entry]),
    ...ladder.map((entry) => ["HELP_LADDER", entry]),
    ...traps.flatMap(({ trap, control }) => [["TRAPS", trap], ["TRAPS", control]]),
  ];
  return entries.filter(([, entry]) => !phrase(entry).test(text)).map(([list, entry]) => `${list}: ${entry}`);
}

// The asset directories the bundle reads: core's, then every contributor's (readDescriptor's order).
function assetRoots() {
  const contributed = [...INTEGRATIONS, ...PRACTICES]
    .filter((contribution) => contribution.assets?.package)
    .map((contribution) => assetPath(packageAssetClass(contribution.assets.package)));
  return [assetPath("bundle"), ...contributed];
}

function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

// Every asset other than teach.md that spells a distinctive trap name, as `<path>: <name>`.
export function strayTrapNames(files, read = (file) => readFileSync(file, "utf8")) {
  const hits = [];
  for (const file of files) {
    if (path.resolve(file) === path.resolve(TEACH)) continue;
    const text = read(file);
    for (const name of DISTINCTIVE) if (phrase(name).test(text)) hits.push(`${path.relative(repoRoot, file)}: ${name}`);
  }
  return hits;
}

const relativeFiles = (dir) => filesUnder(dir).map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));

export const archTests = [
  {
    name: "179/03 FF-17903 · the pedagogy has one home: every STAGES, HELP_LADDER and TRAPS entry appears in teach.md",
    run: () => {
      assert.deepEqual(missingEntries(readFileSync(TEACH, "utf8")), [], "teach.md spells every vocabulary entry");
    },
  },
  {
    name: "179/03 FF-17903 · the pedagogy has one home: no bundle asset other than teach.md names Forming or Dislodging",
    run: () => {
      const roots = assetRoots();
      assert.ok(roots.some((root) => path.resolve(root) === path.resolve(path.join(LEARNING, "assets"))), "guard: the walk reaches the learning package's assets");
      const files = roots.flatMap(filesUnder);
      assert.ok(files.some((file) => path.resolve(file) === path.resolve(TEACH)), "guard: teach.md is among the walked assets");
      assert.ok(files.length > 50, `guard: the walk reaches the core bundle (${files.length} files)`);
      assert.deepEqual(strayTrapNames(files), [], "no other bundle asset spells a distinctive trap name");
    },
  },
  {
    name: "179/03 FF-17903 red probe: a dropped entry, a word-only match and a stray trap name each fail",
    run: () => {
      const text = readFileSync(TEACH, "utf8");
      assert.deepEqual(missingEntries(text.replace(/partial\s+scaffold/giu, "outline")), ["HELP_LADDER: partial scaffold"], "a dropped rung is named");
      assert.deepEqual(missingEntries("evaluate the implementation", { stages: ["implement"], ladder: [], traps: [] }), ["STAGES: implement"], "\"implementation\" does not satisfy the stage \"implement\"");
      assert.deepEqual(missingEntries(text, { stages: [...STAGES, "rubber-duck"] }), ["STAGES: rubber-duck"], "an entry the prompt lacks is named");
      const planted = path.join(repoRoot, "packages", "core", "assets", "commands", "planted.md");
      assert.deepEqual(strayTrapNames([planted, TEACH], (file) => (file === planted ? "beware the Dislodging trap" : text)), ["packages/core/assets/commands/planted.md: Dislodging"], "a stray trap name is named, teach.md is not");
      assert.deepEqual(strayTrapNames([planted], () => "transforming the input"), [], "\"Forming\" inside a word is not the trap");
    },
  },
  {
    name: "179/03 the package exports the vocabulary and writes nothing",
    run: () => {
      const manifest = JSON.parse(readFileSync(path.join(LEARNING, "package.json"), "utf8"));
      assert.equal(manifest.exports["./vocabulary"], "./src/vocabulary.mjs", "package.json exports ./vocabulary");
      const sources = relativeFiles(path.join(LEARNING, "src")).filter((rel) => /\.m?js$/u.test(rel));
      assert.ok(sources.includes("packages/learning/src/vocabulary.mjs"), "guard: the vocabulary module is walked");
      for (const rel of sources) {
        const text = readFileSync(path.join(repoRoot, rel), "utf8");
        const specifiers = moduleReferences(text, rel).references.map((reference) => reference.specifier ?? "");
        assert.deepEqual(specifiers.filter((specifier) => /^(?:node:)?fs(?:\/promises)?$/u.test(specifier)), [], `${rel} imports no file system module`);
        assert.doesNotMatch(text, /\b(?:writeFile|appendFile|createWriteStream|mkdir|rename|unlink|rm)(?:Sync)?\s*\(/u, `${rel} writes no file`);
      }
    },
  },
];
