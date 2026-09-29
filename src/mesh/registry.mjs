// Transitional core composition for mesh-owned persistence.
import { createMeshRegistry } from "@aof/mesh/registry";
import { meshDir } from "./store.mjs";

export const { registryDir, registryPath, isControlNode, emptyRegistry, writeRegistry, readRegistry, admitNode, registerBoard, appendRevocation, appendPendingInvite, consumePendingInvite, isInviteConsumed, isInviteExpired, isInvitePending, isRevoked, verifyCredential } = createMeshRegistry({ meshDir });
