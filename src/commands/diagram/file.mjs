// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createDiagramFileCommand } from "@aof/work/commands/diagram/file";
import { resolveItemExact } from "../resolve.mjs";

export const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact });
