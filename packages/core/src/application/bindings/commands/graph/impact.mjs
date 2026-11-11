// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphImpactCommand } from "@aof/knowledge/commands/graph-impact";

export function assembleCommandsGraphImpact({ knowledgeEngineServices }) {
  // Core composition for knowledge-owned services: graph:impact asks `relations` of the code corpus
  // through the port composed over the graphify code backend (179/ADR-002), and reads no artifact.

  const { codeEngine } = knowledgeEngineServices;

  const { graphImpactCommand } = createGraphImpactCommand({ relations: codeEngine.relations });

  return { graphImpactCommand };
}
