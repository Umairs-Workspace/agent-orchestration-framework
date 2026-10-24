// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramExportCommand } from "@aof/diagrams/commands/export";
import { generatorFor } from "@aof/diagrams/generators";
import { findBrowser } from "@aof/execution/svg-rasterizer";

export function assembleCommandsDiagramExport({ configInspectServices, commandsResolveServices, diagramsRasterizeServices }) {
  // Core constructs this application service from its owning package.

  const { resolveWorkDiagrams } = configInspectServices;

  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;

  const { rasterizeSvg } = diagramsRasterizeServices;
  const { diagramExportCommand } = createDiagramExportCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact, findBrowser, rasterizeSvg });

  return { diagramExportCommand };
}
