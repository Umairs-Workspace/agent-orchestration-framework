// Compatibility entry; construction belongs to core application assembly.
import { storyContractDerive } from "./application/default.mjs";
export const {
  PROPOSAL_REASONS,
  GRAPH_UNAVAILABLE,
  deriveStoryContract,
} = storyContractDerive;
