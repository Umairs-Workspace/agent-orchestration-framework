// THE MESH/REGISTRY SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 24 — device-code group-enrollment (story 00: the group registry —
// src/mesh/registry.mjs is the group-level, control-node-owned SINGLE-WRITER second
// git-of-record (ADR-001): registryDir/registryPath under meshDir/registry/, the ONE
// control-node-guarded write seam writeRegistry (atomic writeText, opaque persist —
// a non-authority invocation is a structured no-op), the absence-tolerant
// readRegistry → empty registry, and the PURE add-only aggregate + pending-invite
// accessors (roster append / boards set-add / revocation append / pending append +
// single-use consume + the strict-> TTL read — time always INJECTED, 22/R2). Three
// @executable task features: 00_registry-store-and-seam (round-trip + futureField +
// ENOENT→empty + the control-node truth table + write-scope confinement + the atomic
// interrupted write), 01_roster-boards-revocations (order-preserving admit + board
// set semantics + explicit-deny revocation + add-only byte-unchanged), and
// 02_pending-invite-lifecycle (the codeHash-never-plaintext durable shape +
// single-use consumedAt + the strict-> expiresAt boundary). The @manual
// 03_registry-over-git feature gets NO executable test (verified at aof:verify).
// Fitness acd-registry-write-scope (imported above) turns GREEN with this story.
import { meshRegistryStoreSeamTests } from "./mesh-registry-store-seam.test.mjs";
import { meshRegistryAggregateMutationsTests } from "./mesh-registry-aggregate-mutations.test.mjs";
import { meshRegistryPendingLifecycleTests } from "./mesh-registry-pending-lifecycle.test.mjs";
// milestone 22 — mesh-foundation (story 00: mesh-store spine + face skeleton — the
// SPINE src/mesh/store.mjs: the partition path seam meshDir/nodeRecordPath (ADR-002),
// the frozen node-record schema's OPAQUE per-node persist/read (ADR-003) through the
// atomic writeText seam (19/R2), plus the greenfield `aof mesh` CLI dispatcher
// SKELETON (meshCommand in cli.mjs, ADR-001). Three task features (00_mesh-record-store
// / 01_path-partition-convention / 02_aof-mesh-face-skeleton) + the three fitness
// arch-tests — partition-write (FF#1), write-scope guard (FF#2), and the NEW
// registry-derived mesh-namespace bijection gate (FF#3, RED-until-commands, vacuous now).
import { meshRecordStoreTests } from "./mesh-record-store.test.mjs";
import { meshPartitionConventionTests } from "./mesh-partition-convention.test.mjs";
import { globalNodeRegistryTests } from "./global-node-registry.test.mjs";
// …and the story's Resync TRANSPORT (ADR-010/R4.2 + ADR-014/E2/E6), the node→node "push me
// your state" request the UI's one door calls. Modelled on mesh-recovery-push: a lazily
// created additive table (no schema bump), a control tick that dispatches to a connected
// admitted peer, and a worker result frame admitted by CONNECTION identity — including the
// spoofed self-declaring frame, which is refused with the row left byte-identical. Owed
// because tasks 05/06 are both @ui and cannot reach the codes the route layer produces.
import { meshResyncTests } from "./mesh-resync.test.mjs";

export const tests = [
  ...meshRegistryStoreSeamTests,
  ...meshRegistryAggregateMutationsTests,
  ...meshRegistryPendingLifecycleTests,
  // milestone 22 — mesh-foundation (story 00: mesh-store spine + face skeleton)
  ...meshRecordStoreTests,
  ...meshPartitionConventionTests,
  ...globalNodeRegistryTests,
  // …and the Resync transport the UI's one door calls (ADR-014/E6)
  ...meshResyncTests,
];
