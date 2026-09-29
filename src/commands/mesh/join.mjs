// Transitional core composition for mesh-owned commands.
import { createMeshJoinCommands } from "@aof/mesh/commands/join";
import { globalWorkspacePaths } from "../../workspace.mjs";
import { assembleDescriptor } from "@aof/mesh/node-identity";
import { publishNodeRecord } from "../../mesh/store.mjs";
import { packageVersionString } from "../../asset-base.mjs";
import { reportDegrade } from "../../degrade.mjs";

export const { meshJoinCommand } = createMeshJoinCommands({ globalWorkspacePaths, assembleDescriptor, publishNodeRecord, packageVersionString, reportDegrade });
