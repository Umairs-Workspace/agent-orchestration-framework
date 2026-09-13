// src/opencode-hooks.mjs — render AOF `config.hooks` (and bundle hooks) into opencode
// plugin files under `.opencode/plugins/*.js`.
//
// opencode has NO declarative command-hook config like Claude's `.claude/settings.json`.
// Its extension mechanism is PLUGINS: JS modules in `.opencode/plugins/` that subscribe
// to events and shell out to a command. This module is the opencode half of the
// claude/codex hook story:
//
//   · claude hooks -> co-authored `.claude/settings.json` surgical MERGE
//     (src/claude-settings.mjs) — a file with many authors.
//   · codex hooks  -> whole-file `.codex/hooks.json` (src/runtime-config.mjs) — aof owns it.
//   · opencode hooks -> one whole-file `.opencode/plugins/aof-<id>.js` PER HOOK — aof
//     owns each file outright, so it rides the render plan and lock, and removing the
//     hook from config removes exactly its own file (idempotent + retractable).
//
// Because every generated plugin is aof-EXCLUSIVELY owned, each carries a line-comment
// self-identifying marker (`aof-generated: true; aof-runtime: opencode; aof-hook: <id>`)
// so aof can recognise its own plugin files — the comment-form analogue of the
// `aofManaged` key on co-authored entries and the frontmatter stamp on rendered resources.
import { hashContent } from "./lock.mjs";
import { loadBundleHooks } from "./work/bundle.mjs";

// The marker line every generated plugin carries. Fitness/detection keys on this.
export const OPENCODE_PLUGIN_STAMP = "aof-generated: true";

// Claude hook event -> opencode plugin event. Only events with a faithful opencode
// equivalent are mapped; the rest are reported (skipped) rather than silently dropped.
export const OPENCODE_EVENT_MAP = {
  PreToolUse: "tool.execute.before",
  PostToolUse: "tool.execute.after",
  SessionStart: "session.created",
  SessionEnd: "session.deleted",
  UserPromptSubmit: "message.updated",
  Stop: "session.idle",
  PreCompact: "session.compacted"
};

// Claude hook events with no faithful opencode equivalent. An aof hook on one of these
// still renders a plugin file (so the config stays consistent and retractable) but the
// plugin body is inert and the mapping is surfaced, not hidden.
export const OPENCODE_UNMAPPED_EVENTS = Object.freeze(["Notification", "SubagentStop"]);

// Is this opencode event one whose Claude matcher (a tool-name / prompt regex) has a
// faithful opencode counterpart? Only tool events take a matcher guard; session and
// message events have no equivalent selector, so the matcher is documented, not enforced.
const MATCHER_EVENTS = new Set(["tool.execute.before", "tool.execute.after"]);

// opencodeHookDeclarations(config, { bundleHooks }) — THE ONE resolver for "which opencode
// hooks does aof render here": the BUNDLE's declarations UNION the project config's own,
// filtered to hooks that select the opencode runtime (absent runtimes => selected, the
// same default normalizeRuntimes applies). A project entry with the same id wins, mirroring
// claudeHookDeclarations exactly.
export function opencodeHookDeclarations(config, { bundleHooks } = {}) {
  const isOpencode = (hook) => (hook?.runtimes == null ? true : Array.isArray(hook.runtimes) && hook.runtimes.includes("opencode"));
  const byId = new Map();
  let anonymous = 0;
  for (const hook of [...(bundleHooks ?? loadBundleHooks()), ...(Array.isArray(config?.hooks) ? config.hooks : [])]) {
    if (!isOpencode(hook)) continue;
    byId.set(typeof hook.id === "string" && hook.id.length > 0 ? hook.id : `anonymous-${anonymous++}`, hook);
  }
  return [...byId.values()];
}

// renderOpenCodePlugin(hook) -> { id, event, opencodeEvent, mapped, content } where
// `content` is the complete JS module text for one `.opencode/plugins/aof-<id>.js` file.
export function renderOpenCodePlugin(hook) {
  const id = hook?.id ?? "aof";
  const opencodeEvent = OPENCODE_EVENT_MAP[hook?.event];
  const mapped = Boolean(opencodeEvent);
  const extension = hook?.opencode != null && typeof hook.opencode === "object" && !Array.isArray(hook.opencode) ? hook.opencode : {};
  const args = Array.isArray(extension.args) ? extension.args.map(String) : [];
  return {
    id,
    event: hook?.event ?? null,
    opencodeEvent,
    mapped,
    content: pluginSource({ id, hook, opencodeEvent, mapped, args })
  };
}

// opencodePluginFiles(config, { bundleHooks }) — the render-plan-ready output descriptors,
// one per opencode-declared hook. Structurally the opencode twin of the codexHooks block
// in src/adapters.mjs renderRuntimeConfigOutputs.
export function opencodePluginFiles(config, { bundleHooks } = {}) {
  const hooks = opencodeHookDeclarations(config, { bundleHooks });
  const files = [];
  for (const hook of hooks) {
    const rendered = renderOpenCodePlugin(hook);
    const relativePath = `plugins/aof-${sanitize(rendered.id)}.js`;
    files.push({
      id: `aof-hook-${rendered.id}`,
      filename: `aof-${sanitize(rendered.id)}.js`,
      relativePath,
      runtime: "opencode",
      resource: { kind: "hooks", id: rendered.id },
      hook,
      mapped: rendered.mapped,
      opencodeEvent: rendered.opencodeEvent,
      content: rendered.content,
      hash: hashContent(rendered.content)
    });
  }
  return files;
}

// Build the JS module text for one plugin file.
function pluginSource({ id, hook, opencodeEvent, mapped, args }) {
  const exportName = `AofHook${camel(id)}`;
  const commandTokens = tokensFor(hook.command, args);
  const matcherGuard = mapped && MATCHER_EVENTS.has(opencodeEvent) && typeof hook.matcher === "string" && hook.matcher.trim() !== ""
    ? `      if (input.tool && !/${escapeRegex(hook.matcher)}/.test(input.tool)) return;`
    : "";

  const lines = [
    `// ${OPENCODE_PLUGIN_STAMP}; aof-runtime: opencode; aof-hook: ${id}`,
    "// Generated by AOF. Do not edit directly; update .aof/ instead.",
    ""
  ];

  if (!mapped) {
    lines.push(
      `// aof event "${hook.event}" has no faithful opencode equivalent; this plugin is inert.`,
      ""
    );
  }

  lines.push(
    `export const ${exportName} = async ({ $ }) => {`,
    "  return {"
  );

  if (mapped) {
    const guard = matcherGuard ? [matcherGuard] : [];
    lines.push(
      `    "${opencodeEvent}": async (input, output) => {`,
      ...guard,
      `      await $` + "`" + `\${${JSON.stringify(commandTokens)}}` + "`" + `;`,
      "    },"
    );
  } else {
    lines.push(
      `    // no-op: "${hook.event}" is not mapped to an opencode event`
    );
  }

  lines.push("  };", "};", "");
  return lines.join("\n");
}

// The hook `command` is a bare executable or shell command string, with optional
// `[opencode].args` argv elements. Tokenise command + append args so the generated
// `$` invocation passes the right argv (Bun's shell handles the array-of-tokens form).
function tokensFor(command, args) {
  const commandTokens = typeof command === "string" && command.trim() !== "" ? command.trim().split(/\s+/) : [];
  return [...commandTokens, ...args];
}

function sanitize(id) {
  return String(id).replace(/[^A-Za-z0-9._-]/g, "-");
}

function camel(id) {
  const base = String(id).replace(/[-_.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
