import { fakeStopSource } from "../../loop/loop-command-probe.test.mjs";
// 154/11: real CLI, loop, gates and run records; only assistant transports are scripted.
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultApplication as app } from "aof/default-application";
import { defaultWorkspace } from "aof/workspace-services";
import { assembleCommandsDrive } from "../../../packages/core/src/application/bindings/commands/drive.mjs";
import { createRuntimeSession } from "../../../packages/execution/src/runtime-session.mjs";
import { createRunSessionCapture } from "../../../packages/execution/src/session-capture.mjs";
import { createRunSpendIngest } from "../../../packages/execution/src/spend.mjs";
import { resolveExecution, resolveExecutionResume } from "../../../packages/execution/src/runtime-selection.mjs";
import { CODEX_PROFILE } from "../../../packages/execution/src/codex-protocol-profile.mjs";
import { buildNoProgressRoundsFromConfig, progressMaxResetsFromConfig } from "../../../packages/contracts/src/loop-bounds.mjs";
import { codexFixture } from "../../../packages/execution/test/codex-app-server.suite.mjs";
import { runCli } from "../../integration/support/cli-context.mjs";
import { createFakePtySpawn, createFakeWhich } from "../mesh-worker-terminal-fixture.mjs";
import { withLaneRepo, replaceStatus, git, collector } from "../loop/lane-fixture.mjs";

const runnerFor = (strict = false) => `const fs = require('node:fs');
const source = fs.readFileSync('./src/s01.cjs', 'utf8');
const built = ${strict ? "true" : "source.includes('// task-ready')"};
const ok = !built || require('./src/s01.cjs').answer === 42;
const tap = 'TAP version 13\\nok 1 - fixture module loads\\n' + (built ? (ok ? 'ok' : 'not ok') + ' 2 - answer is 42\\n' : '') + '1..' + (built ? 2 : 1) + '\\n';
fs.writeFileSync('report.tap', tap); process.stdout.write(tap); process.exitCode = ok ? 0 : 1;
`;
const runner = runnerFor();
const task = `@executable
Feature: Fixture answer
  Scenario: Return the declared answer
    Given the fixture module
    When its answer is read
    Then the answer is 42
`;
const forbidden = () => { throw new Error("Unexpected fixture dependency or native launch"); };
const configFor = runtime => ({
  agents: { mode: "solo", ...(runtime === "codex" ? { runtimes: { codex: { session: { effort: { refine: "high", continue: "high", verify: "high" } } } } } : {}) },
  loop: { concurrency: "sequential", ...(runtime === "codex" ? { runtime } : {}) },
  test: { command: process.execPath, args: ["runner.cjs"], roots: ["src"], deadlineMs: 60_000, report: { format: "tap" } },
});

async function seed(fx) {
  await mkdir(path.join(fx.root, "src"), { recursive: true });
  await writeFile(path.join(fx.root, "src/s01.cjs"), "module.exports = { answer: 0 };\n");
  const story = path.join(fx.storyDir("07/01"), "STORY.md");
  await writeFile(story, (await readFile(story, "utf8")).replace("files:", 'reads: ["src/s01.cjs","runner.cjs"]\nfiles:'));
  await writeFile(path.join(fx.storyDir("07/01"), "tasks/00_ready.feature"), task);
  const file = path.join(fx.root, ".aof/aof.config.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  config.resources = []; config.memory = { enabled: true, backend: "local" };
  fx.runtimeConfig = config;
  await writeFile(path.join(fx.root, "aof.config.json"), JSON.stringify({ name: "runtime-legacy", resources: [{ kind: "skill", id: "fixture-context", description: "Fixture context", body: "Keep changes within the fixture.", runtimes: ["claude", "codex"] }] }, null, 2) + "\n");
  await rm(file);
}

async function cli(context, command, commands) {
  const result = await runCli(context, command);
  commands.push({ command, status: result.status });
  assert.equal(result.status, 0, `${command}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

async function migrateAndConfigure(context, desired, commands) {
  await cli(context, "project migrate", commands);
  const file = path.join(context.projectDir, ".aof/aof.config.json");
  const migrated = JSON.parse(await readFile(file, "utf8"));
  assert.ok(migrated.resources.some(resource => resource.id === "fixture-context"));
  // Runtime/work settings are NEW configuration after migrating a historical asset DSL.
  await writeFile(file, JSON.stringify({ ...migrated, work: desired.work, memory: desired.memory }, null, 2) + "\n");
}

async function validateGuide(context, commands) {
  const guide = await readFile(new URL("../../../wiki/codex-support.md", import.meta.url), "utf8");
  const sample = JSON.parse(guide.match(/```json\r?\n([\s\S]*?)```/)[1]);
  const file = path.join(context.projectDir, ".aof/aof.config.json"), before = await readFile(file);
  try { await writeFile(file, JSON.stringify(sample)); await cli(context, "project validate --json", commands); }
  finally { await writeFile(file, before); }
  const command = app.getCommand("work:loop");
  for (const argv of [["07", "--runtime", "codex", "--level", "L2"], ["07", "--resume"], ["07", "--runtime", "claude"]]) {
    app.cli.parseSpecArgv(argv, command.cli.spec, command.id);
  }
}

function driversFor(fx, globalDir, probes, version) {
  const native = createRuntimeSession({ adapters: { codex: {
    async inspectCapabilities(options) { const p = codexFixture({ version }); probes.push(p); return p.adapter.inspectCapabilities({ ...p.options, ...options }); },
    async canResume() { return true; },
    async drive(brief, options) { const p = codexFixture({ version }); probes.push(p); return p.adapter.drive(brief, { ...p.options, ...options }); },
  } } });
  const runs = app.execution.runs;
  return assembleCommandsDrive({
    runtimeSessionServices: native, loopAskServices: app.loop.ask,
    agentSessionDriverServices: { driveInteractiveClaudeSession: app.mesh.worker.driveInteractiveClaudeSession },
    claudeTrustServices: { ensureWorktreeTrusted: forbidden }, degradeServices: { reportDegrade: (scope, error) => {
      if (scope !== "drive-spend-unavailable" || error?.message !== "transcript-unavailable-or-no-usage") throw error;
    } },
    runStoreServices: runs, loopAskRequestServices: app.loop.askRequest,
    runHeartbeatConsumptionServices: { readConsumedHeartbeatAt: async () => null, enqueueHeartbeat: async (item, id, at) => runs.heartbeat(item, id, { now: at }) },
    effectsRunTransitionsServices: app.execution.transitions,
    runSessionCaptureServices: createRunSessionCapture({ recordSessionId: runs.recordSessionId, reportDegrade: forbidden }),
    commandsResolveServices: app.work.commandTools.resolve,
    workObserveServices: { claudeProjectsDir: () => path.join(globalDir, "transcripts") },
    runSpendIngestServices: createRunSpendIngest(runs),
  });
}

// All global AOF state is under this owned temporary home, including in-process calls.
async function isolated(body) {
  const home = await mkdtemp(path.join(tmpdir(), "aof-runtime-proof-"));
  const prior = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try { return await body(home); }
  finally { if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior; await rm(home, { recursive: true, force: true }); }
}

export async function runRuntimeRegression(runtime, { failBuild = false, version, resumeAfterRefine = false } = {}) {
  assert.ok(["claude", "codex", "mixed"].includes(runtime));
  return isolated(globalDir => withLaneRepo(async fx => {
    await seed(fx);
    const context = { projectDir: fx.root, globalDir, dataDir: path.join(globalDir, "data") };
    const commands = [], probes = [], calls = [], phases = [], report = collector();
    const stop = fakeStopSource();
    await migrateAndConfigure(context, fx.runtimeConfig, commands);
    await cli(context, "project validate --json", commands);
    await cli(context, "work init --runtime claude,codex --json", commands);
    await cli(context, "assets apply --dry-run --json", commands);
    await cli(context, "assets apply --json", commands);
    await cli(context, "work update --json", commands);
    const inspection = JSON.parse(await cli(context, "project show --json", commands));
    assert.equal(inspection.execution.runtime, runtime);
    assert.equal(inspection.execution.runtimeSource, runtime === "mixed" ? "phase-map" : runtime === "claude" ? "default" : "project");
    assert.ok(inspection.assetRuntimes.includes("claude") && inspection.assetRuntimes.includes("codex"));
    await validateGuide(context, commands);
    await readFile(path.join(fx.root, ".agents/skills/aof-continue/SKILL.md"));
    await readFile(path.join(fx.root, ".claude/commands/aof/continue.md"));
    await git(["add", "-A"], fx.root); await git(["commit", "-qm", "fixture: native assets and task"], fx.root);
    fx.workspace = await defaultWorkspace.work.loadWorkspace(fx.root);
    const drivers = driversFor(fx, globalDir, probes, version);
    const typed = [];
    const pty = createFakePtySpawn({ onWrite({ chunk, rawChunk, emitExit }) {
      if (rawChunk === "\r") emitExit(0); else typed.push(chunk);
    } });
    const env = { ...process.env, HOME: globalDir, USERPROFILE: globalDir, CLAUDE_CONFIG_DIR: path.join(globalDir, "claude"), CODEX_HOME: path.join(globalDir, "codex") };
    const ctx = { workspace: fx.workspace, report, ...(resumeAfterRefine ? { stopSource: stop } : {}), globalWorkStoreOptions: { env },
      agentSessionDriverOptions: { env, ptySpawn: pty.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => `fixture-claude-${typed.length}`, commandDelayMs: 0, submitDelayMs: 0, trustWorktree: async () => {}, },
    };
    if (runtime !== "claude") ctx.executionHandoff = resolveExecution(fx.workspace.config, { capabilities: { codex: { models: codexFixture().fixture.models } } });
    if (version !== undefined && !CODEX_PROFILE.supportedVersions.includes(version)) {
      await assert.rejects(drivers.refineDriverCommand.run({ ref: "07/01" }, ctx), { code: "unsupported_profile" });
      const item = await app.work.commandTools.resolve.resolveItemExact(ctx, "07/01");
      assert.deepEqual(await app.execution.runs.readRuns(item), []);
      assert.ok(probes.every(p => p.children.length === 0 && p.calls.every(call => !["thread/start", "turn/start"].includes(call.method))));
      return { runtime, state: "refused", code: "unsupported_profile", phaseRecords: 0, nativeThreads: 0, accepted: false };
    }
    ctx.invokeRegistered = async (id, input, current) => {
      calls.push({ id, ref: input.ref ?? input.scope ?? null });
      if (!id.startsWith("work:drive-")) return app.invoke(id, input, current);
      const phase = id.slice("work:drive-".length);
      phases.push(phase);
      const result = await drivers.createPhaseDriverCommand(phase).run(input, current);
      if (runtime === "mixed") {
        const expected = phase === "refine" ? "codex" : "claude";
        assert.equal(current.loopDrive?.execution?.runtime, expected);
        assert.equal(current.loopDrive.execution.phases[phase].model, phase === "refine" ? codexFixture().fixture.models[0].model : "sonnet");
        assert.equal(current.loopDrive.execution.phases[phase].effort, "high");
      }
      if (result.outcome === "done") {
        const item = await app.work.commandTools.resolve.resolveItemExact(current, input.ref);
        // These writes are SCRIPTED ASSISTANT OUTPUT, not proof of a model's behavior.
        if (phase === "refine" && runtime === "mixed") {
          await writeFile(path.join(fx.storyDir("07/01"), "tasks/00_ready.feature"), task);
          if (resumeAfterRefine) stop.raise(1, "SIGINT");
        }
        if (phase === "continue") {
          // Introduce the task case after a green harness baseline, so a regression
          // is not excluded as an inherited failure by the loop's baseline policy.
          await writeFile(path.join(fx.root, "src/s01.cjs"), `module.exports = { answer: ${failBuild ? 0 : 42} }; // task-ready\n`);
          calls.push({ id: "work:grade", ref: input.ref, run: true });
          const grade = await app.invoke("work:grade", { ref: input.ref, run: true }, current);
          assert.equal(grade.grade?.verdict, failBuild ? "fail" : "pass", JSON.stringify(grade));
          if (!failBuild) await replaceStatus(path.join(item.dir, "STORY.md"), "in-review");
        }
        if (phase === "verify") await replaceStatus(path.join(item.dir, item.type === "story" ? "STORY.md" : "SPEC.md"), "done");
      }
      return result;
    };
    // Real phase doors before the shell; review starts a fresh native thread request.
    for (const phase of runtime === "mixed" ? [] : runtime === "codex" ? ["refine", "review"] : ["refine"]) {
      const result = await ctx.invokeRegistered(`work:drive-${phase}`, { ref: "07/01" }, ctx);
      assert.equal(result.outcome, "done", JSON.stringify(result));
    }
    if (runtime === "mixed") await rm(path.join(fx.storyDir("07/01"), "tasks/00_ready.feature"));
    let state = await app.loop.commandTools.loop.runLoopBody({ scope: "07", level: "L2", cap: 3 }, ctx);
    if (resumeAfterRefine) {
      assert.equal(state.act.stop, "operator-interrupt");
      assert.deepEqual(phases, ["refine"]);
      delete ctx.executionHandoff;
      fx.workspace.config.work.loop.runtimes = { continue: "codex", refine: "claude" };
      fx.workspace.config.work.agents.runtimes.claude.session.models.continue = "changed-after-start";
      ctx.stopSource = fakeStopSource();
      state = await app.loop.commandTools.loop.runLoopBody({ scope: "07", resume: true }, ctx);
    }
    assert.equal(state.state, failBuild ? "halted" : "done", report.lines.join("\n"));
    const item = await app.work.commandTools.resolve.resolveItemExact(ctx, "07/01");
    const runs = await app.execution.runs.readRuns(item);
    assert.ok(runs.every(run => run.state !== "running"));
    const buildLimit = (buildNoProgressRoundsFromConfig(fx.workspace) + 1) * (progressMaxResetsFromConfig(fx.workspace) + 1);
    assert.ok(phases.filter(phase => phase === "continue").length <= buildLimit);
    assert.ok(state.driven.every(row => row.cycle <= state.cap));
    assert.ok(calls.some(call => call.id === "work:grade"));
    if (!failBuild) {
      assert.ok(calls.some(call => call.id === "work:validate") && calls.some(call => call.id === "work:doctor"));
      assert.ok(phases.includes("continue") && phases.includes("verify"));
    } else { assert.equal(phases.includes("verify"), false, "red task cannot cross into verify"); assert.equal(state.act.stop, "progress-exhausted"); }
    if (runtime === "codex") {
      assert.equal(pty.spawnCalls.length, 0);
      assert.ok(probes.every(p => p.children.every(child => child.args.join(" ") === "app-server --listen stdio://")));
      assert.ok(runs.every(run => run.execution?.runtime === "codex" && run.sessionId === codexFixture().fixture.nativeThreadId));
      const pinned = runs.find(run => run.execution)?.execution;
      assert.deepEqual(resolveExecutionResume({ execution: pinned }), pinned);
      assert.throws(() => resolveExecutionResume({ execution: pinned }, { runtime: "claude" }), { code: "execution-resume-conflict" });
    } else if (runtime === "mixed") {
      assert.ok(pty.spawnCalls.length > 0 && probes.length > 0);
      assert.equal(phases[0], "refine");
      assert.ok(runs.some(run => run.execution?.runtime === "codex"));
      assert.ok(runs.some(run => run.execution?.runtime === "claude"));
      assert.ok(runs.every(run => run.execution?.version === 1));
    } else { assert.ok(pty.spawnCalls.length > 0); assert.equal(probes.length, 0); assert.ok(typed.some(text => text.includes("/aof:continue"))); }
    return { runtime, evidence: "deterministic-scripted-transports", accepted: false, profile: runtime === "codex" ? CODEX_PROFILE : null, commands, phases, gates: calls.filter(call => ["work:grade", "work:validate", "work:doctor"].includes(call.id)), state: state.state, stop: state.act.stop ?? null, buildLimit, runs: runs.map(run => ({ state: run.state, outcome: run.outcome, runtime: run.execution?.runtime ?? "claude", sessionId: run.sessionId, spend: run.spend })), globalStateIsolated: true };
  }, { stories: [{ number: "01", files: ["src/s01.cjs"] }], config: runtime === "mixed" ? { ...configFor("codex"), loop: { concurrency: "sequential", runtime: "claude", runtimes: { refine: "codex" } }, agents: { mode: "solo", runtimes: { codex: { session: { models: { refine: codexFixture().fixture.models[0].model }, effort: { refine: "high" } } }, claude: { session: { models: { continue: "sonnet", verify: "sonnet" }, effort: { continue: "high", verify: "high" } } } } } } : configFor(runtime), commit: { "runner.cjs": runner } }));
}

export async function prepareLiveRuntimeFixture(runtime) {
  assert.ok(["claude", "codex"].includes(runtime));
  return isolated(async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aof-live-runtime-"));
    const projectDir = path.join(root, "project"), globalDir = path.join(root, "global-aof");
    try {
      let desired;
      const config = configFor(runtime); config.agents.mode = "orchestrated";
      await withLaneRepo(async fx => { await seed(fx); desired = fx.runtimeConfig; await cp(fx.root, projectDir, { recursive: true }); }, { stories: [{ number: "01", files: ["src/s01.cjs"] }], config, commit: { "runner.cjs": runnerFor(true) } });
      const context = { projectDir, globalDir, dataDir: path.join(root, "data") }, commands = [];
      await migrateAndConfigure(context, desired, commands);
      await cli(context, "work init --runtime claude,codex --json", commands);
      const ignore = path.join(projectDir, ".gitignore");
      await writeFile(ignore, (await readFile(ignore, "utf8")) + "\nreport.tap\n");
      await git(["add", "-A"], projectDir); await git(["commit", "-qm", "fixture: live native lifecycle input"], projectDir);
      const revision = (await git(["rev-parse", "HEAD"], projectDir)).stdout.trim();
      return { root, projectDir, globalDir, revision, cliPath: fileURLToPath(new URL("../../../packages/core/bin/aof.mjs", import.meta.url)), evidence: "prepared-only", accepted: false, launched: false, runtime, commands, profile: runtime === "codex" ? CODEX_PROFILE : null };
    } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
  });
}
