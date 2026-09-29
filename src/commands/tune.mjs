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
// Deferred because command-core registers this command; a static import closes
// the registry ring before its bindings have initialized.
const getRegistry = () => import("../command-core.mjs");

export const {
  buildTuneReport,
  tuneCommand,
} = createTuneCommand({ assembleCorpus, PROPOSAL_LANES, computeProposalLane, emitProposal, proposalClassForTarget, loadLoops, getRegistry });
