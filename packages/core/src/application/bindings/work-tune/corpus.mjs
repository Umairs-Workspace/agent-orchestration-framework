// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTuneCorpus } from "@aof/work/tune/corpus";

export function assembleWorkTuneCorpus({ memoryLocalIndexingServices, runStoreServices, workObserveServices, workLoopsServices }) {
  // Core composition for work-owned tuning services.

  const { parseRetrospective } = memoryLocalIndexingServices;
  const { readRuns } = runStoreServices;
  const { runNodeRecordPath } = runStoreServices;
  const { runRecordPath } = runStoreServices;
  const { readLatestSnapshot } = workObserveServices;
  const { loopPointersIn } = workLoopsServices;

  const {
    CORPUS_FINDING_CODES,
    CORPUS_LANES,
    assembleCorpus,
    assertCorpusLanesDeclared,
    corpusFinding,
    renderCorpusReport,
  } = createTuneCorpus({ parseRetrospective, readRuns, runNodeRecordPath, runRecordPath, readLatestSnapshot, loopPointersIn });

  return { CORPUS_FINDING_CODES, CORPUS_LANES, assembleCorpus, assertCorpusLanesDeclared, corpusFinding, renderCorpusReport };
}
