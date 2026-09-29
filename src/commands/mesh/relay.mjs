// Transitional core composition for mesh-owned commands.
import { createMeshRelayCommands } from "@aof/mesh/commands/relay";
import { relayStatus } from "../../mesh/relay.mjs";

export const { meshRelayCommand } = createMeshRelayCommands({ relayStatus });
