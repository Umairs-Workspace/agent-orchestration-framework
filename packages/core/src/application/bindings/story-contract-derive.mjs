// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createStoryContractDeriver } from "@aof/work/story-contract-derive";

export function assembleStoryContractDerive({ codeRelationsServices }) {
  // Core constructs this application service from its owning package. The graph is the code
  // corpus's `relations`, asked through the port over the graphify code backend's read half
  // (179/ADR-004), which reaches no graphify process.

  const { relations } = codeRelationsServices;

  const { PROPOSAL_REASONS, GRAPH_UNAVAILABLE, deriveStoryContract } = createStoryContractDeriver({ relations });

  return { PROPOSAL_REASONS, GRAPH_UNAVAILABLE, deriveStoryContract };
}
