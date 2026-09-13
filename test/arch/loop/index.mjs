// THE ARCH/LOOP SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 52 / story 04 — FF-5201…FF-5209, the loop registry's nine
// structural fitness gates. Registration is explicit so no authored gate is dead.
import { archTests as acdLoopRegistryNotAnItemTypeTests } from "./acd-loop-registry-not-an-item-type.test.mjs";
import { archTests as acdLoopModuleImportBoundaryTests } from "./acd-loop-module-import-boundary.test.mjs";
import { archTests as acdLoopVocabularyClosedTests } from "./acd-loop-vocabulary-closed.test.mjs";
import { archTests as acdLoopRecordsParseTests } from "./acd-loop-records-parse.test.mjs";
import { archTests as acdLoopChecksPureTests } from "./acd-loop-checks-pure.test.mjs";
import { archTests as acdLoopTimescaleComparabilityTests } from "./acd-loop-timescale-comparability.test.mjs";
import { archTests as acdLoopCommandRouteOnlyTests } from "./acd-loop-command-route-only.test.mjs";
import { archTests as acdLoopRenderDeterministicTests } from "./acd-loop-render-deterministic.test.mjs";
import { archTests as acdLoopFindingEnvelopeTests } from "./acd-loop-finding-envelope.test.mjs";
import { archTests as acdLoopProbeContractTests } from "./acd-loop-probe-contract.test.mjs";
import { archTests as acdLoopLevelL3GatedTests } from "./acd-loop-level-l3-gated.test.mjs";
import { archTests as acdLoopL1ReadOnlyTests } from "./acd-loop-l1-read-only.test.mjs";
import { archTests as acdLoopStateRidesTheRunRecordTests } from "./acd-loop-state-rides-the-run-record.test.mjs";
import { archTests as acdLoopScopeGuardTests } from "./acd-loop-scope-guard.test.mjs";
import { archTests as acdLoopReadyRegistryOptionalTests } from "./acd-loop-ready-registry-optional.test.mjs";
import { archTests as acdLoopCapSingleHomeTests } from "./acd-loop-cap-single-home.test.mjs";
import { archTests as acdLoopSuiteRegistrationTests } from "./acd-loop-suite-registration.test.mjs";
import { archTests as acdWatcherTaxonomyAdditiveTests } from "./acd-watcher-taxonomy-additive.test.mjs";
// milestone 58 / story 00 — the FIFTH node kind and the timescale-layer axis: the arbiter's
// frozen declaration vocabulary (FF-5801), and the endpoint-closed registry fixture every
// subset copy of `src/bundle/loops/` now goes through (FF-5809). The story's behavioural
// scenarios extend the loader's own record/value suites, already registered by milestone 52's
// story-05 block above — 58/00 adds no behavioural suite of its own.
import { archTests as acdArbiterTaxonomyAdditiveTests } from "./acd-arbiter-taxonomy-additive.test.mjs";
// milestone 58 / story 01 — the reference hierarchy and the arbiter: the day-one records
// themselves (FF-5806). The story's behavioural delivery scenarios extend
// `work-loops-home-and-delivery`, already registered by milestone 53's story-07 block above.
import { archTests as acdDayOneSupervisionCompleteTests } from "./acd-day-one-supervision-complete.test.mjs";
// milestone 58 / story 02 — layer separation, arbitration and the gate: the arbiter records the
// trade-off, cannot act, and is a node every traversal considers (FF-5805). The story's other
// three controls EXTEND guards already in service rather than adding siblings —
// `acd-loop-timescale-comparability` (FF-5802), `acd-loop-finding-envelope` (FF-5803) and
// `acd-loop-checks-pure` (FF-5804) are all registered by milestone 52's story-04 block above,
// and for those the red probe is the only evidence the change is armed.
import { archTests as acdArbiterRecordsTheTradeoffTests } from "./acd-arbiter-records-the-tradeoff.test.mjs";
import { archTests as acdLoopGraphKindLegibleTests } from "./acd-loop-graph-kind-legible.test.mjs";
import { archTests as acdLoopDocumentEolPinnedTests } from "./acd-loop-document-eol-pinned.test.mjs";
import { archTests as acdDayOneAuditCompleteTests } from "./acd-day-one-audit-complete.test.mjs";
import { archTests as acdTriggerDeclarationIsDataTests } from "./acd-trigger-declaration-is-data.test.mjs";
import { archTests as acdTriggerLevelIsACeilingTests } from "./acd-trigger-level-is-a-ceiling.test.mjs";
import { archTests as acdTriggerNeverClassifiesTests } from "./acd-trigger-never-classifies.test.mjs";
import { archTests as acdTriggerIsACallerNotACoordinatorTests } from "./acd-trigger-is-a-caller-not-a-coordinator.test.mjs";
import { archTests as acdTriggerHoldsNoClockTests } from "./acd-trigger-holds-no-clock.test.mjs";
import { archTests as acdTriggerIsNonVacuousOverThisRepoTests } from "./acd-trigger-is-non-vacuous-over-this-repo.test.mjs";
import { archTests as acdDwellGatesReversionOnlyTests } from "./acd-dwell-gates-reversion-only.test.mjs";
import { archTests as acdNoUncappedFrameworkLoopTests } from "./acd-no-uncapped-framework-loop.test.mjs";
// ── milestone 49 / story 06 — THE PULSE HONOURS REDUCED MOTION (DESIGN DG-49-6). Not a gap: a
// SHIPPED defect whose own code comment claimed the opposite. `ui/src/terminal/palette.mjs` said
// both pulses honoured `prefers-reduced-motion` through a convention in `ui/src/index.css`; the
// only such rule in the whole of `ui/` named `.aof-pending` — a different class over a different
// animation — so the `connecting…` and `streaming` dots kept pulsing for every operator whose
// system had asked them to stop (measured in a real browser at refine: `pulse`, 2s, with reduce
// FORCED). One pulsing dot on one card hid it; milestone 49's grid of a dozen is what exposed it.
//   THE FIX IS ONE CSS RULE, and that is ARCHITECTURE's ruling rather than a shortcut: twelve
//   `animate-pulse` sites exist across `ui/src` and twelve per-site escapes would be twelve edits
//   with a thirteenth site one diff away, while widening the stylesheet's ONE reduced-motion block
//   covers the site nobody has written yet. Because the block IS the mechanism, the source gate
//   below is a COMPLETE proof of the invariant — which is why the browser lane was DECLINED and
//   the contract's scenarios 2 and 3 move to `@manual` unchanged.
//   THE NINTH FITNESS FUNCTION — set containment over the emitted `animate-*` utilities vs the
//   classes the reduce block actually SILENCES, comment-stripped LINE-FIRST (TECH_DEBT 24). The
//   stripping is not hygiene here: a naive `prefers-reduced-motion` word sweep of `palette.mjs`
//   was GREEN on the live defect, out of a false sentence. Both of the PO's plants are carried and
//   both are fed to the SHIPPED detector — a utility emitted with no escape, and a file whose only
//   `prefers-reduced-motion` is a comment — plus the historical block driven over the REAL tree,
//   so the gate is shown to go red on the defect it was written for.
import { archTests as acdMotionHasAnEscapeTests } from "./acd-motion-has-an-escape.test.mjs";
import { archTests as acdWatcherCounterResolvesTests } from "./acd-watcher-counter-resolves.test.mjs";
import { archTests as acdDayOnePairingCompleteTests } from "./acd-day-one-pairing-complete.test.mjs";
import { archTests as acdLoopDocumentCurrentTests } from "./acd-loop-document-current.test.mjs";
import { archTests as acdLoopDocumentWriteScopeTests } from "./acd-loop-document-write-scope.test.mjs";
import { archTests as acdLoopDocumentBoardDeferredTests } from "./acd-loop-document-board-deferred.test.mjs";
import { archTests as acdLoopDocumentIdempotentTests } from "./acd-loop-document-idempotent.test.mjs";
import { archTests as acdLoopRecordProjectionPureTests } from "./acd-loop-record-projection-pure.test.mjs";
import { archTests as acdLoopRecordRendererAdditiveTests } from "./acd-loop-record-renderer-additive.test.mjs";
import { archTests as acdLoopRecordCeilingLegibleTests } from "./acd-loop-record-ceiling-legible.test.mjs";
import { archTests as acdLoopRecordIdempotentTests } from "./acd-loop-record-idempotent.test.mjs";
import { archTests as acdLoopRecordSignaturePreservedTests } from "./acd-loop-record-signature-preserved.test.mjs";
import { archTests as acdLoopRecordIsAFaceTests } from "./acd-loop-record-is-a-face.test.mjs";
import { archTests as acdLoopRecordBoardDeferredTests } from "./acd-loop-record-board-deferred.test.mjs";
import { archTests as acdLoopRecordWriteScopeTests } from "./acd-loop-record-write-scope.test.mjs";
import { archTests as acdLoopRecordSignoffShapeTests } from "./acd-loop-record-signoff-shape.test.mjs";
import { archTests as acdLoopRecordNeverGatesTests } from "./acd-loop-record-never-gates.test.mjs";
// milestone 124 / story 01 — FF-12404: the cycle-cap decision moves into the engine, returns
// the EXISTING refine act aimed at a DERIVED plan ref, and is bounded twice by counters that
// already exist. The structural half only; the walk is driven in test/loop/.
import { archTests as acdCapExhaustionReturnsToThePlanTests } from "./acd-cap-exhaustion-returns-to-the-plan.test.mjs";
// milestone 126 / story 00 — FF-12601 (the clock counts attempts, not calendar) and FF-12602 (the
// loop narrates in flight). Two controls, one story: the milestone's proposed partition drew them
// as two, and the product owner merged them at the break-down because the second could never wave
// before the first — same two files, same arch index.
import { archTests as acdClockCountsAttemptsTests } from "./acd-clock-counts-attempts.test.mjs";
import { archTests as acdLoopNarratesInFlightTests } from "./acd-loop-narrates-in-flight.test.mjs";
// milestone 126 / story 02 — FF-12604. One pure decider says which declarations should be running
// now: it composes the store-s verdicts and names none of them.
import { archTests as acdDeclarationPredicateIsComposedTests } from "./acd-declaration-predicate-is-composed.test.mjs";
// story 125 / task 01 — the PLACEMENT control on the loop document's readership: the site builder
// (`scripts/site/build-site.mjs`) reaches `loopDocumentPath` from outside the `src/` walk story 79's
// drift check (`acd-loop-document-current`) asserts over, spells no basename and composes nothing,
// and nothing under `docs/` is a copy of the graph document. It lives HERE, beside the reader-set
// control whose predicate it shares, because 124/02's FF-12405 leg 10 freezes `test/arch/bundle/`
// at its 23 parity controls — a ceiling that may only fall.
import { archTests as acdSiteIsProjectedNotCopiedTests } from "./acd-site-is-projected-not-copied.test.mjs";

export const tests = [
  // milestone 52 / story 04 — the nine loop-registry fitness functions
  ...acdLoopRegistryNotAnItemTypeTests,
  ...acdLoopModuleImportBoundaryTests,
  ...acdLoopVocabularyClosedTests,
  ...acdLoopRecordsParseTests,
  ...acdLoopChecksPureTests,
  ...acdLoopTimescaleComparabilityTests,
  ...acdLoopCommandRouteOnlyTests,
  ...acdLoopRenderDeterministicTests,
  ...acdLoopFindingEnvelopeTests,
  ...acdLoopProbeContractTests,
  ...acdLoopLevelL3GatedTests,
  ...acdLoopL1ReadOnlyTests,
  ...acdLoopStateRidesTheRunRecordTests,
  ...acdLoopScopeGuardTests,
  ...acdLoopReadyRegistryOptionalTests,
  ...acdLoopCapSingleHomeTests,
  ...acdLoopSuiteRegistrationTests,
  ...acdWatcherTaxonomyAdditiveTests,
  // milestone 58 / story 00 — the arbiter kind, the layer axis, and the closed registry fixture
  ...acdArbiterTaxonomyAdditiveTests,
  // milestone 58 / story 01 — the day-one reference hierarchy, layers and the arbiter record
  ...acdDayOneSupervisionCompleteTests,
  // milestone 58 / story 02 — the arbiter clears what it records, and is a node the checks see
  ...acdArbiterRecordsTheTradeoffTests,
  ...acdLoopGraphKindLegibleTests,
  ...acdLoopDocumentEolPinnedTests,
  ...acdDayOneAuditCompleteTests,
  ...acdTriggerDeclarationIsDataTests,
  ...acdTriggerLevelIsACeilingTests,
  ...acdTriggerNeverClassifiesTests,
  ...acdTriggerIsACallerNotACoordinatorTests,
  ...acdTriggerHoldsNoClockTests,
  ...acdTriggerIsNonVacuousOverThisRepoTests,
  ...acdDwellGatesReversionOnlyTests,
  ...acdNoUncappedFrameworkLoopTests,
  // milestone 49 / story 06 — the pulse honours reduced motion (DG-49-6). The NINTH fitness
  // function (RED at refine, green with the one CSS rule that lands in the same diff), then
  // task 00's source-lane scenarios 1 and 5. Scenarios 2 and 3 are @manual — the browser lane
  // was DECLINED, argued, because the CSS block IS the mechanism and the source gate proves it.
  ...acdMotionHasAnEscapeTests,
  ...acdWatcherCounterResolvesTests,
  ...acdDayOnePairingCompleteTests,
  ...acdLoopDocumentCurrentTests,
  ...acdLoopDocumentWriteScopeTests,
  ...acdLoopDocumentBoardDeferredTests,
  ...acdLoopDocumentIdempotentTests,
  ...acdLoopRecordProjectionPureTests,
  ...acdLoopRecordRendererAdditiveTests,
  ...acdLoopRecordCeilingLegibleTests,
  ...acdLoopRecordIdempotentTests,
  ...acdLoopRecordSignaturePreservedTests,
  ...acdLoopRecordIsAFaceTests,
  ...acdLoopRecordBoardDeferredTests,
  ...acdLoopRecordWriteScopeTests,
  ...acdLoopRecordSignoffShapeTests,
  ...acdLoopRecordNeverGatesTests,
  // milestone 124 / story 01 — FF-12404 (see the import note).
  ...acdCapExhaustionReturnsToThePlanTests,
  // milestone 126 / story 00 — FF-12601, FF-12602 (see the import note).
  ...acdClockCountsAttemptsTests,
  ...acdLoopNarratesInFlightTests,
  // milestone 126 / story 02 — FF-12604 (see the import note).
  ...acdDeclarationPredicateIsComposedTests,
  // story 125 / task 01 — the published site's placement control (see the import note).
  ...acdSiteIsProjectedNotCopiedTests,
];
