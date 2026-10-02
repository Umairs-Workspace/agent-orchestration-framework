// KIND_SHAPES — the ONE glyph table, and it lives BELOW commands/ (chore 116).
//
// IT USED TO LIVE IN `src/commands/loops-graph.mjs`, and two shipped controls disagreed about that
// for as long as it did. 78/FF-7802 requires `src/loop-record-render.mjs` to IMPORT the table rather
// than restate it — a second hand-copied table drifts the first time a seventh kind lands, and 58
// and 59 each landed one. m42 wave (d)'s `acd-command-layer-imports-downward` forbids any src-root
// module importing `src/commands/*`, because that makes the command layer a dependency of the cores
// and, here, closed a `commands/loop-record.mjs → loop-record-render.mjs → commands/loops-graph.mjs`
// cycle. Both rules are right, and neither could be honoured while the table sat inside the command.
//
// So the table moves DOWN, which is m42 wave (d)'s own cure (command-error.mjs, mesh-repo-marker.mjs,
// mesh-assignment.mjs): the command keeps its verb, the shared thing moves below it. Both faces now
// import from here — `loops-graph.mjs` re-exports it so no existing importer of the command module
// breaks — and 52/FF-5208's freeze is untouched, because that gate pins the RENDERED Mermaid bytes
// and not this module's source.

// 58/ADR-006 §Codebase health — ONE SHAPE PER DECLARED KIND, and the table lives HERE, inside the
// exported pure renderer, which is what lets FF-5808 assert the glyph set without standing up a
// workspace. Before this milestone `loop` and `actor` were drawn distinctly and every other kind
// fell through to the parallelogram an UNDECLARED endpoint is given, so an anchor, a watcher and
// (from 58) an arbiter were the same picture as each other and the same picture as a dangling
// `loop:` reference. Each glyph is chosen to read as what the kind IS: a rectangle for a cycle, a
// stadium for somebody, a circle for a fixed point, a hexagon for an instrument, a rhombus for a
// decision.
//
// A Map, not an object literal: `renderLoopGraph` is exported and is handed models whose `kind` is
// arbitrary text — a record whose `kind:` the vocabulary does not admit arrives with `kind: null`,
// and a plain object would answer `constructor` with a function.
export const KIND_SHAPES = new Map([
  ["loop", ['["', '"]']],
  ["actor", ['(["', '"])']],
  ["anchor", ['(("', '"))']],
  ["watcher", ['{{"', '"}}']],
  ["arbiter", ['{"', '"}']],
  // 59/ADR-001 §1 — the sixth kind. FF-5808 is a PARITY gate in both directions: a kind the loader
  // admits and this table does not would be drawn as the parallelogram an undeclared endpoint gets,
  // so the auditor's glyph lands with the auditor's grammar rather than with the face that reads it
  // (59/04). The flag reads as what the kind IS: a node that raises what it found and does nothing
  // else — it has no vocabulary for acting, so it is not drawn as a box that acts.
  ["auditor", ['>"', '"]']],
]);
