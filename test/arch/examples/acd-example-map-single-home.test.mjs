// FF-13402 (milestone 134 / ADR-001 §2, §4) — THE GRAMMAR HAS ONE HOME.
//
// "The provenance vocabulary (`proposed`, `confirmed`, `stated`), the four question states and the
//  two classes are frozen arrays exported once from `packages/work/src/examples/map.mjs`. No other `packages/core/src/**`
//  module spells an `E<n>`/`Q<n>`/`R<n>` map pattern. No `packages/core/src/**` module writes a file named
//  `EXAMPLES.md`."
//
// Since 135/01 the one home is `packages/specification-by-example/src/map.mjs`: the invariant is
// unchanged, and its path moved with the package (135/ADR-001 §5). The sweep still covers every
// runtime module, so the package's other modules are held to it too.
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
// FF-19201 (milestone 193 / ADR-001 §1–§3, §6, §7) — THE GRAMMAR STILL HAS ONE HOME. The four
// classes, the five states and the four provenance labels are frozen arrays exported once from the
// same module. No other runtime module spells a `researched F<n>` label or state, or builds a
// finding id; and the research document's file name is spelt in ONE module of the package. Its
// shapes join the shared detector below, so the 134 sweep and the 193 cases judge one list.
//
// ONE MODULE IS ADMITTED BY NAME: `packages/core/src/declared-id.mjs`. Its retrospective heading grammar
// (`## R<n>`, `R\d+` in its pattern registry) shares the rule heading's shape and is another
// grammar entirely (measured at 134's feasibility, 2026-09-24). Admitting that module is narrower
// than widening the pattern until it no longer sees a rule id at all.
import assert from "node:assert/strict";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import {
  EXAMPLES_DOC,
  MALFORMED_REASONS,
  PROVENANCE,
  QUESTION_CLASSES,
  QUESTION_STATES,
  RESEARCH_DOC,
} from "@aof/specification-by-example/map";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "packages/specification-by-example/src/map.mjs";
const THE_PACKAGE = "packages/specification-by-example/src/";
const ADMITTED = new Map([
  ["packages/work/src/declared-id.mjs", "the retrospective heading grammar (`## R<n>`), another grammar sharing the rule heading's shape"],
]);

async function modules() {
  // The Node example-map parser is distinct from UI display labels. The full
  // source boundary scan still covers every browser source file.
  const files = await readRuntimeFiles(repoRoot, { runtime: "node" });
  assert.ok(files.length > 0, "runtime grammar sources were enumerated");
  return files.map(file => file.path);
}

// A digit where an id's number goes: a literal one, a regex digit class in either a regex literal
// or a string source (`\d`, `\\d`, `[0-9]`, `[1-9]`), perhaps opening a capture group, or a
// template interpolation. `\d*` is not an id's number: an id has at least one digit, and git's
// rename status (`R\d*` in `packages/core/src/cited-path-resolve.mjs`) is the measured case of the difference.
const DIGIT_CLASS = String.raw`(?:\\{1,2}d(?!\*)|\[[01]-9\])`;
const DIGITISH = String.raw`(?:\d|\((?:\?:)?${DIGIT_CLASS}|${DIGIT_CLASS}|\$\{)`;
const SPACE = String.raw`(?: |\\{1,2}s[*+?]?)?`;
const SHAPES = [
  ["an example or question bullet", new RegExp(String.raw`-${SPACE}[EQ]${DIGITISH}`)],
  ["a rule heading", new RegExp(String.raw`##${SPACE}R${DIGITISH}`)],
  ["a regex source that builds an E/Q/R id", new RegExp(String.raw`(?<![A-Za-z])(?:[EQR]|\[[EQR]{1,3}\])\(?${DIGIT_CLASS}`)],
  ["a `stated Q<n>` bracket", /stated\s+Q/],
  ["a bracketed provenance label", /\[\s*(?:proposed|confirmed|stated|researched)\b/],
  ["a `researched F<n>` label or state", /researched\s+F/],
  ["a regex source that builds a finding id", new RegExp(String.raw`(?<![A-Za-z])F(?:\(?${DIGIT_CLASS}|\$\{)`)],
  ["the provenance vocabulary respelt", /["'`]proposed["'`]\s*,\s*["'`]confirmed["'`]/],
  ["the question states respelt", /["'`]asked["'`]\s*,\s*["'`]answered["'`]/],
  ["the question classes respelt", /["'`](?:business["'`]\s*,\s*["'`]technical|domain["'`]\s*,\s*["'`]policy)["'`]/],
  ["the `## Questions` heading", /##\s*Questions\b/],
  ["the map's file name", /EXAMPLES\.md/],
];

// The detector the sweep and the red probe share: what, in this module, re-spells the map.
function mapSpellings(file, text) {
  if (file === THE_ONE_HOME || ADMITTED.has(file)) return [];
  const code = stripComments(text);
  return SHAPES.filter(([, pattern]) => pattern.test(code)).map(([what]) => `spells ${what}`);
}

// FF-19201's second half: the modules of the package that spell the research document's name, each
// with the first line that spells it. Every one but the home is an offender, and the home must be
// among them.
const RESEARCH_NAME = /RESEARCH\.md/;
function researchDocSpellings(files) {
  return files.flatMap(({ file, text }) => {
    if (!file.startsWith(THE_PACKAGE)) return [];
    const line = stripComments(text).split("\n").find((candidate) => RESEARCH_NAME.test(candidate));
    return line === undefined ? [] : [{ file, line: line.trim() }];
  });
}

// What a sweep reports for a set of files: each module, what it spells, and the line that spells it
// (a shape that only matches across lines is named without one).
function offendersIn(files) {
  return files.flatMap(({ file, text }) => {
    const lines = stripComments(text).split("\n");
    return mapSpellings(file, text).map((hit) => {
      const [, pattern] = SHAPES.find(([what]) => hit === `spells ${what}`);
      const line = lines.find((candidate) => pattern.test(candidate));
      return `${file}: ${hit}${line === undefined ? "" : ` — ${line.trim()}`}`;
    });
  });
}

// The sweep FF-19201 runs: every runtime module read, what each spells of the map, and the package's
// research-name spellers — named, so a sweep that read nothing is a red rather than a vacuous green.
async function sweep() {
  const files = [];
  for (const full of await modules()) {
    files.push({ file: path.relative(repoRoot, full).replace(/\\/g, "/"), text: await readFile(full, "utf8") });
  }
  return {
    swept: files.map(({ file }) => file),
    offenders: offendersIn(files),
    researchSpellers: researchDocSpellings(files),
  };
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
        assert.ok(mapSpellings("packages/core/src/work/doctor-examples.mjs", source).includes(hit), `${source} → ${hit}`);
      }
      assert.deepEqual(mapSpellings("packages/knowledge/src/import/materialize.mjs", "const id = outcome.id ?? \"R1\";"), [], "a bare id is not a map shape");
      assert.deepEqual(mapSpellings("packages/core/src/x.mjs", "const t = /ADR-\\d{3}/;"), [], "an ADR id is not a map id");
      assert.deepEqual(mapSpellings("packages/work/src/cited-path-resolve.mjs", "const m = /^R\\d*\\t([^\\t]+)$/u.exec(line);"), [], "git's rename status is not a map id");
      assert.deepEqual(mapSpellings("packages/core/src/x.mjs", "// - E1 · a → b [proposed]\nconst a = 1;"), [], "a comment is not code");
      assert.deepEqual(mapSpellings("packages/work/src/declared-id.mjs", "{ name: \"R\", id: \"R\\\\d+\" }"), [], "the admitted module");
      assert.ok(mapSpellings("packages/core/src/x.mjs", "{ name: \"R\", id: \"R\\\\d+\" }").length > 0, "the same line anywhere else fires");
    },
  },

  // ══ 193/00 tasks/04_the-grammar-keeps-one-home.feature ══
  {
    name: "arch/193 FF-19201: the grammar still has one home",
    run: async () => {
      assert.deepEqual(QUESTION_CLASSES, ["domain", "policy", "technical", "business"]);
      assert.deepEqual(QUESTION_STATES, ["open", "asked", "answered", "defaulted", "researched"]);
      assert.deepEqual(PROVENANCE, ["proposed", "confirmed", "stated", "researched"]);
      for (const vocabulary of [QUESTION_CLASSES, QUESTION_STATES, PROVENANCE]) assert.ok(Object.isFrozen(vocabulary));
      const { offenders, researchSpellers } = await sweep();
      assert.deepEqual(offenders, [], "no other runtime module spells a researched label or state, or builds a finding id");
      assert.equal(RESEARCH_DOC, "RESEARCH.md");
      assert.deepEqual(researchSpellers.map(({ file }) => file), [THE_ONE_HOME], "the research document's name is spelt in one module of the package");
    },
  },
  {
    name: "arch/193 FF-19201: each planted second spelling turns the control red",
    run: () => {
      const at = "packages/specification-by-example/src/doctor-lane.mjs";
      const planted = [
        ["const cited = line.endsWith(\"[researched F1]\");", "spells a bracketed provenance label"],
        ["const FINDING = /^F([1-9]\\d*)$/;", "spells a regex source that builds a finding id"],
        ["const CLASSES = [\"domain\", \"policy\", \"technical\", \"business\"];", "spells the question classes respelt"],
      ];
      for (const [source, hit] of planted) {
        const text = `import path from "node:path";\n${source}\nexport const x = 1;\n`;
        assert.ok(offendersIn([{ file: at, text }]).includes(`${at}: ${hit} — ${source}`), `${source} → ${hit}, naming the module and the line`);
      }
      assert.ok(mapSpellings(at, "const state = `researched F${n}`;").includes("spells a `researched F<n>` label or state"));
      assert.ok(mapSpellings(at, "const id = `F${n}`;").includes("spells a regex source that builds a finding id"));
      assert.deepEqual(mapSpellings(at, "const fresh = \"FF-19201\"; const hex = /[0-9A-F]+/;"), [], "a fitness id and a hex class are not finding ids");
      const second = "const doc = path.join(dir, \"RESEARCH.md\");";
      assert.deepEqual(researchDocSpellings([
        { file: THE_ONE_HOME, text: "export const RESEARCH_DOC = \"RESEARCH.md\";" },
        { file: at, text: second },
        { file: "packages/work/src/artifacts.mjs", text: second },
      ]), [
        { file: THE_ONE_HOME, line: "export const RESEARCH_DOC = \"RESEARCH.md\";" },
        { file: at, line: second },
      ], "a second spelling in the package is named with its line; one outside it is not this control's");
      assert.deepEqual(researchDocSpellings([{ file: at, text: `// ${second}` }]), [], "a comment is not a spelling");
    },
  },
  {
    name: "arch/193 FF-19201: the sweep still reports what it read",
    run: async () => {
      const { swept } = await sweep();
      assert.ok(swept.length > 0, "the sweep read at least one runtime module");
      assert.ok(swept.includes(THE_ONE_HOME), `the sweep found the home among the ${swept.length} modules it read`);
      assert.ok(swept.some((file) => file.startsWith(THE_PACKAGE) && file !== THE_ONE_HOME), "and the package's other modules");
    },
  },
  {
    name: "arch/193 FF-19201: the package README names what the map module now reads",
    run: async () => {
      const readme = await readFile(path.join(repoRoot, "packages", "specification-by-example", "README.md"), "utf8");
      const row = readme.split("\n").find((line) => line.startsWith("| `map` |"));
      assert.ok(row, "the README has a `map` row");
      assert.match(row, /research document's findings/);
      assert.match(row, /`domain`/);
      assert.match(row, /`policy`/);
    },
  },
  {
    name: "arch/193 FF-19201: this story changes no bundle asset",
    run: () => {
      const result = spawnCliSync(process.execPath, [path.join(repoRoot, "packages", "core", "bin", "aof.mjs"), "work", "update", "--dry-run", "--json"], {
        cwd: repoRoot, encoding: "utf8", windowsHide: true,
        env: { ...process.env, AOF_GLOBAL_HOME: path.join(os.tmpdir(), `aof-ff-19201-${process.pid}`), NODE_NO_WARNINGS: "1" },
      });
      assert.equal(result.status, 0, result.stderr);
      const changes = JSON.parse(result.stdout).actions.filter((action) => action.action !== "skip");
      assert.deepEqual(changes, [], "no command, brief or template is planned to change");
    },
  },
];
