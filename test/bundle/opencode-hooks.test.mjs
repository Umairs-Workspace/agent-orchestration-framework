import assert from "node:assert/strict";
import {
  OPENCODE_EVENT_MAP,
  OPENCODE_PLUGIN_STAMP,
  OPENCODE_UNMAPPED_EVENTS,
  opencodeHookDeclarations,
  opencodePluginFiles,
  renderOpenCodePlugin
} from "../../src/opencode-hooks.mjs";

export const opencodeHookTests = [
  {
    name: "opencodeHookDeclarations unions bundle and config hooks, filtered to opencode runtime",
    run() {
      const bundleHooks = [
        { id: "bundle-start", event: "SessionStart", runtimes: ["opencode"], command: "aof start" },
        { id: "bundle-claude-only", event: "SessionStart", runtimes: ["claude"], command: "echo claude" }
      ];
      const config = {
        hooks: [
          { id: "project-start", event: "SessionStart", runtimes: ["opencode"], command: "aof project" },
          // A config hook with the same id wins over the bundle's.
          { id: "bundle-start", event: "SessionStart", runtimes: ["opencode"], command: "aof overridden" }
        ]
      };
      const declarations = opencodeHookDeclarations(config, { bundleHooks });
      const ids = declarations.map((hook) => hook.id);
      assert.deepEqual(ids, ["bundle-start", "project-start"]);
      assert.equal(declarations[0].command, "aof overridden", "a config hook with the same id wins");
      assert.equal(declarations.every((hook) => hook.runtimes.includes("opencode")), true);
    }
  },
  {
    name: "opencodeHookDeclarations treats absent runtimes as selecting opencode (normalizeRuntimes default)",
    run() {
      const config = { hooks: [{ id: "bare", event: "Stop", command: "aof stop" }] };
      const declarations = opencodeHookDeclarations(config, { bundleHooks: [] });
      assert.equal(declarations.length, 1);
      assert.equal(declarations[0].id, "bare");
    }
  },
  {
    name: "renderOpenCodePlugin maps claude events to opencode events",
    run() {
      const cases = [
        ["PreToolUse", "tool.execute.before"],
        ["PostToolUse", "tool.execute.after"],
        ["SessionStart", "session.created"],
        ["SessionEnd", "session.deleted"],
        ["UserPromptSubmit", "message.updated"],
        ["Stop", "session.idle"],
        ["PreCompact", "session.compacted"]
      ];
      for (const [claudeEvent, opencodeEvent] of cases) {
        const rendered = renderOpenCodePlugin({ id: "h", event: claudeEvent, command: "true" });
        assert.equal(rendered.mapped, true, claudeEvent);
        assert.equal(rendered.opencodeEvent, opencodeEvent, claudeEvent);
        assert.match(rendered.content, new RegExp(`"${opencodeEvent}": async`));
      }
    }
  },
  {
    name: "renderOpenCodePlugin flags unmapped events as inert and self-identifying",
    run() {
      for (const event of OPENCODE_UNMAPPED_EVENTS) {
        const rendered = renderOpenCodePlugin({ id: "h", event, command: "echo hi" });
        assert.equal(rendered.mapped, false, event);
        assert.equal(rendered.opencodeEvent, undefined, event);
        assert.ok(rendered.content.includes("has no faithful opencode equivalent; this plugin is inert"), event);
        assert.ok(rendered.content.includes(`aof event "${event}" has no faithful`), event);
      }
      assert.deepEqual([...OPENCODE_UNMAPPED_EVENTS].sort(), ["Notification", "SubagentStop"]);
    }
  },
  {
    name: "renderOpenCodePlugin tokenises command + opencode args into a Bun $ invocation",
    run() {
      const rendered = renderOpenCodePlugin({
        id: "artifact-sync",
        event: "PostToolUse",
        command: "node",
        opencode: { args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/x.mjs"] }
      });
      assert.ok(rendered.content.includes('await $`${["node","${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/x.mjs"]}`;'));
    }
  },
  {
    name: "renderOpenCodePlugin emits a tool matcher guard only on tool events",
    run() {
      const tool = renderOpenCodePlugin({ id: "h", event: "PostToolUse", matcher: "Write|Edit", command: "true" });
      assert.ok(tool.content.includes('if (input.tool && !/Write\\|Edit/.test(input.tool)) return;'));

      const session = renderOpenCodePlugin({ id: "h", event: "SessionStart", matcher: "startup", command: "true" });
      assert.ok(!session.content.includes("input.tool"));
    }
  },
  {
    name: "every generated plugin is valid JS and self-identifying",
    async run() {
      const { writeFile, rm, mkdtemp, mkdir } = await import("node:fs/promises");
      const os = await import("node:os");
      const path = await import("node:path");
      const { execFile } = await import("node:child_process");
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-och-"));
      try {
        const files = opencodePluginFiles(
          { hooks: [
            { id: "test-after-write", event: "PostToolUse", matcher: "Write", command: "npm test", runtimes: ["opencode"] },
            { id: "session-ping", event: "SessionStart", command: "aof session start", runtimes: ["opencode"] }
          ] },
          { bundleHooks: [] }
        );
        assert.equal(files.length, 2);
        await mkdir(path.join(dir, "plugins"));
        for (const file of files) {
          assert.equal(file.runtime, "opencode");
          assert.equal(file.resource.kind, "hooks");
          assert.match(file.relativePath, /^plugins\/aof-[A-Za-z0-9._-]+\.js$/);
          assert.ok(file.content.includes(`// ${OPENCODE_PLUGIN_STAMP}; aof-runtime: opencode; aof-hook: `));
          const target = path.join(dir, file.relativePath);
          await writeFile(target, file.content);
          await new Promise((resolve, reject) => execFile(process.execPath, ["--check", target], (error) => (error ? reject(error) : resolve())));
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  },
  {
    name: "OPENCODE_EVENT_MAP covers the renderable claude hook events",
    run() {
      for (const event of ["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd", "UserPromptSubmit", "Stop", "PreCompact"]) {
        assert.ok(OPENCODE_EVENT_MAP[event], `missing mapping for ${event}`);
      }
    }
  }
];
