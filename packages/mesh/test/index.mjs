import { meshFabricSeamTests } from "./mesh-fabric-seam.suite.mjs";
import { meshPresenceDegradationLoopTests } from "./mesh-presence-degradation-loop.suite.mjs";
import { workerRoleAddressTests } from "./worker-role-address.suite.mjs";
import { meshEnrollDeviceFlowTests } from "./mesh-enroll-device-flow.suite.mjs";
import { meshLauncherLockTests } from "./mesh-launcher-lock.suite.mjs";
import { meshRegistryAggregateMutationsTests } from "./mesh-registry-aggregate-mutations.suite.mjs";
import { meshRegistryPendingLifecycleTests } from "./mesh-registry-pending-lifecycle.suite.mjs";
import { meshRelayAuthGateTests } from "./mesh-relay-auth-gate.suite.mjs";
import { meshRelayControlNodeTests } from "./mesh-relay-control-node.suite.mjs";
import { meshRelayEnvelopeResilienceTests } from "./mesh-relay-envelope-resilience.suite.mjs";
import { assignmentFleetStatusShapeTests } from "./assignment-fleet-status-shape.suite.mjs";
import { meshCloneCredentialAppKeyDefaultDirTests } from "./mesh-clone-credential-app-key-default-dir.suite.mjs";
import { meshFleetTerminalViewMirrorTests } from "./mesh-fleet-terminal-view-mirror.suite.mjs";
import { meshPresenceAdditiveSessionsTests } from "./mesh-presence-additive-sessions.suite.mjs";
import { meshPresenceSessionEntryTests } from "./mesh-presence-session-entry.suite.mjs";
import { meshPresenceSessionWireTests } from "./mesh-presence-session-wire.suite.mjs";
import { globalNodeRegistryTests } from "./global-node-registry.suite.mjs";
import { meshRecordStoreTests } from "./mesh-record-store.suite.mjs";
import { meshRegistryStoreSeamTests } from "./mesh-registry-store-seam.suite.mjs";
import { meshSessionIndexProjectionTests } from "./mesh-session-index-projection.suite.mjs";
import { meshSessionSpawnDirectiveTests } from "./mesh-session-spawn-directive.suite.mjs";
import { meshSessionTtlLivenessTests } from "./mesh-session-ttl-liveness.suite.mjs";
import { meshTerminalMirrorReconnectTests } from "./mesh-terminal-mirror-reconnect.suite.mjs";
import { meshTerminalStreamRelayTransportWiredTests } from "./mesh-terminal-stream-relay-transport-wired.suite.mjs";
import { workerStreamClientTests } from "./worker-stream-client.suite.mjs";

export const tests = [
  ...meshFabricSeamTests,
  ...meshPresenceDegradationLoopTests,
  ...workerRoleAddressTests,
  ...meshEnrollDeviceFlowTests,
  ...meshLauncherLockTests,
  ...meshRegistryAggregateMutationsTests,
  ...meshRegistryPendingLifecycleTests,
  ...meshRelayAuthGateTests,
  ...meshRelayControlNodeTests,
  ...meshRelayEnvelopeResilienceTests,
  ...assignmentFleetStatusShapeTests,
  ...meshCloneCredentialAppKeyDefaultDirTests,
  ...meshFleetTerminalViewMirrorTests,
  ...meshPresenceAdditiveSessionsTests,
  ...meshPresenceSessionEntryTests,
  ...meshPresenceSessionWireTests,
  ...globalNodeRegistryTests,
  ...meshRecordStoreTests,
  ...meshRegistryStoreSeamTests,
  ...meshSessionIndexProjectionTests,
  ...meshSessionSpawnDirectiveTests,
  ...meshSessionTtlLivenessTests,
  ...meshTerminalMirrorReconnectTests,
  ...meshTerminalStreamRelayTransportWiredTests,
  ...workerStreamClientTests,
];
