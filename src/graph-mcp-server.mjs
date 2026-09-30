// Compatibility entry; construction belongs to core application assembly.
import { graphMcpServer } from "./application/default.mjs";
export const {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_INFO,
  mcpServeProbe,
  handleMcpMessage,
  serveStdio,
} = graphMcpServer;
