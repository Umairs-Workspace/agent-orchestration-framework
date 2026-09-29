// Transitional core composition for mesh-owned commands.
import { createMeshRepoCommands } from "@aof/mesh/commands/repo";
import { publishGlobalWorkSnapshot } from "../../global-work-publisher.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export const { publishRepoToMesh, meshRepoPublishCommand } = createMeshRepoCommands({ publishGlobalWorkSnapshot, resolveWorkspaceId });
