// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramFileCommand } from "@aof/diagrams/commands/file";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";
import { createDiagramCapabilityCommand } from "@aof/diagrams/commands/capability";

export function assembleCommandsDiagramFile({ commandsResolveServices, configInspectServices }) {
  // Core constructs this application service from its owning package.

  const { resolveItemExact, requireLocalCheckout } = commandsResolveServices;
  // diagram:capability reads `work.diagrams` through the one reader (133/ADR-001 §3).
  const { resolveWorkDiagrams } = configInspectServices;

  const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact });
  // Publish writes the formats `work.diagrams` owes, read through the same one reader.
  const { diagramSceneCommand } = createDiagramSceneCommand({ resolveItemExact, requireLocalCheckout, resolveWorkDiagrams });
  const { diagramCapabilityCommand } = createDiagramCapabilityCommand({ resolveWorkDiagrams });

  return { diagramFileCommand, diagramSceneCommand, diagramCapabilityCommand };
}
