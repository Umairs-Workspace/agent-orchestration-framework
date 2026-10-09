import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultApplication as a } from "aof/default-application";
import { assembleCommandsDrive } from "../../../core/src/application/bindings/commands/drive.mjs";
import { createRuntimeSession } from "../../../execution/src/runtime-session.mjs";
import * as execution from "../../../execution/src/runtime-selection.mjs";
import * as sessions from "../../../execution/src/session-model.mjs";
import { codexFixture } from "../../../execution/test/codex-app-server.suite.mjs";
import { compileBriefForItem } from "../../../work/src/phase-brief-read.mjs";
import { createAskRequests, ASK_STATES } from "../../src/ask-request.mjs";
import { createAskOrchestration } from "../../src/ask.mjs";
import { createMeshLauncherLock } from "../../../mesh/src/launcher-lock.mjs";
import { resolveWorkspaceId } from "../../../mesh/src/workspace-identity.mjs";
import { createChildDrive } from "../../src/child-drive.mjs";
import { buildLoopDeclaration, sessionLendFor, decideLoopAction, decideScheduleToClose, decideHaltRepair } from "../../src/engine.mjs";
import { createRuntimeInvocation } from "../../src/commands/runtime-invocation.mjs";
import { createWorkResolvers } from "../../../work/src/commands/resolve.mjs";
import { createRunStartCommand } from "../../../work/src/commands/run-start.mjs";
import { createRunCompleteCommand } from "../../../work/src/commands/run-complete.mjs";

export async function nativePhaseFixture({ scenario = "complete", available = true, version, failFirstAskFile = false, heartbeatEvents = null } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "aof-native-loop-"));
  const dir = path.join(root, "wiki/work/154_milestone_fixture/stories/06_story_native");
  await mkdir(path.join(dir, "tasks"), { recursive: true });
  await writeFile(path.join(dir, "STORY.md"), "---\ntype: story\nnumber: 6\nparent: 154\nslug: native\ntitle: Native\nstatus: in-progress\ndepends: []\n---\n# Native\nA bounded fixture story.\n");
  const item = { ref: "154/06", type: "story", dir };
  const workspace = {
    projectRoot: root, workDir: path.join(root, "wiki/work"),
    config: { work: { dir: "wiki/work", loop: { runtime: "codex" }, agents: {
      mode: "solo", runtimes: { codex: { session: { effort: { refine: "high", continue: "high", verify: "high" } } } },
    } } },
  };
  for (const phase of ["refine", "continue", "review", "verify", "repair"]) {
    const folder = path.join(root, ".agents/skills", `aof-${phase}`);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "SKILL.md"), "<!-- aof-runtime: codex -->\nRead procedure.md\n");
    await writeFile(path.join(folder, "procedure.md"), "Complete the bounded fixture procedure.\n");
  }
  await mkdir(path.join(root, ".codex/agents"), { recursive: true });
  await writeFile(path.join(root, ".codex/agents/aof-qa.toml"), 'name = "aof-qa"\ndeveloper_instructions = "Review the declared tasks and change. Report findings without editing production."\n');
  const probes = [];
  const models = codexFixture().fixture.models.map(model => ({ ...model, supportedReasoningEfforts: [...model.supportedReasoningEfforts, { reasoningEffort: "xhigh", description: "Native role fixture level" }] }));
  let driveScenario = scenario;
  const runtimeSession = createRuntimeSession({ adapters: { codex: {
    capabilities: { nativeIdentity: true },
    async inspectCapabilities(options) { const p = codexFixture({ version, models }); probes.push(p); return p.adapter.inspectCapabilities({ ...p.options, ...options }); },
    async canResume() { return available; },
    async drive(brief, options) { const p = codexFixture({ scenario: driveScenario, version, models }); probes.push(p); return p.adapter.drive(brief, { ...p.options, ...options }); },
  } } });
  const lock = createMeshLauncherLock({ globalMeshPaths: () => ({ meshRoot: root }), reportDegrade: () => {} });
  const requests = { ...createAskRequests({ getRuntimeRoot: () => path.join(root, "runtime"), reportDegrade: () => {}, acquireLock: lock.acquireMeshLauncherLock }), ASK_STATES };
  let askFileWrites = 0;
  const questionRequests = { ...requests, openAsk: async (...args) => {
    if (failFirstAskFile && askFileWrites++ === 0) throw Error("fixture ask projection write failed after the run ledger write");
    return requests.openAsk(...args);
  } };
  const forbidden = () => { throw Error("Claude transcript or trust path reached"); };
  const asks = createAskOrchestration({ askRequests: questionRequests, runs: a.execution.runs, heartbeats: { enqueueHeartbeat: async () => {} }, transcripts: { readAskQuestion: forbidden, readPendingAsk: forbidden }, notifications: { buildNotifyEnvelope: (event, fields) => ({ event, ...fields }), notify: async () => {} }, notificationFormatting: { accountLine: () => "ask" }, diagnostics: { reportDegrade: forbidden }, workspaceIdentity: { resolveWorkspaceId } });
  const drivers = assembleCommandsDrive({ runtimeSessionServices: runtimeSession, loopAskServices: asks, agentSessionDriverServices: { driveInteractiveClaudeSession: forbidden }, claudeTrustServices: { ensureWorktreeTrusted: forbidden }, degradeServices: { reportDegrade: forbidden }, runStoreServices: a.execution.runs, loopAskRequestServices: requests, runHeartbeatConsumptionServices: { readConsumedHeartbeatAt: async () => null, enqueueHeartbeat: async (...args) => { if (heartbeatEvents) { heartbeatEvents.push(args); await a.execution.runs.heartbeat(args[0], args[1], { now: args[2] }); } } }, effectsRunTransitionsServices: a.execution.transitions, runSessionCaptureServices: {}, commandsResolveServices: { resolveItemExact: async () => item, requireLocalCheckout: value => value }, workObserveServices: { claudeProjectsDir: forbidden }, runSpendIngestServices: { settleSpendFromTranscript: forbidden, snapshotTranscriptTree: forbidden } });
  const ctx = { workspace, globalWorkStoreOptions: { env: { AOF_GLOBAL_HOME: path.join(root, "runtime") } } };
  const selected = execution.resolveExecution(workspace.config, { capabilities: { codex: { models: codexFixture().fixture.models } } });
  const mint = async (extra = {}) => (await a.execution.transitions.transitionRunStart(item, { execution: selected, ...extra })).record;
  return { root, dir, item, workspace, ctx, drivers, requests, asks, selected, mint, probes, runtimeSession, setScenario: value => { driveScenario = value; }, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const runtimePhaseTests = [
  { name: "156 — mixed invocation preflights Codex once and lends only each phase's native settings", async run() {
    const f = await nativePhaseFixture();
    try {
      const resolver = createRuntimeInvocation({ ...sessions, ...execution, runtimeSession: f.runtimeSession });
      const command = a.getCommand("work:loop");
      delete f.workspace.config.work.loop.runtime;
      assert.equal(command.cli.spec.flags.runtime, undefined);
      assert.throws(() => a.cli.parseSpecArgv(["154", "--runtime", "codex"], command.cli.spec, command.id));
      const parsed = a.cli.parseSpecArgv(["154", "--model", "refine=" + f.selected.phases.refine.model + ":high", "--model", "continue=sonnet:high", "--model", "verify=sonnet:high"], command.cli.spec, command.id);
      const input = command.cli.argv(parsed._, parsed);
      const resolved = {};
      await resolver.resolveRuntimeInvocation({ input, ctx: f.ctx, resolved, resume: {}, sessionRequest: resolver.requestedRuntimeSessions(input, f.ctx) });
      assert.equal(f.probes.length, 1);
      const declaration = { execution: resolved.execution };
      assert.deepEqual(sessionLendFor(declaration, "continue"), { runtime: "claude", model: "sonnet", thinking: "high" });
      assert.equal(sessionLendFor(declaration, "refine").runtime, "codex");
      assert.equal(sessionLendFor(declaration, "repair").runtime, "claude");
      f.workspace.config.work.loop.runtime = "invalid-current-config";
      const resumed = {};
      await resolver.resolveRuntimeInvocation({ input: { resume: true }, ctx: f.ctx, resolved: resumed, resume: { lastDeclaration: declaration }, sessionRequest: { choices: {} } });
      assert.deepEqual(resumed.execution, resolved.execution);
      assert.equal(f.probes.length, 1, "resume reads the pinned plan rather than re-resolving project settings");
    } finally { await f.cleanup(); }
  } },
  { name: "156 — standalone native drive infers its assistant from the model without a runtime flag", async run() {
    const f = await nativePhaseFixture();
    try {
      delete f.workspace.config.work.loop.runtime;
      assert.equal(f.drivers.refineDriverCommand.cli.spec.flags.runtime, undefined);
      await assert.rejects(f.drivers.refineDriverCommand.run({ ref: f.item.ref, run: "missing-native-record", model: f.selected.phases.refine.model }, f.ctx), { code: "drive-run-not-found" });
      assert.equal(f.probes.length, 0, "a lost native run never falls back to Claude");
      const result = await f.drivers.refineDriverCommand.run({ ref: f.item.ref, model: f.selected.phases.refine.model, thinking: "high" }, f.ctx);
      assert.equal(result.outcome, "done");
      assert.equal((await a.execution.runs.readRuns(f.item))[0].execution.runtime, "codex");
    } finally { await f.cleanup(); }
  } },
  { name: "156 — model routing preserves provider-qualified model IDs and unphased model overrides", async run() {
    const resolver = createRuntimeInvocation({ ...sessions, ...execution });
    const ctx = { workspace: { config: {} } };
    const id = "arn:aws:bedrock:us-east-1:123:inference-profile/us.anthropic.claude-sonnet-v1:0";
    const request = resolver.requestedRuntimeSessions({ model: [id] }, ctx);
    assert.equal(request.choices.continue.model, id);
    assert.equal(execution.resolveExecution({}, { choices: request.choices }).runtime, "claude");
    const mixed = resolver.requestedRuntimeSessions({ model: ["sonnet:high", "refine=gpt-6-astra:high"] }, ctx);
    assert.equal(mixed.choices.verify.model, "sonnet");
    assert.equal(mixed.choices.refine.model, "gpt-6-astra");
  } },
  ...[false, true].map(managed => ({ name: `154/06 task00 — native ${managed ? "loop-managed" : "standalone"} phase lends run ownership to child bookkeeping`, async run() {
    const f = await nativePhaseFixture();
    try {
      const run = managed ? await f.mint() : null;
      const parentEnv = { AOF_RUN_ID: "outer-run", AOF_RUN_ITEM_DIR: "outer-item", FIXTURE_INHERITED: "retained" };
      let observed;
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx,
        ...(managed ? { loopDrive: { runId: run.runId, execution: f.selected } } : {}),
        agentSessionDriverOptions: { env: parentEnv, onTurnStarted: async () => {
          const env = f.probes.at(-1).children[0].options.env;
          const { resolveDrivenRun } = createWorkResolvers({ readRuns: a.execution.runs.readRuns });
          const services = { resolveItemExact: async () => f.item, requireLocalCheckout: () => {}, resolveDrivenRun };
          const started = await createRunStartCommand(services).runStartCommand.run({ ref: f.item.ref }, { env });
          assert.equal(started.driven, true);
          const completed = await createRunCompleteCommand(services).runCompleteCommand.run({ ref: f.item.ref, outcome: "done" }, { env });
          assert.equal(completed.driven, true);
          assert.equal(completed.runId, started.runId);
          assert.equal(completed.state, "running", "the child cannot settle its driver's run");
          assert.equal((await a.execution.runs.readRuns(f.item)).length, 1, "no duplicate child run");
          assert.equal(env.FIXTURE_INHERITED, "retained");
          assert.equal(await resolveDrivenRun({ env }, { ref: "154/07" }), null, "another item still owns its own bookkeeping");
          observed = started.runId;
        } },
      });
      assert.equal(result.outcome, "done", JSON.stringify(result));
      const records = await a.execution.runs.readRuns(f.item);
      assert.equal(records.length, 1); assert.equal(records[0].runId, observed);
      assert.equal(records[0].state, managed ? "running" : "done");
      assert.equal(parentEnv.AOF_RUN_ID, "outer-run", "caller environment is not mutated");
    } finally { await f.cleanup(); }
  } })),
  ...["server connected but no work event", "normalized tool or text activity", "runtime hooks disabled", "owned server process exits"].map(activity => ({ name: `154/08 task01 — Liveness is distinct from useful progress: ${activity}`, async run() {
    const beats = []; const f = await nativePhaseFixture({ scenario: "active", heartbeatEvents: beats });
    try {
      f.workspace.config.work.loop.heartbeatMs = 30;
      const started = Date.now(); const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, agentSessionDriverOptions: {
        deadlinePolicy: { startToCloseMs: 150 },
        onTurnStarted: turn => {
          const child = f.probes.at(-1).child;
          if (activity === "normalized tool or text activity") child.stdout.write(JSON.stringify({ method: "item/agentMessage/delta", params: { threadId: turn.sessionId, turnId: turn.turnId, delta: "fixture text" } }) + "\n");
          if (activity === "owned server process exits") setTimeout(() => child.kill(), 30);
        },
      } });
      assert.equal(result.failureReason, activity === "owned server process exits" ? "protocol_disconnected" : "timeout");
      assert.ok(Date.now() - started < 2000, "heartbeat never extends the original deadline");
      assert.ok(beats.length >= 1, "driver beats without any trusted hook");
      const record = (await a.execution.runs.readRuns(f.item))[0];
      assert.ok(record.heartbeatAt); assert.equal(record.state, "failed");
      assert.equal(record.brief.runtimeObservation.lastActivityAt != null, activity === "normalized tool or text activity");
      const count = beats.length; await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(beats.length, count, "liveness stops with the owned process");
    } finally { await f.cleanup(); }
  } })),
  { name: "154/08 task00 — native adapter usage reaches the actual configured run service", async run() {
    const f = await nativePhaseFixture();
    try {
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, f.ctx); assert.equal(result.outcome, "done");
      const record = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(record.brief.runtimeObservation.tokens.input, f.probes.at(-1).fixture.usage.tokenUsage.total.inputTokens);
      assert.equal(record.brief.runtimeObservation.tokens.total, 26); assert.equal(record.brief.runtimeObservation.costUsd, null);
      assert.equal(record.brief.runtimeObservation.turns[0].turnId, f.probes.at(-1).fixture.nativeTurnId);
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task00 — the loop invocation pins native phase choices once and resumes without consulting edited configuration", async run() {
    const f = await nativePhaseFixture();
    try {
      const resolver = createRuntimeInvocation({ ...sessions, ...execution, runtimeSession: f.runtimeSession });
      const resolved = {}, input = { runtime: "codex", thinking: ["continue=xhigh"] };
      await resolver.resolveRuntimeInvocation({ input, ctx: f.ctx, resume: { lastDeclaration: null }, resolved, sessionRequest: resolver.requestedSessions(input, true) });
      assert.equal(resolved.execution.runtime, "codex"); assert.equal(resolved.sessions.continue.effort, "xhigh");
      const pinned = structuredClone(resolved.execution), probes = f.probes.length;
      f.workspace.config.work.loop.runtime = "claude";
      f.workspace.config.work.agents.runtimes.codex.session.effort.continue = "unsupported-current-config";
      const resumed = {};
      await resolver.resolveRuntimeInvocation({ input: { resume: true }, ctx: f.ctx, resume: { lastDeclaration: { execution: pinned } }, resolved: resumed, sessionRequest: { choices: {} } });
      assert.deepEqual(resumed.execution, pinned); assert.equal(f.probes.length, probes);
      await assert.rejects(resolver.resolveRuntimeInvocation({ input: { resume: true, runtime: "claude" }, ctx: f.ctx, resume: { lastDeclaration: { execution: pinned } }, resolved: {}, sessionRequest: { choices: {} } }), { code: "execution-resume-conflict" });
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task00 — native independent review applies the recorded QA role effort on a fresh thread", async run() {
    const f = await nativePhaseFixture();
    try {
      f.workspace.config.work.agents.runtimes.codex.effort = { "aof-qa": "xhigh" };
      const result = await f.drivers.createPhaseDriverCommand("review").run({ ref: f.item.ref }, f.ctx);
      assert.equal(result.outcome, "done", JSON.stringify(result));
      assert.equal(f.probes.at(-1).calls.find(call => call.method === "turn/start").params.effort, "xhigh");
      const run = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(run.execution.roles["aof-qa"].effort, "xhigh"); assert.equal(run.execution.phases.continue.effort, "high");
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task00 — unsupported native profile refuses before a phase thread or run starts", async run() {
    const f = await nativePhaseFixture({ version: "0.130.0" });
    try {
      await assert.rejects(f.drivers.refineDriverCommand.run({ ref: f.item.ref }, f.ctx), { code: "unsupported_profile" });
      assert.ok(f.probes.every(p => p.calls.every(call => !["thread/start", "turn/start"].includes(call.method))));
      assert.deepEqual(await a.execution.runs.readRuns(f.item), []);
    } finally { await f.cleanup(); }
  } },
  ...["operator-stop", "start-to-close"].map(condition => ({ name: `154/06 task02 — ${condition} settles the native run and owned server without another phase`, async run() {
    const f = await nativePhaseFixture({ scenario: "active" });
    try {
      const controller = new AbortController();
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, agentSessionDriverOptions: {
        signal: controller.signal,
        deadlinePolicy: { startToCloseMs: condition === "start-to-close" ? 25 : 1000 },
        onTurnStarted: condition === "operator-stop" ? async () => { controller.abort(); } : undefined,
      } });
      assert.equal(result.failureReason, condition === "operator-stop" ? "cancelled" : "timeout", JSON.stringify(result));
      const stored = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(stored.state, condition === "operator-stop" ? "cancelled" : "failed");
      const p = f.probes.at(-1); assert.notEqual(p.child.exitCode, null); assert.equal(p.children.length, 1);
      assert.equal(p.calls.filter(call => call.method === "turn/start").length, 1);
    } finally { await f.cleanup(); }
  } })),
  { name: "154/06 task00 — managed native drive retains pinned settings across configuration edits and refuses runtime replacement", async run() {
    const f = await nativePhaseFixture();
    try {
      const run = await f.mint();
      f.workspace.config.work.loop.runtime = "claude";
      f.workspace.config.work.agents.runtimes.codex.session.effort.continue = "unsupported-current-config";
      await assert.rejects(f.drivers.continueDriverCommand.run({ ref: f.item.ref, runtime: "claude" }, { ...f.ctx, loopDrive: { runId: run.runId } }), { code: "execution-resume-conflict" });
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, loopDrive: { runId: run.runId } });
      assert.equal(result.outcome, "done", JSON.stringify(result));
      assert.equal(f.probes.at(-1).calls.find(call => call.method === "turn/start").params.effort, f.selected.phases.continue.effort);
      assert.deepEqual((await a.execution.runs.readRuns(f.item))[0].execution, f.selected);
    } finally { await f.cleanup(); }
  } },
  ...["refine", "continue", "verify", "repair", "review"].map(phase => ({ name: `154/06 task00 — ${phase} uses the native procedure, pinned settings and existing run seam`, async run() {
    const f = await nativePhaseFixture();
    try {
      const input = { ref: f.item.ref };
      if (phase === "repair") { input.halt = path.join(f.root, "halt.json"); await writeFile(input.halt, JSON.stringify({ stop: "lane-open-failed", ref: f.item.ref })); }
      const result = await f.drivers.createPhaseDriverCommand(phase).run(input, f.ctx);
      assert.equal(result.outcome, "done", JSON.stringify(result));
      const p = f.probes.at(-1), start = p.calls.find(call => call.method === "turn/start");
      const text = start.params.input[0].text;
      for (const token of [`$aof-${phase}`, f.item.ref, "SKILL.md", "phase"]) assert.ok(text.includes(token), token);
      if (phase === "refine") {
        const context = await compileBriefForItem({ itemRef: f.item.ref, phase, itemType: f.item.type, itemDir: f.item.dir, milestoneDir: path.dirname(path.dirname(f.item.dir)) });
        assert.ok(context.text.length > 0 && context.chars <= context.ceiling);
        assert.ok(text.includes(context.text), "the existing bounded compiler output reaches native refine by value");
        assert.ok(text.includes("--solo"));
      }
      assert.equal(start.params.effort, f.selected.phases[phase === "review" || phase === "repair" ? "continue" : phase].effort);
      assert.equal(result.settlementContext.projectsDir, null);
      const record = (await a.execution.runs.readRuns(f.item))[0];
      assert.deepEqual(record.execution, f.selected); assert.equal(record.state, "done");
      assert.equal(record.spend, null);
      if (phase === "review") assert.ok(text.includes("independent thread") && text.includes("aof-qa"));
      assert.equal(p.calls.some(call => call.method === "thread/resume"), false);
      assert.equal(f.probes[0].calls.some(call => call.method === "thread/start"), false, "catalog probe starts no phase thread");
    } finally { await f.cleanup(); }
  } })),
  ...["missing", "incompatible"].map(condition => ({ name: `154/06 task00 — asset preflight refuses ${condition} before native launch`, async run() {
    const f = await nativePhaseFixture();
    try {
      const file = path.join(f.root, ".agents/skills/aof-refine/SKILL.md");
      if (condition === "missing") await rm(file); else await writeFile(file, "Claude-only procedure");
      await assert.rejects(f.drivers.refineDriverCommand.run({ ref: f.item.ref }, f.ctx), { code: condition === "missing" ? "runtime-asset-missing" : "runtime-asset-incompatible" });
      assert.equal(f.probes.length, 0); assert.deepEqual(await a.execution.runs.readRuns(f.item), []);
    } finally { await f.cleanup(); }
  } })),
  { name: "154/06 task00 — child argv carries runtime and settings from the recorded envelope", async run() {
    const f = await nativePhaseFixture();
    try {
      const declaration = buildLoopDeclaration({ id: "loop:autonomous-cascade", loopRunId: "loop-native", scope: "154", level: "L2", cap: 2, phase: "continue", cycle: 1, startedAt: new Date().toISOString(), execution: f.selected });
      const lend = sessionLendFor(declaration, "repair");
      assert.equal(lend.runtime, "codex"); assert.equal(lend.model, f.selected.phases.continue.model);
      let args;
      const child = createChildDrive({ getRuntimeRoot: () => f.root, isPackaged: () => false, getCliEntry: () => "aof.mjs", runBounded: async input => { args = input.args; return { outcome: "done", exitCode: 0, stdout: JSON.stringify({ outcome: "done", sessionId: "thread-native" }), stderr: "" }; } });
      await child.spawnLaneDrive({ ref: f.item.ref, phase: "repair", runId: "run-native", lane: f.root, ...lend });
      assert.equal(args.includes("--runtime"), false); assert.equal(args[args.indexOf("--model") + 1], lend.model);
      assert.equal(args[args.indexOf("--thinking") + 1], lend.thinking);
    } finally { await f.cleanup(); }
  } },
  ...[true, false].map(available => ({ name: `154/06 task02 — ${available ? "warm" : "permitted cold"} fix retains native choices, scope and failure evidence`, async run() {
    const f = await nativePhaseFixture({ available });
    try {
      const buildRun = { runId: "build-prior", sessionId: codexFixture().fixture.nativeThreadId };
      const run = await f.mint();
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, loopDrive: { runId: run.runId, fix: { buildRun, resumeBuildRun: buildRun, findings: [{ message: "REPRODUCED_BLOCKER" }], changeUnderReview: "ALLOWED_SCOPE" } } });
      assert.equal(result.outcome, "done", JSON.stringify(result));
      const p = f.probes.at(-1); assert.equal(p.calls.some(call => call.method === "thread/resume"), available);
      const text = p.calls.find(call => call.method === "turn/start").params.input[0].text;
      assert.ok(text.includes("REPRODUCED_BLOCKER") && text.includes("ALLOWED_SCOPE") && text.includes(f.item.ref));
      const stored = (await a.execution.runs.readRuns(f.item))[0];
      assert.deepEqual(stored.execution, f.selected); assert.equal(stored.sessionId, p.fixture.nativeThreadId);
      assert.equal(stored.brief.coldStartReason, available ? undefined : "native-thread-unavailable");
    } finally { await f.cleanup(); }
  } })),
  ...["structural validation", "executable task tests", "independent review", "behavioral verification", "required live evidence"].map(gate => ({ name: `154/06 task02 — completion cannot bypass ${gate}`, run() {
    const result = decideLoopAction({ next: { state: "ready", type: "story", ref: "154/06" }, tasks: { tasks: [{ counts: { uat: 0 } }] }, gate: { findings: [{ code: gate }] }, cycle: 1, cap: 2, session: { outcome: "done", declared: true } });
    assert.notEqual(result.act, "accept"); assert.notEqual(result.phase, "verify");
  } })),
  { name: "154/06 task02 — schedule and repair bounds stay with their existing deciders", run() {
    assert.equal(decideScheduleToClose({ elapsedMs: 100, ceilingMs: 100 }).act, "halt");
    assert.notEqual(decideHaltRepair({ stop: "lane-open-failed", repairOn: true, priorRepair: { runId: "done-repair" } }), "repair");
  } },
];
