// FF-13304 (milestone 133 / ADR-007 §4) — THE CONSOLE RENDERS A DIAGRAM ONLY AS AN IMAGE.
//
// "In `ui/src/board/**`, a `DIAGRAMS` doc body reaches the page only through `encodeURIComponent`
//  into a `data:image/svg+xml` URI in an image `src`. It is never passed to `marked.parse`,
//  `dangerouslySetInnerHTML` or `innerHTML`. `api.doc` is the only fetch of `DIAGRAMS`."
//
// Why it matters: the board renders markdown UNSANITISED, which is safe only because every body is
// the operator's own record. A diagram is a generator's output. As an `<img>` it runs no script and
// loads nothing; as markup it would run inside the board's origin. This control keeps the one
// generated body on the image side of that line.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { diagramRenderer, figureHtml, figureState } from "../../../ui/src/board/diagrams.mjs";
import { Marked } from "marked";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BOARD = path.join(repoRoot, "ui", "src", "board");
const CODE = /\.(tsx?|mjs)$/;
const SINKS = /\bmarked\.parse\s*\(|\.parse\s*\(|dangerouslySetInnerHTML|\binnerHTML\b/;

async function boardSources() {
  const out = [];
  for (const name of await readdir(BOARD)) {
    if (CODE.test(name) && !name.endsWith(".d.mts")) out.push({ file: name, code: stripComments(await readFile(path.join(BOARD, name), "utf8")) });
  }
  return out;
}

const count = (code, pattern) => [...code.matchAll(pattern)].length;

// What, across the board's sources, lets a DIAGRAMS body out of the image path.
function leaks(sources) {
  const found = [];
  for (const { file, code } of sources) {
    // (1) `"DIAGRAMS"` is named only as the doc of an `api.doc`/`workApi.doc` call — or as the
    //     `api.ts` type union that call is declared with. Nothing else fetches it.
    // Counted, never sliced: every spelling must be one of the allowed shapes.
    const named = count(code, /["'`]DIAGRAMS["'`]/g);
    const allowed = count(code, /\b(?:workApi|api)\.doc\(\s*[^,()]+,\s*["']DIAGRAMS["']/g)
      + (file === "api.ts" ? count(code, /DocName\s*\|\s*"DIAGRAMS"/g) : 0);
    if (named > allowed) found.push(`${file}: names "DIAGRAMS" outside an api.doc call`);
    if (file !== "api.ts" && /fetch\(\s*[`"'][^`"']*\/api\/work\/doc/.test(code)) found.push(`${file}: fetches /api/work/doc itself`);
    // (2) In the figure module, a doc BODY is read only into the data URI (or measured for its
    //     viewBox width), and the module reaches no markup sink.
    if (file === "diagrams.mjs") {
      if (SINKS.test(code)) found.push("diagrams.mjs: reaches a markup sink");
      const reads = count(code, /\bresponse\.body\b/g);
      const safe = count(code, /\b(?:svgDataUri|viewBoxWidth)\(\s*response\.body\s*\)/g) + count(code, /\btypeof\s+response\.body\b/g);
      if (reads > safe) found.push("diagrams.mjs: reads a doc body outside svgDataUri");
      if (!/encodeURIComponent\(\s*body\s*\)/.test(code) || !/data:image\/svg\+xml/.test(code)) found.push("diagrams.mjs: the data URI is not an encoded body");
    }
    // (3) The panel's diagram answers flow only into `figureState`.
    if (file === "Markdown.tsx" && /answers\[[^\]]+\]/.test(code) && /answers\[[^\]]+\][^;\n]*(?:parse|__html|innerHTML)/.test(code)) {
      found.push("Markdown.tsx: a diagram answer reaches a markup sink");
    }
  }
  return found;
}

const HOSTILE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><foreignObject><img src=x onerror=alert(2)></foreignObject></svg>';

export const archTests = [
  {
    name: "arch/133 FF-13304: in ui/src/board, a DIAGRAMS body reaches the page only as an encoded data URI, and api.doc is its only fetch",
    run: async () => {
      const sources = await boardSources();
      assert.ok(sources.some((source) => source.file === "diagrams.mjs"), "the figure module is swept");
      assert.ok(sources.some((source) => /\bworkApi\.doc\([^)]*["']DIAGRAMS["']/.test(source.code)), "the panel fetches a diagram through api.doc");
      assert.deepEqual(leaks(sources), []);
    },
  },
  {
    name: "arch/133 FF-13304: a hostile SVG body renders as an image and never as markup",
    run: () => {
      const state = figureState({ ref: "07", doc: "DIAGRAMS", present: true, body: HOSTILE }, { member: "ADR-002-x.svg" });
      const html = new Marked({ gfm: true }).use({ renderer: diagramRenderer({ "diagrams/ADR-002-x.svg": state }) })
        .parse("![x](diagrams/ADR-002-x.svg)\n", { async: false });
      assert.equal(/<script|onerror=|<foreignObject|<svg/i.test(html), false, "no generated markup reaches the output");
      assert.ok(html.includes(`src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(HOSTILE)}"`));
      assert.equal(figureHtml({ alt: '"><script>', ...state }).includes("<script>"), false, "the alt text is escaped");
    },
  },
  {
    name: "arch/133 FF-13304 red probe: the detector fires on a body passed to marked.parse, a raw fetch, and a stray DIAGRAMS literal",
    run: () => {
      assert.deepEqual(leaks([{ file: "diagrams.mjs", code: "const encodeURIComponent = 1; data:image/svg+xml encodeURIComponent(body); export const f = (response) => marked.parse(response.body);" }]).sort(), [
        "diagrams.mjs: reaches a markup sink",
        "diagrams.mjs: reads a doc body outside svgDataUri",
      ]);
      assert.deepEqual(leaks([{ file: "DetailPanel.tsx", code: 'fetch(`/api/work/doc?ref=${r}&doc=DIAGRAMS`)' }]), ["DetailPanel.tsx: fetches /api/work/doc itself"]);
      assert.deepEqual(leaks([{ file: "Overview.tsx", code: 'const name = "DIAGRAMS";' }]), ['Overview.tsx: names "DIAGRAMS" outside an api.doc call']);
      assert.deepEqual(leaks([{ file: "DetailPanel.tsx", code: 'load={(member) => workApi.doc(item.ref, "DIAGRAMS", member)}' }]), []);
    },
  },
];
