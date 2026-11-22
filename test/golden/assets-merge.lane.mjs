// The `assets-merge` golden lane (204/ADR-001 §3, ADR-002, ADR-006 §2). `USER_FILES` is the user's
// own file at every merge point: apply over them must move only aof's entries. Each scenario's
// fixture is `EVERY_KIND` from the apply lane, or a variant of it derived here.
//
// `customised` and `customised-re-apply` hold the merges and a second apply over them.
// `opencode-agents` holds opencode's `AGENTS.md` merged the same way. `mcp-collision` and
// `doc-conflict` hold two refusals, each writing nothing.
import { EVERY_KIND } from "./assets-apply.lane.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

export const USER_FILES = Object.freeze({
  ".claude/settings.json": json({ permissions: { allow: ["Bash(npm test)"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }] } }),
  ".codex/config.toml": 'approval_policy = "never"\n\n[mcp_servers.mine]\ncommand = "my-mcp"\n',
  // A matcher group, as Codex reads it.
  ".codex/hooks.json": json({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }),
  "AGENTS.md": "# Agents\nMine.\n",
  "src/AGENTS.md": "# Src\nMine.\n",
  "CLAUDE.md": "# Claude\nMine.\n",
  ".mcp.json": json({ mcpServers: { mine: { command: "my-mcp" } } }),
  ".gitignore": "node_modules/\n",
  ".claude/.gitignore": "local.json\n",
});

// EVERY_KIND with the project doc `guide` rendered for `runtimes`.
export function withGuideOn(runtimes) {
  const config = JSON.parse(EVERY_KIND[".aof/aof.config.json"]);
  config.projectDocs = config.projectDocs.map((doc) => (doc.id === "guide" ? { ...doc, runtimes } : doc));
  return { ...EVERY_KIND, ".aof/aof.config.json": json(config) };
}

const apply = (...extra) => ({ argv: ["assets", "apply", ...extra, "--json"], exit: 0 });
const refused = { argv: ["assets", "apply", "--json"], exit: 1 };
const CUSTOMISED = Object.freeze({ ...EVERY_KIND, ...USER_FILES });

export const MCP_COLLISION = Object.freeze({ ...EVERY_KIND, ".mcp.json": json({ mcpServers: { docs: { command: "their-docs" } } }) });
export const DOC_CONFLICT = Object.freeze(withGuideOn(["claude", "codex", "opencode"]));
export const OPENCODE_AGENTS = Object.freeze({ ...withGuideOn(["opencode"]), "AGENTS.md": USER_FILES["AGENTS.md"] });

export default Object.freeze({
  id: "assets-merge",
  scenarios: Object.freeze([
    { id: "customised", base: "assets-apply/every-kind", files: CUSTOMISED, steps: [apply()] },
    { id: "customised-re-apply", base: "customised", files: CUSTOMISED, steps: [apply(), apply()] },
    { id: "opencode-agents", base: "assets-apply/opencode", files: OPENCODE_AGENTS, steps: [apply("--runtime", "opencode")] },
    { id: "mcp-collision", files: MCP_COLLISION, steps: [refused] },
    { id: "doc-conflict", files: DOC_CONFLICT, steps: [refused] },
  ]),
});
