// This invariant rules Node services and their core bindings. Browser presentation
// has a separate boundary census; UI routes and type declarations are not server policy.
// FF-13302 (milestone 133 / ADR-003, ADR-006 §1) — THE LAYOUT HAS ONE HOME.
//
// "Outside `packages/core/src/diagrams/layout.mjs`, no `packages/core/src/**` module spells the `ADR-\d{3}-` stem pattern or
//  builds a `"diagrams/"` path. Every `packages/core/src/**` module that reads or writes a diagram path imports
//  the layout by resolved specifier. That includes `packages/core/src/commands/diagram/*.mjs` and
//  `packages/core/src/work/doctor-diagrams.mjs`, each checked once the file exists. `packages/core/src/work/artifacts.mjs`'s
//  manifest entry (`dir: "diagrams"`, ADR-007 §2) is the one named exception, because the manifest
//  is its own single home (FF-7008). A round trip `parseDiagramLinks(renderDiagramBlock(x))` gives
//  back every target it wrote."
//
// Why it matters: the writer (`plan`/`export`), the reader (the doctor lane) and the architect's
// pasted block must agree on one spelling. A second module that re-derives the stem or the folder
// is the drift that makes the doctor lane report a correct diagram as missing.
//
// Extended by 145: outside the layout, no module builds an `execution/` path or spells
// `loop-plan.json` or `loop.html` either — the loop diagram's place has the same one home.
//
// The ADR id's SHAPE is not this control's: FF-6604 already confines every `ADR-\d` spelling to
// `packages/core/src/declared-id.mjs`, and the layout narrows that form rather than re-spelling it. What this
// control adds is the STEM (an `ADR-` template joined to a slug) and the FOLDER segment.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { parseDiagramLinks, readPrototypeBrief, renderDiagramBlock } from "@aof/diagrams/layout";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "packages/diagrams/src/layout.mjs";
// The manifest's own entry (story 04). Named, never counted; it may spell the segment exactly once.
const MANIFEST = "packages/work/src/artifacts.mjs";
const SEGMENT = ["dia", "grams"].join("");
// Assembled for the same reason as SEGMENT: this file is not its own subject.
const EXECUTION = ["exec", "ution"].join("");
const LOOP_FILES = [["loop-plan", "json"].join("."), ["loop", "html"].join(".")];

async function modules() {
  const files = await readRuntimeFiles(repoRoot, { runtime: "node" });
  assert.ok(files.length > 100, "the runtime implementation census is non-empty");
  assert.ok(files.some(file => file.rel === THE_ONE_HOME), "the owner is included");
  return files.map(file => file.path);
}

// Every string/template literal's content in comment-stripped code, import specifiers excepted: a
// module path through the `packages/core/src/diagrams/` family is an import, not a diagram path.
function literals(code) {
  const out = [];
  const body = code.replace(/\bfrom\s*(["'])[^"'\n]*\1/g, "").replace(/\bimport\s*\(\s*(["'])[^"'\n]*\1\s*\)/g, "");
  for (const match of body.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) out.push(match[2]);
  return out;
}

// The detector the sweep and the red probe share: what, in this module, re-derives the layout.
function layoutSpellings(file, text) {
  const code = stripComments(text);
  const hits = [];
  // A workspace package NAME (`@aof/diagrams`) is a module address, not a folder path, exactly as an
  // import specifier through the family is; the contribution that names the package is not a spelling.
  const folder = literals(code).filter((value) => !value.startsWith("@aof/")).filter((value) =>
    value === SEGMENT || value.startsWith(`${SEGMENT}/`) || value.includes(`/${SEGMENT}/`) || value.endsWith(`/${SEGMENT}`));
  if (file === MANIFEST) {
    if (folder.length > 1) hits.push(`${MANIFEST} spells the folder ${folder.length} times (its one manifest entry is the exception)`);
  } else {
    hits.push(...folder.map((value) => `builds a folder path from "${value}"`));
  }
  // The STEM is an id joined to a slug — `ADR-${n}-…` — not an id alone (`recovery.mjs` mints ids).
  if (/`ADR-\$\{[^}`]*\}-/.test(code) || /["']ADR-["']\s*\+[^;\n]*\+\s*["']-/.test(code)) hits.push("builds an ADR-<NNN>- stem");
  // 145 — the loop diagram's `execution/` folder and its file names have the same one home. A path
  // into the `@aof/execution` package's own tree is a module path, not the item folder.
  for (const value of literals(code)) {
    if (value.includes(`packages/${EXECUTION}/`)) continue;
    if (value.startsWith(`${EXECUTION}/`) || value.includes(`/${EXECUTION}/`) || value.endsWith(`/${EXECUTION}`)) hits.push(`builds an ${EXECUTION} path from "${value}"`);
    for (const name of LOOP_FILES) if (value.includes(name)) hits.push(`spells "${name}"`);
  }
  return hits;
}

const offenderLines = (file, text) => layoutSpellings(file, text).map((hit) => `${file}: ${hit}`);

// A relative import that resolves to the one home, or the package's published `./layout` export —
// the layout now lives at @aof/diagrams' root, so its own commands reach it as `../layout.mjs` and
// its lane as `./layout.mjs`, and anything outside the package through the export.
const LAYOUT_IMPORT = /from\s*["']([^"']*layout\.mjs|@aof\/diagrams\/layout)["']/g;

function importsTheLayout(file, text) {
  const code = stripComments(text);
  return [...code.matchAll(LAYOUT_IMPORT)].some((match) =>
    match[1] === "@aof/diagrams/layout"
    || path.resolve(repoRoot, path.dirname(file), match[1]) === path.join(repoRoot, THE_ONE_HOME));
}

const BLOCK = { adrId: "ADR-002", title: "the generator seam", stem: "ADR-002-generator-seam", sourceExt: ".html", formats: ["svg", "png"] };

export const archTests = [
  {
    name: "arch/133 FF-13302: outside the layout, no src module builds a diagrams path or an ADR stem",
    run: async () => {
      const offenders = [];
      for (const full of await modules()) {
        const file = path.relative(repoRoot, full).replace(/\\/g, "/");
        if (file === THE_ONE_HOME) continue;
        offenders.push(...offenderLines(file, await readFile(full, "utf8")));
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/133 FF-13302: every module that handles a diagram path imports the layout by resolved specifier",
    run: async () => {
      assert.equal(existsSync(path.join(repoRoot, "packages/core/src/work-diagrams/layout.mjs")), false,
        "the retired forward is absent; handlers reach the owned implementation");
      const handlers = [];
      const family = path.join(repoRoot, "packages", "diagrams", "src", "commands");
      if (existsSync(family)) {
        // `capability.mjs` handles NO diagram path: it answers the one reader's config (on/off, the
        // generator) and names no folder, stem or file, so it owes the layout nothing. Named, not
        // pattern-matched, so a second path-less verb is an edit here.
        for (const name of await readdir(family)) if (name.endsWith(".mjs") && name !== "capability.mjs") handlers.push(`packages/diagrams/src/commands/${name}`);
      }
      if (existsSync(path.join(repoRoot, "packages", "diagrams", "src", "doctor-lane.mjs"))) handlers.push("packages/diagrams/src/doctor-lane.mjs");
      assert.ok(handlers.includes("packages/diagrams/src/commands/plan.mjs"), "the plan verb exists and is checked");
      for (const file of handlers) {
        assert.ok(importsTheLayout(file, await readFile(path.join(repoRoot, file), "utf8")), `${file} imports ${THE_ONE_HOME}`);
      }
    },
  },
  {
    name: "arch/133 FF-13302: a rendered block parses back to every target it wrote",
    run: () => {
      for (const formats of [["svg", "png"], ["svg"]]) {
        const block = renderDiagramBlock({ ...BLOCK, formats });
        const written = [...block.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).sort();
        const parsed = parseDiagramLinks(`## ADR-002 — seam\n\n${block}\n`);
        assert.deepEqual(parsed.map((link) => link.target).sort(), written);
        assert.ok(parsed.every((link) => link.adr === "ADR-002" && link.stem === BLOCK.stem));
      }
      // 168/ADR-006 §2 — the prototype half is the SAME home: its block, built from the name as its
      // stem, parses back to every target it wrote, and its brief is read only through the layout.
      const block = renderDiagramBlock({ adrId: null, title: "data-flow", stem: "data-flow", sourceExt: ".html", formats: ["svg", "png"] });
      const written = [...block.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).sort();
      assert.deepEqual(parseDiagramLinks(`## Diagrams\n\n${block}\n`).map((link) => link.target).sort(), written);
      assert.equal(readPrototypeBrief("## Diagrams\n\n### data-flow\n\nrows\n", "data-flow"), "rows");
    },
  },
  {
    name: "arch/133 FF-13302 red probe: the detector fires on a planted folder path and a planted stem, and allows the manifest's one entry",
    run: () => {
      assert.deepEqual(layoutSpellings("packages/diagrams/src/doctor-lane.mjs", `const dir = path.join(item, "${SEGMENT}");`), [`builds a folder path from "${SEGMENT}"`]);
      assert.deepEqual(layoutSpellings("packages/core/src/x.mjs", `const p = \`${SEGMENT}/\${stem}.svg\`;`).length, 1);
      assert.deepEqual(layoutSpellings("packages/core/src/x.mjs", "const stem = `ADR-${n}-${slug}`;"), ["builds an ADR-<NNN>- stem"]);
      assert.deepEqual(layoutSpellings("packages/core/src/x.mjs", "const id = `ADR-${String(n).padStart(3, \"0\")}`;"), [], "an ADR id alone is not a stem");
      assert.deepEqual(layoutSpellings(MANIFEST, `{ name: "DIAGRAMS", dir: "${SEGMENT}", ext: ".svg" }`), []);
      assert.equal(layoutSpellings(MANIFEST, `"${SEGMENT}"; "${SEGMENT}"`).length, 1);
      assert.deepEqual(layoutSpellings("packages/core/src/x.mjs", `// "${SEGMENT}/" in a comment\nconst a = 1;`), []);
      assert.deepEqual(layoutSpellings("packages/diagrams/src/contribution.mjs", `export const name = "@aof/${SEGMENT}";`), [], "a package name is an address, not a folder");
      assert.deepEqual(layoutSpellings("packages/core/src/x.mjs", `const p = "wiki/${SEGMENT}";`), [`builds a folder path from "wiki/${SEGMENT}"`], "…and a folder path still fires");
      assert.equal(importsTheLayout("packages/diagrams/src/commands/plan.mjs", 'import { x } from "../layout.mjs";'), true);
      assert.equal(importsTheLayout("packages/diagrams/src/commands/plan.mjs", 'import { x } from "./layout.mjs";'), false);
      assert.equal(importsTheLayout("packages/work/src/doctor/index.mjs", 'import { x } from "@aof/diagrams/layout";'), true);
    },
  },
  {
    name: "arch/145 FF-13302 red probe: an execution/ path or a loop file name spelled outside the layout fails it, naming the file",
    run: () => {
      const plan = "packages/diagrams/src/commands/plan.mjs";
      const planted = offenderLines(plan, `const svg = "${EXECUTION}/loop.svg";`);
      assert.equal(planted.length, 1);
      assert.ok(planted[0].startsWith(`${plan}: `), "the offender names the file");
      assert.equal(offenderLines(plan, `const p = path.join(item.dir, "${LOOP_FILES[0]}");`).length, 1);
      assert.equal(offenderLines(plan, `const p = \`\${dir}/${LOOP_FILES[1]}\`;`).length, 1);
      assert.equal(offenderLines(plan, `const p = \`\${itemDir}/${EXECUTION}\`;`).length, 1);
      assert.deepEqual(offenderLines(plan, `const w = "packages/${EXECUTION}/src/runs.mjs";`), [], "the execution package's own path is a module path");
      assert.deepEqual(offenderLines(plan, `import { x } from "@aof/${EXECUTION}/svg-rasterizer";`), []);
      assert.deepEqual(offenderLines(plan, `// "${EXECUTION}/loop.svg" in a comment\nconst a = 1;`), []);
    },
  },
];
