import { createApplication } from "../src/application/assemble.mjs";
import { createBaseServices } from "../src/application/base.mjs";
import { createRuntimeSession } from "@aof/execution/runtime-session";
import { resolveExecution } from "@aof/execution/runtime-selection";
import { codexFixture } from "../../execution/test/codex-app-server.suite.mjs";
import { withMeshWorkerExecFixture, markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder, scriptedPushExec } from "../../../test/support/mesh-worker-exec-fixture.mjs";
import { assembleAssignmentRecord, insertAssignment } from "@aof/mesh/assignment-record";
import { setAssignmentPhase } from "@aof/mesh/assignment-directive";
import { bundledFrozenSet, compileFrozenSet } from "../src/frozen-set.mjs";
import { decodeExecutionHandoff } from "../../work-loop/src/commands/runtime-invocation.mjs";
import { resolveExecutionResume } from "@aof/execution/runtime-selection";
// 154/04: both task features and every outline row exercise the shipped planner/writer.
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, readdir } from "node:fs/promises";
import { writeText } from "@aof/foundation/fs";
import { existsSync } from "node:fs";
import { createRenderPlan, planApplyActions, executeApplyActions, createLockManifest, formatFriendlyApplyAction } from "../src/render-plan.mjs";
import { hashContent, readLock, writeLock } from "../src/lock.mjs";
import { prepareCodexWorktree, codexJournalPath, recordCodexApply } from "../src/codex-settings.mjs";
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

{
// 154/07 task01: real render ownership and lane files, including operator neighbours.

const put = async (root, file, text) => { const target = path.join(root, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, text); };
const read = (root, file) => readFile(path.join(root, file), "utf8");
async function fixture(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-native-lane-"));
  const root = path.join(dir, "primary"), lane = path.join(dir, "lane");
  await mkdir(root); await mkdir(lane);
  try {
    const config = { resources: [
      { id: "aof-continue", kind: "skill", runtimes: ["codex"], body: "Use the native procedure." },
      { id: "reviewer", kind: "agent", runtimes: ["codex"], body: "Review this workspace." },
      { id: "policy", kind: "rule", runtimes: ["codex"], body: "Read .agents/skills/aof-continue/SKILL.md." },
    ], workflows: [], packages: [], hooks: [], settings: {}, mcpServers: [{ id: "local", transport: "stdio", command: "aof", args: ["graph", "serve"], runtimes: ["codex"] }] };
    const desiredOutputs = await createRenderPlan(config, { targetDir: root, runtimes: ["codex"] });
    const actions = await planApplyActions(desiredOutputs, null, { targetDir: root });
    await executeApplyActions(actions);
    const lock = createLockManifest({ actions, desiredOutputs, config, runtimes: ["codex"] });
    await writeLock(path.join(root, ".aof/aof.lock.json"), lock);
    await run({ root, lane, lock });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const codexWorktreeHandoffTests = [
  { name: "154/07 task01 — lane inherits only lock-owned native assets and shared fragments, preserving destination neighbours", run: () => fixture(async ({ root, lane }) => {
    await put(root, "AGENTS.md", (await read(root, "AGENTS.md")) + "Primary operator prose must stay here.\n");
    await put(root, ".codex/config.toml", 'approval_policy = "on-request"\n' + await read(root, ".codex/config.toml"));
    await put(root, ".codex/auth.json", '{"fixture":"never copied"}');
    await put(root, ".claude/settings.local.json", '{"fixture":"Claude consent"}');
    await put(lane, "AGENTS.md", "Lane operator prose.\n");
    await put(lane, ".codex/config.toml", 'sandbox_mode = "workspace-write"\n');
    await prepareCodexWorktree(root, lane);
    assert.ok(existsSync(path.join(lane, ".agents/skills/aof-continue/SKILL.md")));
    assert.ok(existsSync(path.join(lane, ".codex/agents/reviewer.toml")));
    const guidance = await read(lane, "AGENTS.md"), config = await read(lane, ".codex/config.toml");
    assert.ok(guidance.startsWith("Lane operator prose.")); assert.ok(!guidance.includes("Primary operator prose"));
    assert.ok(config.includes('sandbox_mode = "workspace-write"')); assert.ok(!config.includes("approval_policy")); assert.ok(config.includes("mcp_servers.local"));
    assert.equal(existsSync(path.join(lane, ".codex/auth.json")), false); assert.equal(existsSync(path.join(lane, ".claude/settings.local.json")), false);
    const baseline = await read(lane, ".aof/aof.lock.json");
    await prepareCodexWorktree(root, lane);
    assert.equal(await read(lane, ".aof/aof.lock.json"), baseline); assert.equal(await read(lane, "AGENTS.md"), guidance);
  }) },
  ...["missing source", "source drift", "unowned matching destination", "destination drift"].map(scenario => ({ name: `154/07 task01 — preflight refuses ${scenario} before copying any asset`, run: () => fixture(async ({ root, lane, lock }) => {
    const agent = lock.files.find(entry => entry.path.endsWith("reviewer.toml"));
    if (scenario === "missing source") await rm(path.join(root, agent.path));
    if (scenario === "source drift") await put(root, agent.path, "Edited source");
    if (scenario === "unowned matching destination") await put(lane, agent.path, await read(root, agent.path));
    if (scenario === "destination drift") { await prepareCodexWorktree(root, lane); await put(lane, agent.path, "Edited lane"); }
    const before = await readLock(path.join(lane, ".aof/aof.lock.json"));
    await assert.rejects(prepareCodexWorktree(root, lane), error => ["runtime-asset-missing", "codex-output-conflict"].includes(error.code));
    assert.deepEqual(await readLock(path.join(lane, ".aof/aof.lock.json")), before);
    if (scenario !== "destination drift") assert.equal(existsSync(path.join(lane, ".agents/skills/aof-continue/SKILL.md")), false);
  }) })),
];

codexOwnershipTests.push(...codexWorktreeHandoffTests);
}

{
// 154/07 tasks00–01: assembled production handlers/stores/phase driver; fake only native transport.

async function fixture(run, { scenario = "complete", available = true, version } = {}) {
  return withMeshWorkerExecFixture(async fx => {
    await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
    await seedNodeWorkspaceMembership(fx, { workspaceId: fx.workspaceId, nodeId: "worker-a" });
    const probes = [];
    let current = scenario;
    const make = () => { const p = codexFixture({ scenario: current, version }); probes.push(p); return p; };
    const runtimeSession = createRuntimeSession({ adapters: { codex: {
      inspectCapabilities: async options => { const p = make(); return p.adapter.inspectCapabilities({ ...p.options, ...options }); },
      canResume: async () => available,
      drive: async (brief, options) => { const p = make(); return p.adapter.drive(brief, { ...p.options, ...options }); },
    } } });
    const env = { ...process.env, ...fx.env };
    const base = createBaseServices({ env });
    const forbidden = () => { throw new Error("Claude execution, transcript or trust path reached"); };
    base.runtimeSession = runtimeSession;
    base.agentSessionDriver = { ...base.agentSessionDriver, defaultSpawnRuntime: forbidden, driveInteractiveClaudeSession: forbidden };
    base.claudeTrust = { ...base.claudeTrust, ensureWorktreeTrusted: forbidden };
    base.workObserve = { ...base.workObserve, claudeProjectsDir: forbidden, readAskQuestion: forbidden, readPendingAsk: forbidden };
    const a = createApplication({ base, env });
    try {
      const ws = await base.work.loadWorkspace(fx.root, undefined, { env });
      const config = { resources: ["refine", "continue", "verify"].map(phase => ({ id: `aof-${phase}`, kind: "skill", runtimes: ["codex"], body: "Complete the native fixture procedure." })), workflows: [], hooks: [], mcpServers: [], packages: [], settings: {} };
      const desiredOutputs = await createRenderPlan(config, { targetDir: fx.root, runtimes: ["codex"] });
      const actions = await planApplyActions(desiredOutputs, null, { targetDir: fx.root }); await executeApplyActions(actions);
      await writeLock(path.join(fx.root, ".aof/aof.lock.json"), createLockManifest({ actions, desiredOutputs, config, runtimes: ["codex"] }));
      await writeFile(path.join(fx.root, ".gitignore"), ".aof/\n.codex/\n.agents/\n");
      fx.git(["add", ".gitignore"]); fx.git(["commit", "-qm", "ignore generated assets"]);
      const execution = resolveExecution({}, { runtime: "codex", capabilities: { codex: { models: codexFixture().fixture.models } } });
      const recorder = createStatusRecorder();
      const options = { loadWs: async () => ws, nodeId: "worker-a", globalWorkStoreOptions: { env }, env, pushExec: scriptedPushExec(), sendAssignmentStatus: recorder.sendAssignmentStatus, sendEffectStep: recorder.sendEffectStep };
      const assignmentId = "native-assignment";
      const directive = { kind: "directive", assignmentId, itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: `/aof:continue ${fx.itemRef}`, execution };
      const handler = a.mesh.worker.createMeshWorkerExecutionHandler(options);
      const item = (await base.work.findWork(ws.workDir, fx.itemRef))[0];
      await run({ ...fx, a, ws, options, recorder, directive, execution, probes, handler, item, assignmentId, setScenario: value => { current = value; } });
    } finally { await a.close(); }
  }, { milestoneNumber: "154", storyNumber: "07", storySlug: "native-handoff" });
}

const codexWorkerHandoffTests = [
  { name: "154/07 task00 — spawned loop CLI consumes handoff through its configured resolver and refuses an empty envelope", run: () => fixture(async f => {
    for (const transport of [undefined, JSON.stringify(f.execution), "null"]) {
      const env = { ...process.env, ...f.env, AOF_LOOP_DIAG: "0" };
      delete env.AOF_MESH_EXECUTION;
      if (transport !== undefined) env.AOF_MESH_EXECUTION = transport;
      const result = spawnCliSync(process.execPath, [cli, "work", "loop", "invalid/scope"], { cwd: f.root, env, encoding: "utf8", windowsHide: true, timeout: 30000 });
      assert.equal(typeof result.status, "number", String(result.error));
      assert.notEqual(result.status, 0);
      assert.ok(!result.stderr.includes("is not defined"), result.stderr);
      assert.ok(result.stderr.includes(transport === "null" ? "must be a versioned execution envelope" : "scope matched neither admitted loop scope form"), result.stderr);
    }
  }) },
  { name: "154/07 task00 — unattended worker hands the exact pinned envelope to the declared loop launch", run: () => fixture(async f => {
    const calls = [];
    const handler = f.a.mesh.worker.createMeshWorkerExecutionHandler({ ...f.options, spawnRuntime: async (brief, options) => {
      assert.ok(existsSync(path.join(brief.worktreeCwd, ".agents/skills/aof-verify/SKILL.md")));
      calls.push({ brief, options }); return { outcome: "done", processStarted: true };
    } });
    const { command, ...directive } = f.directive;
    await handler({ ...directive, launch: { kind: "loop", scope: "154" } });
    assert.equal(calls.length, 1);
    const declared = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
    assert.equal(calls[0].options.unattended.program, declared.program);
    assert.deepEqual(calls[0].options.unattended.args, [...declared.args, "154"]);
    assert.deepEqual(decodeExecutionHandoff(calls[0].options.env.AOF_MESH_EXECUTION, resolveExecutionResume), f.execution);
    const run = (await f.a.execution.runs.readRuns(f.item))[0];
    assert.deepEqual(run.execution, f.execution);
    assert.equal(f.probes.some(p => p.calls.some(call => call.method === "turn/start")), false);
  }) },
  { name: "154/07 task00 — assembled controller resolves project Codex and the worker launches that exact wire envelope", run: () => fixture(async f => {
    const filename = path.join(f.root, ".aof/aof.config.json");
    const config = JSON.parse(await readFile(filename, "utf8")); config.work.loop = { runtime: "codex" };
    await writeFile(filename, JSON.stringify(config));
    const store = await f.a.mesh.store.openGlobalWorkProjectionStore(f.options.globalWorkStoreOptions);
    try {
      insertAssignment(store, assembleAssignmentRecord({ assignmentId: f.assignmentId, itemRef: f.itemRef, workspaceId: f.workspaceId, targetNodeId: "worker-a", issuer: "control", state: "assigned", now: "2026-10-07T00:00:00Z" }));
      setAssignmentPhase(store, f.assignmentId, "continue");
    } finally { store.close(); }
    const frames = [];
    await f.a.mesh.assignmentReclaim.runControlDispatchReclaimTick(f.ws, { directiveTargets: { get: () => ({}) }, dispatchDirective: frame => { frames.push(frame); return { sent: true }; } }, {
      workspaceId: f.workspaceId, now: "2026-10-07T00:00:01Z", storeOptions: f.options.globalWorkStoreOptions, buildDirectiveFrame: f.a.mesh.controlStreamServer.buildDirectiveFrame,
    });
    assert.equal(frames.length, 1); assert.equal(frames[0].execution.runtime, "codex"); assert.equal(frames[0].execution.runtimeSource, "project");
    await f.handler(frames[0]); const run = (await f.a.execution.runs.readRuns(f.item))[0];
    assert.equal(run.state, "done"); assert.deepEqual(run.execution, frames[0].execution);
    assert.equal(run.sessionId, codexFixture().fixture.nativeThreadId);
  }) },
  { name: "154/07 task00 E1 — worker default Claude executes pinned Codex and reports its durable native identity once", run: () => fixture(async f => {
    assert.equal(f.ws.config.work.loop?.runtime, undefined);
    await f.handler(f.directive);
    const run = (await f.a.execution.runs.readRuns(f.item))[0];
    assert.equal(run.state, "done"); assert.deepEqual(run.execution, f.execution);
    assert.equal(run.sessionId, codexFixture().fixture.nativeThreadId);
    const drive = f.probes.find(p => p.calls.some(call => call.method === "turn/start"));
    const turn = drive.calls.find(call => call.method === "turn/start");
    assert.equal(turn.params.model, f.execution.phases.continue.model); assert.equal(turn.params.effort, f.execution.phases.continue.effort);
    assert.ok(turn.params.input[0].text.includes(`$aof-continue ${f.itemRef}`));
    assert.equal(f.recorder.frames.filter(frame => frame.state === "running" && frame.sessionId === run.sessionId).length, 1);
    assert.equal(f.recorder.frames.at(-1).state, "done"); assert.equal(f.recorder.frames.at(-1).sessionId, run.sessionId);
  }) },
  { name: "154/07 task00 E2 — unsupported worker profile refuses before acceptance or either assistant launch", run: () => fixture(async f => {
    await f.handler(f.directive);
    assert.equal(f.recorder.frames.some(frame => frame.state === "accepted"), false);
    assert.equal(f.recorder.frames.at(-1).code, "unsupported_profile");
    assert.equal(f.probes.flatMap(p => p.children).length, 0); assert.deepEqual(await f.a.execution.runs.readRuns(f.item), []);
  }, { version: "9.0.0" }) },
  { name: "154/07 task01 — reconnect and native answer continue the same run/thread after worker configuration changes", run: () => fixture(async f => {
    await f.handler(f.directive);
    const before = (await f.a.execution.runs.readRuns(f.item))[0];
    assert.equal(before.state, "running"); assert.equal(before.asks.at(-1).runtime, "codex");
    const preserved = await f.a.mesh.worker.settleStrandedRunRecords([{ assignmentId: f.assignmentId, worktreePath: f.a.mesh.worktree.meshWorktreePath(f.root, f.assignmentId) }], f.options);
    assert.ok(preserved.has(f.assignmentId));
    assert.deepEqual((await f.a.execution.runs.readRuns(f.item))[0], before);
    const count = f.probes.length, frames = f.recorder.frames.length;
    await f.handler(f.directive); assert.equal(f.probes.length, count); assert.equal(f.recorder.frames.length, frames);
    f.ws.config.work.loop = { runtime: "claude" }; f.setScenario("complete");
    const resume = f.a.mesh.worker.createMeshWorkerTerminalResumeHandler(f.options);
    await resume({ assignmentId: f.assignmentId, workspaceId: f.workspaceId, itemRef: f.itemRef, sessionId: before.sessionId, answer: { text: "First", by: { actor: "operator", via: "mesh", node: "control" } } });
    const runs = await f.a.execution.runs.readRuns(f.item);
    assert.equal(runs.length, 1); assert.equal(runs[0].state, "done"); assert.equal(runs[0].runId, before.runId);
    assert.equal(runs[0].sessionId, before.sessionId); assert.deepEqual(runs[0].execution, before.execution);
    assert.equal(runs[0].asks.at(-1).answer, "First");
    const resumed = f.probes.find(p => p.calls.some(call => call.method === "thread/resume")); assert.ok(resumed);
    assert.equal(resumed.calls.some(call => call.method === "thread/start"), false);
  }, { scenario: "structured-question" }) },
  { name: "154/07 task01 — missing native thread refuses resume and retains its run and pending decision", run: () => fixture(async f => {
    await f.handler(f.directive); const before = (await f.a.execution.runs.readRuns(f.item))[0];
    const resume = f.a.mesh.worker.createMeshWorkerTerminalResumeHandler(f.options);
    await resume({ assignmentId: f.assignmentId, workspaceId: f.workspaceId, itemRef: f.itemRef, sessionId: before.sessionId, answer: { text: "First" } });
    assert.deepEqual((await f.a.execution.runs.readRuns(f.item))[0], before);
    assert.equal(f.probes.filter(p => p.calls.some(call => call.method === "turn/start")).length, 1);
  }, { scenario: "structured-question", available: false }) },
  { name: "154/07 task01 — a recorded skill missing on the worker refuses before any phase turn", run: () => fixture(async f => {
    await rm(path.join(f.root, ".agents/skills/aof-continue/SKILL.md"));
    await f.handler(f.directive);
    assert.equal(f.recorder.frames.at(-1).code, "runtime-asset-missing");
    assert.equal(f.probes.some(p => p.calls.some(call => call.method === "turn/start")), false);
    assert.deepEqual(await f.a.execution.runs.readRuns(f.item), []);
  }) },
  ...[["unknown runtime", value => { value.runtime = "future"; }, "invalid-record"], ["unknown profile version", value => { value.profileVersion = 99; }, "unsupported-profile"], ["malformed envelope", value => { delete value.phases; }, "invalid-record"]].map(([label, mutate, code]) => ({ name: `154/07 task00 wire — ${label} refuses before acceptance`, run: () => fixture(async f => {
    mutate(f.directive.execution); await f.handler(f.directive);
    assert.equal(f.recorder.frames.at(-1).code, code); assert.equal(f.recorder.frames.some(frame => frame.state === "accepted"), false);
    assert.equal(f.probes.length, 0); assert.deepEqual(await f.a.execution.runs.readRuns(f.item), []);
  }) })),
  { name: "154/07 task01 — operator withdrawal interrupts the owned native turn, cleans up, and cancels the same run", run: () => fixture(async f => {
    const pending = f.handler(f.directive);
    const started = Date.now();
    while (!f.probes.some(p => p.calls.some(call => call.method === "turn/start"))) {
      if (Date.now() - started > 5000) throw new Error("native turn did not start");
      await new Promise(resolve => setImmediate(resolve));
    }
    await f.a.mesh.worker.createMeshWorkerWithdrawHandler(f.options)({ assignmentId: f.assignmentId, workspaceId: f.workspaceId, itemRef: f.itemRef });
    await pending;
    const run = (await f.a.execution.runs.readRuns(f.item))[0];
    assert.equal(run.state, "cancelled"); assert.deepEqual(run.execution, f.execution);
    const drive = f.probes.find(p => p.calls.some(call => call.method === "turn/start"));
    assert.ok(drive.calls.some(call => call.method === "turn/interrupt")); assert.ok(drive.events.includes("closed"));
    assert.ok(Date.now() - started < 5000);
  }, { scenario: "active" }) },
];

codexOwnershipTests.push(...codexWorkerHandoffTests);
}
