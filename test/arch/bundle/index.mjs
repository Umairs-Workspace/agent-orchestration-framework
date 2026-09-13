// THE ARCH/BUNDLE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdFrozenSetCompiledTests } from "./acd-frozen-set-compiled.test.mjs";
import { archTests as acdFrozenSetTamperCodedTests } from "./acd-frozen-set-tamper-coded.test.mjs";
import { archTests as acdRunsEolPinnedTests } from "./acd-runs-eol-pinned.test.mjs";
import { archTests as acdBundleInstallEolPinnedTests } from "./acd-bundle-install-eol-pinned.test.mjs";
import { archTests as acdManagedHookNotDuplicatedTests } from "./acd-managed-hook-not-duplicated.test.mjs";
import { archTests as acdCapabilityGapCitesACodeSpanTests } from "./acd-capability-gap-cites-a-code-span.test.mjs";
import { archTests as acdHookRuleDetectsNeverWritesTests } from "./acd-hook-rule-detects-never-writes.test.mjs";
import { archTests as acdBundleMembershipTests } from "./acd-bundle-membership.test.mjs";
import { archTests as acdBundleLocationTests } from "./acd-bundle-location.test.mjs";
import { archTests as acdBundleManifestHashesTests } from "./acd-bundle-manifest-hashes.test.mjs";
import { archTests as acdInstallManifestContractTests } from "./acd-install-manifest-contract.test.mjs";
import { archTests as acdGeneratedStampTests } from "./acd-generated-stamp.test.mjs";
import { archTests as acdCapabilityDelegationTests } from "./acd-capability-delegation.test.mjs";
import { archTests as acdProviderNeutralRegistryTests } from "./acd-provider-neutral-registry.test.mjs";
import { archTests as acdNpxLanePreservedTests } from "./acd-npx-lane-preserved.test.mjs";
// milestone 71 / ADR-008 (as amended by ADR-009 §3) — FF-7106: a story's declared write set
// includes every generated sibling its own change lands. Declared by 71 and owned by no story of
// that milestone (71/F-71-A); landed by chore 89.
import { archTests as acdDeclaredWritesIncludeGeneratedSiblingsTests } from "./acd-declared-writes-include-generated-siblings.test.mjs";
import { archTests as acdSeaSafeAssetBaseTests } from "./acd-sea-safe-asset-base.test.mjs";
import { archTests as acdUpgradeIdempotentTests } from "./acd-upgrade-idempotent.test.mjs";
import { archTests as acdChangelogGeneratedTests } from "./acd-changelog-generated.test.mjs";
import { archTests as acdReconstructedMarkerExpressibleTests } from "./acd-reconstructed-marker-expressible.test.mjs";
import { archTests as acdUpgradeEngineBlastRadiusTests } from "./acd-upgrade-engine-blast-radius.test.mjs";
// ---- milestone 43 · mesh artifact authority (the cache is the read surface) ----
// ADR-001 — the PostToolUse trigger's body DERIVES NOTHING (no src/ import, no store,
// no workspace-identity derivation, exit 0 always) and resolves BOTH path fields
// (file_path for Write/Edit, notebook_path for NotebookEdit — measured).
import { archTests as acdArtifactSyncHookDerivationFreeTests } from "./acd-artifact-sync-hook-derivation-free.test.mjs";
// ADR-002 — .claude/settings.json is CO-AUTHORED: aof splices only its own entry, never
// a whole-file render (m42 leg d4's writeLock defect class, one file over).
import { archTests as acdClaudeSettingsCoAuthoredTests } from "./acd-claude-settings-co-authored.test.mjs";

export const tests = [
  ...acdFrozenSetCompiledTests,
  ...acdFrozenSetTamperCodedTests,
  ...acdRunsEolPinnedTests,
  ...acdBundleInstallEolPinnedTests,
  ...acdManagedHookNotDuplicatedTests,
  ...acdCapabilityGapCitesACodeSpanTests,
  ...acdHookRuleDetectsNeverWritesTests,
  ...acdBundleMembershipTests,
  ...acdBundleLocationTests,
  ...acdBundleManifestHashesTests,
  ...acdInstallManifestContractTests,
  ...acdGeneratedStampTests,
  ...acdCapabilityDelegationTests,
  ...acdProviderNeutralRegistryTests,
  ...acdNpxLanePreservedTests,
  // milestone 71 / chore 89 — FF-7106, the register's sixth control: declared by ADR-008 and given
  // no owning story by the four-story partition, so it lands here rather than under a 71 story.
  ...acdDeclaredWritesIncludeGeneratedSiblingsTests,
  ...acdSeaSafeAssetBaseTests,
  ...acdUpgradeIdempotentTests,
  ...acdChangelogGeneratedTests,
  ...acdReconstructedMarkerExpressibleTests,
  ...acdUpgradeEngineBlastRadiusTests,
  // milestone 43 · mesh artifact authority — ADR-001..008
  ...acdArtifactSyncHookDerivationFreeTests,
  ...acdClaudeSettingsCoAuthoredTests,
];
