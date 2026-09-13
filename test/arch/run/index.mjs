// THE ARCH/RUN SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdRunNodePathSingleBuilderTests } from "./acd-run-node-path-single-builder.test.mjs";
import { archTests as acdRunRecordDerivedTests } from "./acd-run-record-derived.test.mjs";
import { archTests as acdRunWriteScopeTests } from "./acd-run-write-scope.test.mjs";
import { archTests as acdRunPartitionReadyTests } from "./acd-run-partition-ready.test.mjs";
import { archTests as acdRunRetryClassificationTests } from "./acd-run-retry-classification.test.mjs";
import { archTests as acdRunRetryResumesLineageTests } from "./acd-run-retry-resumes-lineage.test.mjs";
import { archTests as acdRunReclaimStaleOnlyTests } from "./acd-run-reclaim-stale-only.test.mjs";
import { archTests as acdRunPersistAtomicTests } from "./acd-run-persist-atomic.test.mjs";
import { archTests as acdRunDedupNoDuplicateTests } from "./acd-run-dedup-no-duplicate.test.mjs";
import { archTests as acdRunRecordNodeAdditiveTests } from "./acd-run-record-node-additive.test.mjs";
import { archTests as acdRunPhaseSingleAuthorityTests } from "./acd-run-phase-single-authority.test.mjs";
import { archTests as acdProgressMeasuredNotJudgedTests } from "./acd-progress-measured-not-judged.test.mjs";
import { archTests as acdProgressLedgerConsumedTests } from "./acd-progress-ledger-consumed.test.mjs";
// milestone 126 / story 01 — FF-12603. The render names the record, the `--json` document does not
// move on any of its six producing sites, and 53/FF-5307's byte-pin on this file is RE-PINNED in
// the open rather than dropped — the narrowing of 53/ADR-004 that ADR-003 §4 records.
import { archTests as acdRunStatusRendersTheRecordTests } from "./acd-run-status-renders-the-record.test.mjs";
import { archTests as acdNoLeaseStoreRunRecordUntouchedTests } from "./acd-no-lease-store-run-record-untouched.test.mjs";
import { archTests as acdRunStoreMeshFreeTests } from "./acd-run-store-mesh-free.test.mjs";
// milestone 38 / as-built amendment at aof:verify (ADR-004 AMENDMENT + the new
// ADR-008 "producer-fed contract test" rule) — the three fitness functions that arm
// the milestone's structural lesson: the frozen `string[]` wire shape across BOTH
// languages (F1+F8), the captured-fixture discipline for the cross-language surface
// (F7/F8), and the mounted-component guard (F9 — NodeCard was dead code in
// production while its fixture-fed test stayed green).
import { archTests as acdActiveRunsFrozenStringArrayTests } from "./acd-active-runs-frozen-string-array.test.mjs";
import { archTests as acdOutcomeRecordFrozenShapeTests } from "./acd-outcome-record-frozen-shape.test.mjs";
import { archTests as acdOutcomeSingleIndexSeamTests } from "./acd-outcome-single-index-seam.test.mjs";
import { archTests as acdOutcomeCapabilityRankingBoundedTests } from "./acd-outcome-capability-ranking-bounded.test.mjs";
import { archTests as acdOutcomeAuthoredByVerifyTests } from "./acd-outcome-authored-by-verify.test.mjs";
import { archTests as acdOutcomeDanglingDeclarationPresentTests } from "./acd-outcome-dangling-declaration-present.test.mjs";
import { archTests as acdOutcomeDeclaredFieldHasProducerTests } from "./acd-outcome-declared-field-has-producer.test.mjs";

export const tests = [
  ...acdRunNodePathSingleBuilderTests,
  ...acdRunRecordDerivedTests,
  ...acdRunWriteScopeTests,
  ...acdRunPartitionReadyTests,
  ...acdRunRetryClassificationTests,
  ...acdRunRetryResumesLineageTests,
  ...acdRunReclaimStaleOnlyTests,
  ...acdRunPersistAtomicTests,
  ...acdRunDedupNoDuplicateTests,
  ...acdRunRecordNodeAdditiveTests,
  ...acdRunPhaseSingleAuthorityTests,
  ...acdProgressMeasuredNotJudgedTests,
  ...acdProgressLedgerConsumedTests,
  ...acdNoLeaseStoreRunRecordUntouchedTests,
  // milestone 26 (story 00, mesh-blindness half only) — acd-run-store-mesh-free:
  // registered here at milestone 35 / story 02 build time (fitness #12
  // acd-assignment-run-store-mesh-blind re-arms it). FINDING: this arch-test was
  // imported (scripts/test.mjs) but never spread into this array — a pre-existing
  // registration gap discovered while arming #12 (see
  // test/arch/assignment/acd-assignment-run-store-mesh-blind.test.mjs's header comment for the
  // fuller finding, including the SIBLING acd-fleet-reclaim-guarded, which is left
  // UNregistered here because its 4th proof is now stale against the retired
  // git-bus lease machinery — flagged, not silently fixed, in this story's report).
  ...acdRunStoreMeshFreeTests,
  // the as-built amendment's fitness functions (ADR-004 AMENDMENT + ADR-008)
  ...acdActiveRunsFrozenStringArrayTests,
  ...acdOutcomeRecordFrozenShapeTests,
  ...acdOutcomeSingleIndexSeamTests,
  ...acdOutcomeCapabilityRankingBoundedTests,
  ...acdOutcomeAuthoredByVerifyTests,
  ...acdOutcomeDanglingDeclarationPresentTests,
  ...acdOutcomeDeclaredFieldHasProducerTests,
  // milestone 126 / story 01 — FF-12603 (see the import note).
  ...acdRunStatusRendersTheRecordTests,
];
