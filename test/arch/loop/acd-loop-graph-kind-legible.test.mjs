// milestone 58 / story 03 — FF-5808.
//
// EVERY DECLARED NODE KIND RENDERS AS A DISTINCT SHAPE, AND NONE OF THEM IS THE FALLBACK.
//
// The glyph assignment itself is a choice made in 58/03; the property that outlives the choice is
// the one this gate holds. Two legs, and neither alone is enough:
//
//   (a) `renderLoopGraph` emits a rendering for EVERY member of `NODE_KINDS`, and the set of
//       distinct shapes it emits has the same cardinality as `NODE_KINDS` — so no two kinds
//       collide.
//   (b) no declared kind's shape equals the shape used for an endpoint NO record declares — the
//       parallelogram `test/arch/loop/acd-loop-render-deterministic.test.mjs` pins for `command:`,
//       `config:`, `module:` and dangling `loop:` endpoints.
//
// Leg (a) alone is satisfiable by the very collision this control repairs: a sixth kind handed the
// fallback shape still yields six distinct shapes across six kinds while an `anchor` is drawn
// identically to a dangling reference. Together, the sixth kind fails CI until it is given a glyph
// of its own.
//
// DRIVEN OVER `NODE_KINDS`, NOT OVER THE ONE KIND 58 ADDED — the shape 58/02's
// `acd-arbiter-records-the-tradeoff` parity leg takes, and for the same reason: a gate written
// over `arbiter` alone would be green on the day a seventh kind is silently drawn as a dangling
// reference. And BOTH DIRECTIONS are decided here (58/02 shipped the parity leg one-directional
// and it was raised as a Nit): the sweep below asks that every declared kind has a glyph, and the
// vocabulary-parity leg asks that every glyph belongs to a declared kind, so a shape invented for
// a kind the registry does not admit is as red as a kind with no shape.
//
// The whole gate runs over LITERAL MODELS through the exported pure renderer — no workspace, no
// filesystem, no CLI. That is what the glyph table living inside `renderLoopGraph` buys.
//
// 58/ADR-003 §1, ADR-006 §Codebase health, 52/FF-5208.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { NODE_KINDS } from "../../../src/work/loops.mjs";
import { KIND_SHAPES, renderLoopGraph } from "../../../src/commands/loops-graph.mjs";

const runFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCE = path.join(root, "kind-legible-fixture-not-on-disk", "loops");
const filePath = (id) => path.join(SOURCE, `${id.replace(/[^A-Za-z0-9]+/gu, "-")}.md`);
// NOT `raw.slice(0, raw.indexOf(":"))`: `acd-test-suite-registration`'s positional-slice ledger reads
// a slice whose end is an `indexOf` sentinel as the species it ratchets, and cannot tell a cut over
// an endpoint STRING from a cut over source TEXT. `split` says the same thing and adds no debt.
const endpoint = (raw) => {
  const [scheme, ...rest] = raw.split(":");
  return { raw, scheme, operand: rest.join(":"), resolved: null };
};
const model = (nodes) => ({ source: SOURCE, present: true, findings: [], nodes });

function node(id, kind, { title = "T", edges = {} } = {}) {
  const built = {};
  for (const [key, list] of Object.entries(edges)) built[key] = list.map(endpoint);
  return { id, kind, title, path: filePath(id), fields: {}, edges: built };
}

// THE SHAPE OF A LINE, with the key and the label removed — what is left is the delimiters and
// nothing else, which is precisely the thing two kinds may not share. Deriving it (rather than
// listing six literals) is what lets the sweep run over a vocabulary that grows.
const nodeLines = (text) => text.split("\n").slice(1).filter((line) => !line.includes(" -->|"));
const shapeOf = (line) => line.trim().replace(/^[A-Za-z0-9_]+/u, "").replace(/"[^"]*"/u, String.raw`"…"`);

/** The one node line a single-node model emits. */
function onlyLine(subject) {
  const lines = nodeLines(renderLoopGraph(model([subject])).text);
  assert.equal(lines.length, 1, `${subject.id}: exactly one node line was emitted`);
  return lines[0];
}

// The four endpoint forms 52 froze, each named by the scheme a reader recognises it as.
const UNDECLARED_ENDPOINTS = Object.freeze([
  ["a command endpoint", "command:work:next", '  command_work_next[/"command:work:next"/]'],
  ["a config endpoint", "config:work.loop.reviewRounds", '  config_work_loop_reviewRounds[/"config:work.loop.reviewRounds"/]'],
  ["a module endpoint", "module:src/run-store.mjs#isStale", '  module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]'],
  ["a dangling loop reference", "loop:nowhere", '  loop_nowhere[/"loop:nowhere"/]'],
]);
const FALLBACK_SHAPE = String.raw`[/"…"/]`;

export const archTests = [
  {
    name: "arch/58 FF-5808 (a): renderLoopGraph draws every member of NODE_KINDS, and no two kinds share a shape",
    run: () => {
      assert.ok(NODE_KINDS.size >= 5, `non-vacuous: the vocabulary carries ${NODE_KINDS.size} kinds`);

      const shapes = new Map();
      for (const kind of NODE_KINDS) {
        const subject = node(`${kind}:x`, kind);
        const line = onlyLine(subject);
        // A RENDERING, not merely a line: the declared node carries its own id and title, which is
        // what distinguishes "this kind has a shape" from "this kind fell through to the raw-text
        // fallback and happens to be one line long".
        assert.ok(line.includes(`"${kind}:x · T"`), `${kind}: the line carries the declared label \`<id> · <title>\``);
        shapes.set(kind, shapeOf(line));
      }

      assert.equal(
        new Set(shapes.values()).size, NODE_KINDS.size,
        `the renderer emits ${new Set(shapes.values()).size} distinct shapes for ${NODE_KINDS.size} declared kinds — a kind sharing another kind's glyph says something it is not: ${JSON.stringify([...shapes])}`,
      );

      // NO LITERAL TABLE OF THE SHIPPED ASSIGNMENT HERE, deliberately. This gate's subject is the
      // PROPERTY that outlives the choice; freezing the choice would also freeze `NODE_KINDS`'
      // declaration order, and would red a control on a re-glyph its own header calls permitted.
      // The assignment has two homes that are about the assignment: `GLYPH_ROWS` in
      // `test/loop/loops-supervision-face.test.mjs`, over records on disk through the real CLI, and the
      // five literal node lines in this file's own all-five-kinds determinism case below. Measured:
      // dropping this literal leaves anchor→fallback, loop↔actor swapped, `(("…"))`→`("…")` and
      // `{"…"}`→`[["…"]]` all CAUGHT.
    },
  },
  {
    name: "arch/58 FF-5808 (b): no declared kind borrows the shape an endpoint nobody declares is given",
    run: () => {
      // THE FALLBACK, MEASURED RATHER THAN ASSUMED — from the renderer itself, over all four
      // endpoint forms 52 pinned, so this leg cannot drift away from the shape it is guarding.
      const carrier = node("loop:build", "loop", { edges: { monitoring: UNDECLARED_ENDPOINTS.map(([, raw]) => raw) } });
      const emitted = nodeLines(renderLoopGraph(model([carrier])).text);
      for (const [label, raw, line] of UNDECLARED_ENDPOINTS) {
        assert.ok(emitted.includes(line), `${label}: the frozen line for ${raw} is emitted verbatim — 52/FF-5208's fallback does not move`);
        assert.equal(shapeOf(line), FALLBACK_SHAPE, `${label}: …in the parallelogram, carrying its raw text and no title`);
      }

      for (const kind of NODE_KINDS) {
        assert.notEqual(
          shapeOf(onlyLine(node(`${kind}:x`, kind))), FALLBACK_SHAPE,
          `${kind}: a declared kind may not be drawn as an endpoint no record declares — that is the collision this control repairs`,
        );
      }

      // A KIND THE VOCABULARY DOES NOT ADMIT BORROWS NO KIND'S GLYPH. The loader hands such a
      // record through with `kind: null`; both forms are decided, because the renderer is exported
      // and a caller may pass either.
      for (const unusable of [null, "record-unusable"]) {
        assert.equal(NODE_KINDS.has(unusable), false, `the control kind ${JSON.stringify(unusable)} is outside the vocabulary`);
        assert.equal(
          onlyLine(node("gizmo:odd", unusable)), '  gizmo_odd[/"gizmo:odd"/]',
          `${JSON.stringify(unusable)}: an inadmissible kind renders in the undeclared-endpoint shape, carrying its raw id and no title`,
        );
      }
    },
  },
  {
    name: "arch/58 FF-5808: the glyph table and the kind vocabulary are parity in BOTH directions",
    run: () => {
      // DIRECTION ONE is leg (a)'s sweep — every declared kind is drawn. DIRECTION TWO is here: a
      // glyph invented for a kind the registry does not admit is a shape a reader would learn to
      // read and nothing could ever emit. One-directional parity would let it ship.
      assert.deepEqual(
        [...KIND_SHAPES.keys()].sort(), [...NODE_KINDS].sort(),
        "the renderer's glyph table and the loader's kind vocabulary name exactly the same kinds",
      );
      for (const [kind, shape] of KIND_SHAPES) {
        assert.equal(Array.isArray(shape) && shape.length === 2, true, `${kind}: the table entry is an opener/closer pair`);
        assert.equal(shape.join("…"), shapeOf(onlyLine(node(`${kind}:x`, kind))), `${kind}: the table entry is the shape actually emitted`);
      }
      // THE TABLE IS NOT AN OBJECT LITERAL — and the guard that matters is on the LOOKUP, not on
      // the table. `KIND_SHAPES` being a Map buys nothing if the renderer reads it through a
      // derived object literal: `Object.fromEntries(KIND_SHAPES)[node.kind]` answers
      // `constructor` / `toString` / `__proto__` with an INHERITED value, and the emitted line
      // then splices `undefined` around the label — measured under exactly that mutation:
      //   '  gizmo_constructorundefinedgizmo:constructor · Tundefined'
      // So the claim is decided by RENDERING a node of each prototype-member kind rather than by
      // reading the table. That is a real caller surface: `renderLoopGraph` is exported, and this
      // very leg already hands it a kind the vocabulary does not admit.
      assert.equal(KIND_SHAPES instanceof Map, true, "the glyph table is a Map, so the lookup below has no prototype chain to fall through to");
      for (const inherited of ["constructor", "toString", "__proto__"]) {
        assert.equal(NODE_KINDS.has(inherited), false, `${inherited}: the control kind is outside the vocabulary`);
        assert.equal(
          onlyLine(node(`gizmo:${inherited}`, inherited)),
          `  gizmo_${inherited.replace(/[^A-Za-z0-9_]/gu, "_")}[/"gizmo:${inherited}"/]`,
          `${inherited}: a kind named after an Object.prototype member renders in the fallback shape, with its label intact and no undefined spliced into the line`,
        );
      }
    },
  },
  {
    name: "arch/58 FF-5808: a registry of all five kinds renders byte-identically twice over, in a second process, and whatever order it was authored in",
    run: async () => {
      const nodes = [
        node("actor:operator", "actor", { title: "Operator", edges: { "target-setting": ["arbiter:trade-off"] } }),
        node("anchor:policy", "anchor", { title: "Policy", edges: { "data-feed": ["loop:build"] } }),
        node("arbiter:trade-off", "arbiter", { title: "Trade-off", edges: { veto: ["loop:build"], "parameter-tuning": ["config:work.loop.reviewRounds"] } }),
        node("loop:build", "loop", { title: "Build" }),
        node("watcher:eye", "watcher", { title: "Eye", edges: { monitoring: ["loop:build"] } }),
      ];
      const subject = model(nodes);
      const first = renderLoopGraph(subject);
      assert.deepEqual(renderLoopGraph(subject), first, "twice in one process");
      assert.deepEqual(
        renderLoopGraph(model([...nodes].reverse())), first,
        "…and the picture does not depend on the order the records were discovered",
      );

      // The five shapes, the config endpoint's fallback, and the node lines in LEXICOGRAPHIC id
      // order — the shapes do not group the picture by kind.
      assert.deepEqual(nodeLines(first.text), [
        '  actor_operator(["actor:operator · Operator"])',
        '  anchor_policy(("anchor:policy · Policy"))',
        '  arbiter_trade_off{"arbiter:trade-off · Trade-off"}',
        '  config_work_loop_reviewRounds[/"config:work.loop.reviewRounds"/]',
        '  loop_build["loop:build · Build"]',
        '  watcher_eye{{"watcher:eye · Eye"}}',
      ], "five declared kinds, five shapes, the fallback untouched, lexicographic by id");
      assert.equal(first.edgeCount, 5);

      const url = pathToFileURL(path.join(root, "src/commands/loops-graph.mjs")).href;
      const script = `import {renderLoopGraph} from ${JSON.stringify(url)}; console.log(JSON.stringify(renderLoopGraph(${JSON.stringify(model([...nodes].reverse()))})));`;
      const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
      assert.equal(stdout.trim(), JSON.stringify(first), "…and a SEPARATE process renders the same bytes");
    },
  },
];
