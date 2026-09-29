// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createStoryContractDeriver } from "@aof/work/story-contract-derive";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "@aof/knowledge/graph-normalize";
import { computeImpact } from "@aof/knowledge/graph-impact";
export const { PROPOSAL_REASONS, GRAPH_UNAVAILABLE, deriveStoryContract } = createStoryContractDeriver({ graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, computeImpact });
