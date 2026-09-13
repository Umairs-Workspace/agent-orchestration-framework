// THE STORE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 12 — managed tool provisioning (story 00: the spine — the store
// geometry + store-first resolver, ADR-001; the provider registry + uv lane +
// frozen tool descriptors, ADR-002; @executable traceability)
import { toolStorePathResolutionTests } from "./tool-store-path-resolution.test.mjs";
import { cacheStableLaunchTests } from "./cache-stable-launch.test.mjs";
import { globalWorkStoreTests } from "./global-work-store.test.mjs";
import { globalWorkPropagationTests } from "./global-work-propagation.test.mjs";
// milestone 43 / story 02 — THE AUTHORITY CUT (ADR-004 + ADR-010/D1/D2 + ADR-011/A1).
// `work_items` stops being a disk-rebuilt projection and becomes a provenance-stamped,
// row-upserted FACT written through ONE seam both the control node and every worker use,
// with deletion by author retraction. Task 00: the reclassification IS the enforcement.
// Task 01: one upsert seam, stamped by the CONNECTION-authenticated writer. Task 02:
// author retraction is the only deletion — never a sweep, never time. Task 03: the
// alternation proof (publish, stream a delta, publish again — the worker's row survives),
// including after the worktree is gone. Task 04: contention is decided by the ADR-003
// lock, in its two renderings. Task 05: a frame lands row by row (the P0.3 retirement).
// Task 06: the one named, operator-initiated workspace-removal path. Task 07: the own-disk
// read primitive is unchanged and no reader migrates. Task 08 (the two-machine soak) is
// `@manual` and deliberately has no test file here.
import { cacheAuthorityFactNotProjectionTests } from "./cache-authority-fact-not-projection.test.mjs";
import { cacheAuthorityUpsertSeamTests } from "./cache-authority-upsert-seam.test.mjs";
import { cacheAuthorityRetractionTests } from "./cache-authority-author-retraction.test.mjs";
import { cacheAuthorityAlternationTests } from "./cache-authority-alternation.test.mjs";
import { cacheAuthorityContentionTests } from "./cache-authority-contention-lock.test.mjs";
import { cacheAuthorityFrameRowByRowTests } from "./cache-authority-frame-row-by-row.test.mjs";
import { cacheAuthorityWorkspaceRemovalTests } from "./cache-authority-workspace-removal.test.mjs";
import { cacheAuthorityOwnDiskReadTests } from "./cache-authority-own-disk-read.test.mjs";
// …and the DATA-LAYER half of the same story. Task 00: opening a pre-v8 store lands the two
// provenance columns on `work_items` through a guarded, idempotent, IN-PLACE ALTER, leaves
// every existing row intact and UNSTAMPED (a fabricated backfill is forbidden), and touches
// neither content table. Task 01: every row and artifact the read surface serves says who
// reported it and when — STORAGE names in the store, WIRE names on the response, ONE mapper
// for both subjects — with the configured window stated once on the board envelope and the
// frozen CLI array unbroken. Task 02: the shared strict-`>` predicate judges the row and
// each artifact separately at an injected `now`, a missing instant reads `unknown` rather
// than `stale`, and an ancient row is marked stale yet stays fully readable — removal is by
// AUTHOR RETRACTION, never by age.
import { stalenessSchemaProvenanceTests } from "./staleness-schema-v8-provenance.test.mjs";
import { stalenessCachedRowsProvenanceTests } from "./staleness-cached-rows-provenance.test.mjs";
import { stalenessMarksNeverEvictsTests } from "./staleness-marks-never-evicts.test.mjs";
// milestone 43 / story 06 — THE READERS MIGRATE (ADR-005 + ADR-010/R6.x), the milestone's
// payoff: the cache stops being a write-only fact and becomes the READ surface. Task 00: a new
// cache-first seam (`src/work/read.mjs`) that imports `work.mjs` and is NEVER imported back,
// with every degrade named on the durable sink rather than silently swallowed. Task 01: the
// chokepoint — `commands/resolve.mjs` and its EIGHT dependents move together, with the
// write-doors guarded by one `item-not-local` refusal. Task 02: the control-side leaves migrate
// independently. Task 03: the worker-side and structural readers stay PINNED to disk by
// POSITIVE assertion — including the echo chamber, where a worktree must read its own disk and
// never another node's view of it. Task 04: doctor keeps ONE snapshot — structure from disk,
// status overlaid from the cache, each fact recording which side answered. Task 05 (the
// remote-authored soak) is @manual and deliberately has no test file here.
import { cacheReadSeamTests } from "./cache-read-seam.test.mjs";
import { cacheReadResolveChokepointTests } from "./cache-read-resolve-chokepoint.test.mjs";
import { cacheReadControlLeavesTests } from "./cache-read-control-leaves.test.mjs";
import { cacheReadBoundaryHoldsTests } from "./cache-read-boundary-holds.test.mjs";
import { cacheReadDoctorOverlayTests } from "./cache-read-doctor-overlay.test.mjs";
// milestone 126 / story 05 — the SQLite ExperimentalWarning has ONE filtered import home
// (ADR-008). Both callers collapse onto `src/sqlite-runtime.mjs` and keep their own refusals;
// the leaf's injected importer is what makes a throwing runtime and a counted import drivable
// in-process, and the real-runtime leg runs in a fresh child because Node raises the warning
// once per process.
import { sqliteRuntimeTests } from "./sqlite-runtime.test.mjs";

export const tests = [
  ...toolStorePathResolutionTests,
  ...cacheStableLaunchTests,
  ...globalWorkStoreTests,
  ...globalWorkPropagationTests,
  // milestone 43 / story 02 — the authority cut (tasks 00–07; 08 is @manual)
  ...cacheAuthorityFactNotProjectionTests,
  ...cacheAuthorityUpsertSeamTests,
  ...cacheAuthorityRetractionTests,
  ...cacheAuthorityAlternationTests,
  ...cacheAuthorityContentionTests,
  ...cacheAuthorityFrameRowByRowTests,
  ...cacheAuthorityWorkspaceRemovalTests,
  ...cacheAuthorityOwnDiskReadTests,
  // milestone 43 / story 04 — the data layer: schema v8's read side, the wire, the
  // predicate and the never-evict rule (tasks 00–02)
  ...stalenessSchemaProvenanceTests,
  ...stalenessCachedRowsProvenanceTests,
  ...stalenessMarksNeverEvictsTests,
  // milestone 43 / story 06 — the readers migrate (tasks 00–04; 05 is @manual)
  ...cacheReadSeamTests,
  ...cacheReadResolveChokepointTests,
  ...cacheReadControlLeavesTests,
  ...cacheReadBoundaryHoldsTests,
  ...cacheReadDoctorOverlayTests,
  ...sqliteRuntimeTests,
];
