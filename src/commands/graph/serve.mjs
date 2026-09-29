// Transitional core composition for knowledge-owned services.
import { createGraphServeCommand } from "@aof/knowledge/commands/graph-serve";
import { serveStdio, mcpServeProbe } from "../../graph-mcp-server.mjs";
import { loadWorkspace } from "../../work.mjs";

export const { graphServeCommand } = createGraphServeCommand({ serveStdio, mcpServeProbe, loadWorkspace });
