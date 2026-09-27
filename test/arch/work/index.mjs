// THE ARCH/WORK SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdPhaseDoorNotADriverTests } from "./acd-phase-door-not-a-driver.test.mjs";
import { archTests as workContentFreeDiscoveryTests } from "./work-content-free-discovery.test.mjs";
// milestone 59 (architect, at the milestone close) — FF-5911: `--strict` means two
// DIFFERENT things on `work:doctor` and `work:audit`, and the divergence is a recorded decision
// (59/ADR-002 §2a) rather than a drift. The cross-command table is what a "harmonisation"
// would silently rewrite, which is how the audit would arrive on the frozen cost ladder.
import { archTests as acdStrictIsTwoPoliciesTests } from "./acd-strict-is-two-policies.test.mjs";
import { archTests as acdWorkListContractTests } from "./acd-work-list-contract.test.mjs";
import { archTests as acdRoundtripIsolationTests } from "./acd-roundtrip-isolation.test.mjs";
import { archTests as acdRoundtripReusesShippedCodeTests } from "./acd-roundtrip-reuses-shipped-code.test.mjs";
import { archTests as acdRoundtripHarnessContractTests } from "./acd-roundtrip-harness-contract.test.mjs";
import { archTests as acdRoundtripRegistrationTests } from "./acd-roundtrip-registration.test.mjs";
import { archTests as acdWorkCommandRouteCoverageTests } from "./acd-work-command-route-coverage.test.mjs";
import { archTests as acdWorkCommandCliBijectionTests } from "./acd-work-command-cli-bijection.test.mjs";
import { archTests as acdWorkInsertCommandBundleParityTests } from "./acd-work-insert-command-bundle-parity.test.mjs";
import { archTests as acdWorkUiNoCoreImportTests } from "./acd-work-ui-no-core-import.test.mjs";
import { archTests as acdWorkCommandNoSubprocessTests } from "./acd-work-command-no-subprocess.test.mjs";
import { archTests as acdMigrateCommandCliBijectionTests } from "./acd-migrate-command-cli-bijection.test.mjs";
import { archTests as acdMigrateReadOnlySourceTests } from "./acd-migrate-read-only-source.test.mjs";
import { archTests as acdDoctorFindingEnvelopeTests } from "./acd-doctor-finding-envelope.test.mjs";
import { archTests as acdDoctorEngineDeterminismTests } from "./acd-doctor-engine-determinism.test.mjs";
import { archTests as acdDoctorStrictExitTests } from "./acd-doctor-strict-exit.test.mjs";
// milestone 15 — work doctor core (story 03: validate keystone wiring — the
// /aof:validate skill runs `aof work doctor $ARGUMENTS` AFTER `aof work validate
// $ARGUMENTS`, lane-grouped (validity / health), health beneath the agent-only
// layer; validate stays the hard gate, doctor is the advisory floor, added not
// substituted; @executable doc-content + ordering guard over the bundled skill)
import { archTests as acdDoctorValidateKeystoneTests } from "./acd-doctor-validate-keystone.test.mjs";
import { archTests as acdStatusRollbackBoundedTests } from "./acd-status-rollback-bounded.test.mjs";
import { archTests as acdPhaseBriefSingleBagTests } from "./acd-phase-brief-single-bag.test.mjs";
import { archTests as acdPhaseBriefBoundedInWriterTests } from "./acd-phase-brief-bounded-in-writer.test.mjs";
import { archTests as acdReviewNeverResumedTests } from "./acd-review-never-resumed.test.mjs";
import { archTests as acdReportOnlyIsTheDefaultTests } from "./acd-report-only-is-the-default.test.mjs";
// milestone 25 — mesh-ui (Decide-stage arch tests, ADR-001/002/003): the board→ui
// rename-complete XOR gate + the single-fleet-data-command gate. Both are vacuous-safe
// (green on the current tree) and tighten as milestone 25's code lands.
import { archTests as acdWorkUiRenameCompleteTests } from "./acd-work-ui-rename-complete.test.mjs";
// milestone 41 — work-item insertion & re-index (ADR-001/ADR-003, refine-stage
// fitness functions, GREEN today): resolution is folder-derived so re-index-by-rename
// is sufficient (no index to rebuild), and the renumber WRITER stays OUT of the
// work.mjs god-node (work.mjs never imports a reindex/insert engine; guard-if-present
// that work-reindex.mjs imports work.mjs, never the reverse).
import { archTests as acdReindexResolutionFolderDerivedTests } from "./acd-reindex-resolution-folder-derived.test.mjs";
import { archTests as acdReindexEngineBlastRadiusTests } from "./acd-reindex-engine-blast-radius.test.mjs";
// milestone 40 — work-item versioning & the upgrade path (ADRs 001-008; refine-stage
// GUARD-IF-PRESENT fitness functions, GREEN today): the schema-integer/registry single
// source of truth (no drift, contiguous chain from baseline 0), idempotency by registry
// shape, the migration-writer body-byte-identity bound (mirroring rollbackItemStatus),
// the generated changelog (a projection of the registry), the reconstructed-marker
// readiness for m39's backfill (the imported:true analogue), and the god-node
// blast-radius guard (work-upgrade.mjs -> work.mjs, never the reverse).
import { archTests as acdWorkItemSchemaSingleConstantTests } from "./acd-work-item-schema-single-constant.test.mjs";
import { archTests as acdMigrationWriterBodyPreservingTests } from "./acd-migration-writer-body-preserving.test.mjs";
// …and its packaging half (task 02): the flag rides the STARTING move in the bundle
// surfaces and nowhere else, and no bundle tells an agent to step past a refusal.
import { archTests as acdStatusFlagOnStartingMovesOnlyTests } from "./acd-status-flag-on-starting-moves-only.test.mjs";
// m42 wave (d) leg d5 — the fact/projection split made executable: the store
// classification is total and gates wholesale deletes + fact writers; the
// ref-remap splits across loci; the reconciler + doctor --explain/--converge
// close the write-vs-append crash window.
import { archTests as acdFactProjectionSplitTests } from "./acd-fact-projection-split.test.mjs";
// ADR-004 — work_items has ONE writer module, and the effects/stores.mjs
// reclassification to `fact` is what structurally ends the wholesale disk rebuild.
import { archTests as acdWorkItemsSingleWriterTests } from "./acd-work-items-single-writer.test.mjs";
// ADR-007 — the streamed set and the requestable set are ONE manifest, one home.
import { archTests as acdWorkArtifactSetSingleHomeTests } from "./acd-work-artifact-set-single-home.test.mjs";
// DISCLOSURE — this repo must not name a private downstream project. It was public until
// 2026-08-15, when a measurement found 100 tracked files carrying 419 such references (testbed
// names, `C:\Source\…` paths, per-milestone delivery figures), accumulated one honest example at
// a time because naming the real testbed is what makes a measurement credible. All 419 were
// replaced with placeholders that preserve both LENGTH and ALPHABETICAL ORDER — length because a
// fixture asserts UI truncation of a long repo name, order because two fleet fixtures assert a
// sorted board list (the first pass got order wrong and those two went red, which is how it was
// found). The guard is a hard zero, and `.githooks/pre-commit` refuses the commit before this
// ever has to refuse the merge. Its term list is gitignored, so the guard publishes nothing and
// SKIPS on a machine that has no list.
import { archTests as acdNoInternalProjectNamesTests } from "./acd-no-internal-project-names.test.mjs";
import { archTests as acdFeatureParserSingleHomeTests } from "./acd-feature-parser-single-home.test.mjs";
import { archTests as acdFeatureParseExamplesAdditiveTests } from "./acd-feature-parse-examples-additive.test.mjs";
import { archTests as acdWorkCountersReadOnlyTests } from "./acd-work-counters-read-only.test.mjs";
import { archTests as acdMilestone66ControlsResolveTests } from "./acd-milestone-66-controls-resolve.test.mjs";
import { archTests as acdDoctorGateScopeAndSeverityTests } from "./acd-doctor-gate-scope-and-severity.test.mjs";
import { archTests as acdVerificationTemplateShapeTests } from "./acd-verification-template-shape.test.mjs";
// milestone 124 / story 00 — the depends census's two controls. FF-12401: the lane reports its
// DENOMINATOR as an identity over the edge set `validateWork` resolves, emits exactly one coverage
// finding per run with its two exclusion reasons apart, and renders no verdict it cannot reach
// (the `phantom` sweep scoped to the lane, deliberately). It is also the ONE place this
// repository's own stream is measured for the census. FF-12402: "an advisory lane never gates"
// raised from a promise about one lane to a CLASS claim on its third instance, with
// `doctor-controls.mjs` the one NAMED exemption — plus task 04's five behavioural scenarios.
import { archTests as acdCensusReportsItsDenominatorTests } from "./acd-census-reports-its-denominator.test.mjs";
import { archTests as acdAdvisoryLaneNeverGatesTests } from "./acd-advisory-lane-never-gates.test.mjs";
// milestone 127 / story 01 — one enumerator, three roots: the three controls the story lands.
// FF-12701: `ITEM_RE`/`BACKLOG_ITEM_RE` have one home and no src module other than `src/work.mjs`
// pairs a `readdir` with an item-name match — six keepers allow-listed by path AND reason, a
// stale keeper its own failure, `local-indexing.mjs` asserted match-free. FF-12702: every
// `.number` parse in the ten named files is guarded within its enclosing top-level function (or
// allow-listed by file + function + reason), set-equality over the ten. FF-12706: the scheduling
// walkers reference `isLiveStreamRow` and the resolving readers do not, textually and over the
// three-root fixture; the loop imports no disk reader of its own.
import { archTests as acdWorkRootOneEnumeratorTests } from "./acd-work-root-one-enumerator.test.mjs";
import { archTests as acdNumberNullSafeTests } from "./acd-number-null-safe.test.mjs";
import { archTests as acdNextWalkersExcludeArchivedTests } from "./acd-next-walkers-exclude-archived.test.mjs";
// milestone 127 / story 02 — promote mints the number: the two controls the story lands.
// FF-12703 (one mint): `appendPosition` has one home and exactly the promote family as callers, the
// TOP-LEVEL slot-open is called from `promote.mjs` alone and `runInsertTopLevel` is defined there, the
// four insert verb faces contain no `parseInt`/`Math.max`/`number:` write, `reindex.mjs` keeps its two
// src importers (read from import specifiers, since four mentions of the path are comments), and no
// `add-*` prompt computes a number — each leg with its own non-vacuity. FF-12704 (intake is
// write-side only): the token lives in init, its face, promote and the bundle prompts; every named
// reader and the whole doctor family hold zero; the writer and the reader must each carry it.
import { archTests as acdOneMintTests } from "./acd-one-mint.test.mjs";
import { archTests as acdIntakeWriteSideOnlyTests } from "./acd-intake-write-side-only.test.mjs";
// milestone 127 / story 03 — archive is a move: the one control the story lands. FF-12705 (archive
// never renumbers): the face's and the engine's import specifiers are each a closed set, every
// transitive path to the reindex engine or insert-shared crosses the stream seam (a source-level
// walk, non-vacuous on the seam path itself), neither file writes a number, the rewriter matches
// link syntax only (driven over a scratch text whose `number:` line must stay byte-identical), and
// the face calls the seam rather than the engine.
import { archTests as acdArchiveNeverRenumbersTests } from "./acd-archive-never-renumbers.test.mjs";

export const tests = [
  ...acdPhaseDoorNotADriverTests,
  ...workContentFreeDiscoveryTests,
  ...acdStrictIsTwoPoliciesTests,
  ...acdWorkListContractTests,
  ...acdRoundtripIsolationTests,
  ...acdRoundtripReusesShippedCodeTests,
  ...acdRoundtripHarnessContractTests,
  ...acdRoundtripRegistrationTests,
  ...acdWorkCommandRouteCoverageTests,
  ...acdWorkCommandCliBijectionTests,
  ...acdWorkInsertCommandBundleParityTests,
  ...acdWorkUiNoCoreImportTests,
  ...acdWorkCommandNoSubprocessTests,
  ...acdMigrateCommandCliBijectionTests,
  ...acdMigrateReadOnlySourceTests,
  ...acdDoctorFindingEnvelopeTests,
  ...acdDoctorEngineDeterminismTests,
  ...acdDoctorStrictExitTests,
  ...acdDoctorValidateKeystoneTests,
  ...acdStatusRollbackBoundedTests,
  ...acdPhaseBriefSingleBagTests,
  ...acdPhaseBriefBoundedInWriterTests,
  ...acdReviewNeverResumedTests,
  ...acdReportOnlyIsTheDefaultTests,
  // milestone 25 — mesh-ui (Decide-stage arch tests: board→ui rename XOR + single fleet-data command)
  ...acdWorkUiRenameCompleteTests,
  // milestone 41 — work-item insertion & re-index (refine-stage fitness functions)
  ...acdReindexResolutionFolderDerivedTests,
  ...acdReindexEngineBlastRadiusTests,
  // milestone 40 — work-item versioning & the upgrade path (ADRs 001-008)
  ...acdWorkItemSchemaSingleConstantTests,
  ...acdMigrationWriterBodyPreservingTests,
  ...acdStatusFlagOnStartingMovesOnlyTests,
  ...acdFactProjectionSplitTests,
  ...acdWorkItemsSingleWriterTests,
  ...acdWorkArtifactSetSingleHomeTests,
  ...acdNoInternalProjectNamesTests,
  ...acdFeatureParserSingleHomeTests,
  ...acdFeatureParseExamplesAdditiveTests,
  ...acdWorkCountersReadOnlyTests,
  ...acdMilestone66ControlsResolveTests,
  ...acdDoctorGateScopeAndSeverityTests,
  ...acdVerificationTemplateShapeTests,
  // milestone 124 / story 00 — FF-12401 and FF-12402 (see the import note).
  ...acdCensusReportsItsDenominatorTests,
  ...acdAdvisoryLaneNeverGatesTests,
  // milestone 127 / story 01 — FF-12701, FF-12702 and FF-12706 (see the import note).
  ...acdWorkRootOneEnumeratorTests,
  ...acdNumberNullSafeTests,
  ...acdNextWalkersExcludeArchivedTests,
  // milestone 127 / story 02 — FF-12703 and FF-12704 (see the import note).
  ...acdOneMintTests,
  ...acdIntakeWriteSideOnlyTests,
  // milestone 127 / story 03 — FF-12705 (see the import note).
  ...acdArchiveNeverRenumbersTests,
];
