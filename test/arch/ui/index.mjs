// THE ARCH/UI SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 42 (item 5 — the gate must gate): acd-sync-root-set is RETIRED — its
// subject (src/mesh-sync.mjs, the m22/m23 git-bus sync engine) was eliminated by
// 33/ADR-002's relay-transport redesign, and the test failed on ENOENT ever since
// (a permanently-red gate gates nothing).
// milestone 26 — distributed-runs-leasing (story 01: the lease-of-record + mesh-aware
// next — GIT-ONLY; ADR-003 + ADR-005, no relay). src/mesh-lease.mjs (NEW) carries the
// frozen six-key claim record { itemRef, nodeId, state, claimedAt, runId, aofVersion },
// the absence-tolerant/torn-skipping claim reads, the presence-tied liveness predicate
// (claimLiveness — presence IS the lease clock, the PO lock: claimed + no-presence =
// leased-unknown, skip NOT reclaimable), the PURE resolveArbitration, own-path hygiene
// (withdrawOwnLapsedClaims), acquireLease/releaseLease/standDown over an INJECTED
// runSync (bounded by the exported MAX_CLAIM_SYNC_ATTEMPTS — ambiguity fails CLOSED),
// and the pure buildLeaseView (disk-first, add-skip-only hint overlay).
// work.mjs:nextWork gains the OPTIONAL { leaseView } third argument (absent ⇒
// byte-identical; leased-live ⇒ skip + the all-leased false-accept guard; leased-stale
// ⇒ ready + { reclaimable, leasedBy }); commands/next.mjs injects the view under the
// config.mesh.nodeId gate; commands/mesh-identity.mjs renders the additive mesh:status
// lease section ({ itemRef, holder, live } — key absent when unconfigured). Four
// @executable task features: 00_lease-claim-and-arbitration (real two-clone git race +
// the scripted-envelope fake), 01_presence-is-the-lease-clock, 02_mesh-aware-next,
// 03_lease-render-on-status. Fitness #6–#8: acd-lease-write-scope,
// acd-next-lease-injected, acd-lease-arbitration-git-observed.
// milestone 26 (story 02) — distributed-runs-leasing: claim integration + relay
// fast-path + fleet reclaim — the A2 join (ADR-004 + ADR-006). work:run-start composes
// the FROZEN sequence in ONE file (fleet-reclaim prefilter → acquireLease over the
// mesh-aware root set, the best-effort pushLeaseSignal riding acquire's onClaimWritten
// slot — claim-write → INTENT → sync, caught-never-thrown → hold ⇒ mint-with-node +
// runId tie-back / stand-down ⇒ no mint + heldBy; the reclaimed-lineage retryOf
// refinement, never the dead peer's sessionId); work:run-complete releases the
// holder's OWN claim on ALL THREE terminal outcomes under the config.mesh gate;
// work:run-retry threads node through the lineage mint (the sanctioned retryRun
// co-edits: node + the sessionId override);
// mesh-relay-client.mjs gains the second wire kind (LEASE_SIGNAL_KIND +
// leaseRelayEnvelope + the propagating pushLeaseSignal — ZERO change to
// mesh-relay.mjs); mesh-presence-cache.mjs gains createLeaseCache (itemRef-keyed,
// latest-wins, in-memory only) and the subscriber the additive lease apply branch.
// Four @executable task features (00_claim-sequence-a2 over a real bare-remote
// two-clone fixture + the injected four-state relay stub; 01_lease-release-on-
// complete; 02_relay-fast-path-defer over ONE shared cache instance + the injected
// transport; 03_fleet-orphan-reclaim — the dual-staleness decision table with
// presence precedence under injected clocks). The @manual 04_kr2-contested-soak
// gets NO executable test (measured at aof:verify on a real two-node fleet).
// Fitness #9/#12: acd-claim-relay-independent, acd-fleet-reclaim-guarded (+ the
// run-complete release-gate half; enumerates the re-armed acd-run-reclaim-stale-only
// / acd-status-rollback-bounded).
// milestone 33 / story 01 (ADR-002.1 — F-3204): task 02_relay-fast-path-defer's
// RECEIVE-side rows (the persistent subscriber applying a lease frame into
// createLeaseCache) are RETIRED with src/mesh-presence-subscriber.mjs +
// src/mesh-presence-cache.mjs — superseded by 33/ADR-002 — the broker is eliminated
// (relayLeaseFastPathTests is TRIMMED to its surviving SEND-side row; fitness
// acd-lease-cache-only, the receive-side cache-only guard, is RETIRED outright — no
// module remains for it to guard). REVIEW FIX (story-01 review): acd-relay-lease-blind
// is ALSO RETIRED here — ADR-002's fitness ledger + STORY.md both name it a sibling of
// the other three relay arch-tests sharing the broker's fate, and serveRelay/relayMode
// are confirmed DEAD code (no live caller) once the broker is eliminated, so this guard
// now protects a broker that no longer brokers — superseded by 33/ADR-002 — the broker
// is eliminated.
// milestone 42 (item 5): acd-claim-relay-independent is RETIRED — the lease/claim
// path it guarded (acquireLease/pushLeaseSignal in run-start.mjs) was superseded by
// m35's assignment record; no lease call site remains in the run commands.
import { archTests as acdFleetReclaimGuardedTests } from "./acd-fleet-reclaim-guarded.test.mjs";
import { archTests as acdReusesRenderPlanTests } from "./acd-reuses-render-plan.test.mjs";
import { archTests as acdBoardWriteIsolationTests } from "./acd-board-write-isolation.test.mjs";
import { archTests as acdVibeyardAttributionTests } from "./acd-vibeyard-attribution.test.mjs";
import { archTests as acdBoardSingleServerTests } from "./acd-board-single-server.test.mjs";
import { archTests as acdBoardServerNoFleetImportTests } from "./acd-board-server-no-fleet-import.test.mjs";
// …and THE GATE ADR-005's `fixed inset-0` PROHIBITION NEVER HAD. `acd-shell-z-ladder-single-home`
// caught only the `z-50` half of the one live violation, and its exemption retired with the FILE
// rather than with the RULE — so the day 46/04 deleted `FleetTerminalView.tsx` that gate went
// green while the SHAPE survived under a new name in the extracted control. A rule whose only
// enforcement was an exemption on a deleted file is not enforced.
import { archTests as acdNoPerSurfaceFixedOverlayTests } from "./acd-no-per-surface-fixed-overlay.test.mjs";
// milestone 07 — design-conformance verification (ADRs 001–005 carry fitness functions; ADR-006 is the
// story-partition rationale, no arch-test). NEW: role-split, verdict-contract, template-baseline,
// a11y-config-schema, and the design-conformance-bundled drift guard.
import { archTests as acdDesignRoleSplitTests } from "./acd-design-role-split.test.mjs";
import { archTests as acdConformanceVerdictContractTests } from "./acd-conformance-verdict-contract.test.mjs";
import { archTests as acdDesignTemplateBaselineTests } from "./acd-design-template-baseline.test.mjs";
import { archTests as acdA11yConfigSchemaTests } from "./acd-a11y-config-schema.test.mjs";
import { archTests as acdDesignConformanceBundledTests } from "./acd-design-conformance-bundled.test.mjs";
// milestone 71 / story 03 — the render lane gated on renderability (ADR-005, amended by
// ADR-009 §C/§D/§5): FF-7102. The three milestone-07 controls it supersedes are amended
// in place — 07's delivered `.feature` files are immutable and are not touched.
import { archTests as acdRenderLaneIsGatedTests } from "./acd-render-lane-is-gated.test.mjs";
import { archTests as acdRenderedComponentFedByRouteTests } from "./acd-rendered-component-fed-by-route.test.mjs";
import { archTests as acdFleetTerminalInputConstrainedTests } from "./acd-fleet-terminal-input-constrained.test.mjs";
// SECURITY T14 concern #2 / finding F17 (as-built review, story 06 hybrid, 2026-07-19):
// the terminal-frame's routing nodeId must be RE-STAMPED with the connection-bound
// identity (meta.nodeId) before the loopback push — never the worker's self-declared
// frame.nodeId. acd-fleet-terminal-frame-connection-identity pins this (gate (a) is
// RED-until-fixed: mesh-launcher.mjs:719 pushes the raw frame, so a malicious admitted
// worker can target another node's fleet card; the developer's one-line re-stamp flips
// it green) + moves T14 concern #1's credential-source pin onto the LIVE sendTerminalFrame
// path (wireTerminalBridge was retired and is now DELETED — m46/story 01, ADR-007),
// which is already green.
import { archTests as acdFleetTerminalFrameConnectionIdentityTests } from "./acd-fleet-terminal-frame-connection-identity.test.mjs";
import { archTests as acdFleetFaceSingleMutationRouteTests } from "./acd-fleet-face-single-mutation-route.test.mjs";
// milestone 38 / story 04 — ADR-012 AMENDMENT (2026-07-24, BLOCKER F21): the
// assign route targets the ITEM's own workspace, never the daemon's launch dir.
// A COMPANION file, so the four inv.1-4 clauses above stay untouched and green.
// ARMED RED-until-fixed by design (the entry-21 precedent).
import { archTests as acdFleetAssignTargetsItemWorkspaceTests } from "./acd-fleet-assign-targets-item-workspace.test.mjs";
// milestone 36 / mesh desktop app — the native Windows supervisor's STRUCTURAL
// invariants (ADR-003/ADR-004), authored at refine as GUARD-IF-PRESENT arch-tests:
// each asserts its invariant when its target (the greenfield app/desktop/ Rust subtree,
// or the new CLI-only nested verbs in meshCommand) exists, and is a deliberate no-op
// while absent — so the suite stays GREEN now and each guard converts to a hard
// assertion the moment the code lands. no-mesh-logic + single-data-path + read-only +
// trusted-spawn target the Rust subtree; verbs-outside-bijection guards the CLI seam
// (and asserts the existing ui/repo/assign sibling precedent NOW).
import { archTests as acdDesktopNoMeshLogicTests } from "./acd-desktop-no-mesh-logic.test.mjs";
import { archTests as acdDesktopSingleDataPathTests } from "./acd-desktop-single-data-path.test.mjs";
import { archTests as acdDesktopReadOnlyFleetTests } from "./acd-desktop-read-only-fleet.test.mjs";
import { archTests as acdDesktopTrustedSpawnTests } from "./acd-desktop-trusted-spawn.test.mjs";
// milestone 126 / story 03 — the supervisor reconciles a SUPPLIED set (ADR-006): FF-12606.
// Its roster leg lands in acd-desktop-read-only-fleet.test.mjs, in that control's OWN file
// (ADR-006 §8 EXTENDS it rather than siblinging it) — so that file now exports a SECOND
// binding, and both are spread below, because a binding imported and not spread is no gate.
import { archTests as acdDesktopSuppliedSetTests } from "./acd-desktop-supervises-a-supplied-set.test.mjs";
import { rosterTests as acdDesktopSpawnRosterTests } from "./acd-desktop-read-only-fleet.test.mjs";
// ── milestone 45 · UI app shell & path routing — the fitness functions authored at refine.
// EXPECTED RED until 45's stories land; that is the house convention (an arch test written
// at refine time is part of the CONTRACT, not a report on the present), and they are
// registered NOW because m43/ADR-014 E7 established that an unregistered suite is no gate
// at all — including a red one nobody can see.
//   ADR-001/002 — ONE route table; the render root selects through it and by nothing else;
//                 the application entry imports surfaces and defines none.
import { archTests as acdUiSingleRouteTableTests } from "./acd-ui-single-route-table.test.mjs";
//   ADR-002/003 — no `?mode=` surface URL is minted anywhere in src/ · ui/src/ · app/desktop/;
//                 the legacy vocabulary is read-only and only the translator reads it.
import { archTests as acdNoSurfaceModeUrlLiteralTests } from "./acd-no-surface-mode-url-literal.test.mjs";
//   ADR-004     — ONE shared static-serving module (src/static-serve.mjs) for BOTH servers:
//                 the history fallback never shadows /api/* and never masks a missing asset
//                 (driven against the REAL serveSetupUi handler, not a copy of its logic),
//                 and the byte-identical, twice-defined safeStaticPath traversal guard
//                 (setup-ui.mjs:269-280 == mesh-ui-serve.mjs:873-884) gets one definition.
import { archTests as acdSpaFallbackNeverMasksTests } from "./acd-spa-fallback-never-masks.test.mjs";
// ── milestone 47 — /fleet WITH A REPO FILTER. Four fitness functions, written at refine
// (2026-08-10) and registered here the same day, because an unregistered suite is no gate at all
// (m43/ADR-014 E7) — including a RED one nobody can see. Two are EXPECTED RED until 47's stories
// land and two are GREEN ON ARRIVAL, and the distinction is kept explicit: a ratchet written at
// refine forecasts a contract; a ratchet green on arrival PRESERVES one that already holds.
//   ADR-001/003 — the repo filter has ONE home (`ui/src/fleet/scope.mjs`): no sibling filter
//                 module, no module outside that home naming the `repo` query key (the route
//                 module and the shell nav included — m45/ADR-006's passthrough and
//                 shell-nav.mjs's positional href rule are both properties of NOT KNOWING the
//                 name), and exactly ONE call site for the narrowing.
import { archTests as acdFleetFilterSingleHomeTests } from "./acd-fleet-filter-single-home.test.mjs";
//   ADR-004     — EVERY REGION, OR NONE: every array collection on the `GlobalMeshStatus` wire is
//                 narrowed or DECLARED machine-wide (read off the wire TYPE, so adding `boards`
//                 fails CI the day the type changes), and the narrowing is applied ONCE, above the
//                 region fan-out and BEFORE `pageState` judges emptiness. Also pins the node rule
//                 — membership — which deliberately DIVERGES from `?scope=local`, so neither
//                 behaviour gets "unified" into the other by a later reader.
import { archTests as acdFleetFilterEveryRegionTests } from "./acd-fleet-filter-every-region.test.mjs";
//   ADR-002     — the filter is READ-SIDE and CLIENT-SIDE: `/api/mesh/status`'s accepted input
//                 stays exactly `scope`, the fleet client mints no filter parameter, and `src/`
//                 grows no home for the filter at all. That last clause is what makes SPEC's "the
//                 read-only contract stays green UNTOUCHED" checkable rather than remembered.
import { archTests as acdFleetFilterReadOnlyTests } from "./acd-fleet-filter-read-only.test.mjs";
//   ADR-006a    — no hard-coded board address anywhere in `ui/src/fleet/`; every drill-in resolves
//                 through `GET /api/mesh/board-url`, the ONE thing that knows a board's ephemeral
//                 per-workspace port. RED today at the inherited defect (m45/STATE F-45-04-1(a),
//                 `Fleet.tsx:1427`'s relative `href="/board"`), and written against the RULE rather
//                 than the region, so it still binds after ADR-006 deletes the dead branch.
import { archTests as acdFleetBoardLinkResolvedTests } from "./acd-fleet-board-link-resolved.test.mjs";
//   the m48 pin `mesh-fleet-session-subsumption-render` (registered with m48's block above)
//   keeps its two-sessions-one-repo row — REWRITTEN to the new answer, never deleted — and
//   its rule-form assertion is REPLACED BY ANOTHER RULE (test/support/session-line-rule.mjs,
//   shared with the suite above so the rule has ONE home).
//   task 01 — the TEETH: the AMENDED fitness function `acd-captured-producer-fixture`
//   (registered at the top of this file) gains a FIFTH captured payload carrying two live
//   sessions in one repo with no run, plus ADR-010's non-vacuity clause — before it, no
//   fixture exercised the case, so the cross-language gate could not see this change at all.
// ── milestone 49 / story 02 — THE HOME'S PURE CORE (ADR-003 the feed axis, ADR-006 the socket
// cap, ADR-009 layout, ADR-001's directory ratchet). It creates `ui/src/home/` as framework-free
// `.mjs` with `.d.mts` siblings, RENDERS NOTHING and is imported by no component — the shape m45
// and m46 both used, because this repo has NO React test harness and a rule that can only be
// exercised through a component is a rule with no test. Every module is driven EXHAUSTIVELY (the
// PO's ruling: invariant 4 part 2's whole-table precedent is the standard), because each answers
// a question where a wrong answer is SILENT ON SCREEN.
//   FOUR FITNESS FUNCTIONS, all GREEN ON ARRIVAL because their subjects land in the same diff:
//     · acd-home-pane-truth — the home defines no state word of its own, the feed derivation
//       reads NO byte, the precedence is ONE pure function. (ADR-007's POSTURE clause is 49/03's
//       and is routed in that file's header rather than left as a hole.)
import { archTests as acdHomePaneTruthTests } from "./acd-home-pane-truth.test.mjs";
//     · acd-home-socket-cap-single-arbiter — ONE `MAX_LIVE_PANES` in ONE module, the cap AND the
//       currently-subscribed set are ARGUMENTS, and the number is `<= MAX_TAIL_KEYS` read ACROSS
//       THE BUILD BOUNDARY as text (the technique acd-terminal-mirror-geometry-pinned invented
//       for 80x24 — its second instance). Also textual: the number may NOT be justified by a
//       browser limit, because RESEARCH's first pass did exactly that and produced a 6-pane grid.
import { archTests as acdHomeSocketCapSingleArbiterTests } from "./acd-home-socket-cap-single-arbiter.test.mjs";
//     · acd-home-layout-is-a-filter — no browser global anywhere under `ui/src/home/**`, the
//       persisted shape is tuples and focus and nothing else, and the composer's output is a
//       SUBSET of the live rows BY IDENTITY (a composer that rebuilds a row from a stored tuple
//       passes every deep-equal check ever written against it).
import { archTests as acdHomeLayoutIsAFilterTests } from "./acd-home-layout-is-a-filter.test.mjs";

export const tests = [
  ...acdFleetReclaimGuardedTests,
  ...acdReusesRenderPlanTests,
  ...acdBoardWriteIsolationTests,
  ...acdVibeyardAttributionTests,
  ...acdBoardSingleServerTests,
  ...acdBoardServerNoFleetImportTests,
  ...acdNoPerSurfaceFixedOverlayTests,
  ...acdDesignRoleSplitTests,
  ...acdConformanceVerdictContractTests,
  ...acdDesignTemplateBaselineTests,
  ...acdA11yConfigSchemaTests,
  ...acdDesignConformanceBundledTests,
  // milestone 71 / story 03 — the render lane is gated on renderability: FF-7102. Its two
  // task features are prompt-layer claims driven by this suite; the story lands no runtime
  // module, only the `work.ui.renderer` schema key the precondition reads.
  ...acdRenderLaneIsGatedTests,
  ...acdRenderedComponentFedByRouteTests,
  ...acdFleetTerminalInputConstrainedTests,
  ...acdFleetTerminalFrameConnectionIdentityTests,
  ...acdFleetFaceSingleMutationRouteTests,
  ...acdFleetAssignTargetsItemWorkspaceTests,
  // milestone 36 — mesh desktop app: the guard-if-present structural fitness functions
  // (ADR-003/ADR-004). Green now (targets absent, pre-build); each arms at build.
  ...acdDesktopNoMeshLogicTests,
  ...acdDesktopSingleDataPathTests,
  ...acdDesktopReadOnlyFleetTests,
  ...acdDesktopTrustedSpawnTests,
  // milestone 126 / story 03 — FF-12606, plus the roster leg extended into the control above.
  ...acdDesktopSuppliedSetTests,
  ...acdDesktopSpawnRosterTests,
  // milestone 45 — UI app shell & path routing (EXPECTED RED until 45's stories land)
  ...acdUiSingleRouteTableTests,
  ...acdNoSurfaceModeUrlLiteralTests,
  ...acdSpaFallbackNeverMasksTests,
  // milestone 47 — /fleet with a repo filter (architect's refine, 2026-08-10). Two EXPECTED RED
  // until 47's stories land (the narrowing has no call site and no seam; the board href is the
  // inherited m45 defect), two GREEN ON ARRIVAL (the sibling/`repo`-key sweeps and the whole
  // read-only lane). Each file states its own expectation at the top.
  ...acdFleetFilterSingleHomeTests,
  ...acdFleetFilterEveryRegionTests,
  ...acdFleetFilterReadOnlyTests,
  ...acdFleetBoardLinkResolvedTests,
  // milestone 49 / story 02 — the home's pure core. Four fitness functions (all GREEN ON
  // ARRIVAL: their subjects land in this same diff), then the four @executable task features —
  // 00 the feed axis, 01 the socket-cap arbiter (which also drives the shipped cap detector to
  // eleven planted violations), 02 the layout filter, 03 the directory ratchet.
  ...acdHomePaneTruthTests,
  ...acdHomeSocketCapSingleArbiterTests,
  ...acdHomeLayoutIsAFilterTests,
];
