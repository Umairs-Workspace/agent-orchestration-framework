// THE ARCH/MESH SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdShellLoopIdIsDeclaredTests } from "./acd-shell-loop-id-is-declared.test.mjs";
import { archTests as acdPresenceWriteScopeTests } from "./acd-presence-write-scope.test.mjs";
import { archTests as acdMeshEolPinnedTests } from "./acd-mesh-eol-pinned.test.mjs";
// milestone 23 — control-node-relay (story 02: presence-over-relay — task 03, finding F1).
// milestone 33 / story 01 (ADR-002.1 — F-3204): the node-side PERSISTENT relay SUBSCRIBER
// (src/mesh-presence-subscriber.mjs) + the in-memory liveness cache
// (src/mesh-presence-cache.mjs) are DELETED outright — no consumer remains once the fabric
// peer-map (src/mesh/fabric.mjs's resolvePeers) is the fast liveness read mesh:status
// consumes instead (src/commands/mesh-identity.mjs's ADR-002.1 cutover). mergePresence
// itself (src/mesh/presence.mjs) is UNCHANGED — only its caller's second-argument SOURCE
// re-points from the retired relay cache to the fabric peer-map liveness (see
// test/mesh/mesh-fabric-liveness-cutover.test.mjs, task 01). meshRelayReceiveApplyTests (task
// 03's whole subject) and fitness #7 acd-presence-subscriber-cache-only are RETIRED —
// superseded by 33/ADR-002 — the broker is eliminated.
// milestone 24 — device-code group-enrollment (SECURITY.md / the threat model's security
// fitness functions — RED-until-built, the enrollment/registry/relay-auth modules do not
// exist yet). The trust boundary IS this milestone (23/ADR-001 §Security-posture deferred
// it here). Three security invariants: (T3) the pending device code is stored HASHED at
// rest — never plaintext committed to the git-of-record registry; (T4/T2) the code match
// is SINGLE-USE (consumed) + CONSTANT-TIME (timingSafeEqual, no `===` timing oracle on the
// 10^6 space); (T1/T6) the relay ws auth-gate REJECTS an absent/invalid/revoked credential,
// reading the LIVE roster/revocation BEFORE a signal is brokered (the 22/R6 'the credential
// is actually used' guard + the pre-auth→authenticated relay transition). Each carries the
// m03 non-vacuous self-check. From: story 00 (registry) / 01 (device-code flow) / 02
// (relay-auth + revocation) — see SECURITY.md's fitness table for the per-story ownership.
import { archTests as acdEnrollmentCodeHashedAtRestTests } from "./acd-enrollment-code-hashed-at-rest.test.mjs";
import { archTests as acdEnrollmentCodeSingleUseConstantTimeTests } from "./acd-enrollment-code-single-use-constant-time.test.mjs";
import { archTests as acdEnrollEndpointHttpNotWsTests } from "./acd-enroll-endpoint-http-not-ws.test.mjs";
import { archTests as acdEnrollGitArgvNoShellTests } from "./acd-enroll-git-argv-no-shell.test.mjs";
import { archTests as acdUnattendedLaunchIsDeclaredTests } from "./acd-unattended-launch-is-declared.test.mjs";
import { archTests as acdTokenBucketsMutuallyExclusiveTests } from "./acd-token-buckets-mutually-exclusive.test.mjs";
import { archTests as acdHeartbeatByConsumptionTests } from "./acd-heartbeat-by-consumption.test.mjs";
import { archTests as acdMeshPartitionWriteTests } from "./acd-mesh-partition-write.test.mjs";
import { archTests as acdMeshWriteScopeTests } from "./acd-mesh-write-scope.test.mjs";
import { archTests as acdMeshCommandCliBijectionTests } from "./acd-mesh-command-cli-bijection.test.mjs";
import { archTests as acdMeshUiSingleDataCommandTests } from "./acd-mesh-ui-single-data-command.test.mjs";
import { archTests as acdMeshUiNoCoreImportTests } from "./acd-mesh-ui-no-core-import.test.mjs";
import { archTests as acdMeshUiSingleServerTests } from "./acd-mesh-ui-single-server.test.mjs";
import { archTests as acdMeshUiWriteIsolationTests } from "./acd-mesh-ui-write-isolation.test.mjs";
import { archTests as acdMeshUiGlobalDefaultTests } from "./acd-mesh-ui-global-default.test.mjs";
import { archTests as acdMeshUiLocalFilterPreservesStatusTests } from "./acd-mesh-ui-local-filter-preserves-status.test.mjs";
import { archTests as acdMeshUiScopeVisibleTests } from "./acd-mesh-ui-scope-visible.test.mjs";
// milestone 27 issuance/routing write surfaces are retired for the global WebSocket-only mesh cleanup.
// milestone 33 — mesh relay/transport redesign (Tailscale-first). Two Decide-stage
// fitness functions. acd-mesh-identity-not-committed (F-3203 / ADR-004 — no per-install
// nodeId/salt in committed config) is UN-SKIPPED + GREEN (story 00 / per-install-node-
// identity migrated the committed .aof/aof.config.json's mesh.nodeId/mesh.salt to the
// git-ignored sidecar .aof/mesh/identity.json via migrateIdentity — its Definition-of-Done).
// acd-fabric-single-seam (F-3202/F-3204 / ADR-001/002 — the tailscale spawn + peer-address
// resolution live only in src/mesh/fabric.mjs) is UN-SKIPPED + GREEN (story 01 / fabric-
// native-transport built src/mesh/fabric.mjs as the sole seam and removed the broker's
// liveness-path callers — its Definition-of-Done).
import { archTests as acdMeshIdentityNotCommittedTests } from "./acd-mesh-identity-not-committed.test.mjs";
import { archTests as acdFabricSingleSeamTests } from "./acd-fabric-single-seam.test.mjs";
import { archTests as acdDirectiveTargetsOnePeerTests } from "./acd-directive-targets-one-peer.test.mjs";
import { archTests as acdDirectiveOnlyFromAdmittedPeerTests } from "./acd-directive-only-from-admitted-peer.test.mjs";
import { archTests as acdRevokedIssuerDirectiveNeverExecutesTests } from "./acd-revoked-issuer-directive-never-executes.test.mjs";
import { archTests as acdUnpublishedRepoDirectiveRefusedTests } from "./acd-unpublished-repo-directive-refused.test.mjs";
import { archTests as acdPresenceAggregatesNodeWorkspacesTests } from "./acd-presence-aggregates-node-workspaces.test.mjs";
import { archTests as acdCloneCredentialPullNotPushedTests } from "./acd-clone-credential-pull-not-pushed.test.mjs";
import { archTests as acdCloneCredentialRelayNotLoggedTests } from "./acd-clone-credential-relay-not-logged.test.mjs";
import { archTests as acdCloneCredentialProviderConfigDrivenTests } from "./acd-clone-credential-provider-config-driven.test.mjs";
import { archTests as acdCloneAppKeyNotRelayedTests } from "./acd-clone-app-key-not-relayed.test.mjs";
import { archTests as acdMintedTokenScopedSingleRepoTests } from "./acd-minted-token-scoped-single-repo.test.mjs";
import { archTests as acdCrossOrgKeyIsolationTests } from "./acd-cross-org-key-isolation.test.mjs";
import { archTests as acdWriteTokenScopedToPushTests } from "./acd-write-token-scoped-to-push.test.mjs";
import { archTests as acdMeshUiReadOnlyTests } from "./acd-mesh-ui-read-only.test.mjs";
import { archTests as acdLauncherSeamTests } from "./acd-launcher-seam.test.mjs";
import { archTests as acdGlobalMeshPathsHomeTests } from "./acd-global-mesh-paths-home.test.mjs";
import { archTests as acdGlobalNodeDescriptorsRedactSecretsTests } from "./acd-global-node-descriptors-redact-secrets.test.mjs";
import { archTests as acdGlobalNodeRegistryProjectionOnlyTests } from "./acd-global-node-registry-projection-only.test.mjs";
import { archTests as acdGlobalNodeIdentityHomeTests } from "./acd-global-node-identity-home.test.mjs";
import { archTests as acdControlStreamTailnetOnlyTests } from "./acd-control-stream-tailnet-only.test.mjs";
import { archTests as acdControlStreamAddressBoundTests } from "./acd-control-stream-address-bound.test.mjs";
import { archTests as acdNativeAddonDegradesTests } from "./acd-native-addon-degrades.test.mjs";
//   ADR-005     — the shell owns a CLOSED stacking ladder (DESIGN DG-45-2): `z-50` means the
//                 shell's fullscreen occupant and nothing else, and no surface invents a rung
//                 at the call site. Ratchets the gap 45/03 closes so 46/47/49 cannot reopen it
//                 — 49 being precisely the milestone that puts a surface fullscreen.
import { archTests as acdShellZLadderSingleHomeTests } from "./acd-shell-z-ladder-single-home.test.mjs";
//   ADR-005     — the surface → shell channel has ONE host: `declareShellPresent()` is called
//                 exactly once in ui/src, at MODULE scope, by the module that renders the shell
//                 root, and NO routed surface imports the shell component. Added at the
//                 architect's structural review of 45/03 (2026-08-07). The bus flag is set by
//                 IMPORTING Shell.tsx, so a single stray import inside ui/src/{fleet,board,
//                 config}/ — even a `type` one, which tsc erases but the bundler still follows —
//                 would declare a shell that is not mounted, and every contributed control (the
//                 fleet's scope switch, the board's sync, the board's serverGone notice) would
//                 vanish with EVERY suite still green. Not reachable by review attention;
//                 trivially greppable; therefore a ratchet.
import { archTests as acdShellBusSingleHostTests } from "./acd-shell-bus-single-host.test.mjs";
import { archTests as acdWireKindHasBothEndsTests } from "./acd-wire-kind-has-both-ends.test.mjs";
// milestone 126 / story 02 — FF-12605. The argv has one home (a zero-import leaf) and the
// declarations answer rides the ONE data command 36/ADR-004 gives the supervisor.
import { archTests as acdDeclarationsRideTheOneDataCommandTests } from "./acd-declarations-ride-the-one-data-command.test.mjs";
// milestone 126 / story 04 — autostart is ONE injected runner (ADR-007): FF-12607. The
// BEHAVIOUR is driven over fakes in test/mesh/desktop/; this control holds the absences —
// no un-injectable child-process call, the platform an input rather than a read, the act a
// flag rather than a fifth command, and a preflight that reaches for none of the three
// readers that would make it a false green or a write.
import { archTests as acdAutostartIsOneInjectedRunnerTests } from "./acd-autostart-is-one-injected-runner.test.mjs";

export const tests = [
  ...acdShellLoopIdIsDeclaredTests,
  ...acdPresenceWriteScopeTests,
  ...acdMeshEolPinnedTests,
  ...acdEnrollmentCodeHashedAtRestTests,
  ...acdEnrollmentCodeSingleUseConstantTimeTests,
  ...acdEnrollEndpointHttpNotWsTests,
  ...acdEnrollGitArgvNoShellTests,
  ...acdUnattendedLaunchIsDeclaredTests,
  ...acdTokenBucketsMutuallyExclusiveTests,
  ...acdHeartbeatByConsumptionTests,
  ...acdMeshPartitionWriteTests,
  ...acdMeshWriteScopeTests,
  ...acdMeshCommandCliBijectionTests,
  ...acdMeshUiSingleDataCommandTests,
  ...acdMeshUiNoCoreImportTests,
  ...acdMeshUiSingleServerTests,
  ...acdMeshUiWriteIsolationTests,
  ...acdMeshUiGlobalDefaultTests,
  ...acdMeshUiLocalFilterPreservesStatusTests,
  ...acdMeshUiScopeVisibleTests,
  // milestone 27 issuance/routing write surfaces are retired for the global WebSocket-only mesh cleanup.
  // milestone 33 — mesh relay/transport redesign: the two Decide-stage fitness
  // functions (see the import comment; each is the DoD of its build story:
  // F-3203 identity-not-committed — UN-SKIPPED + GREEN by story 00 below;
  // F-3202/F-3204 fabric-single-seam — UN-SKIPPED + GREEN by story 01 below)
  ...acdMeshIdentityNotCommittedTests,
  ...acdFabricSingleSeamTests,
  ...acdDirectiveTargetsOnePeerTests,
  ...acdDirectiveOnlyFromAdmittedPeerTests,
  ...acdRevokedIssuerDirectiveNeverExecutesTests,
  ...acdUnpublishedRepoDirectiveRefusedTests,
  ...acdPresenceAggregatesNodeWorkspacesTests,
  ...acdCloneCredentialPullNotPushedTests,
  ...acdCloneCredentialRelayNotLoggedTests,
  ...acdCloneCredentialProviderConfigDrivenTests,
  ...acdCloneAppKeyNotRelayedTests,
  ...acdMintedTokenScopedSingleRepoTests,
  ...acdCrossOrgKeyIsolationTests,
  ...acdWriteTokenScopedToPushTests,
  ...acdMeshUiReadOnlyTests,
  ...acdLauncherSeamTests,
  ...acdGlobalMeshPathsHomeTests,
  ...acdGlobalNodeDescriptorsRedactSecretsTests,
  ...acdGlobalNodeRegistryProjectionOnlyTests,
  ...acdGlobalNodeIdentityHomeTests,
  ...acdControlStreamTailnetOnlyTests,
  ...acdControlStreamAddressBoundTests,
  ...acdNativeAddonDegradesTests,
  ...acdShellZLadderSingleHomeTests,
  // …and the one m45 ratchet that is expected GREEN from the day 45/03 lands: it pins a
  // property the delivered build already has, so the accident that would silently break it
  // cannot happen (architect's structural review, 2026-08-07).
  ...acdShellBusSingleHostTests,
  ...acdWireKindHasBothEndsTests,
  // milestone 126 / story 02 — FF-12605 (see the import note).
  ...acdDeclarationsRideTheOneDataCommandTests,
  // milestone 126 / story 04 — FF-12607
  ...acdAutostartIsOneInjectedRunnerTests,
];
