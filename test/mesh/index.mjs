// THE MESH SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 72 / story 04 - THE PREPARED WORKTREE: a git worktree is materialised with no
// dependencies and discarded on completion, so every assignment begins with the agent paying for an
// install out of its own tokens and ends by throwing the result away. The project's declared
// `prepare` step now runs INSIDE the tree at the ONE choke point all four materialisation doors
// funnel through - including the reuse door a CONTINUING item takes, which is the dominant path -
// through the same bounded seam and the same compiler the test runner uses. Absent is a silent
// no-op, present-and-malformed is a compile-time refusal, and a failed prepare REMOVES the tree it
// created before it throws, because two shipped callers read a directory's existence as ready. And
// nothing is linked in: dependencies arrive by install, never by link, and no worktree is deleted by
// filesystem call - TECH_DEBT item 36 is what that cost, twice in four hours. Task 00's @executable
// scenarios plus FF-7207.
import { meshWorktreePrepareTests } from "./mesh-worktree-prepare.test.mjs";
// milestone 34 / story 03 — mesh UI global scope (ADR-006): `aof mesh ui` /
// `/api/mesh/status` default to the GLOBAL projection query (src/global-mesh-
// query.mjs, the ONE composition seam over the story 00/02 query surfaces);
// `--local` (or `?scope=local`) keeps the pre-existing invoke("mesh:status")
// current-workspace aggregate, byte-unchanged. Four @executable task features:
// 00_cli-scope-selection, 01_mesh-ui-api-scope-switch, 02_fleet-ui-scope-
// rendering, 03_empty-error-and-health-states. Three fitness units:
// acd-mesh-ui-global-default, acd-mesh-ui-local-filter-preserves-status,
// acd-mesh-ui-scope-visible. The React fleet surface's scope/region/state/
// credential-guard logic lives in the pure ui/src/fleet/scope.mjs helper (no
// React test harness in this repo), exercised headlessly by fleet-scope.test.mjs.
import { globalMeshQueryTests } from "./global-mesh-query.test.mjs";
// milestone 33 (story 01) — fabric-native transport + coordination launcher. task 00
// (00_fabric-seam.feature): src/mesh/fabric.mjs's probeFabric/selfAddress/resolvePeers
// over an injected fabric-exec closure — the two-stage refusal-reason matrix, the Windows
// install-path fallback, the HostName/DNSName join matrix, the non-tailscale/undeclared
// clean refusals. task 01 (01_fabric-liveness-cutover.feature): mergePresence reconciling
// disk vs the fabric peer-map liveness (git wins a tie), mesh:status sourcing a live
// candidate off the fabric Online pre-filter via INJECTED ctx.fabricPeers, the
// Online-≠-dialable handled outcomes (resolvePeerReachability, an injected dial closure),
// the presence record assembly/read staying byte-unchanged, the unconfigured-mesh floor.
import { meshFabricSeamTests } from "./mesh-fabric-seam.test.mjs";
import { meshDirectFabricTests } from "./mesh-direct-fabric.test.mjs";
import { meshFabricLivenessCutoverTests } from "./mesh-fabric-liveness-cutover.test.mjs";
import { meshOperatorGuidanceTests } from "./mesh-operator-guidance.test.mjs";
import { meshRepoPublishTests } from "./mesh-repo-publish.test.mjs";
// milestone 35 / story 01 — control->worker command channel (ADR-002, the up-half of
// ADR-001): the server-side nodeId->ws targeting map + directive down-frame (task 00),
// admission (T5) + live-re-read revocation (T2) gating dispatch (task 01), and the
// worker's assignment-status up-frame write-through into ADR-001's dedicated writer,
// authored from the connection's nodeId (T6, task 02). Extends milestone 34's stream
// transport — no second socket, no git-bus.
import { meshDirectiveDownFrameTests } from "./mesh-directive-down-frame.test.mjs";
import { meshDirectiveAdmissionTests } from "./mesh-directive-admission.test.mjs";
import { meshDirectiveWorkerChannelTests } from "./mesh-directive-worker-channel.test.mjs";
// milestone 35 / ADR-008 (as-built review fast-follow, 2026-07-09) — the control-side
// dispatch/reclaim driver: task 01/03's DISPATCH half (the launcher's control tick
// dispatches an assigned row targeting a connected peer).
import { meshControlDispatchDriverTests } from "./mesh-control-dispatch-driver.test.mjs";
// milestone 35 / story 02 — isolated worker execution, the HEADLINE story (ADR-004):
// the worker-side repo guard FIRST (task 01), a dedicated git worktree keyed by
// assignmentId under the ONE .aof/mesh/worktrees/ seam, detached-at-commit (task 00),
// the accepted->running->done|failed run-lifecycle bracket through the EXISTING
// mesh-blind run-store with a BOUNDED headless-runtime spawn seam (task 02), cleanup
// on done / retain on failed bounded by a documented retention default (task 03), and
// the control-side dual-staleness reclaim path (task 04, ADR-005). Task 05
// (two-machine soak) is @manual — no executable test, verified at aof:verify.
import { meshWorktreeMaterializeTests } from "./mesh-worktree-materialize.test.mjs";
import { meshRunLifecycleBracketingTests } from "./mesh-run-lifecycle-bracketing.test.mjs";
import { meshWorktreeCleanupRetentionTests } from "./mesh-worktree-cleanup-retention.test.mjs";
// milestone 38 / story 00 / task 10 — finding F11 (aof:verify 38, BLOCKER): the
// write-side + read-side absolute-workDir fix (global-node-registry.mjs's
// assembleGlobalRegistrySnapshot + mesh-presence.mjs's resolveNodeWorkspaces) —
// resolving a registered workspace's work dir from a FOREIGN cwd, exercised over
// the REAL descriptor store.
import { meshWorkspaceWorkdirAbsoluteTests } from "./mesh-workspace-workdir-absolute.test.mjs";
import { meshAssistantHookWiringTests } from "./mesh-assistant-hook-wiring.test.mjs";
// milestone 38 / story 07 — durable worker pushback (ADR-015): a REAL branch, not
// detached (task 00), push BEFORE the worktree is force-removed, over a real local
// bare origin (task 01), the two-token write scope (task 02) + the REQUIRED
// write-credential-request wire (production wiring the pre-existing F12 guard,
// acd-clone-credential-pull-not-pushed, demands the moment a new credential-shaped
// collaborator exists) + the acd-write-token-scoped-to-push fitness function; the
// acd-minted-token-scoped-single-repo REWRITE (two-seam) is registered above, in
// place (SECURITY T15/T9).
import { meshWorktreeBranchNotDetachedTests } from "./mesh-worktree-branch-not-detached.test.mjs";
import { meshRecoveryPushTests } from "./mesh-recovery-push.test.mjs";
// milestone 38 / story 08 — worker-verified-memory-syncback (ADR-016): durable
// knowledge rides GIT on story-07's merge (no wire protocol) — task 00 pins the
// OBSERVABLE frame-vocabulary contract (no builder carries an index slot) + the
// git-observable index facts (committed markdown, gitignored/derived graphify-out/);
// task 01 drives a REAL local git merge + the REAL `local` backend ingest/recall so a
// worker-authored RETROSPECTIVE/ADR becomes recallable on the control node
// (absent-before / recallable-after, immune to the graphify-extraction LLM
// non-determinism by construction — no graphify binary is ever invoked). Task 02 is
// the @manual real-mesh worker-verified-recall soak, deferred to aof:verify 38 — no
// test file here. Armed: acd-memory-index-never-on-mesh.
import { meshMemorySyncbackGitNotMeshTests } from "./mesh-memory-syncback-git-not-mesh.test.mjs";
import { meshMemorySyncbackControlReingestTests } from "./mesh-memory-syncback-control-reingest.test.mjs";
// milestone 35 / ADR-008 (as-built review fast-follow, 2026-07-09) — the control-side
// dispatch/reclaim driver: task 02/06's RECLAIM half (the SAME launcher control tick
// also runs reclaimStaleAssignments) + the shared fitness function guarding both halves.
import { meshReclaimSchedulerTests } from "./mesh-reclaim-scheduler.test.mjs";
// m42 wave (a) / TECH_DEBT item 2 — the daemons' durable JSONL log sink + reader.
import { meshLogTests } from "./mesh-log.test.mjs";
// m42 wave (d) leg d3 — facts over the bridge: the durable outbox (delivery is not
// completion, an offline send loses nothing, the ack is the receipt) and the
// guarded bridge door.
import { meshEffectsOutboxTests } from "./mesh-effects-outbox.test.mjs";

export const tests = [
  // milestone 72 / story 04 - the prepared worktree (task 00) plus FF-7207.
  ...meshWorktreePrepareTests,
  // milestone 34 — global mesh work store (story 03: mesh UI global scope, ADR-006)
  ...globalMeshQueryTests,
  // milestone 33 (story 01) — fabric-native transport + coordination launcher: tasks 00–04
  ...meshFabricSeamTests,
  ...meshDirectFabricTests,
  ...meshFabricLivenessCutoverTests,
  ...meshOperatorGuidanceTests,
  ...meshRepoPublishTests,
  // milestone 35 / story 01 — control->worker command channel
  ...meshDirectiveDownFrameTests,
  ...meshDirectiveAdmissionTests,
  ...meshDirectiveWorkerChannelTests,
  // milestone 35 / ADR-008 (as-built review fast-follow) — the control-side
  // dispatch/reclaim driver's DISPATCH half (task 01/03)
  ...meshControlDispatchDriverTests,
  // milestone 35 / story 02 — isolated worker execution (the headline)
  ...meshWorktreeMaterializeTests,
  ...meshRunLifecycleBracketingTests,
  ...meshWorktreeCleanupRetentionTests,
  ...meshWorkspaceWorkdirAbsoluteTests,
  ...meshAssistantHookWiringTests,
  // milestone 38 / story 07 — durable worker pushback (ADR-015, tasks 00-02
  // traceability modules + the write-credential wire + acd-write-token-scoped-to-push)
  ...meshWorktreeBranchNotDetachedTests,
  // VERIFICATION (live soak 2026-07-25) — control-driven recovery push (aof mesh
  // recover-push): the store surface + dispatch tick + result-apply holder gate, the
  // REAL worker handler over a real bare origin, and the CLI resolve→request→poll→report.
  ...meshRecoveryPushTests,
  // milestone 38 / story 08 — worker-verified-memory-syncback (ADR-016, tasks 00-01
  // traceability modules + acd-memory-index-never-on-mesh)
  ...meshMemorySyncbackGitNotMeshTests,
  ...meshMemorySyncbackControlReingestTests,
  // milestone 35 / ADR-008 (as-built review fast-follow) — the control-side
  // dispatch/reclaim driver's RECLAIM half (task 02/06) + the shared fitness function
  ...meshReclaimSchedulerTests,
  ...meshLogTests,
  ...meshEffectsOutboxTests,
];
