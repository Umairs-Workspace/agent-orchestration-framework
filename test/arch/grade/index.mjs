// THE ARCH/GRADE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdEvidenceOracleIsAMessageTests } from "./acd-evidence-oracle-is-a-message.test.mjs";
import { archTests as acdSeamLivenessUnknownIsALimitTests } from "./acd-seam-liveness-unknown-is-a-limit.test.mjs";
import { archTests as acdReferenceCorpusOfflineAndSourcedTests } from "./acd-reference-corpus-offline-and-sourced.test.mjs";
import { archTests as acdCriterionFrozenInEpochTests } from "./acd-criterion-frozen-in-epoch.test.mjs";
import { archTests as acdAcceptorRuleIsOneObjectTests } from "./acd-acceptor-rule-is-one-object.test.mjs";
import { archTests as acdTrialMetricDeclaredTests } from "./acd-trial-metric-declared.test.mjs";
import { archTests as acdAcceptorLedgerAccruesAcrossEpochsTests } from "./acd-acceptor-ledger-accrues-across-epochs.test.mjs";
import { archTests as acdHarnessRulingLedgeredTests } from "./acd-harness-ruling-ledgered.test.mjs";
import { archTests as acdNoPatchNoApplierTests } from "./acd-no-patch-no-applier.test.mjs";
// ADR-008 — the gate-time branch advance can never discard a worker commit: no rebase,
// no force, no reset on the branch path; a conflicting merge aborts and refuses.
import { archTests as acdGatePropagationNeverDiscardsTests } from "./acd-gate-propagation-never-discards.test.mjs";
import { archTests as acdAcceptanceHorizonSinglePredicateTests } from "./acd-acceptance-horizon-single-predicate.test.mjs";
import { archTests as acdRatchetPureAndDischargeScopedTests } from "./acd-ratchet-pure-and-discharge-scoped.test.mjs";
// milestone 57 / MILESTONE GATE — FF-5706 (ADR-006): the oracle is a message, not a count.
// Registered in its own block rather than a story's: §1 spans 57/03's AND 57/04's new modules
// and §2 is over 57/05's `src/bundle/loops/`, so no single story could carry it (`F-57-03-4`).
import { archTests as acdOracleIsAMessageNotACountTests } from "./acd-oracle-is-a-message-not-a-count.test.mjs";
import { archTests as acdRegisterDeclarationFormTests } from "./acd-register-declaration-form.test.mjs";
import { archTests as acdGradeNeverImportsTheSuiteTests } from "./acd-grade-never-imports-the-suite.test.mjs";
import { archTests as acdGradeUnconfiguredIsAdditiveTests } from "./acd-grade-unconfigured-is-additive.test.mjs";
import { archTests as acdGradeReadFaceNeverExecutesTests } from "./acd-grade-read-face-never-executes.test.mjs";
import { archTests as acdGradeBoundedSingleSpawnTests } from "./acd-grade-bounded-single-spawn.test.mjs";
import { archTests as acdGradeSubjectIsEmittedTests } from "./acd-grade-subject-is-emitted.test.mjs";
import { archTests as acdGateDoorLivesInTheCommandLayerTests } from "./acd-gate-door-lives-in-the-command-layer.test.mjs";
import { archTests as acdGateResultIsEvidenceTests } from "./acd-gate-result-is-evidence.test.mjs";
import { archTests as acdGradeGreenNeedsEvidenceTests } from "./acd-grade-green-needs-evidence.test.mjs";
import { archTests as acdGradeRecordEnvelopeTests } from "./acd-grade-record-envelope.test.mjs";

export const tests = [
  ...acdEvidenceOracleIsAMessageTests,
  ...acdSeamLivenessUnknownIsALimitTests,
  ...acdReferenceCorpusOfflineAndSourcedTests,
  ...acdCriterionFrozenInEpochTests,
  ...acdAcceptorRuleIsOneObjectTests,
  ...acdTrialMetricDeclaredTests,
  ...acdAcceptorLedgerAccruesAcrossEpochsTests,
  ...acdHarnessRulingLedgeredTests,
  ...acdNoPatchNoApplierTests,
  ...acdGatePropagationNeverDiscardsTests,
  ...acdAcceptanceHorizonSinglePredicateTests,
  ...acdRatchetPureAndDischargeScopedTests,
  // milestone 57 / milestone gate — FF-5706 (ADR-006), the milestone-level control
  ...acdOracleIsAMessageNotACountTests,
  ...acdRegisterDeclarationFormTests,
  ...acdGradeNeverImportsTheSuiteTests,
  ...acdGradeUnconfiguredIsAdditiveTests,
  ...acdGradeReadFaceNeverExecutesTests,
  ...acdGradeBoundedSingleSpawnTests,
  ...acdGradeSubjectIsEmittedTests,
  ...acdGateDoorLivesInTheCommandLayerTests,
  ...acdGateResultIsEvidenceTests,
  ...acdGradeGreenNeedsEvidenceTests,
  ...acdGradeRecordEnvelopeTests,
];
