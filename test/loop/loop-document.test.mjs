// Traceability wiring for story 79 / task 00 — the composed document.
//
// Covers EVERY @executable scenario in
//   wiki/work/79_story_committed-loop-graph/tasks/00_the-document.feature
// exercising the REAL src/loop-document.mjs composer over injected models, with the fenced
// block's bytes produced by the REAL exported `renderLoopGraph` from
// src/commands/loops-graph.mjs. One test object per @executable scenario (the Scenario Outline
// folded into one entry iterating its rows), each name tracing to feature + scenario.
// node:assert/strict.
//
// The composer takes injected data and returns bytes — no clock, no filesystem, no environment —
// so every scenario below is decided in-process without standing up a workspace. That is the
// property the last two entries pin directly.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { composeLoopDocument, loopDocumentPath, REGENERATE_COMMAND } from "../../src/loop-document.mjs";
import { renderLoopGraph } from "../../src/commands/loops-graph.mjs";
import { loopsGraphCommand } from "../../src/commands/loops-graph.mjs";
import { parseFrontmatter } from "../../src/work.mjs";
// THE ONE HOME for cutting source (m47 / F-47-04-ARCH-2). Its `stripComments` strips LINE
// COMMENTS FIRST — TECH_DEBT item 24's trap order. The source sweeps below MUST run over the
// stripped text: this module's own header names `process.cwd()` as a thing it does not reach,
// and a raw grep would read that sentence as the reach it forbids.
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// --- fixture builders --------------------------------------------------------

// A loader-shaped node. `edges` is `{ <type>: [<raw endpoint>, …] }` — the loader's own shape,
// where each endpoint is an object carrying its raw text.
function node(id, kind, title, edges = {}) {
  return {
    id,
    kind,
    title,
    edges: Object.fromEntries(
      Object.entries(edges).map(([type, raws]) => [type, raws.map((raw) => ({ raw }))])
    ),
  };
}

// `work:loops-validate`'s own summary shape: the two totals plus the per-check census, whose keys
// arrive in the canonical `CHECK_IDS` order the command inserted them in.
function summaryOf({ error = 0, warn = 0, checks = {}, ran = true } = {}) {
  const ids = ["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"];
  return {
    error,
    warn,
    checks: Object.fromEntries(ids.map((id) => [id, { ran, findings: checks[id] ?? 0 }])),
  };
}

// Compose for a model, taking the fenced bytes from the frozen renderer exactly as the command
// does. Returns both halves so a scenario can compare them.
function composeFor(nodes, { present = true, source = ".aof/loops", ...rest } = {}) {
  const model = { nodes };
  const rendered = renderLoopGraph(model);
  const summary = rest.summary ?? summaryOf(rest);
  const text = composeLoopDocument({
    present,
    source,
    nodeCount: nodes.length,
    edgeCount: rendered.edgeCount,
    graph: rendered.text,
    summary,
    records: nodes,
  });
  return { text, rendered, summary };
}

// The one fenced ```mermaid block, and a hard failure if there is not exactly one.
function mermaidFence(text) {
  const opens = [...text.matchAll(/^```mermaid$/gm)];
  assert.equal(opens.length, 1, "the document carries exactly one fenced block tagged `mermaid`");
  const after = text.slice(opens[0].index + "```mermaid\n".length);
  const closeAt = after.search(/^```$/m);
  assert.ok(closeAt >= 0, "the mermaid fence closes");
  return after.slice(0, closeAt).replace(/\n$/, "");
}

const REGISTRY = [
  node("loop:build-to-green", "loop", "Build to green", { monitoring: ["anchor:run-liveness"], above: ["loop:autonomous-cascade"] }),
  node("loop:autonomous-cascade", "loop", "Advance a work range", { actuator: ["command:work-loop"] }),
  node("anchor:run-liveness", "anchor", "Run liveness"),
  node("actor:operator", "actor", "Human operator"),
];

export const loopDocumentTests = [
  {
    name: "loop-document/00 the document wraps the renderer's bytes in a fenced mermaid block",
    async run() {
      const { text, rendered } = composeFor(REGISTRY);
      assert.equal(mermaidFence(text), rendered.text, "the bytes inside the fence are exactly what the exported renderer produced");

      // No glyph, node ordering or edge ordering is restated OUTSIDE the renderer: the composer's
      // own source carries none of the shapes 52/FF-5208 froze, and no ordering of its own.
      const composer = stripComments(await readFile(path.join(repoRoot, "src/loop-document.mjs"), "utf8"));
      for (const glyph of ['(["', '(("', '{{"', '[/"', '-->|', "flowchart LR"]) {
        assert.ok(!composer.includes(glyph), `src/loop-document.mjs restates no renderer glyph or edge form (${glyph})`);
      }
      assert.doesNotMatch(composer, /\.sort\s*\(/, "src/loop-document.mjs imposes no ordering of its own — the renderer owns node and edge order");
    },
  },
  {
    name: "loop-document/00 the frozen renderer is left byte-unmodified",
    async run() {
      // This story IMPORTS `renderLoopGraph` and restates none of it, so the only ways it could
      // have moved `src/commands/loops-graph.mjs` are the two the contract names: an output-path
      // input, or a write call form. Both are asserted here, on the file as it stands.
      const source = stripComments(await readFile(path.join(repoRoot, "src/commands/loops-graph.mjs"), "utf8"));
      assert.doesNotMatch(
        source,
        /\b(?:writeFile|appendFile|mkdir|rm|rename)\s*\(/,
        "src/commands/loops-graph.mjs gained no write call form — 52/FF-5201's sweep over it passes exactly as before"
      );
      assert.deepEqual(
        Object.keys(loopsGraphCommand.input.properties),
        ["format"],
        "the renderer's command declares no output-path input — its input contract is unmoved"
      );
      assert.equal(loopsGraphCommand.input.additionalProperties, false, "and it admits nothing else either");
      assert.equal(typeof renderLoopGraph, "function", "the renderer is still exported for this story to import rather than restate");
    },
  },
  {
    name: "loop-document/00 the document opens with a generated marker and names its own regenerating command",
    run() {
      const { text } = composeFor(REGISTRY);
      const [first] = text.split("\n");
      assert.match(first, /^<!-- aof-generated:/, "the first line is a generated-artefact marker");
      assert.ok(!text.startsWith("---"), "no frontmatter block precedes that marker");
      assert.ok(first.includes(REGENERATE_COMMAND), "the marker names the command that regenerates it");
      assert.ok(
        text.split("\n").slice(1).some((line) => line.includes(REGENERATE_COMMAND)),
        "and the body names it too, so a reader who finds it stale knows what to run"
      );
    },
  },
  {
    name: "loop-document/00 the document has no frontmatter at all",
    run() {
      const { text } = composeFor(REGISTRY);
      assert.ok(!text.startsWith("---"), "the document carries no frontmatter block");
      // Parsed as a work record it yields NO frontmatter rather than a malformed one — F-73-G
      // (a leading comment BEFORE frontmatter breaks parsing silently) cannot be sprung on a
      // document that carries no frontmatter to break.
      assert.deepEqual(parseFrontmatter(text), {}, "parsing it as a work record yields no frontmatter");
    },
  },
  {
    name: "loop-document/00 the health summary carries the counts the read commands already compute",
    run() {
      const { text, rendered } = composeFor(REGISTRY, { error: 2, warn: 3, checks: { grounding: 3, timescale: 2 } });
      assert.match(text, /^- Declared records: 4$/m, "the declared node count");
      assert.match(text, new RegExp(`^- Declared edges: ${rendered.edgeCount}$`, "m"), "the declared edge count");
      assert.match(text, /^- Findings: 2 error, 3 warning$/m, "the error and warning finding totals");
      for (const [id, count] of [["grounding", 3], ["anchor-grounding", 0], ["pairing", 0], ["reference-ownership", 0], ["actuator-arbitration", 0], ["timescale", 2]]) {
        assert.match(text, new RegExp(`^\\| ${id} \\| ${count} \\|$`, "m"), `each named check and how many findings it raised (${id})`);
      }
    },
  },
  {
    name: "loop-document/00 a registry state is stated on the page, never left for the reader to infer",
    run() {
      const rows = [
        {
          state: "records, edges, and no findings",
          compose: () => composeFor(REGISTRY),
          stated: (text) => {
            assert.match(text, /^- Declared records: 4$/m);
            assert.match(text, /^- Declared edges: 3$/m);
            assert.match(text, /^No check raised a finding\.$/m, "that no check raised a finding");
          },
        },
        {
          state: "records and edges, with warning findings",
          compose: () => composeFor(REGISTRY, { warn: 5, checks: { grounding: 4, timescale: 1 } }),
          stated: (text) => {
            assert.match(text, /^- Declared records: 4$/m);
            assert.match(text, /^- Findings: 0 error, 5 warning$/m, "the warning total");
            assert.match(text, /^\| grounding \| 4 \|$/m, "with its per-check split");
            assert.match(text, /^\| timescale \| 1 \|$/m);
            assert.doesNotMatch(text, /^No check raised a finding\.$/m, "and it does not claim a clean sweep");
          },
        },
        {
          state: "records and edges, with error findings",
          compose: () => composeFor(REGISTRY, { error: 2, checks: { "reference-ownership": 2 } }),
          stated: (text) => {
            assert.match(text, /^- Findings: 2 error, 0 warning$/m, "the error total");
            assert.match(text, /^\| reference-ownership \| 2 \|$/m, "with its per-check split");
          },
        },
        {
          state: "records present but declaring no edges",
          compose: () => composeFor([node("loop:solo", "loop", "Solo"), node("actor:operator", "actor", "Operator")]),
          stated: (text) => {
            assert.match(text, /^- Declared records: 2$/m, "the node count");
            assert.match(text, /^- Declared edges: 0$/m, "and an edge count of zero");
          },
        },
        {
          state: "no registry directory present",
          compose: () => composeFor([], { present: false, source: ".aof/loops", ran: false }),
          stated: (text) => {
            assert.match(text, /^No loop registry is declared\. The registry was looked for at `\.aof\/loops`\.$/m, "that no registry is declared, and where it was looked for");
            assert.match(text, /^No check ran — there is no registry to check\.$/m, "and that the checks did not run rather than that they passed");
          },
        },
      ];

      for (const row of rows) {
        const { text } = row.compose();
        row.stated(text);
        assert.ok(text.trim().length > 0, `${row.state}: it is not silently empty`);
        mermaidFence(text);
      }
    },
  },
  {
    name: "loop-document/00 composition is deterministic for a fixed registry",
    run() {
      assert.equal(composeFor(REGISTRY).text, composeFor(REGISTRY).text, "the two documents are byte-identical");
    },
  },
  {
    name: "loop-document/00 composition reaches no clock, no filesystem and no environment",
    async run() {
      const composer = stripComments(await readFile(path.join(repoRoot, "src/loop-document.mjs"), "utf8"));
      const imports = [...composer.matchAll(/^import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((match) => match[1]);
      assert.deepEqual(imports, ["node:path"], "the composer's DIRECT imports are exactly node:path — no fs, no os, no child_process");
      for (const reach of [/\bDate\b/, /\bprocess\.env\b/, /\bprocess\.cwd\b/, /\bhostname\b/, /\bnode:fs\b/]) {
        assert.doesNotMatch(composer, reach, `the composer reaches no ${reach}`);
      }

      const { text } = composeFor(REGISTRY);
      assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "the composed bytes carry no timestamp");
      assert.ok(!text.includes(os.hostname()), "no hostname");
      assert.ok(!text.includes(repoRoot), "no absolute path outside the project");
      assert.ok(!text.includes(os.tmpdir()), "and no path from the machine it ran on");

      // Composing the same model in a DIFFERENT working directory yields byte-identical output.
      const before = process.cwd();
      try {
        process.chdir(os.tmpdir());
        assert.equal(composeFor(REGISTRY).text, text, "byte-identical from another working directory");
      } finally {
        process.chdir(before);
      }
    },
  },
  {
    name: "loop-document/00 the summary and the picture describe the same registry",
    run() {
      // Two declared records pointing at endpoints NOTHING declares: the graph draws five nodes
      // while the registry declares two.
      const nodes = [
        node("loop:build-to-green", "loop", "Build to green", { actuator: ["command:work-loop"], monitoring: ["anchor:run-liveness"] }),
        node("loop:review-fix", "loop", "Review, fix, re-review", { ceiling: ["config:work.loop.reviewRounds"] }),
      ];
      const { text, rendered } = composeFor(nodes);

      assert.match(text, /^- Declared records: 2$/m, "the stated node count is the declared-record count");
      const fence = mermaidFence(text);
      for (const undeclared of ["command:work-loop", "anchor:run-liveness", "config:work.loop.reviewRounds"]) {
        assert.ok(fence.includes(undeclared), `the fenced block still renders the undeclared endpoint ${undeclared}`);
      }
      assert.equal(fence, rendered.text, "and it renders them exactly as the frozen renderer drew them");

      // The page RECONCILES the two rather than presenting them as a contradiction: it says the
      // diagram draws endpoints no record declares, and that the count is of declared records.
      assert.match(
        text,
        /diagram below draws every endpoint a record points at, including endpoints no record\ndeclares; the record count above counts declared records only\./,
        "the document does not present the two numbers as a contradiction"
      );
    },
  },
  {
    name: "loop-document/00 the document's home is derived from the configured work directory",
    run() {
      // The path helper shares this module with the composer so the writer and the drift check
      // resolve ONE home rather than two spellings of it.
      assert.equal(loopDocumentPath({ workDir: path.join("wiki", "work") }), path.join("wiki", "work", "loops.md"));
      assert.equal(loopDocumentPath(path.join("docs", "stream")), path.join("docs", "stream", "loops.md"));
      assert.throws(() => loopDocumentPath({}), TypeError, "a workspace with no work directory is a loud refusal, never a guessed path");
    },
  },
];
