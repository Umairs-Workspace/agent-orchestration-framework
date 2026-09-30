// Compatibility entry; construction belongs to core application assembly.
import { meshRegistry } from "../application/default.mjs";
export const {
  registryDir,
  registryPath,
  isControlNode,
  emptyRegistry,
  writeRegistry,
  readRegistry,
  admitNode,
  registerBoard,
  appendRevocation,
  appendPendingInvite,
  consumePendingInvite,
  isInviteConsumed,
  isInviteExpired,
  isInvitePending,
  isRevoked,
  verifyCredential,
} = meshRegistry;
