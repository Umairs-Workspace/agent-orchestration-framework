// The `work-init` golden lane (203/ADR-005): every way a project can be initialised, as data, in
// the ADR's order. `default` is held whole; each other scenario is held as a delta over it, so a
// change to a shared render shows once, in `default`, and again only where a scenario's own copy
// changed too (ADR-003). Each scenario runs one step, `work init --runtime <list> --json`, exiting 0.
//
// Eight scenarios, not the 24-way cross product: the three single-runtime inits together hold
// exactly the three-runtime tree (measured, ARCHITECTURE "Measured facts"), so each runtime alone
// costs only its `removed.golden`. Learning has no key and is in every render; `all-practices`
// turns on every practice key that exists. A profile is the config the project already holds when
// it runs `init`, because a plain `init` writes no config.

const ALL = "claude,codex,opencode";
const init = (runtimes) => [{ argv: ["work", "init", "--runtime", runtimes, "--json"], exit: 0 }];
const config = (work) => ({ ".aof/aof.config.json": `${JSON.stringify({ work }, null, 2)}\n` });

// The user's own files, beside aof's paths (story 01's map, E9 to E14).
const CUSTOMISED_FILES = Object.freeze({
  ".claude/commands/deploy.md": "# Deploy\nMine.\n",
  ".claude/settings.json": `${JSON.stringify(
    { permissions: { allow: ["Bash(npm test)"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }] } },
    null,
    2,
  )}\n`,
  // A matcher group, as Codex reads it: a flat shape makes `init` refuse with `codex-hooks-unparseable`.
  ".codex/hooks.json": `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }, null, 2)}\n`,
  ".codex/config.toml": 'model = "o3"\n',
  ".opencode/opencode.json": `${JSON.stringify({ $schema: "https://opencode.ai/config.json" }, null, 2)}\n`,
  "AGENTS.md": "# Agents\nMine.\n",
  "CLAUDE.md": "# Claude\n",
  ".gitignore": "node_modules/\n",
  "wiki/work/.gitignore": "scratch/\n",
  // A user file at an aof path. `init` overwrites it today, and this lane holds that (ADR-005).
  ".claude/agents/aof-architect.md": "mine\n",
});

export default Object.freeze({
  id: "work-init",
  scenarios: Object.freeze([
    { id: "default", steps: init(ALL) },
    { id: "claude", base: "default", steps: init("claude") },
    { id: "codex", base: "default", steps: init("codex") },
    { id: "opencode", base: "default", steps: init("opencode") },
    { id: "all-practices", base: "default", files: config({ examples: { enabled: true, operatorAware: true }, plan: { enabled: true } }), steps: init(ALL) },
    { id: "notion", base: "default", files: config({ integrations: { notion: {} } }), steps: init(ALL) },
    { id: "hyperagent", base: "default", files: config({ integrations: { hyperagent: {} } }), steps: init(ALL) },
    { id: "customised", base: "default", files: CUSTOMISED_FILES, steps: init(ALL) },
  ]),
});
