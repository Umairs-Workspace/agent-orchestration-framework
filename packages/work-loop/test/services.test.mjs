import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { createAskRequests, ASK_STATES } from "@aof/work-loop/ask-request";
import { createStopRequests, STOP_LEVELS } from "@aof/work-loop/stop-request";
import { createChildDrive } from "@aof/work-loop/child-drive";
import { createStoryCycle } from "@aof/work-loop/cycle";
import { createWaveOrchestration } from "@aof/work-loop/wave";
import { createLoopShell } from "@aof/work-loop/commands/loop";
import { createPhaseDrivers } from "@aof/work-loop/commands/drive";
import { createWorkLoopContribution } from "@aof/work-loop/commands";

// A port may be read during composition, but calling one must wait for execution.
function orchestrationServices() {
  const unexpected = () => assert.fail("composition executed an application service");
  const port = new Proxy({}, { get: () => unexpected });
  const groups = ["items", "childDrive", "asks", "askRequests", "dispatch", "worktrees", "progress", "grading", "briefs", "gradeCommand", "locks", "placement", "runs", "transitions", "diagnostics", "spend", "work", "doctor", "cycle", "sessions", "wave", "loopDiagnostics", "notifications", "stops", "stopRequests", "sessionDriver", "trust", "briefCompiler", "heartbeats", "attribution", "sessionCapture", "transcripts"];
  return {
    ...Object.fromEntries(groups.map(name => [name, port])),
    doctor: { CONTROL_FINDING_CODES: [] },
    grading: { GRADE_VERDICTS: ["pass", "fail"], GRADE_CODES: [], ADVISORY_CODES: [] },
    invoke: unexpected,
  };
}

// 147/02 — the work-loop package contributes FOUR phase drivers beside the loop: `work:drive-repair`
// is the fourth, the session a lane halt is handed to, and the contribution refuses without it.
test("orchestration composition is inert and the package contributes all five command descriptors", () => {
  const services = orchestrationServices();
  const cycle = createStoryCycle(services);
  const wave = createWaveOrchestration({ ...services, cycle });
  const shell = createLoopShell({ ...services, cycle, wave });
  const drivers = createPhaseDrivers(services);
  const input = { loop: shell.loopCommand, refine: drivers.refineDriverCommand, continue: drivers.continueDriverCommand, verify: drivers.verifyDriverCommand, repair: drivers.repairDriverCommand };
  const contribution = createWorkLoopContribution(input);
  assert.deepEqual(contribution.commands.map(command => command.id), ["work:loop", "work:drive-refine", "work:drive-continue", "work:drive-verify", "work:drive-repair"]);
  assert.equal(contribution.commands[4], drivers.repairDriverCommand);
  assert.deepEqual(drivers.repairDriverCommand.cli.route, ["work", "drive", "repair"], "aof work drive repair is routed to work:drive-repair");
  assert.equal(contribution.commands[0], shell.loopCommand);
  assert.equal(contribution.commands[2], drivers.continueDriverCommand);
  for (const value of [cycle, wave, shell, drivers, contribution, contribution.commands]) assert.ok(Object.isFrozen(value));
  assert.throws(() => createWorkLoopContribution({ ...input, verify: input.refine }), /all four phase drivers/);
  assert.throws(() => createWorkLoopContribution({ ...input, repair: undefined }), /all four phase drivers/, "the repair driver is required too");
});

test("cycle invocation uses the supplied registry and preserves the per-call override", async () => {
  const calls = [];
  const services = orchestrationServices();
  const cycle = createStoryCycle({ ...services, invoke: async (...args) => { calls.push(args); return { configured: true, grade: { verdict: "pass" } }; } });
  const ctx = { workspace: { sentinel: true } };
  const measured = await cycle.measureGradeBaseline("42/01", ctx, { now: "2026-09-28T00:00:00Z", priorDrives: 2 });
  assert.deepEqual(calls[0].slice(0, 2), ["work:grade", { ref: "42/01", run: true }]);
  assert.equal(calls[0][2], ctx);
  assert.equal(measured.baseline.priorDrives, 2);
  const overridden = await cycle.measureGradeBaseline("42/02", { ...ctx, invokeRegistered: async () => ({ configured: true, grade: { verdict: "fail", failures: [{ case: "existing failure" }] } }) });
  assert.deepEqual(overridden.baseline.failures, ["existing failure"]);
  assert.equal(calls.length, 1);
  for (const create of [createStoryCycle, createWaveOrchestration, createLoopShell]) assert.throws(() => create({ ...services, invoke: undefined }), /invoke is required/);
});

async function fixture(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-loop-package-"));
  try { await run(dir); } finally {
    assert.equal(path.dirname(await realpath(dir)), await realpath(os.tmpdir()));
    await rm(dir, { recursive: true, force: true });
  }
}

test("service instances keep path policy and diagnostic sinks isolated", () => {
  for (const create of [createAskRequests, createStopRequests]) {
    assert.throws(() => create({}), /getRuntimeRoot is required/);
    assert.throws(() => create({ getRuntimeRoot() {} }), /reportDegrade is required/);
    const unexpected = () => { throw new Error("construction called a service"); };
    assert.ok(Object.isFrozen(create({ getRuntimeRoot: unexpected, reportDegrade: unexpected })));
  }
});

test("ask records retain unknown fields, sanitize answers and report corrupt records once", () => fixture(async root => {
  const events = [];
  const env = { sentinel: true };
  const asks = createAskRequests({ getRuntimeRoot: value => { assert.equal(value, env); return root; }, reportDegrade: (...args) => events.push(args) });
  const dir = asks.loopAsksDir(env);
  const now = () => new Date("2026-09-28T12:00:00.000Z");
  const opened = await asks.openAsk(dir, { runId: "r1", ref: "42/01", workspaceId: "w", question: "Proceed?", future: 7, now });
  assert.equal(opened.state, ASK_STATES.waiting);
  await assert.rejects(asks.answerAsk(dir, { workspaceId: "w", ref: "42/01", text: "\u001b[201~" }), error => error.code === "answer-control-chars");
  const answered = await asks.answerAsk(dir, { workspaceId: "w", ref: "42/01", text: "Yes", now });
  assert.equal(answered.future, 7);
  assert.equal(answered.state, ASK_STATES.answered);
  const bytes = await readFile(asks.askRequestPath(dir, "r1"), "utf8");
  await asks.parkAsk(dir, "r1", { now });
  assert.equal(await readFile(asks.askRequestPath(dir, "r1"), "utf8"), bytes);
  await writeFile(asks.askRequestPath(dir, "r1"), "broken");
  assert.equal(await asks.readAsk(dir, "r1"), null);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "loop-ask-request");
  const otherEvents = [];
  const other = createAskRequests({ getRuntimeRoot: () => root, reportDegrade: (...args) => otherEvents.push(args) });
  await other.readAsk(dir, "r1");
  assert.equal(events.length, 1);
  assert.equal(otherEvents.length, 1);
}));

test("stop files escalate monotonically and release owned process listeners", () => fixture(async root => {
  const stops = createStopRequests({ getRuntimeRoot: () => root, reportDegrade: () => assert.fail("unexpected degradation") });
  const dir = stops.loopStopsDir();
  const first = await stops.requestLoopStop(dir, { loopRunId: "r1", scope: "42" });
  assert.equal(first.level, STOP_LEVELS.drain);
  const proc = new EventEmitter();
  const source = stops.createStopSource({ dir, loopRunId: "r1", process: proc, pollMs: 0 });
  assert.equal(source.level(), 0);
  await source.poll();
  assert.equal(source.level(), STOP_LEVELS.drain);
  await stops.requestLoopStop(dir, { loopRunId: "r1", scope: "42" });
  await source.poll();
  assert.equal(source.signal.aborted, true);
  assert.equal(proc.listenerCount("SIGINT"), 0);
  await stops.clearStopRequest(dir, "r1");
  await source.poll();
  assert.equal(source.level(), STOP_LEVELS.cancel);
  source.stop();
  const resumes = stops.loopResumesDir();
  await stops.requestLoopResume(resumes, { loopRunId: "r1", scope: "42" });
  assert.equal((await stops.clearResumeRequest(resumes, "r1")).cleared, true);
}));

test("child drive uses supplied CLI only for Node and preserves subprocess arguments", async () => {
  let packaged = false;
  let entryReads = 0;
  const calls = [];
  const services = createChildDrive({
    getRuntimeRoot: () => "runtime",
    isPackaged: () => packaged,
    getCliEntry: () => { entryReads++; return "application/cli.mjs"; },
    runBounded: async options => { calls.push(options); return { outcome: "exited", exitCode: 0, stdout: '{"outcome":"done"}', stderr: "" }; },
  });
  const input = { ref: "42/01", phase: "continue", runId: "r1", lane: "lane" };
  const result = await services.spawnLaneDrive(input);
  assert.equal(result.outcome, "document");
  assert.equal(calls[0].command, process.execPath);
  assert.deepEqual(calls[0].args, ["application/cli.mjs", "work", "drive", "continue", "42/01", "--run", "r1", "--json"]);
  assert.equal(calls[0].ownConsole, true);
  assert.equal(calls[0].stdin, "pipe");
  packaged = true;
  await services.spawnLaneDrive(input);
  assert.deepEqual(calls[1].args, calls[0].args.slice(1));
  assert.equal(entryReads, 1);
  await assert.rejects(services.spawnLaneDrive({ ...input, answerFile: "answer", fixFile: "fix" }), /cannot ride one drive/);
  assert.equal(calls.length, 2);
  // 147/00 — a repair drive names its hand-over file (`--halt`), and nothing else beside it.
  await assert.rejects(services.spawnLaneDrive({ ...input, phase: "repair", haltFile: "halt.json", fixFile: "fix" }), /rides a repair drive alone/);
  await assert.rejects(services.spawnLaneDrive({ ...input, phase: "repair", haltFile: "halt.json", answerFile: "answer" }), /rides a repair drive alone/);
  assert.equal(calls.length, 2, "a caller error spawns nothing");
  const repairFile = services.loopRepairFilePath("r1");
  assert.equal(repairFile, path.join("runtime", "loop-repairs", "r1.json"), "the hand-over lives beside loop-fixes under the aof home");
  assert.equal(services.loopFixFilePath("r1"), path.join("runtime", "loop-fixes", "r1.json"));
  await services.spawnLaneDrive({ ...input, phase: "repair", haltFile: repairFile });
  assert.deepEqual(calls[2].args, ["work", "drive", "repair", "42/01", "--run", "r1", "--halt", repairFile, "--json"]);
});
