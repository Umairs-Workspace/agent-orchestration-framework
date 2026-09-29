// Transitional core composition for work-owned tuning services.
import { createTuneCorpus } from "@aof/work/tune/corpus";
import { parseRetrospective } from "../memory/local-indexing.mjs";
import { readRuns, runNodeRecordPath, runRecordPath } from "../run-store.mjs";
import { readLatestSnapshot } from "../work/observe.mjs";
import { loopPointersIn } from "../work/loops.mjs";

export const {
  CORPUS_FINDING_CODES,
  CORPUS_LANES,
  assembleCorpus,
  assertCorpusLanesDeclared,
  corpusFinding,
  renderCorpusReport,
} = createTuneCorpus({ parseRetrospective, readRuns, runNodeRecordPath, runRecordPath, readLatestSnapshot, loopPointersIn });
