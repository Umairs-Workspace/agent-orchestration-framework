// Transitional core composition for work-owned tuning services.
import { createTuneCommand } from "@aof/work/commands/tune";
import { assembleCorpus } from "../work-tune/corpus.mjs";
import {
  PROPOSAL_LANES,
  computeProposalLane,
  emitProposal,
  proposalClassForTarget,
} from "../work-tune/proposal.mjs";
import { loadLoops } from "../work/loops.mjs";
const getRegistry = () => import("../command-core.mjs");

export const {
  buildTuneReport,
  tuneCommand,
} = createTuneCommand({ assembleCorpus, PROPOSAL_LANES, computeProposalLane, emitProposal, proposalClassForTarget, loadLoops, getRegistry });
