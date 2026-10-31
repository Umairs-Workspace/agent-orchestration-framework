import { existsSync } from "node:fs";
import { computeImpact } from "./graph-impact.mjs";
import { graphArtifactBuiltAt as artifactBuiltAt, graphJsonPath as artifactPath, normalizeGraph as normalizeArtifact, readGraph as readArtifact } from "./graph-normalize.mjs";
import { createKnowledgeEngine } from "./engine.mjs";

// The graphify code backend's READ HALF (179/ADR-004), in a module of its own so that a reader of
// the code graph imports no part of the build. `graphify-code-backend.mjs` composes this reader
// for its own `relations` and `status`; the code readers' port (`createCodeRelations`) is built
// over it alone. Kept apart from the ingest half because that half writes the build's stamp and
// tree hashes (`graph-bundle.mjs`), and the read-only audit family reaches this port: a module the
// family imports is one it can write through (77/FF-7703, found at PR #22).

// THE READ HALF — availability and `relations` — needs the normalizer and the edge walk, and no
// driver: reading the code graph never resolves, starts or spawns graphify.
export function createCodeGraphReader({ readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt }) {
  // The one availability check `relations` and `status` share. The artifact is read on every
  // call; `cause` is the read error's code, else its message.
  function availability(projectRoot) {
    const artifact = graphJsonPath(projectRoot);
    if (!existsSync(artifact)) return { available: false, unavailable: "no-graph", cause: "ENOENT", artifact, builtAt: null, graph: null };
    try {
      const graph = normalizeGraph(readGraph(artifact));
      return { available: true, unavailable: null, artifact, builtAt: graphArtifactBuiltAt(artifact), graph };
    } catch (error) {
      return { available: false, unavailable: "graph-unreadable", cause: error?.code ?? error?.message ?? "unreadable", artifact, builtAt: null, graph: null };
    }
  }

  //   result { served: true, available, unavailable, artifact, builtAt, files[, cause] }
  //   files[i] { file, present, dependencies, dependents }
  async function relations(paths, ctx) {
    const { graph, cause, ...answer } = availability(ctx.projectRoot);
    if (!answer.available) return { served: true, ...answer, cause, files: [] };
    return { served: true, ...answer, files: computeImpact(graph, paths) };
  }

  return { availability, relations };
}

// The code readers' port (179/ADR-004): test selection, contract derivation and seam liveness ask
// `relations` and nothing else, so they are handed a port over the read half alone — composed
// here from the normalizer's own functions, with no driver behind it. A process the audit family
// reaches is one it can start (59/FF-5904); this port reaches none.
export function createCodeRelations() {
  const { relations } = createCodeGraphReader({ readGraph: readArtifact, normalizeGraph: normalizeArtifact, graphJsonPath: artifactPath, graphArtifactBuiltAt: artifactBuiltAt });
  const reader = Object.freeze({ name: "graphify", corpora: Object.freeze({ code: Object.freeze(["relations"]) }), relations });
  return createKnowledgeEngine({ backends: [reader] }).relations;
}
