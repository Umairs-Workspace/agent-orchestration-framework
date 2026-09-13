import assert from "node:assert/strict";
import { projectExecution } from "../../src/loop-record.mjs";
import {
  REGENERATE_REF_PLACEHOLDER,
  regenerateCommand,
  renderExecutionGraph,
  renderExecutionDocument,
} from "../../src/loop-record-render.mjs";
import { renderLoopGraph, KIND_SHAPES } from "../../src/commands/loops-graph.mjs";

// ------------------------------------------------------------- fixtures ----
//
// Loader-shaped, exactly as `loop-record-projection.test.mjs` builds them, and for the same reason
// (m77/R8): a fixture written against a belief about the loader passes for the wrong reason. The
// MODEL is never hand-built — it comes from `projectExecution`, so this suite renders the same
// object story 02 will hand it rather than a convenient stand-in for it.

const CAP_KEY = "work.autonomous.maxAttempts";
const capOf = (value) => ({ work: { autonomous: { maxAttempts: value } } });

const ceilingField = (declared) => {
  if (declared == null) return null;
  if (["none", "unknown", "uncapped"].includes(declared)) return [{ key: "ceiling", raw: declared, kind: declared }];
  return [{
    key: "ceiling",
    raw: `config:${declared.config}`,
    kind: "pointer",
    pointer: { scheme: "config", operand: declared.config },
  }];
};

const node = (id, kind, { ceiling = null, title = `${id} title`, fields = {}, edges = {} } = {}) => {
  const built = { ...fields };
  const parsed = ceilingField(ceiling);
  if (parsed) built.ceiling = parsed;
  return { id, kind, title, path: `.aof/loops/${id.slice(id.indexOf(":") + 1)}.md`, fields: built, edges };
};

const loopNode = (id, options = {}) => node(id, "loop", { ceiling: "none", ...options });

// `actuator` parses through `machineField` — a pointer or a prose citation, never an intra-registry
// scheme. `owner` parses through ACTOR_SCHEMES — an `actor:` ref, or the `unknown` sentinel.
const actuator = (raw) => [{ key: "actuator", raw, kind: "prose", path: raw.slice("prose:".length) }];
const owner = (raw) => ({ key: "owner", raw, kind: "ref", scheme: "actor", operand: raw.slice("actor:".length) });

const run = ({ runId, createdAt, loop, state = "running", outcome = null, failureReason = null, retryOf = null }) => ({
  runId,
  itemRef: "78/01",
  state,
  attempt: 1,
  outcome,
  sessionId: null,
  brief: { loop },
  createdAt,
  updatedAt: createdAt,
  failureReason,
  heartbeatAt: null,
  retryOf,
  reclaimedAt: null,
  node: "test-node",
});

const declaration = ({ id, loopRunId, phase = "continue", cycle = 1, startedAt = "2026-09-01T00:00:00.000Z", ...rest }) => ({
  loopRunId, id, scope: "78", level: "L1", cap: 3, phase, cycle, startedAt, ...rest,
});

const stamp = (n) => `2026-09-01T00:0${n}:00.000Z`;

const engagementRuns = (id, loopRunId, cycles, extra = {}) => Array.from({ length: cycles }, (unused, index) => run({
  runId: `${loopRunId}-000${index}`,
  createdAt: stamp(index),
  loop: declaration({ id, loopRunId, cycle: index + 1 }),
  ...extra,
}));

const modelFor = (registry, runs, config = {}) => projectExecution({ registry, runs, config });

// =============================================================================
// 00_the-scoped-graph.feature
// =============================================================================

export const loopRecordRenderTests = [
  // Scenario: only the loops that ran are drawn
  {
    name: "loop-render/00: a 17-record registry whose item engaged 2 draws those 2 and none of the other 15",
    run: () => {
      const registry = Array.from({ length: 17 }, (unused, index) => loopNode(`loop:l-${String(index).padStart(2, "0")}`));
      const runs = [...engagementRuns("loop:l-00", "lr-a", 1), ...engagementRuns("loop:l-05", "lr-b", 1)];
      const graph = renderExecutionGraph({ model: modelFor(registry, runs), registry });
      assert.ok(graph.text.includes("loop:l-00"), "an engaged loop is drawn");
      assert.ok(graph.text.includes("loop:l-05"), "the other engaged loop is drawn");
      for (const index of [1, 2, 3, 4, 6, 7, 16]) {
        assert.ok(!graph.text.includes(`loop:l-${String(index).padStart(2, "0")}`), `loop ${index} did not run and is not drawn`);
      }
      assert.equal(graph.nodeCount, 2);
    },
  },

  // Scenario: a loop's actuators and reference owners are drawn with it
  {
    name: "loop-render/00: an engaged loop draws its actuator and its reference owner, edged by the key the registry declares them under",
    run: () => {
      const registry = [
        loopNode("loop:the-loop", { fields: { actuator: actuator("prose:src/bundle/agents/aof-developer.md"), owner: owner("actor:operator") } }),
        node("actor:operator", "actor"),
      ];
      const graph = renderExecutionGraph({ model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1)), registry });
      assert.ok(graph.text.includes("prose:src/bundle/agents/aof-developer.md"), "the actuator carries a node");
      assert.ok(graph.text.includes("actor:operator"), "the reference owner carries a node");
      assert.match(graph.text, /-->\|actuator\| /, "the actuator edge carries the key the registry declares it under");
      assert.match(graph.text, /-->\|owner\| /, "the owner edge carries the key the registry declares it under");
    },
  },

  // Scenario (the same one, from the other side): "the edges between them carry the edge types the
  // registry declares" covers the registry's OWN edge keys too, not just the authority fields.
  {
    name: "loop-render/00: a declared edge between two engaged loops is drawn whichever of them sorts first",
    run: () => {
      const withEdge = (from, to) => [
        loopNode(from, { edges: { monitoring: [{ raw: to, scheme: "loop", operand: to.slice(5), resolved: true }] } }),
        loopNode(to),
      ];
      // Forward: the source sorts before the target. Backward: it sorts after — the case that was
      // silently dropped.
      const forward = withEdge("loop:alpha", "loop:zulu");
      const backward = withEdge("loop:zulu", "loop:alpha");
      for (const [registry, source, target] of [[forward, "loop:alpha", "loop:zulu"], [backward, "loop:zulu", "loop:alpha"]]) {
        const runs = [...engagementRuns(source, "lr-a", 1), ...engagementRuns(target, "lr-b", 1)];
        const graph = renderExecutionGraph({ model: modelFor(registry, runs), registry });
        assert.match(graph.text, /-->|monitoring| /, `the declared edge ${source} -> ${target} is drawn`);
        assert.equal(graph.edgeCount, 1);
      }
    },
  },

  {
    name: "loop-render/00: a declared edge to a loop the item never engaged is not drawn",
    run: () => {
      const registry = [
        loopNode("loop:the-loop", { edges: { monitoring: [{ raw: "loop:never-driven", scheme: "loop", operand: "never-driven", resolved: true }] } }),
        loopNode("loop:never-driven"),
      ];
      const graph = renderExecutionGraph({ model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1)), registry });
      assert.ok(!graph.text.includes("loop:never-driven"), "the out-of-scope target is not dragged in");
      assert.equal(graph.edgeCount, 0);
    },
  },

  // THE REGRESSION the architect lane found, written to fail against the defect rather than beside
  // it. The scope set was grown inside the same walk that read it, and it is SEEDED with the engaged
  // loops — so an edge between two of them survived either way, and the case that was really dropped
  // is an edge whose target is an AUTHORITY that a LATER-sorting loop brings into scope. Here
  // `loop:alpha` points at `actor:operator`, and only `loop:zulu` cites it as an owner: with the
  // one-pass walk, alpha was judged before zulu had put the actor in scope, and its edge vanished.
  {
    name: "loop-render/00: an edge to an authority a later-sorting loop brings into scope is still drawn",
    run: () => {
      const registry = [
        loopNode("loop:alpha", { edges: { "target-setting": [{ raw: "actor:operator", scheme: "actor", operand: "operator", resolved: true }] } }),
        loopNode("loop:zulu", { fields: { owner: owner("actor:operator") } }),
        node("actor:operator", "actor"),
      ];
      const runs = [...engagementRuns("loop:alpha", "lr-a", 1), ...engagementRuns("loop:zulu", "lr-b", 1)];
      const graph = renderExecutionGraph({ model: modelFor(registry, runs), registry });
      assert.match(graph.text, /loop_alpha -->|target-setting| actor_operator/,
        "the edge is judged against the finished scope, not against a scope still being built");
      assert.match(graph.text, /loop_zulu -->|owner| actor_operator/, "and the owner edge that brought it into scope is drawn too");
      assert.equal(graph.edgeCount, 2);
    },
  },

  // Scenario: the glyph for each node kind comes from the one shared table
  {
    name: "loop-render/00: every declared kind is drawn with the shape KIND_SHAPES gives it",
    run: () => {
      // One loop citing an owner of each declared kind in turn — the graph must draw each with its
      // own glyph, taken from the imported table rather than from a second copy.
      for (const [kind, shape] of KIND_SHAPES) {
        if (kind === "loop") continue;
        const cited = `${kind}:cited`;
        const registry = [
          loopNode("loop:the-loop", { fields: { owner: { key: "owner", raw: cited, kind: "ref", scheme: kind, operand: "cited" } } }),
          node(cited, kind),
        ];
        const graph = renderExecutionGraph({ model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1)), registry });
        assert.ok(graph.text.includes(`${shape[0]}${cited} · ${cited} title${shape[1]}`), `${kind} is drawn with its own glyph`);
      }
      const loopShape = KIND_SHAPES.get("loop");
      const registry = [loopNode("loop:the-loop")];
      const graph = renderExecutionGraph({ model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1)), registry });
      assert.ok(graph.text.includes(`${loopShape[0]}loop:the-loop · loop:the-loop title${loopShape[1]}`));
    },
  },

  // Scenario: an endpoint the vocabulary does not admit falls to the undeclared shape
  {
    name: "loop-render/00: an endpoint of no admitted kind falls to the undeclared shape and borrows no declared glyph",
    run: () => {
      const registry = [loopNode("loop:the-loop", { fields: { actuator: actuator("prose:src/nowhere.md") } })];
      const graph = renderExecutionGraph({ model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1)), registry });
      const line = graph.text.split("\n").find((text) => text.includes("prose:src/nowhere.md"));
      assert.ok(line.includes('[/"') && line.includes('"/]'), "it takes the undeclared-endpoint shape");
      for (const [kind, shape] of KIND_SHAPES) {
        assert.ok(!line.includes(shape[0]), `it borrows no ${kind} glyph`);
      }
    },
  },

  // Scenario: node keys are collision-safe
  {
    name: "loop-render/00: two ids that mangle to one key get distinct keys, and each edge names the key it meant",
    run: () => {
      // `loop:a-b` and `loop:a_b` both mangle to `loop_a_b`.
      const registry = [
        loopNode("loop:a-b", { fields: { owner: owner("actor:x") } }),
        loopNode("loop:a_b", { fields: { owner: owner("actor:x") } }),
        node("actor:x", "actor"),
      ];
      const runs = [...engagementRuns("loop:a-b", "lr-a", 1), ...engagementRuns("loop:a_b", "lr-b", 1)];
      const graph = renderExecutionGraph({ model: modelFor(registry, runs), registry });
      assert.ok(graph.text.includes("loop_a_b["), "the first id takes the base key");
      assert.ok(graph.text.includes("loop_a_b_2["), "the second takes a distinct suffixed key");
      assert.ok(graph.text.includes("loop_a_b -->|owner|"), "the first edge names its own node's key");
      assert.ok(graph.text.includes("loop_a_b_2 -->|owner|"), "the second edge names its own node's key");
    },
  },

  // Scenario: node and edge order is canonical
  {
    name: "loop-render/00: the same model with its engagements supplied in reverse renders byte-identically",
    run: () => {
      const registry = [
        loopNode("loop:zulu", { fields: { owner: owner("actor:operator") } }),
        loopNode("loop:alpha", { fields: { owner: owner("actor:operator") } }),
        node("actor:operator", "actor"),
      ];
      const forward = modelFor(registry, [...engagementRuns("loop:alpha", "lr-a", 1), ...engagementRuns("loop:zulu", "lr-b", 1)]);
      const reversed = { ...forward, engagements: [...forward.engagements].reverse() };
      assert.equal(
        renderExecutionGraph({ model: forward, registry }).text,
        renderExecutionGraph({ model: reversed, registry }).text,
      );
    },
  },

  // Scenario: an empty scope renders a graph, not a blank
  {
    name: "loop-render/00: no engagements renders a graph header and a statement, not a blank",
    run: () => {
      const registry = [loopNode("loop:never-driven")];
      const model = modelFor(registry, []);
      const graph = renderExecutionGraph({ model, registry });
      assert.equal(graph.text, "flowchart LR", "it is still a graph, not an empty string");
      assert.equal(graph.nodeCount, 0);
      const document = renderExecutionDocument({ model, registry, ref: "78/01" });
      assert.ok(document.includes("No loop ran for this item."), "the document says so in words");
      assert.ok(document.length > 0);
    },
  },

  // Scenario: the frozen renderer is not called and not changed
  {
    name: "loop-render/00: renderLoopGraph produced none of these bytes",
    run: () => {
      const registry = [loopNode("loop:the-loop"), loopNode("loop:never-driven"), node("actor:operator", "actor")];
      const model = modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 1));
      const scoped = renderExecutionGraph({ model, registry }).text;
      const frameworkWide = renderLoopGraph({ nodes: registry }).text;
      assert.notEqual(scoped, frameworkWide, "the item-scoped graph is not the framework-wide one");
      assert.ok(frameworkWide.includes("loop:never-driven"), "the frozen renderer draws every record");
      assert.ok(!scoped.includes("loop:never-driven"), "the scoped renderer draws only what ran");
    },
  },

  // =============================================================================
  // 01_the-document-body.feature
  // =============================================================================

  // Scenario: the coverage line is always present, and states what was measured
  {
    name: "loop-render/01: 14 runs with 0 declarations render a coverage line stating both numbers",
    run: () => {
      const registry = [loopNode("loop:the-loop")];
      const runs = Array.from({ length: 14 }, (unused, index) => ({
        ...run({ runId: `r-${index}`, createdAt: stamp(0), loop: null }),
        brief: {},
      }));
      const zero = renderExecutionDocument({ model: modelFor(registry, runs), registry, ref: "78/01" });
      assert.match(zero, /14 runs found for this item, 0 carrying a loop declaration/);
      const complete = renderExecutionDocument({
        model: modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 2)),
        registry,
        ref: "78/01",
      });
      assert.match(complete, /2 runs found for this item, 2 carrying a loop declaration/,
        "the line is present whether coverage is zero or complete");
    },
  },

  // Scenario Outline: an engagement renders its cycles against its declared ceiling
  ...[
    { declared: { config: CAP_KEY }, config: capOf(6), cycles: 4, expect: "4 cycles against a declared ceiling of 6" },
    { declared: { config: CAP_KEY }, config: capOf(6), cycles: 7, expect: "7 cycles against a declared ceiling of 6, over the bound" },
    { declared: "none", config: {}, cycles: 4, expect: "4 cycles, ceiling `none` — terminates by construction" },
    { declared: "unknown", config: {}, cycles: 4, expect: "4 cycles, ceiling `unknown` — nothing has declared one" },
    { declared: "uncapped", config: {}, cycles: 4, expect: "4 cycles, ceiling `uncapped` — deliberately unbounded" },
  ].map((row) => ({
    name: `loop-render/01: ${row.cycles} cycles under ${JSON.stringify(row.declared)} renders "${row.expect}"`,
    run: () => {
      const registry = [loopNode("loop:the-loop", { ceiling: row.declared })];
      const model = modelFor(registry, engagementRuns("loop:the-loop", "lr-1", row.cycles), row.config);
      assert.ok(renderExecutionDocument({ model, registry, ref: "78/01" }).includes(row.expect));
    },
  })),

  // Scenario: a capped engagement and an uncapped one do not render the same bytes
  {
    name: "loop-render/01: identical observed facts under ceiling 6 and ceiling uncapped render different bytes",
    run: () => {
      const runs = engagementRuns("loop:the-loop", "lr-1", 4);
      const cappedRegistry = [loopNode("loop:the-loop", { ceiling: { config: CAP_KEY } })];
      const uncappedRegistry = [loopNode("loop:the-loop", { ceiling: "uncapped" })];
      const cappedDoc = renderExecutionDocument({ model: modelFor(cappedRegistry, runs, capOf(6)), registry: cappedRegistry, ref: "78/01" });
      const uncappedDoc = renderExecutionDocument({ model: modelFor(uncappedRegistry, runs, capOf(6)), registry: uncappedRegistry, ref: "78/01" });
      assert.notEqual(cappedDoc, uncappedDoc);
    },
  },

  // Scenario: phases, attempts and the terminal outcome appear per engagement
  {
    name: "loop-render/01: a row carries the phases entered, the attempt count and the terminal outcome",
    run: () => {
      const registry = [loopNode("loop:the-loop")];
      const runs = ["continue", "verify", "continue"].map((phase, index) => run({
        runId: `lr-1-000${index}`,
        createdAt: stamp(index),
        retryOf: index === 0 ? null : `lr-1-000${index - 1}`,
        loop: declaration({ id: "loop:the-loop", loopRunId: "lr-1", phase, cycle: index + 1 }),
        ...(index === 2 ? { state: "done", outcome: "done" } : {}),
      }));
      const document = renderExecutionDocument({ model: modelFor(registry, runs), registry, ref: "78/01" });
      assert.ok(document.includes("phases `continue` → `verify`"), "the phases entered, in first-entry order");
      assert.ok(document.includes("3 attempts"), "the attempt count");
      assert.ok(document.includes("ended `done`"), "the terminal outcome");

      const inFlight = renderExecutionDocument({
        model: modelFor(registry, engagementRuns("loop:the-loop", "lr-2", 2)),
        registry,
        ref: "78/01",
      });
      assert.ok(inFlight.includes("in flight"), "an engagement still running renders as in flight");
      assert.ok(!inFlight.includes("ended `failed`"), "and never as failed");
    },
  },

  // Scenario Outline: each gap class renders under its own heading
  ...[
    { gap: "ran-undeclared", heading: "## Ran, undeclared", remedy: "declare the loop, or fix the id it named" },
    { gap: "declared-never-ran", heading: "## Declared, never ran", remedy: "drive the loop, or accept that it does not apply here" },
    { gap: "authority-unresolved", heading: "## Authority unresolved", remedy: "fix the registry record's endpoint" },
  ].map((row) => ({
    name: `loop-render/01: a ${row.gap} gap renders under its own heading naming its remedy`,
    run: () => {
      const registry = row.gap === "authority-unresolved"
        ? [loopNode("loop:the-loop", { fields: { owner: owner("actor:nobody") } })]
        : [loopNode("loop:the-loop")];
      const runs = row.gap === "declared-never-ran" ? [] : engagementRuns(
        row.gap === "ran-undeclared" ? "loop:not-in-the-registry" : "loop:the-loop",
        "lr-1",
        1,
      );
      const document = renderExecutionDocument({ model: modelFor(registry, runs), registry, ref: "78/01" });
      assert.ok(document.includes(row.heading), `the ${row.gap} heading appears`);
      assert.ok(document.includes(`Remedy: ${row.remedy}.`), "the heading names the remedy");
    },
  })),

  // Scenario: a class with no gaps renders no heading
  {
    name: "loop-render/01: a class with no gaps renders no heading and no empty None placeholder",
    run: () => {
      // Every declared loop ran, and its authority resolves — so only `ran-undeclared` has a gap.
      const registry = [loopNode("loop:the-loop", { fields: { owner: owner("actor:operator") } }), node("actor:operator", "actor")];
      const runs = [
        ...engagementRuns("loop:the-loop", "lr-a", 1),
        ...engagementRuns("loop:not-in-the-registry", "lr-b", 1),
      ];
      const document = renderExecutionDocument({ model: modelFor(registry, runs), registry, ref: "78/01" });
      assert.ok(document.includes("## Ran, undeclared"));
      assert.ok(!document.includes("## Declared, never ran"), "a class with no gaps has no heading");
      assert.ok(!document.includes("## Authority unresolved"), "nor does the other empty class");
      assert.ok(!document.includes("None"), "and the absence is not rendered as an empty placeholder");
    },
  },

  // Scenario: the rendering is byte-identical on unchanged input
  {
    name: "loop-render/01: two renderings of one model are byte-identical",
    run: () => {
      const registry = [loopNode("loop:the-loop", { ceiling: { config: CAP_KEY }, fields: { owner: owner("actor:operator") } }), node("actor:operator", "actor")];
      const model = modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 3), capOf(6));
      assert.equal(
        renderExecutionDocument({ model, registry, ref: "78/01" }),
        renderExecutionDocument({ model, registry, ref: "78/01" }),
      );
    },
  },

  // Scenario: the rendering carries nothing that changes by itself
  {
    name: "loop-render/01: the document carries no generation timestamp, absolute path or host name",
    run: () => {
      const registry = [loopNode("loop:the-loop"), node("actor:operator", "actor")];
      const model = modelFor(registry, engagementRuns("loop:the-loop", "lr-1", 2));
      const document = renderExecutionDocument({ model, registry, ref: "78/01" });
      // The engagement's own `startedAt` is an input fact, not a generation stamp — the document
      // renders no time OF ITS OWN, which is what makes regeneration byte-identical.
      assert.ok(!document.includes(new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0")),
        "no stamp of the month this ran in");
      assert.doesNotMatch(document, /[A-Za-z]:[\\/]|\/(?:home|Users)\//, "no absolute filesystem path");
      assert.ok(!document.includes("test-node"), "no host or node name");
      assert.equal(document, renderExecutionDocument({ model, registry, ref: "78/01" }),
        "rendering it again produces the same bytes, whenever it is rendered");
    },
  },

  // Scenario: the frontmatter comes first and the generated marker after it
  {
    name: "loop-render/01: frontmatter is the first block, the generated marker follows it, and the frontmatter parses",
    run: () => {
      const registry = [loopNode("loop:the-loop")];
      const document = renderExecutionDocument({ model: modelFor(registry, []), registry, ref: "78/01" });
      assert.ok(document.startsWith("---\n"), "the frontmatter is the first block in the file");
      const block = document.match(/^---\n([\s\S]*?)\n---/);
      assert.ok(block, "the frontmatter parses — the F-73-G trap is a leading comment breaking exactly this");
      assert.ok(block[1].includes("doc: execution"));
      assert.ok(document.indexOf("aof-generated") > document.indexOf("\n---\n", 4),
        "the generated marker appears after the frontmatter, never before it");
    },
  },

  // Scenario: the marker names a command an operator can actually run
  //
  // Chore 100, promoted from 78/02's review: the marker's bytes are the one line of this document a
  // reader is invited to COPY, and it spelled `aof work loop-record --write` — the verb without the
  // ref it requires, which refuses before it does anything. Pinned here in bytes, and pinned against
  // the exported spelling rather than a restatement of it, so the marker and the sign-off's
  // instruction cannot drift apart again (m71/R8: a marker accurate when written is a lie later, and
  // nothing catches it).
  //
  // RE-PINNED OVER THE INTERPOLATED FORM (chore 117, promoted from 100's own review). 100 fixed the
  // missing ref by spelling the literal `<ref>`, which names the shape but is still a line the
  // operator must edit before it runs — so the copied line still did not run. The bytes now carry
  // THIS item's ref, and the entry asserts the copy is invokable rather than merely well-formed: no
  // placeholder survives in the marker of a named document.
  {
    name: "loop-render/01: the generated marker spells the regeneration command with the ref the verb requires",
    run: () => {
      const registry = [loopNode("loop:the-loop")];
      const document = renderExecutionDocument({ model: modelFor(registry, []), registry, ref: "78/01" });
      const marker = document.split("\n").find((line) => line.includes("aof-generated"));
      assert.equal(
        marker,
        "<!-- aof-generated: `aof work loop-record 78/01 --write` — do not edit by hand, except the sign-off. -->",
        "the marker's bytes name the invokable spelling, carrying the item's own ref",
      );
      assert.ok(marker.includes(regenerateCommand("78/01")), "and it is the exported spelling, not a second copy of it");
      assert.ok(
        !marker.includes(REGENERATE_REF_PLACEHOLDER),
        "a named document's marker leaves no placeholder for the operator to substitute",
      );
      // A DIFFERENT ITEM GETS A DIFFERENT MARKER, which is the whole claim: the bytes are
      // deterministic PER ITEM, not constant across items. Asserted from the renderer rather than
      // from the helper alone, so a marker that ignored its `ref` argument would still be caught.
      const other = renderExecutionDocument({ model: modelFor(registry, []), registry, ref: "78/02" });
      assert.ok(
        other.includes("`aof work loop-record 78/02 --write`"),
        "the marker follows the ref it was rendered for",
      );
      // AND AN UNNAMED RENDER FALLS BACK TO THE SHAPE, never to a command with a hole in it. The
      // production path always has a ref (`item.ref`, after exact resolution), so this is the guard
      // on the fallback rather than a case the command can reach.
      const unnamed = renderExecutionDocument({ model: modelFor(registry, []), registry });
      assert.ok(
        unnamed.includes(`\`aof work loop-record ${REGENERATE_REF_PLACEHOLDER} --write\``),
        "an unnamed document still documents the shape",
      );
    },
  },
];
