// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphServeCommand } from "@aof/knowledge/commands/graph-serve";

export function assembleCommandsGraphServe({ graphMcpServerServices, workServices }) {
  // Core composition for knowledge-owned services.

  const { serveStdio } = graphMcpServerServices;
  const { mcpServeProbe } = graphMcpServerServices;
  const { loadWorkspace } = workServices;

  const { graphServeCommand } = createGraphServeCommand({ serveStdio, mcpServeProbe, loadWorkspace });

  return { graphServeCommand };
}
