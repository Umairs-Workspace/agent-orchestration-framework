// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphMcpServer } from "@aof/server/graph-mcp-server";

export function assembleGraphMcpServer({ commandCoreServices }) {
  // Core composition for server-owned transports.

  const { getCommand } = commandCoreServices;
  const { invoke } = commandCoreServices;

  const { MCP_PROTOCOL_VERSION, MCP_SERVER_INFO, mcpServeProbe, handleMcpMessage, serveStdio } = createGraphMcpServer({ getCommand, invoke });

  return { MCP_PROTOCOL_VERSION, MCP_SERVER_INFO, mcpServeProbe, handleMcpMessage, serveStdio };
}
