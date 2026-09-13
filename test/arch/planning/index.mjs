// THE ARCH/PLANNING SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdProvenanceStampedAtWriteTests } from "./acd-provenance-stamped-at-write.test.mjs";
import { archTests as acdTuneCorpusDeclaresItsReadsTests } from "./acd-tune-corpus-declares-its-reads.test.mjs";
import { archTests as acdProposalProvenanceResolvesTests } from "./acd-proposal-provenance-resolves.test.mjs";
import { archTests as acdDistanceToLiveIsComputedTests } from "./acd-distance-to-live-is-computed.test.mjs";
import { archTests as acdCandidateFormationIsLosslessTests } from "./acd-candidate-formation-is-lossless.test.mjs";
import { archTests as acdTuneCarriesNoSecondRuleTests } from "./acd-tune-carries-no-second-rule.test.mjs";
import { archTests as acdTuneWritesNothingTests } from "./acd-tune-writes-nothing.test.mjs";
import { archTests as acdTuneIsNonVacuousOverThisRepoTests } from "./acd-tune-is-non-vacuous-over-this-repo.test.mjs";
import { archTests as acdPlanningInstallCommandsTests } from "./acd-planning-install-commands.test.mjs";
import { archTests as acdPlanningProvenanceShaTests } from "./acd-planning-provenance-sha.test.mjs";
import { archTests as acdPlanningLockIsolationTests } from "./acd-planning-lock-isolation.test.mjs";
import { archTests as acdPlanningNoCodexInstallTests } from "./acd-planning-no-codex-install.test.mjs";
import { archTests as acdPlanningClonableRefTests } from "./acd-planning-clonable-ref.test.mjs";
// milestone 06 — headroom plugin (ADRs 001–005; RED-until-built fitness functions)
import { archTests as acdHeadroomConfigSchemaTests } from "./acd-headroom-config-schema.test.mjs";
import { archTests as acdHeadroomHonestDegradeTests } from "./acd-headroom-honest-degrade.test.mjs";
import { archTests as acdHeadroomConfigIsolationTests } from "./acd-headroom-config-isolation.test.mjs";
import { archTests as acdHeadroomNoDependencyTests } from "./acd-headroom-no-dependency.test.mjs";
import { archTests as acdHeadroomNoProxyRuntimeTests } from "./acd-headroom-no-proxy-runtime.test.mjs";
import { archTests as acdContextBudgetFindingTests } from "./acd-context-budget-finding.test.mjs";
import { archTests as acdContextBudgetConfigSourcedTests } from "./acd-context-budget-config-sourced.test.mjs";
import { archTests as acdPromotionCreatesOneTypeTests } from "./acd-promotion-creates-one-type.test.mjs";
import { archTests as acdOnePromotionEngineTests } from "./acd-one-promotion-engine.test.mjs";
import { archTests as acdTunableSetIsTheRegistryTests } from "./acd-tunable-set-is-the-registry.test.mjs";
import { archTests as acdPerKnobSizingTests } from "./acd-per-knob-sizing.test.mjs";
import { archTests as acdProposalClassIsComputedTests } from "./acd-proposal-class-is-computed.test.mjs";
// milestone 37 — spike & chore item types (ADRs 001-003; RED-until-built fitness functions,
// gated on the ITEM_RE alternation / template existence — inert-green until story 00/01 land,
// then self-activating). FF-3701..3706.
import { archTests as acdSpikeChoreVocabularyTests } from "./acd-spike-chore-vocabulary.test.mjs";
import { archTests as acdSpikeChoreAreDriversTests } from "./acd-spike-chore-are-drivers.test.mjs";
import { archTests as acdSpikeChoreRecordDocTests } from "./acd-spike-chore-record-doc.test.mjs";
import { archTests as acdSpikeNoFeatureTests } from "./acd-spike-no-feature.test.mjs";
import { archTests as acdChoreNoFeatureTests } from "./acd-chore-no-feature.test.mjs";
import { archTests as acdSpikeChoreNextUatShapedTests } from "./acd-spike-chore-next-uat-shaped.test.mjs";
import { archTests as acdChoreDodChecklistTests } from "./acd-chore-dod-checklist.test.mjs";
import { archTests as acdDerivationProposesNeverWritesTests } from "./acd-derivation-proposes-never-writes.test.mjs";
import { archTests as acdPlanRestatesNoDeclaredPathTests } from "./acd-plan-restates-no-declared-path.test.mjs";
// milestone 124 / story 00 — FF-12403: the contract set has ONE home (`src/story-contract.mjs`,
// still a pure leaf), directory intent is AUTHORED rather than probed, and `ready-wave`'s adoption
// of the shared coverage predicate is a strict TIGHTENING — asserted as a superset over a
// generated corpus, because a parallelism gate that quietly widened would be invisible until two
// builders write the same file. Carries both of ADR-003's red probes, driven.
import { archTests as acdContractSetHasOneHomeTests } from "./acd-contract-set-has-one-home.test.mjs";

export const tests = [
  ...acdProvenanceStampedAtWriteTests,
  ...acdTuneCorpusDeclaresItsReadsTests,
  ...acdProposalProvenanceResolvesTests,
  ...acdDistanceToLiveIsComputedTests,
  ...acdCandidateFormationIsLosslessTests,
  ...acdTuneCarriesNoSecondRuleTests,
  ...acdTuneWritesNothingTests,
  ...acdTuneIsNonVacuousOverThisRepoTests,
  ...acdPlanningInstallCommandsTests,
  ...acdPlanningProvenanceShaTests,
  ...acdPlanningLockIsolationTests,
  ...acdPlanningNoCodexInstallTests,
  ...acdPlanningClonableRefTests,
  ...acdHeadroomConfigSchemaTests,
  ...acdHeadroomHonestDegradeTests,
  ...acdHeadroomConfigIsolationTests,
  ...acdHeadroomNoDependencyTests,
  ...acdHeadroomNoProxyRuntimeTests,
  ...acdContextBudgetFindingTests,
  ...acdContextBudgetConfigSourcedTests,
  ...acdPromotionCreatesOneTypeTests,
  ...acdOnePromotionEngineTests,
  ...acdTunableSetIsTheRegistryTests,
  ...acdPerKnobSizingTests,
  ...acdProposalClassIsComputedTests,
  // milestone 37 — spike & chore item types (ADRs 001-003; RED-until-built fitness functions)
  ...acdSpikeChoreVocabularyTests,
  ...acdSpikeChoreAreDriversTests,
  ...acdSpikeChoreRecordDocTests,
  ...acdSpikeNoFeatureTests,
  ...acdChoreNoFeatureTests,
  ...acdSpikeChoreNextUatShapedTests,
  ...acdChoreDodChecklistTests,
  ...acdDerivationProposesNeverWritesTests,
  ...acdPlanRestatesNoDeclaredPathTests,
  // milestone 124 / story 00 — FF-12403 (see the import note).
  ...acdContractSetHasOneHomeTests,
];
