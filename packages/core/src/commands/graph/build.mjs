// Compatibility entry; construction belongs to core application assembly.
import { commandsGraphBuild } from "../../application/default.mjs";
export const {
  isNetworkBackend,
  isKnownNetworkBackend,
  classifyEgress,
  readBuiltGraph,
  graphBuildCommand,
} = commandsGraphBuild;
