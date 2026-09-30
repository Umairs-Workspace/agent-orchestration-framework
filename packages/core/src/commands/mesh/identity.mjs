// Compatibility entry; construction belongs to core application assembly.
import { commandsMeshIdentity } from "../../application/default.mjs";
export const {
  resolveInstallSalt,
  meshIdentityCommand,
  keyedByOldId,
  meshStatusCommand,
} = commandsMeshIdentity;
