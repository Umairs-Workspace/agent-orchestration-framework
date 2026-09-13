// THE ARCH/ASSIGNMENT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdAssignmentResolvesToALoopCallTests } from "./acd-assignment-resolves-to-a-loop-call.test.mjs";
import { archTests as acdWorktreeNeverLinkedTests } from "./acd-worktree-never-linked.test.mjs";
import { archTests as acdSlotBeforeAdmissionTests } from "./acd-slot-before-admission.test.mjs";
import { archTests as acdLaneIsTheLocalSlotTests } from "./acd-lane-is-the-local-slot.test.mjs";
import { archTests as acdAssignmentStateHasProducerTests } from "./acd-assignment-state-has-producer.test.mjs";
import { archTests as acdAssignmentRecordFrozenTests } from "./acd-assignment-record-frozen.test.mjs";
import { archTests as acdAssignmentsSurviveSnapshotTests } from "./acd-assignments-survive-snapshot.test.mjs";
import { archTests as acdAssignmentArbitrationStoreNotGitTests } from "./acd-assignment-arbitration-store-not-git.test.mjs";
import { archTests as acdAssignmentTargetNotConnectedLoudTests } from "./acd-assignment-target-not-connected-loud.test.mjs";
import { archTests as acdAssignmentStatusAuthoredByHolderTests } from "./acd-assignment-status-authored-by-holder.test.mjs";
import { archTests as acdAssignmentWorktreePathScopedTests } from "./acd-assignment-worktree-path-scoped.test.mjs";
import { archTests as acdWorktreePathScopedTests } from "./acd-worktree-path-scoped.test.mjs";
import { archTests as acdAssignmentRepoAvailabilityLoudTests } from "./acd-assignment-repo-availability-loud.test.mjs";
import { archTests as acdAssignmentReclaimDualStalenessTests } from "./acd-assignment-reclaim-dual-staleness.test.mjs";
import { archTests as acdAssignmentRunStoreMeshBlindTests } from "./acd-assignment-run-store-mesh-blind.test.mjs";
import { archTests as acdWorkerCloneTargetScopedTests } from "./acd-worker-clone-target-scoped.test.mjs";
import { archTests as acdWorkerCloneNoCredentialPersistedTests } from "./acd-worker-clone-no-credential-persisted.test.mjs";
import { archTests as acdWorkerCheckoutReusesWorktreeTests } from "./acd-worker-checkout-reuses-worktree.test.mjs";
import { archTests as acdWorkerDriverNoHeadlessPrintTests } from "./acd-worker-driver-no-headless-print.test.mjs";
import { archTests as acdParkPublishedOnceAfterExitTests } from "./acd-park-published-once-after-exit.test.mjs";
import { archTests as acdWorkerStreamSinglePredicateTests } from "./acd-worker-stream-single-predicate.test.mjs";
import { archTests as acdWorkerStreamFabricAddressedTests } from "./acd-worker-stream-fabric-addressed.test.mjs";
import { archTests as acdWorkerStreamNonBlockingTests } from "./acd-worker-stream-non-blocking.test.mjs";
// m42 wave (d) leg d3 — one transition seam in front of the assignment fact: the
// holder + terminal-never-regresses guards, inherited by every writer.
import { archTests as acdAssignmentTransitionSeamTests } from "./acd-assignment-transition-seam.test.mjs";
// m42 wave (d) leg d4 (port 2) — the two reclaim halves on ONE edge: a reclaim is a
// run completion, so both raise it and both inherit the declared rollback (the
// control tick never had one).
import { archTests as acdReclaimOneEdgeTests } from "./acd-reclaim-one-edge.test.mjs";
// m42 brittleness cure — one derivable branch per item (aof/mesh/<ref>); the
// per-assignment mint retired, the side table demoted to a cache that wins on hit.
import { archTests as acdItemBranchDerivableTests } from "./acd-item-branch-derivable.test.mjs";
// ADR-003 — one execution-scope rule, one lock door (inside transitionRunStart), and the
// run store stays mesh-blind.
import { archTests as acdItemLockSingleDoorTests } from "./acd-item-lock-single-door.test.mjs";
import { archTests as acdDispatchBoundSingleHomeTests } from "./acd-dispatch-bound-single-home.test.mjs";

export const tests = [
  ...acdAssignmentResolvesToALoopCallTests,
  ...acdWorktreeNeverLinkedTests,
  ...acdSlotBeforeAdmissionTests,
  ...acdLaneIsTheLocalSlotTests,
  ...acdAssignmentStateHasProducerTests,
  ...acdAssignmentRecordFrozenTests,
  ...acdAssignmentsSurviveSnapshotTests,
  ...acdAssignmentArbitrationStoreNotGitTests,
  ...acdAssignmentTargetNotConnectedLoudTests,
  ...acdAssignmentStatusAuthoredByHolderTests,
  ...acdAssignmentWorktreePathScopedTests,
  ...acdWorktreePathScopedTests,
  ...acdAssignmentRepoAvailabilityLoudTests,
  ...acdAssignmentReclaimDualStalenessTests,
  ...acdAssignmentRunStoreMeshBlindTests,
  ...acdWorkerCloneTargetScopedTests,
  ...acdWorkerCloneNoCredentialPersistedTests,
  ...acdWorkerCheckoutReusesWorktreeTests,
  ...acdWorkerDriverNoHeadlessPrintTests,
  ...acdParkPublishedOnceAfterExitTests,
  ...acdWorkerStreamSinglePredicateTests,
  ...acdWorkerStreamFabricAddressedTests,
  ...acdWorkerStreamNonBlockingTests,
  ...acdAssignmentTransitionSeamTests,
  ...acdReclaimOneEdgeTests,
  ...acdItemBranchDerivableTests,
  ...acdItemLockSingleDoorTests,
  ...acdDispatchBoundSingleHomeTests,
];
