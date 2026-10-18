// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramFileCommand } from "@aof/work/commands/diagram/file";
import { createDiagramSceneCommand } from "@aof/work/commands/diagram/scene";

export function assembleCommandsDiagramFile({ commandsResolveServices }) {
  // Core constructs this application service from its owning package.

  const { resolveItemExact, requireLocalCheckout } = commandsResolveServices;

  const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact });
  const { diagramSceneCommand } = createDiagramSceneCommand({ resolveItemExact, requireLocalCheckout });

  return { diagramFileCommand, diagramSceneCommand };
}
