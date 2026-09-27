// FF-13302 (milestone 133 / ADR-003, ADR-006 §1) — THE LAYOUT HAS ONE HOME.
//
// "Outside `src/diagrams/layout.mjs`, no `src/**` module spells the `ADR-\d{3}-` stem pattern or
//  builds a `"diagrams/"` path. Every `src/**` module that reads or writes a diagram path imports
//  the layout by resolved specifier. That includes `src/commands/diagram/*.mjs` and
//  `src/work/doctor-diagrams.mjs`, each checked once the file exists. `src/work/artifacts.mjs`'s
//  manifest entry (`dir: "diagrams"`, ADR-007 §2) is the one named exception, because the manifest
//  is its own single home (FF-7008). A round trip `parseDiagramLinks(renderDiagramBlock(x))` gives
//  back every target it wrote."
//
// Why it matters: the writer (`plan`/`export`), the reader (the doctor lane) and the architect's
// pasted block must agree on one spelling. A second module that re-derives the stem or the folder
// is the drift that makes the doctor lane report a correct diagram as missing.
//
// The ADR id's SHAPE is not this control's: FF-6604 already confines every `ADR-\d` spelling to
// `src/declared-id.mjs`, and the layout narrows that form rather than re-spelling it. What this
// control adds is the STEM (an `ADR-` template joined to a slug) and the FOLDER segment.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { parseDiagramLinks, renderDiagramBlock } from "../../../src/diagrams/layout.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_ONE_HOME = "src/diagrams/layout.mjs";
// The manifest's own entry (story 04). Named, never counted; it may spell the segment exactly once.
const MANIFEST = "src/work/artifacts.mjs";
const SEGMENT = ["dia", "grams"].join("");

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

// Every string/template literal's content in comment-stripped code, import specifiers excepted: a
// module path through the `src/diagrams/` family is an import, not a diagram path.
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
  const folder = literals(code).filter((value) =>
    value === SEGMENT || value.startsWith(`${SEGMENT}/`) || value.includes(`/${SEGMENT}/`) || value.endsWith(`/${SEGMENT}`));
  if (file === MANIFEST) {
    if (folder.length > 1) hits.push(`${MANIFEST} spells the folder ${folder.length} times (its one manifest entry is the exception)`);
  } else {
    hits.push(...folder.map((value) => `builds a folder path from "${value}"`));
  }
  // The STEM is an id joined to a slug — `ADR-${n}-…` — not an id alone (`recovery.mjs` mints ids).
  if (/`ADR-\$\{[^}`]*\}-/.test(code) || /["']ADR-["']\s*\+[^;\n]*\+\s*["']-/.test(code)) hits.push("builds an ADR-<NNN>- stem");
  return hits;
}

const LAYOUT_IMPORT = /from\s*["']([^"']*diagrams\/layout\.mjs)["']/g;

function importsTheLayout(file, text) {
  const code = stripComments(text);
  return [...code.matchAll(LAYOUT_IMPORT)].some((match) =>
    path.resolve(repoRoot, path.dirname(file), match[1]) === path.join(repoRoot, THE_ONE_HOME));
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
        for (const hit of layoutSpellings(file, await readFile(full, "utf8"))) offenders.push(`${file}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/133 FF-13302: every module that handles a diagram path imports the layout by resolved specifier",
    run: async () => {
      const handlers = [];
      const family = path.join(repoRoot, "src", "commands", "diagram");
      if (existsSync(family)) {
        for (const name of await readdir(family)) if (name.endsWith(".mjs")) handlers.push(`src/commands/diagram/${name}`);
      }
      if (existsSync(path.join(repoRoot, "src", "work", "doctor-diagrams.mjs"))) handlers.push("src/work/doctor-diagrams.mjs");
      assert.ok(handlers.includes("src/commands/diagram/plan.mjs"), "the plan verb exists and is checked");
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
    },
  },
  {
    name: "arch/133 FF-13302 red probe: the detector fires on a planted folder path and a planted stem, and allows the manifest's one entry",
    run: () => {
      assert.deepEqual(layoutSpellings("src/work/doctor-diagrams.mjs", `const dir = path.join(item, "${SEGMENT}");`), [`builds a folder path from "${SEGMENT}"`]);
      assert.deepEqual(layoutSpellings("src/x.mjs", `const p = \`${SEGMENT}/\${stem}.svg\`;`).length, 1);
      assert.deepEqual(layoutSpellings("src/x.mjs", "const stem = `ADR-${n}-${slug}`;"), ["builds an ADR-<NNN>- stem"]);
      assert.deepEqual(layoutSpellings("src/x.mjs", "const id = `ADR-${String(n).padStart(3, \"0\")}`;"), [], "an ADR id alone is not a stem");
      assert.deepEqual(layoutSpellings(MANIFEST, `{ name: "DIAGRAMS", dir: "${SEGMENT}", ext: ".svg" }`), []);
      assert.equal(layoutSpellings(MANIFEST, `"${SEGMENT}"; "${SEGMENT}"`).length, 1);
      assert.deepEqual(layoutSpellings("src/x.mjs", `// "${SEGMENT}/" in a comment\nconst a = 1;`), []);
      assert.equal(importsTheLayout("src/commands/diagram/plan.mjs", 'import { x } from "../../diagrams/layout.mjs";'), true);
      assert.equal(importsTheLayout("src/commands/diagram/plan.mjs", 'import { x } from "../diagrams/layout.mjs";'), false);
    },
  },
];
