// Transitional core composition for server-owned transports.
import { createGraphMcpServer } from "@aof/server/graph-mcp-server";
import { getCommand, invoke } from "./command-core.mjs";

export const { MCP_PROTOCOL_VERSION, MCP_SERVER_INFO, mcpServeProbe, handleMcpMessage, serveStdio } = createGraphMcpServer({ getCommand, invoke });
