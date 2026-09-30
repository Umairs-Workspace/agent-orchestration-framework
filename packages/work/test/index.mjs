import { diagramLayoutTests } from "./diagram-layout.suite.mjs";
import { gradeRecordVocabulariesTests } from "./grade-record-vocabularies.suite.mjs";
import { loopReadyScoreTests } from "./loop-ready-score.suite.mjs";
import { l3AnchorCheckScoreTests } from "./l3-anchor-check-score.suite.mjs";
import { tuneProvenanceTests } from "./tune-provenance.suite.mjs";
import { tuneDistanceTests } from "./tune-distance.suite.mjs";
import { hookWiringTests } from "./work-audit-hook-wiring.suite.mjs";
import { workDebtTests } from "./work-debt.suite.mjs";

export const tests = [
  ...diagramLayoutTests,
  ...gradeRecordVocabulariesTests,
  ...loopReadyScoreTests,
  ...l3AnchorCheckScoreTests,
  ...tuneProvenanceTests,
  ...tuneDistanceTests,
  ...hookWiringTests,
  ...workDebtTests,
];
