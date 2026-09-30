// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTuneProposals } from "@aof/work/tune/proposal";
import { AGENT_MODEL_MAP_PATH, agentModelMap } from "../../../work/bundle.mjs";

export function assembleWorkTuneProposal({  } = {}) {
  // Core composition for work-owned tuning services.

  const {
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

  return { ABSENT, ABSENT_READING, PROPOSAL_CLASSES, PROPOSAL_LANES, PROPOSAL_REASONS, computeProposalLane, emitProposal, emitProposals, laneProposals, proposalClassForTarget, proposalLane };
}
