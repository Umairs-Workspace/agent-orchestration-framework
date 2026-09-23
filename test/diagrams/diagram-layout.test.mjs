// milestone 133 / story 01 / task 01 — the layout module owns the diagram's folder, its stem, its
// brief and its link block (ADR-003). Pure over text and paths: every case below hands the module
// its input and reads its answer, and nothing touches the disk.
import assert from "node:assert/strict";
import {
  diagramFile,
  diagramPaths,
  diagramStem,
  parseDiagramLinks,
  readDiagramBrief,
  renderDiagramBlock,
} from "../../src/diagrams/layout.mjs";

const refusal = (fn) => {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
};

const doc = (...lines) => lines.join("\n");

const BLOCK_INPUT = {
  adrId: "ADR-002",
  title: "the generator seam",
  stem: "ADR-002-generator-seam",
  sourceExt: ".html",
  formats: ["svg", "png"],
};

export const diagramLayoutTests = [
  {
    name: "133/01 task 01: the stem grammar — ADR-NNN plus a lowercase slug of at most 48 characters",
    run: () => {
      assert.equal(diagramStem("ADR-002", "generator-seam"), "ADR-002-generator-seam");
      assert.equal(diagramStem("ADR-010", "a"), "ADR-010-a");
      assert.equal(refusal(() => diagramStem("ADR-2", "generator-seam")), "diagram-adr-invalid");
      assert.equal(refusal(() => diagramStem("adr-002", "generator-seam")), "diagram-adr-invalid");
      assert.equal(refusal(() => diagramStem("ADR-002", "Generator-Seam")), "diagram-slug-invalid");
      assert.equal(refusal(() => diagramStem("ADR-002", "-seam")), "diagram-slug-invalid");
      assert.equal(refusal(() => diagramStem("ADR-002", "seam/../x")), "diagram-slug-invalid");
      assert.equal(refusal(() => diagramStem("ADR-002", "a".repeat(49))), "diagram-slug-invalid");
      assert.equal(diagramStem("ADR-002", "a".repeat(48)), `ADR-002-${"a".repeat(48)}`);
    },
  },
  {
    name: "133/01 task 01: the paths sit in the item's own diagrams folder, forward-slashed on every OS",
    run: () => {
      const expected = {
        dir: "wiki/work/133_milestone_x/diagrams",
        source: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.html",
        svg: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.svg",
        png: "wiki/work/133_milestone_x/diagrams/ADR-002-generator-seam.png",
      };
      assert.deepEqual(diagramPaths("wiki/work/133_milestone_x", "ADR-002-generator-seam", ".html", ["svg", "png"]), expected);
      const svgOnly = diagramPaths("wiki/work/133_milestone_x", "ADR-002-generator-seam", ".html", ["svg"]);
      assert.equal("png" in svgOnly, false, "with formats [svg] the answer has no png key");
      assert.deepEqual(diagramPaths("wiki\\work\\133_milestone_x", "ADR-002-generator-seam", ".html", ["svg", "png"]), expected);
    },
  },
  {
    name: "133/01 task 01: the brief is the prose under the ADR's own Diagram heading",
    run: () => {
      const rows = [
        [doc("## ADR-002 — seam", "### Diagram", "Draw the seam.", "## ADR-003 — x"), "Draw the seam."],
        [doc("## ADR-002 — seam", "### Diagram", "Draw it.", "", "![a](diagrams/ADR-002-s.svg)", "after"), "Draw it."],
        [doc("## ADR-002 — seam", "### Consequences", "none", "## ADR-003 — x", "### Diagram", "not mine"), null],
        [doc("## ADR-002 — seam", "### Diagram", "", "## ADR-003 — x"), null],
        [doc("## ADR-003 — x", "### Diagram", "other ADR"), null],
      ];
      for (const [text, brief] of rows) {
        assert.equal(readDiagramBrief(text, "ADR-002"), brief, JSON.stringify(text));
      }
      assert.equal(readDiagramBrief(doc("## ADR-2 — no", "### Diagram", "x"), "ADR-002"), null, "## ADR-2 is not ADR-002");
    },
  },
  {
    name: "133/01 task 01: the link block is exactly the shape ADR-003 §3 prints",
    run: () => {
      assert.equal(
        renderDiagramBlock(BLOCK_INPUT),
        "![ADR-002 — the generator seam](diagrams/ADR-002-generator-seam.svg)\n\n"
          + "Source: [ADR-002-generator-seam.html](diagrams/ADR-002-generator-seam.html) · PNG: [ADR-002-generator-seam.png](diagrams/ADR-002-generator-seam.png)",
      );
      const svgOnly = renderDiagramBlock({ ...BLOCK_INPUT, formats: ["svg"] });
      assert.ok(svgOnly.endsWith("Source: [ADR-002-generator-seam.html](diagrams/ADR-002-generator-seam.html)"));
      assert.equal(svgOnly.includes("· PNG:"), false);
    },
  },
  {
    name: "133/01 task 01: a rendered block parses back to every target it wrote, under its own ADR",
    run: () => {
      const text = doc("# Architecture", "", "## ADR-002 — seam", "", "Some prose.", "", renderDiagramBlock(BLOCK_INPUT), "");
      const links = parseDiagramLinks(text);
      assert.deepEqual(links, [
        { adr: "ADR-002", stem: "ADR-002-generator-seam", target: "diagrams/ADR-002-generator-seam.svg", line: 7, kind: "image" },
        { adr: "ADR-002", stem: "ADR-002-generator-seam", target: "diagrams/ADR-002-generator-seam.html", line: 9, kind: "link" },
        { adr: "ADR-002", stem: "ADR-002-generator-seam", target: "diagrams/ADR-002-generator-seam.png", line: 9, kind: "link" },
      ]);
    },
  },
  {
    name: "133/01 task 01: links outside diagrams/ are not diagram links, and a link outside an ADR is still reported",
    run: () => {
      const text = doc("![z](diagrams/ADR-009-z.svg)", "## ADR-001 — a", "[x](../SPEC.md)", "![y](mocks/a.png)");
      assert.deepEqual(parseDiagramLinks(text), [
        { adr: null, stem: "ADR-009-z", target: "diagrams/ADR-009-z.svg", line: 1, kind: "image" },
      ]);
    },
  },
  {
    name: "133/01 task 01: a link QUOTED in an inline code span is not a link",
    run: () => {
      const text = doc("## ADR-001 — a", "A relative `![](diagrams/x.svg)` resolves against the board URL. ![real](diagrams/ADR-001-r.svg)");
      assert.deepEqual(parseDiagramLinks(text).map((link) => link.target), ["diagrams/ADR-001-r.svg"]);
    },
  },
  {
    name: "133/01 task 01: a block SHOWN in a fenced example is not a link, and a non-ADR heading closes the section",
    run: () => {
      const text = doc("## ADR-003 — layout", "```markdown", renderDiagramBlock(BLOCK_INPUT), "```", "## Fitness functions", "![f](diagrams/ADR-004-f.svg)");
      assert.deepEqual(parseDiagramLinks(text), [
        { adr: null, stem: "ADR-004-f", target: "diagrams/ADR-004-f.svg", line: 8, kind: "image" },
      ]);
    },
  },
  {
    name: "133/04 task 03 (@finding-F-133-02): the layout admits one diagram file name, and nothing outside the folder",
    run: () => {
      for (const ext of [".html", ".svg", ".png"]) {
        assert.deepEqual(diagramFile("wiki/work/07_milestone_m", `ADR-002-seam${ext}`), {
          name: `ADR-002-seam${ext}`,
          stem: "ADR-002-seam",
          ext,
          path: `wiki/work/07_milestone_m/diagrams/ADR-002-seam${ext}`,
        });
      }
      for (const name of ["ADR-002-seam.js", "ADR-002.svg", "../SPEC.md", "x/ADR-002-seam.svg", "ADR-2-seam.svg", "ADR-002-Seam.svg", "", null]) {
        assert.equal(diagramFile("wiki/work/07_milestone_m", name), null, String(name));
      }
    },
  },
];
