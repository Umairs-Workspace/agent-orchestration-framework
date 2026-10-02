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
];
