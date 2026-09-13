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
// Measured blast radius at the move: two importers, the command and `test/graph/graph-impact.test.mjs`.
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
// COMPLEXITY IS O(paths × (nodes + edges)) AND THAT IS PRICED, NOT MISSED (ADR-002's consequences):
// it re-walks all 35,577 edges once per changed path — ~80 ms for one changed file and ~400 ms for
// fifty, measured on the live 17 MB artifact. The obvious optimisation, hoisting the walk and
// caching the normalised graph across calls, is precisely what the selector's purity clause
// forbids, because a cached graph is how two calls in one process stop being two answers.
export function computeImpact(graph, paths) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  // Normalize requested paths to the graph's separator convention (graphify writes POSIX-style
  // source_file). Match on suffix so an agent may pass an absolute or a repo-relative path; the
  // graph stores repo-relative POSIX paths.
  const wanted = paths.map((p) => p.replace(/\\/g, "/"));

  return wanted.map((requested) => {
    // The node ids whose source_file resolves to this requested path.
    const fileNodes = graph.nodes.filter((n) => {
      if (!n.sourceFile) return false;
      const sf = n.sourceFile.replace(/\\/g, "/");
      return sf === requested || sf.endsWith(`/${requested}`) || requested.endsWith(`/${sf}`);
    });
    const ids = new Set(fileNodes.map((n) => n.id));
    const resolvedFile = fileNodes[0]?.sourceFile ?? requested;

    const dependencies = new Set();
    const dependents = new Set();
    for (const edge of graph.edges) {
      const src = byId.get(edge.source);
      const tgt = byId.get(edge.target);
      if (!src || !tgt) continue;
      const srcFile = src.sourceFile?.replace(/\\/g, "/");
      const tgtFile = tgt.sourceFile?.replace(/\\/g, "/");
      // OUT edge: a node in this file points at another file → a dependency.
      if (ids.has(edge.source) && tgtFile && tgtFile !== resolvedFile) dependencies.add(tgtFile);
      // IN edge: another file points at a node in this file → a dependent.
      if (ids.has(edge.target) && srcFile && srcFile !== resolvedFile) dependents.add(srcFile);
    }
    return {
      file: resolvedFile,
      present: fileNodes.length > 0,
      dependencies: [...dependencies].sort(),
      dependents: [...dependents].sort(),
    };
  });
}
