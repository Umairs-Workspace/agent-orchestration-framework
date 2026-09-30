// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRegistry } from "@aof/mesh/registry";

export function assembleMeshRegistry({ meshStoreServices }) {
  // Core composition for mesh-owned persistence.

  const { meshDir } = meshStoreServices;

  const { registryDir, registryPath, isControlNode, emptyRegistry, writeRegistry, readRegistry, admitNode, registerBoard, appendRevocation, appendPendingInvite, consumePendingInvite, isInviteConsumed, isInviteExpired, isInvitePending, isRevoked, verifyCredential } = createMeshRegistry({ meshDir });

  return { registryDir, registryPath, isControlNode, emptyRegistry, writeRegistry, readRegistry, admitNode, registerBoard, appendRevocation, appendPendingInvite, consumePendingInvite, isInviteConsumed, isInviteExpired, isInvitePending, isRevoked, verifyCredential };
}
