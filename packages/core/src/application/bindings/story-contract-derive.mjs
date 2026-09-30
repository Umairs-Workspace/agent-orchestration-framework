// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createStoryContractDeriver } from "@aof/work/story-contract-derive";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "@aof/knowledge/graph-normalize";
import { computeImpact } from "@aof/knowledge/graph-impact";

export function assembleStoryContractDerive({  } = {}) {
  // Core constructs this application service from its owning package.

  const { PROPOSAL_REASONS, GRAPH_UNAVAILABLE, deriveStoryContract } = createStoryContractDeriver({ graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, computeImpact });

  return { PROPOSAL_REASONS, GRAPH_UNAVAILABLE, deriveStoryContract };
}
