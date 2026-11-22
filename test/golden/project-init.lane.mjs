// The `project-init` golden lane (204/ADR-001, ADR-005). `empty` is `aof init` on an empty folder,
// held whole. `customised` runs it over the user's own ignore files, `re-init` runs it twice,
// `after-work-init` runs it after `aof work init` (a delta over 203's `work-init/claude`), and
// `global` holds the `--global` path through `assets add --global` and `assets use --global`
// (ADR-001 §4), because `assets apply --global` refuses by design.
const ALL = "claude,codex,opencode";
const json = (argv, exit = 0) => ({ argv: [...argv, "--json"], exit });
const init = (runtimes, exit = 0) => json(["init", "--runtime", runtimes], exit);

export const CUSTOMISED_FILES = Object.freeze({
  ".aof/.gitignore": "scratch/\n",
  ".gitignore": "node_modules/\n",
});

const addGlobal = (kind, id, label) => json(["assets", "add", "--global", kind, id, "--description", `Global ${label}`, "--body", `Global ${label} body.`, "--runtime", ALL]);

export const GLOBAL_STEPS = Object.freeze([
  init(ALL),
  addGlobal("skill", "g-skill", "skill"),
  addGlobal("agent", "g-agent", "agent"),
  addGlobal("rule", "g-rule", "rule"),
  json(["assets", "add", "--global", "command", "g-command", "--body", "x"], 1),
  json(["assets", "use", "--global", "skill", "g-skill"]),
  json(["assets", "use", "--global", "agent", "g-agent"]),
  json(["assets", "use", "--global", "rule", "g-rule"]),
  json(["assets", "apply"]),
]);

export default Object.freeze({
  id: "project-init",
  scenarios: Object.freeze([
    { id: "empty", steps: [init(ALL)] },
    { id: "customised", base: "empty", files: CUSTOMISED_FILES, steps: [init(ALL)] },
    { id: "re-init", base: "empty", steps: [init(ALL), init(ALL, 1)] },
    { id: "after-work-init", base: "work-init/claude", steps: [json(["work", "init", "--runtime", "claude"]), init("claude")] },
    { id: "global", base: "empty", steps: GLOBAL_STEPS },
  ]),
});
