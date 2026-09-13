// THE WORK/STREAM SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 41 / story 01 — reindex-engine (the shared foundation, ADR-001/003/
// 004/005/006): the deterministic slot-open (rename + frontmatter number bump,
// task 00), the depends/parent reference rewrite (task 01), the surgical
// byte-identical frontmatter discipline (task 02), the two number-space axes
// (task 03), and the pure count primitive (task 04) — all against
// src/work/reindex.mjs, story 01 has no command surface.
import { workReindexSlotOpenTests } from "./work-reindex-slot-open.test.mjs";
import { workReindexDependsParentRewriteTests } from "./work-reindex-depends-parent-rewrite.test.mjs";
import { workReindexSurgicalFrontmatterTests } from "./work-reindex-surgical-frontmatter.test.mjs";
import { workReindexNumberSpacesTests } from "./work-reindex-number-spaces.test.mjs";
import { workReindexCountShiftedTests } from "./work-reindex-count-shifted.test.mjs";
// milestone 41 review fast-follow (2026-07-16) — regression coverage for the 4
// confirmed structural/craft review fixes: fix 3 (the mandatory number: bump's
// fail-loud guard, work-reindex.mjs).
import { workReindexNumberBumpGuardTests } from "./work-reindex-number-bump-guard.test.mjs";
// milestone 41 / story 02 — insert-top-level (ADR-002/004/005/006): the two thin
// commands `work:insert-milestone` / `work:insert-uat` over story 01's engine
// (task 00 placement+scaffold, task 01 uat depends-framing, task 02 count-gated
// confirmation + --yes/--force, task 03 the --json envelope's shifted/at/space).
// milestone 127 / story 02, task 03 — the insert-* aliases (ADR-003 §4): the SECOND binding the
// places suite exports, wired beside the delivered insert assertions the aliases must keep green.
import { workInsertTopLevelPlacesTests, workInsertAliasTests } from "./work-insert-top-level-places.test.mjs";
import { workInsertUatDependsTests } from "./work-insert-uat-depends.test.mjs";
import { workInsertCountGateTests } from "./work-insert-count-gate.test.mjs";
import { workInsertJsonEnvelopeTests } from "./work-insert-json-envelope.test.mjs";
// milestone 41 review fast-follow (2026-07-16) — regression coverage for fix 1
// (pre-flight everything cheap BEFORE the first mutation, insert-shared.mjs's
// runInsertTopLevel/runInsertStory) and fix 2 (the CRLF/BOM-tolerant
// stripBundleMarker, insert-shared.mjs).
import { workInsertAtomicPreflightTests } from "./work-insert-atomic-preflight.test.mjs";
import { workInsertCrlfTemplateStripTests } from "./work-insert-crlf-template-strip.test.mjs";
// milestone 41 review fast-follow — QA behavioural-review coverage gap F-3: the
// CLI-facing { ok:false, error, code, shifted } loud-failure envelope
// (workInsertCli, src/cli.mjs), driven end-to-end as a real child process.
import { workInsertCliConfirmEnvelopeTests } from "./work-insert-cli-confirm-envelope.test.mjs";
// milestone 41 / story 03 — insert-story (ADR-002/003/004/005/006): the thin
// command `work:insert-story` over story 01's engine's NESTED axis (task 00
// placement+scaffold, task 01 nested-shift parent/validate-green, task 02 the
// best-effort ## Stories checklist update, task 03 the count-gated
// confirmation scoped to the target milestone's own siblings).
import { workInsertStoryPlacesTests } from "./work-insert-story-places.test.mjs";
import { workInsertStoryNestedValidateTests } from "./work-insert-story-nested-validate.test.mjs";
import { workInsertStoryChecklistTests } from "./work-insert-story-checklist.test.mjs";
import { workInsertStoryCountGateTests } from "./work-insert-story-count-gate.test.mjs";
// milestone 37 / story 00 — the 3 task-feature traceability modules (every
// @executable scenario + Examples row wired to the LOCKED engine surface).
import { workSpikeChoreEnumerateTests } from "./work-spike-chore-enumerate.test.mjs";
import { workSpikeChoreNextTests } from "./work-spike-chore-next.test.mjs";
import { workSpikeChoreValidateTests } from "./work-spike-chore-validate.test.mjs";
// milestone 37 / story 01 — scaffold commands & templates (task-feature traceability
// for 00_spike-template-and-command, 01_chore-template-and-command, 02_bundle-membership).
import { workSpikeTemplateTests } from "./work-spike-template.test.mjs";
import { workChoreTemplateTests } from "./work-chore-template.test.mjs";
import { workScaffoldBornStampedTests } from "./work-scaffold-born-stamped.test.mjs";
import { workFrontmatterWriterTests } from "./work-frontmatter-writer.test.mjs";
// milestone 40 / story 02 — migration registry & `aof upgrade` (ADR-005): the
// contiguous 0->1->… chain + engine selection (task 00), the CLI dry-run/apply/
// refuse face (task 01), idempotency across re-runs (task 02), the 0->1 stamp
// transform backstamping every recordDoc type (task 03), and the reconstructed-
// marker expressibility seam (task 04, ADR-008 readiness for m39's backfill).
import { workUpgradeRegistryChainTests } from "./work-upgrade-registry-chain.test.mjs";
import { workUpgradeDryRunApplyTests } from "./work-upgrade-dry-run-apply.test.mjs";
import { workUpgradeIdempotentTests } from "./work-upgrade-idempotent.test.mjs";
import { workUpgradeStampTransformTests } from "./work-upgrade-stamp-transform.test.mjs";
import { workUpgradeReconstructedMarkerTests } from "./work-upgrade-reconstructed-marker.test.mjs";
// milestone 40 / story 04 — the generated changelog (ADR-006): renderChangelog
// is a pure, deterministic projection of WORK_ITEM_MIGRATIONS; the committed
// UPGRADE-CHANGELOG.md matches regenerate byte-for-byte (the drift guard); a
// hand edit is caught (changelogDrift); the artifact self-identifies via the
// aof-generated stamp; and the changelog is downstream-only (registry ->
// changelog live, changelog -> registry dead — no feedback edge).
import { workUpgradeChangelogTests } from "./work-upgrade-changelog.test.mjs";
// milestone 127 / story 01 — one enumerator, three roots: the three-root fixture driven
// through every executable scenario of tasks 00-04 (listItems over the root, backlog/** and
// archive/; the live-row predicate on next/list; validate + doctor over the three roots; the
// null-safe .number consumers and the mint) plus task 01's behavioural legs. The textual
// sweeps (FF-12701/12702/12706) live in test/arch/work.
import { workBacklogArchiveEnumerateTests } from "./work-backlog-archive-enumerate.test.mjs";
// milestone 127 / story 02 — promote mints the number: the ONE mint driven over the SAME three-root
// fixture (tasks 00-02 — resolution, the append and the surgical stamp, `--at P` through the
// existing seam and gate, and `depends:` validated at promotion) plus task 04's one promote-side
// refusal. Task 03's alias scenarios are `workInsertAliasTests`, the second binding
// work-insert-top-level-places exports (spread above, beside the delivered insert assertions they
// must keep green); the textual halves (FF-12703/12704) live in test/arch/work.
import { workPromoteMintsTheNumberTests } from "./work-promote-mints-the-number.test.mjs";

export const tests = [
  // milestone 41 / story 01 — reindex-engine task traceability
  ...workReindexSlotOpenTests,
  ...workReindexDependsParentRewriteTests,
  ...workReindexSurgicalFrontmatterTests,
  ...workReindexNumberSpacesTests,
  ...workReindexCountShiftedTests,
  // milestone 41 review fast-follow (2026-07-16) — fix 3 regression coverage
  ...workReindexNumberBumpGuardTests,
  // milestone 41 / story 02 — insert-top-level command-surface task traceability
  ...workInsertTopLevelPlacesTests,
  // milestone 127 / story 02, task 03 — the insert-* aliases (second binding of the places suite)
  ...workInsertAliasTests,
  ...workInsertUatDependsTests,
  ...workInsertCountGateTests,
  ...workInsertJsonEnvelopeTests,
  // milestone 41 review fast-follow (2026-07-16) — fix 1 + fix 2 regression coverage
  ...workInsertAtomicPreflightTests,
  ...workInsertCrlfTemplateStripTests,
  // milestone 41 review fast-follow — QA coverage gap F-3 (CLI loud-failure envelope)
  ...workInsertCliConfirmEnvelopeTests,
  // milestone 41 / story 03 — insert-story (nested axis) command-surface task
  // traceability
  ...workInsertStoryPlacesTests,
  ...workInsertStoryNestedValidateTests,
  ...workInsertStoryChecklistTests,
  ...workInsertStoryCountGateTests,
  // milestone 37 / story 00 — task-feature traceability (00_admit-and-enumerate,
  // 01_drivers-ordering-and-next, 02_record-doc-and-structural-validate)
  ...workSpikeChoreEnumerateTests,
  ...workSpikeChoreNextTests,
  ...workSpikeChoreValidateTests,
  // milestone 37 / story 01 — scaffold commands & templates
  ...workSpikeTemplateTests,
  ...workChoreTemplateTests,
  ...workScaffoldBornStampedTests,
  ...workFrontmatterWriterTests,
  // milestone 40 / story 02 — migration registry & `aof upgrade` task traceability
  ...workUpgradeRegistryChainTests,
  ...workUpgradeDryRunApplyTests,
  ...workUpgradeIdempotentTests,
  ...workUpgradeStampTransformTests,
  ...workUpgradeReconstructedMarkerTests,
  // milestone 40 / story 04 — the generated changelog task traceability
  ...workUpgradeChangelogTests,
  // milestone 127 / story 01 — one enumerator, three roots (tasks 00-04 + task 01 behaviour)
  ...workBacklogArchiveEnumerateTests,
  // milestone 127 / story 02 — promote mints the number (tasks 00-02 + task 04's promote refusal)
  ...workPromoteMintsTheNumberTests,
];
