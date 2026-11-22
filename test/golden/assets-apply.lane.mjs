// The `assets-apply` golden lane (204/ADR-001). `EVERY_KIND` is a project's own `.aof/` holding
// every asset kind, as data: a map from project path to text. Other lanes import it, and a
// scenario that needs a variant derives one from it in its own lane module; nobody keeps a second
// copy.
//
// `every-kind` applies it on three runtimes and is held whole. Each runtime alone is a delta over
// it, so its `removed.golden` names the other runtimes' outputs. `re-apply` applies twice, and its
// second step must skip every file (ADR-003).
const ALL = ["claude", "codex", "opencode"];

const asset = (kind, id, description, extra = {}) => ({ kind, id, description, path: `assets/${kind}s/${id}/${kind.toUpperCase()}.md`, runtimes: ALL, ...extra });

const CONFIG = {
  name: "every-kind",
  runtimes: ALL,
  resources: [
    asset("agent", "my-agent", "Reviews changes before they merge"),
    asset("skill", "my-skill", "Runs the tests and summarises failures"),
    // Scoped to `src`, so Codex writes it to `src/AGENTS.md`, beside the root project doc (E4).
    asset("rule", "my-rule", "Keeps modules small", { paths: ["src"] }),
    // Codex refuses commands (E2).
    asset("command", "my-command", "Lists the open pull requests", { runtimes: ["claude", "opencode"] }),
  ],
  workflows: [{ id: "release", path: "assets/workflows/release/WORKFLOW.md", runtimes: ALL }],
  mcpServers: [
    { id: "docs", transport: "stdio", command: "npx", args: ["-y", "docs-mcp"], runtimes: ALL },
    { id: "remote", transport: "http", url: "https://mcp.example.com/mcp", runtimes: ["claude", "codex"] },
  ],
  hooks: [{ id: "lint-on-stop", event: "Stop", command: "npm run lint", runtimes: ALL }],
  projectDocs: [{ id: "guide", path: "docs/guide.md", targets: ["AGENTS.md", "CLAUDE.md"], runtimes: ["claude", "codex"] }],
  settings: { codex: { model: "o3" }, claude: { model: "sonnet" } },
};

export const EVERY_KIND = Object.freeze({
  ".aof/aof.config.json": `${JSON.stringify(CONFIG, null, 2)}\n`,
  ".aof/assets/agents/my-agent/AGENT.md": "# my-agent\n\nReview each change for correctness before it merges.\n",
  ".aof/assets/skills/my-skill/SKILL.md": "# my-skill\n\n## Workflow\n\nRun the tests, then summarise what failed.\n",
  ".aof/assets/rules/my-rule/RULE.md": "# my-rule\n\n- Keep each module under 300 lines.\n",
  ".aof/assets/commands/my-command/COMMAND.md": "# my-command\n\nList the open pull requests.\n",
  ".aof/assets/workflows/release/WORKFLOW.md": "# release\n\n1. Bump the version.\n2. Tag the commit.\n",
  ".aof/docs/guide.md": "# Guide\n\nRun `npm test` before every commit.\n",
});

const apply = (...extra) => ({ argv: ["assets", "apply", ...extra, "--json"], exit: 0 });

export default Object.freeze({
  id: "assets-apply",
  scenarios: Object.freeze([
    { id: "every-kind", files: EVERY_KIND, steps: [apply()] },
    ...ALL.map((runtime) => ({ id: runtime, base: "every-kind", files: EVERY_KIND, steps: [apply("--runtime", runtime)] })),
    { id: "re-apply", base: "every-kind", files: EVERY_KIND, steps: [apply(), apply()] },
  ]),
});
