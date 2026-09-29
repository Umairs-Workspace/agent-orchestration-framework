// Transitional core composition for mesh-owned commands.
import { createMeshAssignCommands } from "@aof/mesh/commands/assign";
import { assignWork, withdrawWork } from "../../mesh/assignment.mjs";

export const { meshAssignCommand } = createMeshAssignCommands({ assignWork, withdrawWork });

