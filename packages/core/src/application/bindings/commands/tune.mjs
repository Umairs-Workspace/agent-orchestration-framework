// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTuneCommand } from "@aof/work/commands/tune";

export function assembleCommandsTune({ workTuneCorpusServices, workTuneProposalServices, workLoopsServices, commandsDoctorServices, provideCommandCore }) {
  // Core composition for work-owned tuning services.

  const { assembleCorpus } = workTuneCorpusServices;
  const { PROPOSAL_LANES } = workTuneProposalServices;
  const { computeProposalLane } = workTuneProposalServices;
  const { emitProposal } = workTuneProposalServices;
  const { proposalClassForTarget } = workTuneProposalServices;
  const { loadLoops } = workLoopsServices;
  const { readRenameMap } = commandsDoctorServices;
  // Deferred operation: core supplies the completed registry after construction.
  // The callback refuses use before readiness and after application shutdown.
  const getRegistry = () => provideCommandCore();

  const {
    buildTuneReport,
    tuneCommand,
  } = createTuneCommand({ assembleCorpus, PROPOSAL_LANES, computeProposalLane, emitProposal, proposalClassForTarget, loadLoops, getRegistry, readRenameMap });

  return { buildTuneReport, tuneCommand };
}
