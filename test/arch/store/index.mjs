// THE ARCH/STORE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdNoClobberWithoutForceTests } from "./acd-no-clobber-without-force.test.mjs";
import { archTests as acdUnifiedLockSectionsTests } from "./acd-unified-lock-sections.test.mjs";
// milestone 12 — managed tool provisioning (story 04: the FIVE provisioning fitness
// functions of ADR-005 — store-first resolution, AOF_GLOBAL_HOME-honoured/no-hardcoded
// -home, provider-neutral registry, npx-lane-preserved, uninstall-store-scoped)
import { archTests as acdToolStoreResolutionOrderTests } from "./acd-tool-store-resolution-order.test.mjs";
import { archTests as acdToolStoreGlobalHomeTests } from "./acd-tool-store-global-home.test.mjs";
import { archTests as acdUninstallStoreScopedTests } from "./acd-uninstall-store-scoped.test.mjs";
import { archTests as acdGlobalStoreNoNativeDepTests } from "./acd-global-store-no-native-dep.test.mjs";
import { archTests as acdGlobalPropagationSinglePredicateTests } from "./acd-global-propagation-single-predicate.test.mjs";
import { archTests as acdGlobalPublisherSingleSeamTests } from "./acd-global-publisher-single-seam.test.mjs";
// m42 wave (b) / TECH_DEBT item 4 — workspace identity has ONE home
// (workspace-identity.mjs); no hand-spelled `?? workspaceIdFor(...)` fallback.
import { archTests as acdWorkspaceIdentitySingleHomeTests } from "./acd-workspace-identity-single-home.test.mjs";
// m42 wave (d) leg d4 — the install lock has several writers and no owner: every
// one of them read-merges, so an init/migrate can no longer delete work/planning.
import { archTests as acdLockReadMergedTests } from "./acd-lock-read-merged.test.mjs";
// m42 wave (d) leg d4 (port 1) — publish-on-mutate is a LEDGERED consequence: the
// per-command withGlobalWorkPropagation wrapper is retired, publishing has one
// door, and the reactor's warning is threaded back onto the command result.
import { archTests as acdPublishOnMutateLedgeredTests } from "./acd-publish-on-mutate-ledgered.test.mjs";
// m42 wave (d) leg d4 (port 3) — insert/reindex raises `stream.reindexed` carrying
// its own OLD -> NEW ref map, so the stores keyed by ref converge with the renumber
// (the silent Notion page mis-binding dies).
import { archTests as acdStreamReindexCascadeTests } from "./acd-stream-reindex-cascade.test.mjs";
// m42 — the shared-store concurrency pragmas (STATE's measured "database is
// locked every ~5s" residual): every multi-process SQLite store opens with
// busy_timeout, the projection with WAL, proven by a cross-process collision
// against a pre-fix control.
import { archTests as acdSharedStoreConcurrencyTests } from "./acd-shared-store-concurrency.test.mjs";
// ADR-005 — the reader migration's boundary in BOTH directions: the cache seam depends
// on work.mjs (never the reverse), and the worker-side/structural readers stay on disk.
import { archTests as acdCacheReadSurfaceBoundaryTests } from "./acd-cache-read-surface-boundary.test.mjs";
// ADR-006 — one staleness predicate (strict >), one threshold (on the wire), and the
// settled never-evict rule: no DELETE against a cache table may be predicated on time.
import { archTests as acdCacheStalenessSinglePredicateTests } from "./acd-cache-staleness-single-predicate.test.mjs";
// milestone 126 / story 05 — FF-12608: one import home, a targeted filter restored in a
// `finally`, and no blanket suppression under src/, bin/, scripts/, the bundle or package.json.
// `test/` is deliberately outside the swept roots — a harness suppressing its own child's
// warnings is a legitimate choice, and the consequence (every CLI integration test is blind to
// this warning) is stated in the control rather than hidden.
import { archTests as acdSqliteRuntimeHasOneHomeTests } from "./acd-sqlite-runtime-has-one-home.test.mjs";

export const tests = [
  ...acdNoClobberWithoutForceTests,
  ...acdUnifiedLockSectionsTests,
  ...acdToolStoreResolutionOrderTests,
  ...acdToolStoreGlobalHomeTests,
  ...acdUninstallStoreScopedTests,
  ...acdGlobalStoreNoNativeDepTests,
  ...acdGlobalPropagationSinglePredicateTests,
  ...acdGlobalPublisherSingleSeamTests,
  ...acdWorkspaceIdentitySingleHomeTests,
  ...acdLockReadMergedTests,
  ...acdPublishOnMutateLedgeredTests,
  ...acdStreamReindexCascadeTests,
  ...acdSharedStoreConcurrencyTests,
  ...acdCacheReadSurfaceBoundaryTests,
  ...acdCacheStalenessSinglePredicateTests,
  ...acdSqliteRuntimeHasOneHomeTests,
];
