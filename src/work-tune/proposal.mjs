// Transitional core composition for work-owned tuning services.
import { createTuneProposals } from "@aof/work/tune/proposal";
import { AGENT_MODEL_MAP_PATH, agentModelMap } from "../work/bundle.mjs";

export const {
  ABSENT,
  ABSENT_READING,
  PROPOSAL_CLASSES,
  PROPOSAL_LANES,
  PROPOSAL_REASONS,
  computeProposalLane,
  emitProposal,
  emitProposals,
  laneProposals,
  proposalClassForTarget,
  proposalLane,
} = createTuneProposals({ AGENT_MODEL_MAP_PATH, agentModelMap });
