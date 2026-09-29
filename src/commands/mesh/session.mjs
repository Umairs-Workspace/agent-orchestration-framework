// Transitional core composition for mesh-owned commands.
import { createMeshSessionCommands } from "@aof/mesh/commands/session";
import { loadWorkspace } from "../../work.mjs";
import { resolveInstallSalt } from "./identity.mjs";
import { deriveNodeId, sidecarPathFor } from "@aof/mesh/node-identity";
import { startSession, pingSession, endSession } from "../../mesh/session.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { reportDegrade } from "../../degrade.mjs";

export const { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId } = createMeshSessionCommands({ loadWorkspace, resolveInstallSalt, deriveNodeId, sidecarPathFor, startSession, pingSession, endSession, resolveWorkspaceId, reportDegrade });
