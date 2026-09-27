// FF-13402 (milestone 134 / ADR-001 §2, §4) — THE GRAMMAR HAS ONE HOME.
//
// "The provenance vocabulary (`proposed`, `confirmed`, `stated`), the four question states and the
//  two classes are frozen arrays exported once from `src/work-examples/map.mjs`. No other `src/**`
//  module spells an `E<n>`/`Q<n>`/`R<n>` map pattern. No `src/**` module writes a file named
//  `EXAMPLES.md`."
//
// Why it matters: the doctor lane, the continue door and the discovery prose all judge one map. A
// second module that re-spells a label or a line shape is the drift that lets one of them read
// `[confirmd]` as a claim, or a `defaulted` business question as closed, while the others do not.
//
// The detector matches the MAP's shapes, never a bare id: `R1`, `E2` and `Q3` occur in unrelated
// code (an import's placeholder outcome id, a prior-lesson citation). What it matches is an example
// or question bullet, a rule heading, a regex source that builds an E/Q/R id, a `stated Q<n>`
// bracket, a bracketed provenance label, the vocabularies respelt as a literal run, the
// `## Questions` heading, and the map's file name.
//
// ONE MODULE IS ADMITTED BY NAME: `src/declared-id.mjs`. Its retrospective heading grammar
// (`## R<n>`, `R\d+` in its pattern registry) shares the rule heading's shape and is another
// grammar entirely (measured at 134's feasibility, 2026-09-24). Admitting that module is narrower
// than widening the pattern until it no longer sees a rule id at all.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import {
  EXAMPLES_DOC,
  MALFORMED_REASONS,
  PROVENANCE,
  QUESTION_CLASSES,
  QUESTION_STATES,
} from "../../../src/work-examples/map.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "src/work-examples/map.mjs";
const ADMITTED = new Map([
  ["src/declared-id.mjs", "the retrospective heading grammar (`## R<n>`), another grammar sharing the rule heading's shape"],
]);

async function modules(dir = path.join(repoRoot, "src")) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "bundle") out.push(...await modules(full));
    } else if (entry.name.endsWith(".mjs")) {
      out.push(full);
    }
  }
  return out;
}

// A digit where an id's number goes: a literal one, a regex digit class in either a regex literal
// or a string source (`\d`, `\\d`, `[0-9]`, `[1-9]`), perhaps opening a capture group, or a
// template interpolation. `\d*` is not an id's number: an id has at least one digit, and git's
// rename status (`R\d*` in `src/cited-path-resolve.mjs`) is the measured case of the difference.
const DIGIT_CLASS = String.raw`(?:\\{1,2}d(?!\*)|\[[01]-9\])`;
const DIGITISH = String.raw`(?:\d|\((?:\?:)?${DIGIT_CLASS}|${DIGIT_CLASS}|\$\{)`;
const SPACE = String.raw`(?: |\\{1,2}s[*+?]?)?`;
const SHAPES = [
  ["an example or question bullet", new RegExp(String.raw`-${SPACE}[EQ]${DIGITISH}`)],
  ["a rule heading", new RegExp(String.raw`##${SPACE}R${DIGITISH}`)],
  ["a regex source that builds an E/Q/R id", new RegExp(String.raw`(?<![A-Za-z])(?:[EQR]|\[[EQR]{1,3}\])\(?${DIGIT_CLASS}`)],
  ["a `stated Q<n>` bracket", /stated\s+Q/],
  ["a bracketed provenance label", /\[\s*(?:proposed|confirmed|stated)\b/],
  ["the provenance vocabulary respelt", /["'`]proposed["'`]\s*,\s*["'`]confirmed["'`]/],
  ["the question states respelt", /["'`]asked["'`]\s*,\s*["'`]answered["'`]/],
  ["the question classes respelt", /["'`]business["'`]\s*,\s*["'`]technical["'`]/],
  ["the `## Questions` heading", /##\s*Questions\b/],
  ["the map's file name", /EXAMPLES\.md/],
];

// The detector the sweep and the red probe share: what, in this module, re-spells the map.
function mapSpellings(file, text) {
  if (file === THE_ONE_HOME || ADMITTED.has(file)) return [];
  const code = stripComments(text);
  return SHAPES.filter(([, pattern]) => pattern.test(code)).map(([what]) => `spells ${what}`);
}

export const archTests = [
  {
    name: "arch/134 FF-13402: outside map.mjs, no src module spells the example map's grammar or its file name",
    run: async () => {
      const offenders = [];
      for (const full of await modules()) {
        const file = path.relative(repoRoot, full).replace(/\\/g, "/");
        for (const hit of mapSpellings(file, await readFile(full, "utf8"))) offenders.push(`${file}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
      // An admission that no longer fires guards nothing: it is stale, and is removed rather than kept.
      for (const [file, why] of ADMITTED) {
        const code = stripComments(await readFile(path.join(repoRoot, file), "utf8"));
        assert.ok(SHAPES.some(([, pattern]) => pattern.test(code)), `${file} is admitted for ${why}, and no longer spells any map shape`);
      }
    },
  },
  {
    name: "arch/134 FF-13402: the vocabularies are frozen arrays exported once, from map.mjs",
    run: async () => {
      for (const vocabulary of [PROVENANCE, QUESTION_STATES, QUESTION_CLASSES, MALFORMED_REASONS]) {
        assert.ok(Array.isArray(vocabulary) && Object.isFrozen(vocabulary));
      }
      assert.equal(EXAMPLES_DOC, "EXAMPLES.md");
      // The home is the one module that spells them — the sweep above would fire on it otherwise.
      const home = stripComments(await readFile(path.join(repoRoot, THE_ONE_HOME), "utf8"));
      for (const [what, pattern] of SHAPES.filter(([what]) => /respelt|file name|Questions/.test(what))) {
        assert.ok(pattern.test(home), `the home spells ${what}`);
      }
      // No other module exports a vocabulary under the home's names.
      const exporters = [];
      for (const full of await modules()) {
        const file = path.relative(repoRoot, full).replace(/\\/g, "/");
        if (file === THE_ONE_HOME) continue;
        const code = stripComments(await readFile(full, "utf8"));
        if (/export\s+const\s+(?:PROVENANCE|QUESTION_STATES|QUESTION_CLASSES|EXAMPLES_DOC)\b/.test(code)) exporters.push(file);
      }
      assert.deepEqual(exporters, []);
    },
  },
  {
    name: "arch/134 FF-13402 red probe: the detector fires on each planted spelling, and not on a bare id, a comment or the admitted module",
    run: () => {
      const planted = [
        ["const line = `- E${n} · ${text} [proposed]`;", "spells an example or question bullet"],
        ["const QUESTION = /^- Q(\\d+) · /;", "spells an example or question bullet"],
        ["const RULE = /^## R\\d+/;", "spells a rule heading"],
        ["const id = new RegExp(\"^Q\\\\d+$\");", "spells a regex source that builds an E/Q/R id"],
        ["if (label.startsWith(\"stated Q\")) return true;", "spells a `stated Q<n>` bracket"],
        ["const ok = line.endsWith(\"[confirmed]\");", "spells a bracketed provenance label"],
        ["const LABELS = [\"proposed\", \"confirmed\", \"stated\"];", "spells the provenance vocabulary respelt"],
        ["const STATES = [\"open\", \"asked\", \"answered\"];", "spells the question states respelt"],
        ["const CLASSES = [\"business\", \"technical\"];", "spells the question classes respelt"],
        ["const at = text.indexOf(\"## Questions\");", "spells the `## Questions` heading"],
        ["await writeFile(path.join(dir, \"EXAMPLES.md\"), body);", "spells the map's file name"],
      ];
      for (const [source, hit] of planted) {
        assert.ok(mapSpellings("src/work/doctor-examples.mjs", source).includes(hit), `${source} → ${hit}`);
      }
      assert.deepEqual(mapSpellings("src/import/materialize.mjs", "const id = outcome.id ?? \"R1\";"), [], "a bare id is not a map shape");
      assert.deepEqual(mapSpellings("src/x.mjs", "const t = /ADR-\\d{3}/;"), [], "an ADR id is not a map id");
      assert.deepEqual(mapSpellings("src/cited-path-resolve.mjs", "const m = /^R\\d*\\t([^\\t]+)$/u.exec(line);"), [], "git's rename status is not a map id");
      assert.deepEqual(mapSpellings("src/x.mjs", "// - E1 · a → b [proposed]\nconst a = 1;"), [], "a comment is not code");
      assert.deepEqual(mapSpellings("src/declared-id.mjs", "{ name: \"R\", id: \"R\\\\d+\" }"), [], "the admitted module");
      assert.ok(mapSpellings("src/x.mjs", "{ name: \"R\", id: \"R\\\\d+\" }").length > 0, "the same line anywhere else fires");
    },
  },
];
