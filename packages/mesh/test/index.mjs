import { meshFabricSeamTests } from "./mesh-fabric-seam.suite.mjs";
import { meshPresenceDegradationLoopTests } from "./mesh-presence-degradation-loop.suite.mjs";
import { workerRoleAddressTests } from "./worker-role-address.suite.mjs";

export const tests = [
  ...meshFabricSeamTests,
  ...meshPresenceDegradationLoopTests,
  ...workerRoleAddressTests,
];
