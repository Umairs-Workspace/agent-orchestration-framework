// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramFileCommand } from "@aof/work/commands/diagram/file";

export function assembleCommandsDiagramFile({ commandsResolveServices }) {
  // Core constructs this application service from its owning package.

  const { resolveItemExact } = commandsResolveServices;

  const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact });

  return { diagramFileCommand };
}
