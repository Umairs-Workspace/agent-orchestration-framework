// Transitional core composition for mesh-owned commands.
import { createMeshRevokeCommands } from "@aof/mesh/commands/revoke";
import {
  isControlNode,
  readRegistry,
  writeRegistry,
  appendRevocation,
} from "../../mesh/registry.mjs";

export const { meshRevokeCommand } = createMeshRevokeCommands({ isControlNode, readRegistry, writeRegistry, appendRevocation });
