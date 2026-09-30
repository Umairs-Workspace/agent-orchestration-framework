// Compatibility entry; construction belongs to core application assembly.
import { workTuneCorpus } from "../application/default.mjs";
export const {
  CORPUS_FINDING_CODES,
  CORPUS_LANES,
  assembleCorpus,
  assertCorpusLanesDeclared,
  corpusFinding,
  renderCorpusReport,
} = workTuneCorpus;
