// Transitional core composition for mesh-owned commands.
import { createMeshIdentityCommands } from "@aof/mesh/commands/identity";
import { publishNodeRecord, readNodeRecord, readNodeRecords, nodeRecordPath } from "../../mesh/store.mjs";
import { deriveNodeId, assembleDescriptor, sidecarPathFor, writeSidecarPatch, readSidecar, sanitizeHostname } from "../../node-identity.mjs";
import { packageVersionString } from "../../asset-base.mjs";
import {
  readPresenceRecord,
  resolveStalenessSeconds,
  isNodeStale,
  mergePresence,
} from "../../mesh/presence.mjs";
import { readRegistry, isControlNode } from "../../mesh/registry.mjs";

export const { resolveInstallSalt, meshIdentityCommand, keyedByOldId, meshStatusCommand } = createMeshIdentityCommands({ publishNodeRecord, readNodeRecord, readNodeRecords, nodeRecordPath, deriveNodeId, assembleDescriptor, sidecarPathFor, writeSidecarPatch, readSidecar, sanitizeHostname, packageVersionString, readPresenceRecord, resolveStalenessSeconds, isNodeStale, mergePresence, readRegistry, isControlNode, loadDeclarations: () => import("../../mesh/declarations.mjs") });
