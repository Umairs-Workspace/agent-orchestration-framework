// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshSessionCommands } from "@aof/mesh/commands/session";
import { resolveInstallSalt } from "@aof/mesh/node-identity";
import { deriveNodeId, sidecarPathFor } from "@aof/mesh/node-identity";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsMeshSession({ workServices, meshSessionServices, degradeServices }) {
  // Core composition for mesh-owned commands.

  const { loadWorkspace } = workServices;

  const { startSession } = meshSessionServices;
  const { pingSession } = meshSessionServices;
  const { endSession } = meshSessionServices;

  const { reportDegrade } = degradeServices;

  const { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId } = createMeshSessionCommands({ loadWorkspace, resolveInstallSalt, deriveNodeId, sidecarPathFor, startSession, pingSession, endSession, resolveWorkspaceId, reportDegrade });

  return { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId };
}
