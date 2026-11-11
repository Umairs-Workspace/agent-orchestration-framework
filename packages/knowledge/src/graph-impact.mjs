
// src/graph-impact.mjs — the PURE coupling core of `graph:impact`, moved DOWN out of the command
// layer (milestone 72 / story 01, ADR-002 §1).
//
// WHY IT MOVED, and it is the remedy the layer gate's own failure message prescribes
// (`test/arch/command/acd-command-layer-imports-downward.test.mjs:78-80` — *"Move the shared thing below
// commands/ — the command keeps its verb, the core moves down"*). Test selection needs this
// computation, and a `src/*.mjs` selector importing `./commands/graph-impact.mjs` is exactly the
// edge that gate forbids (`:63-80`, exempt set `cli.mjs` + `command-core.mjs` only). The gate's
// sanctioned escape — a dynamic `await import()` — is shut here too: FF-7204 forbids one anywhere
// in this milestone's families, because a dynamic import of a project module is how the aof
// process ends up executing project code.
//
// So the core sits at `src/`, a sibling of its own face — the tree's existing convention
// (`src/mesh/session.mjs` ↔ `src/commands/mesh-session.mjs`, and three more pairs) — and
// `src/commands/graph-impact.mjs` RE-EXPORTS it, so every existing consumer is byte-unchanged.
// Measured blast radius at the move: two importers, the command and `packages/knowledge/test/graph-impact.suite.mjs`.
//
// WHAT DID NOT COME WITH IT: `matchFile`, which was declared in the command and never used. A dead
// helper carried through a move is a dead helper with a new address.
//
// This module needs NEITHER graph allowlist: it takes an ALREADY-NORMALIZED graph and names no
// reader symbol. The module that reads the artifact is `src/work/test-select.mjs`, and that is the
// one the allowlists gained.

// Compute, for the given target file set, the cross-file dependencies (edges OUT of a target node)
// and dependents (edges INTO a target node) — deduped, self-file dropped. Pure over the normalized
// graph; the whole testable core (no fs, no spawn).
//
// ONE PASS OVER THE EDGES PER CALL, however many paths are asked (179/ADR-002). Each requested path
// is resolved to its node ids first; the edges are then walked once, and every edge adds to each
// requested file whose id set holds its source or target. The matching rule and the output are
// unchanged — `graph-impact.suite.mjs` holds the cases — so a caller can ask about every file at
// once rather than pay one walk of all ~46,000 edges per path, the O(paths × edges) cost this
// comment used to price. Nothing is cached across calls: a cached graph is how two calls in one
// process stop being two answers (72/ADR-002).
export function computeImpact(graph, paths) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const fileOf = (node) => node.sourceFile?.replace(/\\/g, "/");
  // Normalize requested paths to the graph's separator convention (graphify writes POSIX-style
  // source_file). Match on suffix so an agent may pass an absolute or a repo-relative path; the
  // graph stores repo-relative POSIX paths.
  const wanted = paths.map((p) => p.replace(/\\/g, "/"));

  const answers = wanted.map((requested) => {
    // The node ids whose source_file resolves to this requested path.
    const fileNodes = graph.nodes.filter((n) => {
      if (!n.sourceFile) return false;
      const sf = fileOf(n);
      return sf === requested || sf.endsWith(`/${requested}`) || requested.endsWith(`/${sf}`);
    });
    return {
      ids: new Set(fileNodes.map((n) => n.id)),
      file: fileNodes[0]?.sourceFile ?? requested,
      present: fileNodes.length > 0,
      dependencies: new Set(),
      dependents: new Set(),
    };
  });

  // Every requested answer a node id belongs to, so one edge reaches all of them.
  const answersById = new Map();
  for (const answer of answers) {
    for (const id of answer.ids) {
      if (!answersById.has(id)) answersById.set(id, []);
      answersById.get(id).push(answer);
    }
  }

  for (const edge of graph.edges) {
    const src = byId.get(edge.source);
    const tgt = byId.get(edge.target);
    if (!src || !tgt) continue;
    const srcFile = fileOf(src);
    const tgtFile = fileOf(tgt);
    // OUT edge: a node in this file points at another file → a dependency.
    for (const answer of answersById.get(edge.source) ?? []) if (tgtFile && tgtFile !== answer.file) answer.dependencies.add(tgtFile);
    // IN edge: another file points at a node in this file → a dependent.
    for (const answer of answersById.get(edge.target) ?? []) if (srcFile && srcFile !== answer.file) answer.dependents.add(srcFile);
  }

  return answers.map((answer) => ({
    file: answer.file,
    present: answer.present,
    dependencies: [...answer.dependencies].sort(),
    dependents: [...answer.dependents].sort(),
  }));
}
