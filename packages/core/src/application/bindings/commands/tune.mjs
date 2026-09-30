// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTuneCommand } from "@aof/work/commands/tune";

export function assembleCommandsTune({ workTuneCorpusServices, workTuneProposalServices, workLoopsServices, provideCommandCore }) {
  // Core composition for work-owned tuning services.

  const { assembleCorpus } = workTuneCorpusServices;
  const { PROPOSAL_LANES } = workTuneProposalServices;
  const { computeProposalLane } = workTuneProposalServices;
  const { emitProposal } = workTuneProposalServices;
  const { proposalClassForTarget } = workTuneProposalServices;
  const { loadLoops } = workLoopsServices;
  // Deferred operation: core supplies the completed registry after construction.
  // The callback refuses use before readiness and after application shutdown.
  const getRegistry = () => provideCommandCore();

  const {
    buildTuneReport,
    tuneCommand,
  } = createTuneCommand({ assembleCorpus, PROPOSAL_LANES, computeProposalLane, emitProposal, proposalClassForTarget, loadLoops, getRegistry });

  return { buildTuneReport, tuneCommand };
}
