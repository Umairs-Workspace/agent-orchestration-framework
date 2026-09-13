// THE WORK/LIFECYCLE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { resolveItemsTests } from "./work-resolve.test.mjs";
import { orderWorkTests } from "./work-next.test.mjs";
// milestone 72 / story 01 — THE SELECTION: changed files reach suite files through the code graph
// the repo already builds, READ and never built; an UNKNOWN widens the selection to the whole suite
// and is NAMED with one of four exhaustive reasons, presence outranking the union so a test file
// created this turn widens rather than quietly selecting itself; every result carries the
// ARTIFACT's own instant or exactly null; selection is pure across calls; and a selected suite the
// runner does not assemble is reported in the census's own verdict, reached by import with no
// second derivation. The changed set itself comes from a bounded git reader through the one seam,
// where an unresolvable base and an empty set are REFUSALS rather than a fifth widening. Both
// @executable task features, plus FF-7202 and FF-7203.
import { workTestSelectTests } from "./work-test-select.test.mjs";
import { workMemorySeamTests } from "./work-memory-seam.test.mjs";
// milestone 03 — work board UI
import { workListTests } from "./work-list.test.mjs";
import { workDebtTests } from "./work-debt.test.mjs";
// milestone 68 / story 04 — story-and-phase-scoped-observe: the resolver reads one
// level deeper (NN/SS → the story's own folder; a bare story-like ref is refused,
// never substring-resolved), the per-phase rollup groups by brief.loop.phase (ADR-002,
// read never minted), and the registered command's --json door carries the scoped
// answer under a stable key set with the --if-enabled self-gate intact. The three
// @executable task features trace to test/work/lifecycle/work-observe-scope.test.mjs; this story
// declares no fitness function of its own.
import { workObserveScopeTests } from "./work-observe-scope.test.mjs";
// milestone 68 / story 05 — append-only snapshots: an observe run NEVER truncates or
// rewrites an existing snapshot; each writes a new timestamped artefact and the legacy
// pre-68 in-place files are marked, never migrated (ADR-007). The two @executable task
// features trace to test/work/lifecycle/work-observe-snapshots.test.mjs; FF-6807 is enforced by
// acd-observe-snapshots-append-only (registered below).
import { workObserveSnapshotsTests } from "./work-observe-snapshots.test.mjs";
// milestone 68 / story 03 — attribution-by-join: the two @executable task features
// (the sessionId join replacing the retired text matcher, and the content-based
// classifier replacing the retired command-name regex) trace to
// test/work/lifecycle/work-observe-attribution.test.mjs; FF-6805 + FF-6806 are enforced by
// acd-observe-attribution-by-join (registered below).
import { workObserveAttributionTests } from "./work-observe-attribution.test.mjs";
// milestone 70 / story 02 — cache-economics: `cacheRead ÷ cacheCreate` reported per
// phase from 68's spend buckets, plus a stated target turning the ratio into a
// met/missed verdict (ADR-008 — records, never enforces). The two @executable task
// features trace to test/work/lifecycle/work-observe-cache-economics.test.mjs; this story declares no
// fitness function of its own.
import { workObserveCacheEconomicsTests } from "./work-observe-cache-economics.test.mjs";
import { workOrchestratorTests } from "./work-orchestrator.test.mjs";
import { workNextReadySetTests } from "./work-next-ready-set.test.mjs";
import { workDispatchLaneTests } from "./work-dispatch-lanes.test.mjs";
// milestone 96 / story 03 — the test run matches the story. One behavioural suite over all three
// task contracts (the declared write set as a changed-set source and its parser-inherited quirks,
// the declared path the graph does not know widening rather than dropping, and the one selector the
// lanes call) plus FF-9604 (one selection authority, the shipped parser, the widening driven over a
// planted graph, no narrowing path, and the two invocation refusals).
import { workTestDeclaredTests } from "./work-test-declared.test.mjs";

export const tests = [
  ...resolveItemsTests,
  ...orderWorkTests,
  // milestone 72 / story 01 — the selection (tasks 00–01) plus FF-7202 and FF-7203.
  ...workTestSelectTests,
  ...workMemorySeamTests,
  ...workListTests,
  ...workDebtTests,
  // milestone 68 / story 04 — story-and-phase-scoped-observe (the three @executable
  // task features; no fitness function of its own).
  ...workObserveScopeTests,
  // milestone 68 / story 05 — append-only snapshots: the two @executable task features
  // + FF-6807 (acd-observe-snapshots-append-only).
  ...workObserveSnapshotsTests,
  // milestone 68 / story 03 — attribution-by-join: the two @executable task features
  // + FF-6805 + FF-6806 (acd-observe-attribution-by-join).
  ...workObserveAttributionTests,
  // milestone 70 / story 02 — cache-economics (the two @executable task features;
  // no fitness function of its own).
  ...workObserveCacheEconomicsTests,
  ...workOrchestratorTests,
  ...workNextReadySetTests,
  ...workDispatchLaneTests,
  // milestone 96 / story 03 — the story-scoped test run and its one control (see the import note).
  ...workTestDeclaredTests,
];
