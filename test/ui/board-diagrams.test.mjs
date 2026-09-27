// milestone 133 / story 04 / task 01 — a milestone's ARCHITECTURE tab renders each linked diagram as
// an image figure in one of four states (ADR-007 §4, DESIGN's binding checklist).
//
// `ui/src/board/diagrams.mjs` is imported headlessly, the way the other board ramps are. The
// rendering scenarios drive a per-call `Marked` with the renderer the module hands `Markdown`, which
// is exactly what `Markdown.tsx` does.
import assert from "node:assert/strict";
import { Marked, marked } from "marked";
import { diagramFileUrl, diagramMembers, diagramRenderer, figureHtml, figureState, svgDataUri } from "../../ui/src/board/diagrams.mjs";

const render = (text, images) => {
  const instance = new Marked({ gfm: true, breaks: false });
  if (images !== undefined) instance.use({ renderer: diagramRenderer(images) });
  return instance.parse(text, { async: false });
};

// The panel's call since 133/04 task 03: the renderer is handed the item's ref.
const renderFor = (ref, text, images) => new Marked({ gfm: true, breaks: false }).use({ renderer: diagramRenderer(images, { ref }) }).parse(text, { async: false });

const BLOCK_DOC = [
  "## ADR-002 — seam",
  "",
  "The seam has two sides.",
  "",
  "![ADR-002 — seam](diagrams/ADR-002-seam.svg)",
  "",
  "Source: [ADR-002-seam.html](diagrams/ADR-002-seam.html) · PNG: [ADR-002-seam.png](diagrams/ADR-002-seam.png)",
  "",
].join("\n");

const BODY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480"><title>a & b</title></svg>';
const POPULATED = figureState({ ref: "07", doc: "DIAGRAMS", present: true, body: BODY }, { member: "ADR-002-seam.svg" });

export const boardDiagramsTests = [
  {
    name: "133/04 task 01: only diagrams/<member>.svg images are diagrams, each member once",
    run: () => {
      assert.deepEqual(diagramMembers("![a](diagrams/ADR-002-seam.svg)"), ["ADR-002-seam.svg"]);
      assert.deepEqual(diagramMembers("![a](diagrams/ADR-002-seam.svg)\n![a](diagrams/ADR-002-seam.svg)\n![b](diagrams/ADR-005-x.svg)"), ["ADR-002-seam.svg", "ADR-005-x.svg"]);
      assert.deepEqual(diagramMembers("![a](diagrams/ADR-002-seam.png) ![b](mocks/x.svg) ![c](diagrams/old/y.svg)"), []);
      assert.deepEqual(diagramMembers("[s](diagrams/ADR-002-seam.html)"), []);
    },
  },
  {
    name: "133/04 task 01: the data URI carries the body encoded, and nothing else",
    run: () => {
      const uri = svgDataUri(BODY);
      assert.equal(uri, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BODY)}`);
      assert.equal(decodeURIComponent(uri.slice(uri.indexOf(",") + 1)), BODY);
    },
  },
  {
    name: "133/04 task 01: a doc response maps to a figure state",
    run: () => {
      const context = { member: "ADR-002-seam.svg" };
      assert.deepEqual(figureState(undefined, context), { state: "loading" });
      assert.equal(POPULATED.state, "populated");
      assert.equal(POPULATED.uri, svgDataUri(BODY));
      assert.deepEqual(figureState({ ref: "07", doc: "DIAGRAMS", present: false, body: "" }, context), { state: "missing", text: "Diagram not found — ADR-002-seam.svg is not in this item" });
      assert.deepEqual(figureState({ ref: "07", doc: "DIAGRAMS", present: false, body: "", fromWorker: true }, { ...context, elsewhere: "node-a1b2" }), { state: "missing", text: "Diagram not synced from node-a1b2 yet" });
      assert.deepEqual(figureState({ error: "HTTP 500" }, context), { state: "error", text: "Could not load diagram: HTTP 500" });
    },
  },
  {
    name: "133/04 task 01: the figure's markup, per state",
    run: () => {
      const alt = "ADR-002 — the <seam>";
      const escaped = "ADR-002 — the &lt;seam&gt;";
      const populated = figureHtml({ alt, ...POPULATED });
      assert.match(populated, /^<figure[^>]*>/);
      for (const cls of ["rounded-md", "border", "border-border", "bg-card"]) assert.match(populated, new RegExp(`class="[^"]*\\b${cls}\\b`), cls);
      assert.ok(populated.includes(`src="${POPULATED.uri}"`));
      assert.ok(populated.includes(`alt="${escaped}"`));
      assert.match(populated, /<figcaption class="[^"]*text-xs text-muted-foreground[^"]*">ADR-002 — the &lt;seam&gt;<\/figcaption>/);

      const loading = figureHtml({ alt, state: "loading" });
      assert.ok(loading.includes("aspect-ratio: 16 / 9"));
      assert.match(loading, /class="text-sm text-muted-foreground">Loading diagram…/);
      assert.equal(loading.includes("<img"), false);

      const missing = figureHtml({ alt, state: "missing", text: "Diagram not found — x.svg is not in this item" });
      assert.match(missing, /border-dashed/);
      assert.match(missing, /border-border/);
      assert.match(missing, /class="text-sm text-muted-foreground">Diagram not found/);
      assert.equal(missing.includes("text-accent"), false);
      assert.equal(missing.includes("<img"), false);

      const error = figureHtml({ alt, state: "error", text: "Could not load diagram: HTTP 500" });
      assert.match(error, /border-dashed/);
      assert.match(error, /class="text-sm text-accent">Could not load diagram: HTTP 500/);
      assert.equal(error.includes("<img"), false);
    },
  },
  {
    name: "133/04 task 01: the image never grows past its own width and never scrolls sideways",
    run: () => {
      const img = /<img [^>]*style="([^"]*)"/.exec(figureHtml({ alt: "a", ...POPULATED }))[1];
      for (const rule of ["display:block", "width:100%", "height:auto", "max-height:70vh", "object-fit:contain", "max-width:1000px"]) {
        assert.ok(img.includes(rule), rule);
      }
    },
  },
  {
    name: "133/04 task 01: a figure replaces its image in place, and the block's source line stays a paragraph",
    run: () => {
      const html = render(BLOCK_DOC, { "diagrams/ADR-002-seam.svg": POPULATED });
      const prose = html.indexOf("The seam has two sides.");
      const figure = html.indexOf("<figure");
      const source = html.indexOf("<p>Source:");
      assert.ok(prose >= 0 && figure > prose && source > figure, "prose, then the figure, then the source line");
      assert.ok(html.includes(`src="${POPULATED.uri}"`), "the populated figure");
      assert.doesNotMatch(html, /<p>\s*<figure/, "the figure is not nested inside a <p>");
      assert.match(html, /<p>Source: <a href="diagrams\/ADR-002-seam\.html">ADR-002-seam\.html<\/a> · PNG: <a href="diagrams\/ADR-002-seam\.png">ADR-002-seam\.png<\/a><\/p>/);
      assert.equal(html.includes("<svg"), false, "no SVG markup reaches the output");
    },
  },
  {
    name: "133/04 task 01: an image the map does not know renders the missing figure",
    run: () => {
      const html = render(BLOCK_DOC, {});
      assert.match(html, /border-dashed/);
      assert.ok(html.includes("Diagram not found — ADR-002-seam.svg is not in this item"));
      assert.equal(html.includes("<img"), false);
    },
  },
  {
    name: "133/04 task 01: a document with no diagrams renders as it does today",
    run: () => {
      const text = "## ADR-001 — a\n\nProse with ![mock](mocks/a.png) and [spec](../SPEC.md).\n\n| a | b |\n|---|---|\n| 1 | 2 |\n";
      const today = marked.parse(text, { async: false, gfm: true, breaks: false });
      assert.equal(render(text, {}), today, "with an empty images map");
      assert.equal(render(text, undefined), today, "and without one");
      assert.equal(render(text, {}).includes("<figure"), false);
    },
  },
  {
    name: "133/04 task 03 (@finding-F-133-01): a populated figure is a button that names what it enlarges",
    run: () => {
      const html = renderFor("133", BLOCK_DOC, { "diagrams/ADR-002-seam.svg": POPULATED });
      const button = /<button type="button" data-diagram-expand="([^"]*)" data-diagram-alt="([^"]*)"[^>]*class="([^"]*)">/.exec(html);
      assert.ok(button, "the frame is a button");
      assert.deepEqual([button[1], button[2]], ["diagrams/ADR-002-seam.svg", "ADR-002 — seam"]);
      for (const cls of ["rounded-md", "border", "border-border", "bg-card", "cursor-zoom-in"]) assert.match(button[3], new RegExp(`\\b${cls}\\b`), cls);
      assert.ok(html.includes(`src="${POPULATED.uri}"`), "the same data-URI image");
      assert.ok(html.includes('<figcaption class="mt-1.5 text-xs text-muted-foreground">ADR-002 — seam</figcaption>'), "the same caption");
      assert.equal(figureHtml({ alt: '"><b>', ...POPULATED, expand: 'x"><b>' }).includes("<b>"), false, "the alt and the key are escaped");
      for (const state of [figureState(undefined), figureState({ present: false }, { member: "m.svg" }), figureState({ error: "boom" })]) {
        assert.equal(figureHtml({ alt: "a", ...state, expand: "diagrams/m.svg" }).includes("<button"), false, `${state.state} is not a button`);
      }
      assert.equal(render(BLOCK_DOC, { "diagrams/ADR-002-seam.svg": POPULATED }).includes("<button"), false, "without an item ref, task 01's markup");
    },
  },
  {
    name: "133/04 task 03 (@finding-F-133-02): the block's links point at the served file in a new tab",
    run: () => {
      const html = renderFor("133", BLOCK_DOC, { "diagrams/ADR-002-seam.svg": POPULATED });
      assert.ok(html.includes('<a href="/api/diagram/file?ref=133&amp;file=ADR-002-seam.html" target="_blank" rel="noopener noreferrer">ADR-002-seam.html</a>'), "Source");
      assert.ok(html.includes('<a href="/api/diagram/file?ref=133&amp;file=ADR-002-seam.png" target="_blank" rel="noopener noreferrer">ADR-002-seam.png</a>'), "PNG");
      assert.equal(diagramFileUrl("133/04", "ADR-002-a b.svg"), "/api/diagram/file?ref=133%2F04&file=ADR-002-a%20b.svg");
      const other = "See [spec](../SPEC.md), [a folder](diagrams/old/x.svg) and [a script](diagrams/ADR-002-x.js).";
      assert.equal(renderFor("133", other, {}), marked.parse(other, { async: false, gfm: true, breaks: false }), "every other link renders as marked renders it");
    },
  },
];
