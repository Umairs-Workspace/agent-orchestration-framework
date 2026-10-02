import { diagramLayoutTests } from "./diagram-layout.suite.mjs";
import { gradeRecordVocabulariesTests } from "./grade-record-vocabularies.suite.mjs";
import { loopReadyScoreTests } from "./loop-ready-score.suite.mjs";
import { l3AnchorCheckScoreTests } from "./l3-anchor-check-score.suite.mjs";
import { tuneProvenanceTests } from "./tune-provenance.suite.mjs";
import { tuneDistanceTests } from "./tune-distance.suite.mjs";
import { hookWiringTests } from "./work-audit-hook-wiring.suite.mjs";
import { workDebtTests } from "./work-debt.suite.mjs";
import { exampleMapParseTests } from "./example-map-parse.suite.mjs";
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
import { resolveItemsTests } from "./work-resolve.suite.mjs";
import { workDoctorTests } from "./work-doctor.suite.mjs";
import { workSpikeChoreEnumerateTests } from "./work-spike-chore-enumerate.suite.mjs";
import { workSpikeChoreNextTests } from "./work-spike-chore-next.suite.mjs";
import { workSpikeChoreValidateTests } from "./work-spike-chore-validate.suite.mjs";
import { verifyAuthorsOutcomeTests } from "./verify-authors-outcome.suite.mjs";
import { workTests } from "./work.suite.mjs";

export const tests = [
  ...diagramLayoutTests,
  ...gradeRecordVocabulariesTests,
  ...loopReadyScoreTests,
  ...l3AnchorCheckScoreTests,
  ...tuneProvenanceTests,
  ...tuneDistanceTests,
  ...hookWiringTests,
  ...workDebtTests,
  ...exampleMapParseTests,
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
  ...workDoctorTests,
  ...workSpikeChoreEnumerateTests,
  ...workSpikeChoreNextTests,
  ...workSpikeChoreValidateTests,
  ...verifyAuthorsOutcomeTests,
  ...workTests,
];
