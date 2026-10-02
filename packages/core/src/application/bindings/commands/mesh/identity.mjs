// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshIdentityCommands } from "@aof/mesh/commands/identity";
import { deriveNodeId, assembleDescriptor, sidecarPathFor, writeSidecarPatch, readSidecar, sanitizeHostname } from "@aof/mesh/node-identity";
import { packageVersionString } from "../../../../asset-base.mjs";

export function assembleCommandsMeshIdentity({ meshStoreServices, meshPresenceServices, meshRegistryServices, provideMeshDeclarations }) {
  // Core composition for mesh-owned commands.

  const { publishNodeRecord } = meshStoreServices;
  const { readNodeRecord } = meshStoreServices;
  const { readNodeRecords } = meshStoreServices;
  const { nodeRecordPath } = meshStoreServices;

  const { readPresenceRecord } = meshPresenceServices;
  const { resolveStalenessSeconds } = meshPresenceServices;
  const { isNodeStale } = meshPresenceServices;
  const { mergePresence } = meshPresenceServices;
  const { readRegistry } = meshRegistryServices;
  const { isControlNode } = meshRegistryServices;

  const { resolveInstallSalt, meshIdentityCommand, keyedByOldId, meshStatusCommand } = createMeshIdentityCommands({ publishNodeRecord, readNodeRecord, readNodeRecords, nodeRecordPath, deriveNodeId, assembleDescriptor, sidecarPathFor, writeSidecarPatch, readSidecar, sanitizeHostname, packageVersionString, readPresenceRecord, resolveStalenessSeconds, isNodeStale, mergePresence, readRegistry, isControlNode, loadDeclarations: () => provideMeshDeclarations() });

  return { resolveInstallSalt, meshIdentityCommand, keyedByOldId, meshStatusCommand };
}
