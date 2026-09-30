// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionHooks } from "../../application/default-session-hooks.mjs";
export const resolveSessionIdentity = defaultSessionHooks.commandsMeshSession.resolveSessionIdentity;
export const meshSessionCommand = defaultSessionHooks.commandsMeshSession.meshSessionCommand;
export const readStdinText = defaultSessionHooks.commandsMeshSession.readStdinText;
export const resolveNodeId = defaultSessionHooks.commandsMeshSession.resolveNodeId;
