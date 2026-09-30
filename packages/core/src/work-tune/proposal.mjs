// Compatibility entry; construction belongs to core application assembly.
import { workTuneProposal } from "../application/default.mjs";
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
} = workTuneProposal;
