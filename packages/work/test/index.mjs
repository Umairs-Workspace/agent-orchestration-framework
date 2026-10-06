import { diagramLayoutTests } from "./diagram-layout.suite.mjs";
import { gradeRecordVocabulariesTests } from "./grade-record-vocabularies.suite.mjs";
import { loopReadyScoreTests } from "./loop-ready-score.suite.mjs";
import { l3AnchorCheckScoreTests } from "./l3-anchor-check-score.suite.mjs";
import { tuneProvenanceTests } from "./tune-provenance.suite.mjs";
import { tuneDistanceTests } from "./tune-distance.suite.mjs";
import { hookWiringTests } from "./work-audit-hook-wiring.suite.mjs";
import { workDebtTests } from "./work-debt.suite.mjs";
import { rubricJoinIsDeclaredTests } from "./rubric-join-is-declared.suite.mjs";
import { tuneFormationTests } from "./tune-formation.suite.mjs";
import { featureParseExamplesTests } from "./feature-parse-examples.suite.mjs";
import { acceptorLedgerTests } from "./acceptor-ledger.suite.mjs";
import { acceptorRuleTests } from "./acceptor-rule.suite.mjs";
import { meshCandidacyEveryReturnTests } from "./mesh-candidacy-every-return.suite.mjs";
import { deliveredStoryRecordsTests } from "./delivered-story-records-reported.suite.mjs";
import { orderWorkTests } from "./work-next.suite.mjs";
import { workObserveAttributionTests } from "./work-observe-attribution.suite.mjs";
import { workObserveSnapshotsTests } from "./work-observe-snapshots.suite.mjs";
import { resolveItemsTests, resolvePathTests } from "./work-resolve.suite.mjs";
import { workDoctorTests } from "./work-doctor.suite.mjs";
import { verifyAuthorsOutcomeTests } from "./verify-authors-outcome.suite.mjs";
import { workTests } from "./work.suite.mjs";
// milestone 148 / story 02 — the memory vocabulary's enums, readers and normalisers.
import { memoryVocabularyTests } from "./memory-vocabulary.suite.mjs";
// milestone 148 / story 04 — a live lesson's meta line is held by validate; an archived one is
// flagged by doctor's lesson-meta lane and never failed.
import { lessonMetaHoldTests } from "./lesson-meta-hold.suite.mjs";

export const tests = [
  ...diagramLayoutTests,
  ...gradeRecordVocabulariesTests,
  ...loopReadyScoreTests,
  ...l3AnchorCheckScoreTests,
  ...tuneProvenanceTests,
  ...tuneDistanceTests,
  ...hookWiringTests,
  ...workDebtTests,
  ...rubricJoinIsDeclaredTests,
  ...tuneFormationTests,
  ...featureParseExamplesTests,
  ...acceptorLedgerTests,
  ...acceptorRuleTests,
  ...meshCandidacyEveryReturnTests,
  ...deliveredStoryRecordsTests,
  ...orderWorkTests,
  ...workObserveAttributionTests,
  ...workObserveSnapshotsTests,
  ...resolveItemsTests,
  ...resolvePathTests,
  ...workDoctorTests,
  ...verifyAuthorsOutcomeTests,
  ...workTests,
  ...memoryVocabularyTests,
  ...lessonMetaHoldTests,
];
