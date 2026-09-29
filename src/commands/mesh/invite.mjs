// Transitional core composition for mesh-owned commands.
import { createMeshInviteCommands } from "@aof/mesh/commands/invite";
import {
  isControlNode,
  readRegistry,
  writeRegistry,
  appendPendingInvite,
} from "../../mesh/registry.mjs";
import { resolveCodeTtlSeconds, sha256Hex } from "../../mesh/relay.mjs";

export const { meshInviteCommand } = createMeshInviteCommands({ isControlNode, readRegistry, writeRegistry, appendPendingInvite, resolveCodeTtlSeconds, sha256Hex });
