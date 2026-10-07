// 154/04: both task features and every outline row exercise the shipped planner/writer.
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, readdir } from "node:fs/promises";
import { writeText } from "@aof/foundation/fs";
import { existsSync } from "node:fs";
import { createRenderPlan, planApplyActions, executeApplyActions, createLockManifest, formatFriendlyApplyAction } from "../src/render-plan.mjs";
import { hashContent, readLock, writeLock } from "../src/lock.mjs";
import { codexJournalPath, recordCodexApply } from "../src/codex-settings.mjs";
import { assets } from "./support/assets-services.mjs";
import { updateWork } from "../src/work/update.mjs";
import { applyConfig } from "../src/adapters.mjs";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../../test/support/cli-spawn.mjs";

const cli = fileURLToPath(new URL("../bin/aof.mjs", import.meta.url));

const config = () => ({ resources: [
  { id: "reviewer", kind: "agent", runtimes: ["codex"], body: "Review the code." },
  { id: "aof-refine", kind: "skill", runtimes: ["codex"], body: "Refine the story." },
  { id: "policy", kind: "rule", runtimes: ["codex"], body: "Use the configured tests." }
], workflows: [], packages: [], hooks: [
  { id: "presence", event: "SessionStart", command: "aof session start --assistant codex", type: "command", runtimes: ["codex"] }
], mcpServers: [{ id: "aof", transport: "stdio", command: "aof", args: ["graph", "serve"], runtimes: ["codex"] }], settings: {} });

async function put(root, relative, text) {
  const filename = path.join(root, relative);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, text);
}
async function read(root, relative) { return readFile(path.join(root, relative), "utf8"); }
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-codex-owned-"));
  try { await run(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
async function apply(root, source, previous = null, options = {}) {
  const desiredOutputs = await createRenderPlan(source, { targetDir: root, runtimes: ["codex"] });
  const actions = await planApplyActions(desiredOutputs, previous, { targetDir: root, ...options });
  await executeApplyActions(actions);
  const lock = createLockManifest({ actions, desiredOutputs, previousLock: previous, config: source, runtimes: ["codex"] });
  await writeLock(path.join(root, ".aof/aof.lock.json"), lock);
  return { lock, actions, desiredOutputs };
}
async function legacy(root, edited = false) {
  const old = ".codex/skills/aof-refine/SKILL.md";
  const text = "legacy AOF refine\n";
  await put(root, old, edited ? text + "operator edit\n" : text);
  await put(root, ".aof/aof.lock.json", JSON.stringify({ files: [{ path: old, runtime: "codex", resource: { id: "aof-refine", kind: "skill" }, hash: hashContent(text) }] }));
  return { old, previous: await readLock(path.join(root, ".aof/aof.lock.json")) };
}

export const codexOwnershipTests = [
  { name: "154/04 ownership: upgrading legacy configuration preserves protected profile values in their original table",
    run: () => fixture(async root => {
      const text = '[profiles.operator]\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\n';
      await put(root, ".codex/config.toml", text);
      const previous = { files: [{ path: ".codex/config.toml", runtime: "codex", resource: { kind: "settings", id: "codex-config" }, hash: hashContent(text) }] };
      const source = config();
      const first = await apply(root, source, previous);
      assert.ok((await read(root, ".codex/config.toml")).startsWith(text));
      source.mcpServers = [];
      await apply(root, source, first.lock);
      assert.ok((await read(root, ".codex/config.toml")).startsWith(text));
    }) },
  { name: "154/04 ownership: unsupported native hook events remain explicitly inactive",
    run: () => fixture(async root => {
      const source = config(); source.hooks[0].event = "Notification";
      const result = await apply(root, source);
      const hook = result.actions.find(action => action.resource.kind === "hooks");
      assert.equal(hook.active, false);
      assert.equal(hook.activation, "inactive-unsupported-profile");
      assert.deepEqual(hook.unsupportedEvents, ["Notification"]);
      assert.match(hook.reason, /inactive hook events/);
      assert.ok(!JSON.parse(await read(root, ".codex/hooks.json")).hooks.Notification);
    }) },
  { name: "154/04 ownership: CLI apply preserves shared files and lock on repeats, and dry-run/refusal preserve collisions",
    run: () => fixture(async root => {
      await put(root, ".aof/aof.config.json", JSON.stringify({ name: "ownership-fixture", runtimes: ["codex"], ...config() }));
      await put(root, "AGENTS.md", "Operator prose.\n");
      const invoke = args => spawnCliSync(process.execPath, [cli, "assets", "apply", ...args], {
        cwd: root, encoding: "utf8", windowsHide: true, timeout: 30000,
        env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "fixture-home") }
      });
      let result = invoke([]);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const lock = await read(root, ".aof/aof.lock.json");
      const guidance = await read(root, "AGENTS.md");
      assert.ok(guidance.startsWith("Operator prose.\n"));
      result = invoke([]);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(await read(root, ".aof/aof.lock.json"), lock);
      await put(root, ".codex/agents/reviewer.toml", "Operator edited native agent.\n");
      result = invoke(["--dry-run", "--force"]);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /refusal.*reviewer\.toml/);
      result = invoke(["--force"]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr + result.stdout, /conflict.*reviewer\.toml/);
      assert.equal(await read(root, ".aof/aof.lock.json"), lock);
      assert.equal(await read(root, "AGENTS.md"), guidance);
      assert.equal(await read(root, ".codex/agents/reviewer.toml"), "Operator edited native agent.\n");
    }) },
  { name: "154/04 ownership: atomic outputs and locks support legal long filenames and reclaim failed rename temps",
    run: () => fixture(async root => {
      const name = "x".repeat(210);
      await writeText(path.join(root, name), "owned output");
      await writeLock(path.join(root, name + ".json"), { owned: true });
      assert.equal(await read(root, name), "owned output");
      assert.deepEqual(await readLock(path.join(root, name + ".json")), { owned: true });
      const directory = path.join(root, "occupied");
      await mkdir(directory);
      await assert.rejects(writeLock(directory, { owned: true }));
      assert.ok(!(await readdir(root)).some(file => file.startsWith(".tmp-")));
    }) },
  { name: "154/04 ownership: the public applyConfig door refuses an unowned Codex target",
    run: () => fixture(async root => {
      await put(root, ".agents/skills/aof-refine/SKILL.md", "operator-owned\n");
      await assert.rejects(applyConfig(config(), { targetDir: root, runtimes: ["codex"], force: true }), /unowned target/);
      assert.equal(await read(root, ".agents/skills/aof-refine/SKILL.md"), "operator-owned\n");
      assert.ok(!existsSync(path.join(root, ".codex/agents/reviewer.toml")));
    }) },
  { name: "154/04 coauthored config: Shared Codex files retain operator content and repeated apply skips",
    run: () => fixture(async root => {
      const toml = '# operator formatting\nmodel = "operator-model"\n\n[projects."C:/operator"]\ntrust_level = "trusted"\n\n[mcp_servers.user]\ncommand = "user-server"\n';
      await put(root, ".codex/config.toml", toml);
      const hook = { matcher: "resume", hooks: [{ type: "command", command: "user-hook" }] };
      await put(root, ".codex/hooks.json", JSON.stringify({ description: "user hooks", hooks: { SessionStart: [hook] }, unrelated: 7 }));
      await put(root, "AGENTS.md", "# Operator guidance\nKeep this exact text.\n");
      const first = await apply(root, config());
      assert.ok((await read(root, ".codex/config.toml")).includes(toml), "all operator TOML bytes remain");
      assert.match(await read(root, ".codex/config.toml"), /command = "aof"/);
      assert.ok((await read(root, "AGENTS.md")).startsWith("# Operator guidance\nKeep this exact text.\n"));
      const hooks = JSON.parse(await read(root, ".codex/hooks.json"));
      assert.deepEqual(hooks.hooks.SessionStart[0], hook);
      assert.equal(hooks.unrelated, 7);
      assert.equal(hooks.description, "user hooks");
      assert.ok(first.lock.files.filter(entry => /config.toml|hooks.json|AGENTS.md/.test(entry.path)).every(entry => entry.ownership));
      const journalTime = (await stat(codexJournalPath(root))).mtimeMs;
      const lockBefore = await read(root, ".aof/aof.lock.json");
      const lockTime = (await stat(path.join(root, ".aof/aof.lock.json"))).mtimeMs;
      const second = await apply(root, config(), first.lock);
      assert.ok(second.actions.every(action => action.action === "skip"));
      assert.equal((await stat(codexJournalPath(root))).mtimeMs, journalTime);
      assert.equal(await read(root, ".aof/aof.lock.json"), lockBefore);
      assert.equal((await stat(path.join(root, ".aof/aof.lock.json"))).mtimeMs, lockTime);
    }) },
  ...[
    ["an unowned agent with the same name", ".codex/agents/reviewer.toml", "user agent\n"],
    ["an unowned skill at the target path", ".agents/skills/aof-refine/SKILL.md", "user skill\n"],
    ["a user MCP entry with the same key", ".codex/config.toml", '[mcp_servers.aof]\ncommand = "user"\n'],
    ["a user MCP entry with a different transport", ".codex/config.toml", '[mcp_servers.aof]\nurl = "https://operator.invalid/mcp"\n'],
    ["an unowned runtime gitignore", ".codex/.gitignore", 'operator-file\n'],
    ["an edited AOF guidance block", "AGENTS.md", null],
    ["invalid existing TOML", ".codex/config.toml", 'model = "unterminated\n'],
    ["a target escaping the configured root", "../escape.toml", "outside target"]
  ].map(([collision, target, content]) => ({ name: `154/04 coauthored config: Collisions fail before shared-file mutation — ${collision}`,
    run: () => fixture(async root => {
      let prior = null;
      if (content === null) {
        prior = (await apply(root, config())).lock;
        await put(root, target, (await read(root, target)).replace("Use the configured tests.", "Operator edited the managed block."));
      } else if (!target.startsWith("../")) await put(root, target, content);
      await put(root, ".aof/aof.lock.json", JSON.stringify(prior ?? { operator: "prior lock" }));
      const lockBefore = await read(root, ".aof/aof.lock.json");
      const userBefore = target.startsWith("../") ? null : await read(root, target);
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      if (target.startsWith("../")) desired[0] = { ...desired[0], path: target, absolutePath: path.resolve(root, target) };
      const actions = await planApplyActions(desired, prior, { targetDir: root, force: true });
      const refused = actions.find(action => action.action === "conflict");
      assert.ok(refused);
      assert.ok(refused.reason.length > 0);
      assert.match(formatFriendlyApplyAction(refused, { dryRun: true }), /refusal/);
      await assert.rejects(executeApplyActions(actions), /conflict|outside-root|unparseable/);
      assert.equal(await read(root, ".aof/aof.lock.json"), lockBefore);
      if (userBefore !== null) assert.equal(await read(root, target), userBefore);
      if (!prior) assert.ok(!existsSync(path.join(root, "AGENTS.md")), "no unrelated merge ran before refusal");
    }) })),
  { name: "154/04 coauthored config: Applying assets cannot grant trust or change access",
    run: () => fixture(async root => {
      const protectedFiles = [".codex/auth.json", ".codex/hook-trust.json", ".codex/trusted-projects.json"];
      for (const file of protectedFiles) await put(root, file, "fixture operator-owned bytes\n");
      const first = await apply(root, config());
      for (const file of protectedFiles) assert.equal(await read(root, file), "fixture operator-owned bytes\n");
      const hook = first.actions.find(action => action.path.replaceAll("\\", "/") === ".codex/hooks.json");
      assert.equal(hook.activation, "requires-native-hook-review");
      for (const settings of [
        { approval_policy: "never", sandbox_mode: "danger-full-access" },
        { profiles: { unsafe: { approval_policy: "never", sandbox_mode: "danger-full-access" } } },
        { profile: "unsafe" }
      ]) {
        const source = config(); source.settings.codex = settings;
        await assert.rejects(apply(root, source, first.lock), /access settings cannot be managed/);
        for (const file of protectedFiles) assert.equal(await read(root, file), "fixture operator-owned bytes\n");
      }
    }) },
  { name: "154/04 owned migration: E1 Owned legacy skills migrate once",
    run: () => fixture(async root => {
      const { old, previous } = await legacy(root);
      const first = await apply(root, config(), previous);
      assert.ok(!existsSync(path.join(root, old)));
      assert.ok(existsSync(path.join(root, ".agents/skills/aof-refine/SKILL.md")));
      assert.ok(first.lock.files.some(entry => entry.path.replaceAll("\\", "/") === ".agents/skills/aof-refine/SKILL.md"));
      const second = await apply(root, config(), first.lock);
      assert.ok(second.actions.every(action => action.action === "skip"));
    }) },
  { name: "154/04 owned migration: E2 Drifted legacy skill blocks duplicate discovery",
    run: () => fixture(async root => {
      const { old, previous } = await legacy(root, true);
      const before = await read(root, old);
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      const actions = await planApplyActions(desired, previous, { targetDir: root, force: true });
      assert.ok(actions.some(action => action.code === "codex-migration-drift" && action.reason.includes(old) && action.reason.includes(".agents/skills/")));
      await assert.rejects(executeApplyActions(actions), /native target|duplicate discovery/);
      assert.equal(await read(root, old), before);
      assert.ok(!existsSync(path.join(root, ".agents/skills/aof-refine/SKILL.md")));
    }) },
  ...["before target write", "after target write before old removal", "after old removal before lock save"].map(checkpoint => ({
    name: `154/04 owned migration: Interrupted migration remains recoverable — ${checkpoint}`,
    run: () => fixture(async root => {
      const { old, previous } = await legacy(root);
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      const planned = await planApplyActions(desired, previous, { targetDir: root });
      await recordCodexApply(planned);
      if (checkpoint !== "before target write") {
        for (const action of planned.filter(action => action.action === "create" || action.action === "update")) await put(root, action.path, action.content);
      }
      if (checkpoint === "after old removal before lock save") await rm(path.join(root, old));
      await put(root, ".codex/operator.txt", "unrelated\n");
      const result = await apply(root, config(), previous);
      assert.ok(!existsSync(path.join(root, old)));
      assert.ok(existsSync(path.join(root, ".agents/skills/aof-refine/SKILL.md")));
      assert.equal(await read(root, ".codex/operator.txt"), "unrelated\n");
      assert.ok(result.lock.files.some(entry => entry.path.replaceAll("\\", "/") === ".agents/skills/aof-refine/SKILL.md"));
    }) })),
  { name: "154/04 owned migration: Dry run exposes migration without writing",
    run: () => fixture(async root => {
      const { old, previous } = await legacy(root);
      await put(root, "AGENTS.md", "operator\n");
      await put(root, ".codex/unrelated.md", "unrelated\n");
      const lockBefore = await read(root, ".aof/aof.lock.json");
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      const actions = await planApplyActions(desired, previous, { targetDir: root });
      assert.ok(actions.some(action => action.action === "delete" && action.path === old));
      assert.ok(actions.some(action => action.action === "update" && action.reason.includes("merge")));
      assert.ok(actions.some(action => action.action === "create" && action.path.replaceAll("\\", "/").startsWith(".agents/skills/")));
      assert.equal(await read(root, ".aof/aof.lock.json"), lockBefore);
      assert.equal(await read(root, old), "legacy AOF refine\n");
      assert.equal(await read(root, "AGENTS.md"), "operator\n");
      assert.equal(await read(root, ".codex/unrelated.md"), "unrelated\n");
      assert.ok(!existsSync(codexJournalPath(root)));
    }) },
  { name: "154/04 ownership: identical unowned native bytes are never silently adopted",
    run: () => fixture(async root => {
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      const skill = desired.find(output => output.resource.kind === "skill");
      await put(root, skill.path, skill.content);
      const actions = await planApplyActions(desired, null, { targetDir: root });
      assert.equal(actions.find(action => action.path === skill.path).action, "conflict");
    }) },
  { name: "154/04 ownership: operator edits beside managed TOML and guidance survive an update and retraction",
    run: () => fixture(async root => {
      const first = await apply(root, config());
      await put(root, ".codex/config.toml", (await read(root, ".codex/config.toml")) + '\n[mcp_servers.extra]\ncommand = "operator"\n');
      await put(root, "AGENTS.md", (await read(root, "AGENTS.md")) + "\nExtra operator prose.\n");
      const source = config(); source.mcpServers[0].command = "aof-new"; source.resources[2].body = "Updated owned guidance.";
      const second = await apply(root, source, first.lock);
      assert.match(await read(root, ".codex/config.toml"), /aof-new/);
      assert.match(await read(root, ".codex/config.toml"), /command = "operator"/);
      assert.match(await read(root, "AGENTS.md"), /Extra operator prose/);
      source.resources = source.resources.filter(resource => resource.kind !== "rule"); source.mcpServers = []; source.hooks = [];
      await apply(root, source, second.lock);
      assert.equal(await read(root, "AGENTS.md"), "\nExtra operator prose.\n");
      assert.doesNotMatch(await read(root, ".codex/config.toml"), /aof-new/);
      assert.doesNotMatch(await read(root, ".codex/config.toml"), /\[mcp_servers\.aof\]/);
      assert.match(await read(root, ".codex/config.toml"), /operator/);
    }) },
  ...['duplicate = 1\nduplicate = 2\n', 'value = [bare_word]\n', '[broken\n', 'value = { missing = }\n', 'parent.child = 1\nparent = 2\n', 'value = 0b2\n', 'value = "\\/"\n', 'value = """invalid \\q"""\n', 'value = { a = 1, "a" = 2 }\n', 'value = 2026-99-99\n'].map((text, index) => ({
    name: `154/04 ownership: malformed TOML refuses before any mutation (${index})`,
    run: () => fixture(async root => {
      await put(root, ".codex/config.toml", text);
      await assert.rejects(apply(root, config()), /toml-unparseable/);
      assert.equal(await read(root, ".codex/config.toml"), text);
      assert.ok(!existsSync(path.join(root, ".agents/skills/aof-refine/SKILL.md")));
    }) })),
  { name: "154/04 ownership: init and force re-init preserve operator hooks; update uses the same ownership",
    run: () => fixture(async root => {
      const user = { hooks: [{ type: "command", command: "operator-start" }] };
      await put(root, ".codex/hooks.json", JSON.stringify({ hooks: { SessionStart: [user] }, operator: true }));
      const first = await assets.work.init.initWork({ targetDir: root, runtimes: ["codex"] });
      assert.equal(first.manifestWritten, true);
      await assets.work.init.initWork({ targetDir: root, runtimes: ["codex"], force: true });
      await updateWork({ targetDir: root });
      const hooks = JSON.parse(await read(root, ".codex/hooks.json"));
      assert.deepEqual(hooks.hooks.SessionStart[0], user);
      assert.equal(hooks.operator, true);
    }) },
  { name: "154/04 ownership: init collision refuses before writing either runtime or its lock",
    run: () => fixture(async root => {
      await put(root, ".codex/agents/aof-architect.toml", "operator agent\n");
      await assert.rejects(assets.work.init.initWork({ targetDir: root, runtimes: ["claude", "codex"], force: true }), /unowned target/);
      assert.ok(!existsSync(path.join(root, ".claude/agents/aof-architect.md")));
      assert.ok(!existsSync(path.join(root, ".aof/aof.lock.json")));
    }) },
  { name: "154/04 ownership: a target changed after planning is preserved",
    run: () => fixture(async root => {
      const desired = await createRenderPlan(config(), { targetDir: root, runtimes: ["codex"] });
      const actions = await planApplyActions(desired, null, { targetDir: root });
      await put(root, ".codex/agents/reviewer.toml", "operator race\n");
      await assert.rejects(executeApplyActions(actions), /changed after planning/);
      assert.equal(await read(root, ".codex/agents/reviewer.toml"), "operator race\n");
      assert.ok(!existsSync(path.join(root, ".agents/skills/aof-refine/SKILL.md")));
    }) }
];
