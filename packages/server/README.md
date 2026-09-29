# @aof/server

Owns the board HTTP routes, configuration editor HTTP server, board launcher, local terminal
WebSocket transport, shared static-serving rules and graph MCP stdio transport. Core supplies
application services and asset locations. The package does not import the assembled registry,
legacy root source, work implementations or configuration policy.

| Public API | Supplied application services |
| --- | --- |
| `board-ui` / `createBoardApi` | Command invocation, workspace loading and the cache staleness resolver. |
| `setup-ui` / `createSetupServer` | Configuration editing, supported kinds/runtimes, board handlers, terminal attachment and asset resolution. |
| `board-serve` / `createBoardServer` | Configured HTTP server, workspace trust and asset resolution. |
| `terminal-ws` / `createTerminalWebSocket` | Workspace/provider/session services, trust, headroom routing, packaged-mode detection and degradation reporting. |
| `graph-mcp-server` / `createGraphMcpServer` | Command lookup and invocation. MCP tool schemas come from those command descriptors. |
| `static-serve` | Direct pure APIs for MIME types, safe paths, app-shell fallback and loopback admission. |

Constructing a transport binds no listener. Server functions retain their existing explicit startup
and shutdown contracts. Native PTY loading stays deferred through `@aof/execution/pty`; importing
the server package does not load the native addon. `ws` is the package's only third-party dependency.

Core currently composes these services through compatibility modules. Final application assembly
will remove those modules. Mesh fleet/control streaming still carries domain policy and remains
outside this extraction; reusable transport mechanisms can be assigned as mesh is separated.

Run `yarn workspace @aof/server test`. Package tests use temporary directories, an ephemeral local
HTTP server, in-memory MCP streams and a simulated terminal socket. Integration tests retain real
application command/configuration and WebSocket coverage through the existing public entry points.
