import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { runLoopBody, runLoopLaunch, renderLoopState } from "../../src/commands/loop.mjs";
import {
  DECLARATION_L1,
  cancellableDriver,
  completingDriver,
  fakeStopSource,
  loopFixture,
  replaceStatus,
  resetLoopStops,
  runCollected,
  writeDeclarationRun,
} from "./loop-command-probe.test.mjs";
import { answerRunAsk, completeRun, openRunAsk, parkRunAsk, readRuns, recordSessionId, retryReadiness } from "../../src/run-store.mjs";
import { LOOP_STOPS, attemptElapsedMs } from "../../src/work/loop.mjs";
import { PHASE_WORDS, askBlockLines, awaitAnswer, defaultAskWait, parkedHalt, phaseWord } from "../../src/loop/ask.mjs";
import { resolveWorkspaceId } from "../../src/workspace-identity.mjs";
import { answerAsk, askRequestPath, loopAsksDir, readAsk, readAsks } from "../../src/loop/ask-request.mjs";
import { claudeProjectsDir } from "../../src/work/observe.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { transitionRunStart } from "../../src/effects/run-transitions.mjs";
import { installLoopDiagnostics, loopDiagLogDir } from "../../src/loop-diag.mjs";
import { createStopSource, loopStopsDir, requestLoopStop, stopRequestPath } from "../../src/loop/stop-request.mjs";
import { functionBody, stripComments } from "../support/source-slice.mjs";
import { seedActive, withItemLockFixture } from "../support/item-lock-fixture.mjs";
import { LANE_CANCEL_GRACE_MS, childDriveOutcome } from "../../src/loop/child-drive.mjs";
import { drivePhase } from "../../src/loop/cycle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// 2026-09-24 — a recording `spawnPhaseDrive`: answers the scripted `spawnLaneDrive` shapes in
// order (the last one repeats), and hands each call's args to `onSpawn` before answering.
function fakePhaseChild(answers, { onSpawn } = {}) {
  const calls = [];
  const spawn = async (args) => {
    calls.push(args);
    await onSpawn?.(args);
    return answers[Math.min(calls.length - 1, answers.length - 1)];
  };
  return { calls, spawn };
}
const childDocument = (document) => ({ outcome: "document", document: { ok: true, ...document }, exitCode: 0, stderrTail: [], spawn: {} });

// 130/02 — the closing commands: a verify drive moves its item to done (the shape the narration
// suite's `closingCommands` has), so a walk under a level-0 source reaches `done`.
const closing = (fx) => (command) => {
  if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
  if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
};

// 130/02 task 02 — the process double the recorder's own suite installs on (loop-diag.test.mjs):
// an emitter with a pid, an `exit` that records its calls, teed streams and a memory reading.
function fakeProc() {
  const proc = new EventEmitter();
  proc.pid = 4242;
  proc.version = "v22.0.0-test";
  proc.exitCode = undefined;
  proc.exited = [];
  proc.exit = (code) => { proc.exited.push(code); };
  proc.stderr = { write: () => true };
  proc.stdout = { write: () => true };
  proc.memoryUsage = () => ({ rss: 100 * 1048576, heapUsed: 40 * 1048576 });
  return proc;
}

function fakeDiagFs() {
  const files = new Map();
  return {
    appendFileSync: (file, chunk) => { files.set(file, (files.get(file) ?? "") + chunk); },
    mkdirSync: () => {},
    readdirSync: (dir) => [...files.keys()].filter((f) => path.dirname(f) === dir).map((f) => path.basename(f)),
    unlinkSync: (file) => { files.delete(file); },
  };
}

const STOP_ROWS = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "s11", "s12", "s13"];
const REPORT_ROWS = ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10", "p11", "p12", "p13"];
const REASON_ROWS = ["r01", "r02", "r03", "r04", "r05", "r06", "r07", "r08"];
const READINESS_ROWS = ["q01", "q02", "q03"];

function watcherDriver(outcomes, { onCommand } = {}) {
  const scripted = [...outcomes];
  const typed = [];
  const waiting = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      typed.push(command);
      // milestone 70/00 (phase-brief) — feed only the leading directive to onCommand; the
      // compiled brief follows after "\n\n" and is not part of the phase command string.
      onCommand?.(command.split("\n\n")[0]);
      waiting.shift()?.(scripted.shift() ?? { outcome: "done" });
    },
  });
  return {
    ...fake,
    typed,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${fake.spawnCalls.length}`,
      watchTranscriptCompletion: async () => await new Promise((resolve) => waiting.push(resolve)),
      commandDelayMs: 0,
    },
  };
}

function assertFrozenHalt(state, { stop, producer, ref }, report, detailPattern) {
  assert.equal(state.act.stop, stop);
  assert.equal(state.act.producer, producer);
  assert.equal(state.act.ref, ref);
  assert.deepEqual(Object.keys(state), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
  assert.deepEqual(Object.keys(state.act).sort(), ["act", "producer", "ref", "stop"]);
  assert.equal("readyAt" in state, false);
  assert.equal("readyAt" in state.act, false);
  assert.match(report, new RegExp(stop));
  assert.match(report, new RegExp(ref.replace("/", "\\/")));
  assert.match(report, new RegExp(producer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(report, new RegExp(`aof work loop ${state.scope.replace("/", "\\/")} --resume`));
  assert.match(report, detailPattern);
}

async function runReported(input, fx, options = {}) {
  const lines = [];
  const state = await runLoopBody(input, { ...fx.ctx, ...options, report: (line) => lines.push(line) });
  // 131/03 — the halt line is the last line OUTSIDE an ask block, which a halt that parked asks
  // prints after it, indented (task 05).
  return { state, report: lines.findLast((line) => !line.startsWith("  ") && line !== "") ?? "", lines };
}

async function replaceWithDriver(fx, { number, type, doc }) {
  await rm(fx.milestoneDir, { recursive: true, force: true });
  const dir = path.join(fx.workDir, `${number}_${type}_fixture`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, doc), `---
type: ${type}
number: ${Number(number)}
slug: fixture
title: Fixture
status: not-started
depends: []
created: 2026-08-17
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
# Fixture
`);
  return dir;
}

function failingDriver() {
  const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(1) });
  return {
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => "failed-session",
      commandDelayMs: 0,
    },
  };
}

export const loopCommandStopsTests = [
  {
    name: "loop command stops — driver needs-input and non-retryable failure halt with producer and exact resume command",
    async run() {
      const fx = await loopFixture();
      try {
        const needsFake = createFakePtySpawn();
        const needs = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: {
            ptySpawn: needsFake.spawn,
            which: createFakeWhich(["claude"]),
            watchTranscriptSessionId: async () => "needs-session",
            watchTranscriptCompletion: async () => ({ outcome: "needs-input" }),
            commandDelayMs: 0,
          },
          report: () => {},
        });
        assert.equal(needs.act.stop, "session-needs-input");
        assert.match(renderLoopState(needs), /aof work loop 03 --resume/u);
      } finally {
        await fx.cleanup();
      }

      const fx2 = await loopFixture();
      try {
        const failed = failingDriver();
        const state = await runLoopBody({ scope: "03" }, { ...fx2.ctx, agentSessionDriverOptions: failed.options, report: () => {} });
        assert.equal(state.act.stop, "run-not-retryable");
        assert.equal(state.act.producer, "run-store:not-retryable");
        assert.equal(failed.spawnCalls.length, 1);
      } finally {
        await fx2.cleanup();
      }
    },
  },
  {
    name: "loop command stops — uat facts halt after verification and SIGINT leaves the in-flight run for resume",
    async run() {
      const fx = await loopFixture({ uat: true });
      try {
        const driver = completingDriver(fx);
        const uat = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(uat.act.stop, "uat-gate");
        assert.equal(uat.act.producer, "work:tasks:counts.uat");
      } finally {
        await fx.cleanup();
      }

      const fx2 = await loopFixture();
      try {
        const interrupting = completingDriver(fx2, { onCommand: () => process.emit("SIGINT") });
        const stopped = await runLoopBody({ scope: "03" }, { ...fx2.ctx, agentSessionDriverOptions: interrupting.options, report: () => {} });
        assert.equal(stopped.act.stop, "operator-interrupt");
        assert.equal(stopped.act.producer, "SIGINT");
        assert.equal(interrupting.spawnCalls.length, 1);
      } finally {
        await fx2.cleanup();
      }
    },
  },
  {
    name: "loop command stops — blocked and unmapped answers halt before spawning through work:next's own facts",
    async run() {
      const blockedFx = await loopFixture();
      try {
        const spec = path.join(blockedFx.milestoneDir, "SPEC.md");
        const text = (await import("node:fs/promises")).readFile(spec, "utf8");
        await writeFile(spec, (await text).replace("depends: []", "depends: [2]"));
        const dependency = path.join(blockedFx.workDir, "02_milestone_dependency");
        await mkdir(dependency, { recursive: true });
        await writeFile(path.join(dependency, "SPEC.md"), `---
type: milestone
number: 2
slug: dependency
title: Dependency
status: in-progress
depends: []
---
# Dependency
`);
        const driver = completingDriver(blockedFx);
        const blocked = await runLoopBody({ scope: "03" }, { ...blockedFx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(blocked.act.stop, "dependency-blocked");
        assert.equal(blocked.act.producer, "work:next:state=blocked");
        assert.equal(driver.spawnCalls.length, 0);
      } finally {
        await blockedFx.cleanup();
      }

      const spikeFx = await loopFixture();
      try {
        await rm(spikeFx.milestoneDir, { recursive: true, force: true });
        const spike = path.join(spikeFx.workDir, "03_spike_unknown");
        await mkdir(spike, { recursive: true });
        await writeFile(path.join(spike, "SPIKE.md"), `---
type: spike
number: 3
slug: unknown
title: Unknown
status: not-started
depends: []
---
# Unknown
`);
        const driver = completingDriver(spikeFx);
        const unmapped = await runLoopBody({ scope: "03" }, { ...spikeFx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(unmapped.act.stop, "unmapped-item-type");
        assert.equal(unmapped.act.producer, "work:next:type=spike");
        assert.equal(driver.spawnCalls.length, 0);
      } finally {
        await spikeFx.cleanup();
      }
    },
  },
  {
    name: "loop command stops — session-limit parks and repeated infra failures stay on lineage until the store ceiling",
    async run() {
      const parkedFx = await loopFixture();
      try {
        const fake = createFakePtySpawn();
        const parked = await runLoopBody({ scope: "03" }, {
          ...parkedFx.ctx,
          agentSessionDriverOptions: {
            ptySpawn: fake.spawn,
            which: createFakeWhich(["claude"]),
            watchTranscriptSessionId: async () => "limited-session",
            watchTranscriptCompletion: async () => ({ outcome: "failed", failureReason: "session_limit" }),
            commandDelayMs: 0,
          },
          report: () => {},
        });
        assert.equal(parked.act.stop, "retry-parked");
        assert.equal(parked.act.producer, "run-store:retry-parked");
        assert.equal(fake.spawnCalls.length, 1);
      } finally {
        await parkedFx.cleanup();
      }

      const retryFx = await loopFixture({ cap: 3 });
      try {
        const fake = createFakePtySpawn();
        const exhausted = await runLoopBody({ scope: "03" }, {
          ...retryFx.ctx,
          agentSessionDriverOptions: {
            ptySpawn: fake.spawn,
            which: createFakeWhich(["claude"]),
            watchTranscriptSessionId: async () => "offline-session",
            watchTranscriptCompletion: async () => ({ outcome: "failed", failureReason: "runtime_offline" }),
            commandDelayMs: 0,
          },
          report: () => {},
        });
        assert.equal(exhausted.act.stop, "cap-exhausted");
        assert.equal(exhausted.act.producer, "run-store:attempts-exhausted");
        assert.equal(fake.spawnCalls.length, 3);
        assert.deepEqual(exhausted.driven.map((row) => row.attempt), [1, 2, 3]);
      } finally {
        await retryFx.cleanup();
      }
    },
  },
  {
    name: "loop command stops — s01-s13 and p01-p13 exercise every producer and human-report row with frozen machine shapes",
    async run() {
      const stopRows = new Set();
      const reportRows = new Set();
      const record = (stopRow, reportRow, result, expected, detailPattern) => {
        assertFrozenHalt(result.state, expected, result.report, detailPattern);
        stopRows.add(stopRow);
        reportRows.add(reportRow);
      };

      const uatFx = await loopFixture();
      try {
        await replaceWithDriver(uatFx, { number: "04", type: "uat", doc: "SESSION.md" });
        const driver = completingDriver(uatFx);
        const result = await runReported({ scope: "03-04" }, uatFx, { agentSessionDriverOptions: driver.options });
        record("s01", "p01", result, { stop: "uat-gate", producer: "work:next:type=uat", ref: "04" }, /humanSignoff=required/u);
        assert.equal(driver.spawnCalls.length, 0);
      } finally { await uatFx.cleanup(); }

      const taskUatFx = await loopFixture({ uat: true });
      try {
        const driver = completingDriver(taskUatFx);
        const result = await runReported({ scope: "03" }, taskUatFx, { agentSessionDriverOptions: driver.options });
        record("s02", "p02", result, { stop: "uat-gate", producer: "work:tasks:counts.uat", ref: "03/01" }, /uatCount=1/u);
        assert.deepEqual(driver.typed.map((t) => t.split("\n\n")[0]), ["/aof:continue 03/01", "/aof:verify 03/01"]);
      } finally { await taskUatFx.cleanup(); }

      const blockedFx = await loopFixture();
      try {
        const spec = path.join(blockedFx.milestoneDir, "SPEC.md");
        const body = await (await import("node:fs/promises")).readFile(spec, "utf8");
        await writeFile(spec, body.replace("depends: []", "depends: [2]"));
        const dependency = path.join(blockedFx.workDir, "02_milestone_dependency");
        await mkdir(dependency, { recursive: true });
        await writeFile(path.join(dependency, "SPEC.md"), "---\ntype: milestone\nnumber: 2\nslug: dependency\ntitle: Dependency\nstatus: in-progress\ndepends: []\n---\n# Dependency\n");
        const driver = completingDriver(blockedFx);
        const result = await runReported({ scope: "03" }, blockedFx, { agentSessionDriverOptions: driver.options });
        record("s03", "p03", result, { stop: "dependency-blocked", producer: "work:next:state=blocked", ref: "03" }, /waitingOn=\["2"\]/u);
        assert.equal(driver.spawnCalls.length, 0);
      } finally { await blockedFx.cleanup(); }

      await withItemLockFixture(async (fx) => {
        await seedActive(fx, { itemRef: "03", assignmentId: "loop-held", node: "holder-node" });
        const result = await runReported({ scope: "03" }, fx);
        record("s04", "p04", result, { stop: "dependency-blocked", producer: "work:next:state=held", ref: "03" }, /skipped=.*holder-node/u);
      }, { stream: [{ number: "03", stories: [] }] });

      const gateFx = await loopFixture({ cap: 2 });
      try {
        await writeFile(path.join(gateFx.storyDir, "tasks", "00_ready.feature"), "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n");
        const driver = completingDriver(gateFx);
        const result = await runReported({ scope: "03" }, gateFx, { agentSessionDriverOptions: driver.options });
        record("s05", "p05", result, { stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "03/01" }, /cap=2; findings=\[/u);
      } finally { await gateFx.cleanup(); }

      const exhaustedFx = await loopFixture({ cap: 3 });
      try {
        const driver = watcherDriver(Array(3).fill({ outcome: "failed", failureReason: "timeout" }));
        const result = await runReported({ scope: "03" }, exhaustedFx, { agentSessionDriverOptions: driver.options });
        record("s06", "p06", result, { stop: "cap-exhausted", producer: "run-store:attempts-exhausted", ref: "03/01" }, /attempt=3/u);
        assert.equal(driver.spawnCalls.length, 3);
      } finally { await exhaustedFx.cleanup(); }

      const needsFx = await loopFixture();
      try {
        const driver = watcherDriver([{ outcome: "needs-input" }]);
        const result = await runReported({ scope: "03" }, needsFx, { agentSessionDriverOptions: driver.options });
        // 131/03 (task 01, ruling 6) — the session is named by the parked entry the halt carries.
        record("s07", "p07", result, { stop: "session-needs-input", producer: "driver:needs-input", ref: "03/01" }, /parked=\[\{"ref":"03\/01","runId":"[^"]+","sessionId":"session-1"/u);
        assert.equal(driver.spawnCalls.length, 1);
      } finally { await needsFx.cleanup(); }

      const failedFx = await loopFixture();
      try {
        const driver = watcherDriver([{ outcome: "failed", failureReason: "agent_error" }]);
        const result = await runReported({ scope: "03" }, failedFx, { agentSessionDriverOptions: driver.options });
        record("s08", "p08", result, { stop: "run-not-retryable", producer: "run-store:not-retryable", ref: "03/01" }, /failureReason=agent_error/u);
        assert.equal(driver.spawnCalls.length, 1);
      } finally { await failedFx.cleanup(); }

      const parkedFx = await loopFixture();
      try {
        const driver = watcherDriver([{ outcome: "failed", failureReason: "session_limit" }]);
        const result = await runReported({ scope: "03", now: "2026-08-17T12:00:00.000Z" }, parkedFx, { agentSessionDriverOptions: driver.options });
        record("s09", "p09", result, { stop: "retry-parked", producer: "run-store:retry-parked", ref: "03/01" }, /readyAt=2026-08-17T13:00:00.000Z/u);
        assert.doesNotMatch(JSON.stringify(result.state), /readyAt|resetAt|resumeAfter/u);
      } finally { await parkedFx.cleanup(); }

      for (const [stopRow, reportRow, number, type, doc] of [
        ["s10", "p10", "05", "spike", "SPIKE.md"],
        ["s11", "p11", "06", "chore", "CHORE.md"],
      ]) {
        const fx = await loopFixture();
        try {
          await replaceWithDriver(fx, { number, type, doc });
          const driver = completingDriver(fx);
          const result = await runReported({ scope: number }, fx, { agentSessionDriverOptions: driver.options });
          record(stopRow, reportRow, result, { stop: "unmapped-item-type", producer: `work:next:type=${type}`, ref: number }, new RegExp(`itemType=${type}`));
          assert.equal(driver.spawnCalls.length, 0);
        } finally { await fx.cleanup(); }
      }

      for (const [stopRow, reportRow, signal] of [["s12", "p12", "SIGINT"], ["s13", "p13", "SIGTERM"]]) {
        const fx = await loopFixture();
        try {
          const driver = completingDriver(fx, { onCommand: () => process.emit(signal) });
          const result = await runReported({ scope: "03" }, fx, { agentSessionDriverOptions: driver.options });
          record(stopRow, reportRow, result, { stop: "operator-interrupt", producer: signal, ref: "03/01" }, new RegExp(`signal=${signal}`));
          assert.equal(driver.spawnCalls.length, 1);
          const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(runs.length, 1);
          // 130/02 (ADR-003 §3; task 03 ruling 4): this row once asserted the interrupted run
          // "stays running" — that assertion WAS the measured defect (the interrupt branch
          // returned before the settle, 129/04's run leaked `running`). The drive ended on its
          // own, so it settles as it ended; the row's meaning — the loop halts on the signal
          // after the drive — is unchanged.
          assert.equal(runs[0].state, "done", "the interrupted drive settled as it ended — never left running");
        } finally { await fx.cleanup(); }
      }

      assert.deepEqual([...stopRows].sort(), [...STOP_ROWS].sort());
      assert.deepEqual([...reportRows].sort(), [...REPORT_ROWS].sort());
    },
  },
  {
    name: "loop command stops — r01-r08 and q01-q03 follow the run store's exact reason and readiness answers",
    async run() {
      const reasonRows = new Set();
      const readinessRows = new Set();

      const recoverable = async (row, failureReason) => {
        const fx = await loopFixture({ cap: 3 });
        try {
          const driver = watcherDriver([
            { outcome: "failed", failureReason },
            { outcome: "done" },
            { outcome: "done" },
            { outcome: "done" },
          ], {
            onCommand(command) {
              if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
              if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
            },
          });
          const result = await runReported({ scope: "03", now: "2026-08-17T12:00:00.000Z" }, fx, { agentSessionDriverOptions: driver.options });
          assert.equal(result.state.state, "done");
          const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
          const failed = runs.find((record) => record.state === "failed");
          const retry = runs.find((record) => record.retryOf === failed?.runId);
          assert.equal(failed?.failureReason, failureReason);
          assert.equal(retry?.attempt, 2);
          assert.equal(result.state.act.stop, undefined);
          reasonRows.add(row);
        } finally { await fx.cleanup(); }
      };
      await recoverable("r01", "runtime_offline");
      await recoverable("r02", "timeout");

      for (const [row, failureReason, expectedStop] of [
        ["r05", "agent_error", "run-not-retryable"],
        ["r08", "unrecognised_driver_reason", "run-not-retryable"],
      ]) {
        const fx = await loopFixture({ cap: 3 });
        try {
          const driver = watcherDriver([{ outcome: "failed", failureReason }]);
          const result = await runReported({ scope: "03", now: "2026-08-17T12:00:00.000Z" }, fx, { agentSessionDriverOptions: driver.options });
          assert.equal(result.state.act.stop, expectedStop);
          const failed = (await readRuns({ ref: "03/01", dir: fx.storyDir })).find((record) => record.state === "failed");
          assert.equal(failed?.failureReason, failureReason);
          assert.match(result.report, new RegExp(`failureReason=${failureReason}`));
          assert.equal(driver.spawnCalls.length, 1);
          reasonRows.add(row);
        } finally { await fx.cleanup(); }
      }

      for (const [row, failureReason] of [["r06", "runtime_offline"], ["r07", "timeout"]]) {
        const fx = await loopFixture({ cap: 3 });
        try {
          const driver = watcherDriver(Array(3).fill({ outcome: "failed", failureReason }));
          const result = await runReported({ scope: "03", now: "2026-08-17T12:00:00.000Z" }, fx, { agentSessionDriverOptions: driver.options });
          assert.equal(result.state.act.stop, "cap-exhausted");
          assert.equal(result.state.act.producer, "run-store:attempts-exhausted");
          assert.deepEqual(result.state.driven.map(({ attempt }) => attempt), [1, 2, 3]);
          assert.equal((await readRuns({ ref: "03/01", dir: fx.storyDir })).filter((record) => record.failureReason === failureReason).length, 3);
          reasonRows.add(row);
        } finally { await fx.cleanup(); }
      }

      const parkedFx = await loopFixture({ cap: 3 });
      try {
        const limited = watcherDriver([{ outcome: "failed", failureReason: "session_limit" }]);
        const q01 = await runReported({ scope: "03", now: "2026-08-17T12:00:00.000Z" }, parkedFx, { agentSessionDriverOptions: limited.options });
        assert.equal(q01.state.act.stop, "retry-parked");
        assert.match(q01.report, /readyAt=2026-08-17T13:00:00.000Z/u);
        assert.doesNotMatch(JSON.stringify(q01.state), /readyAt|resetAt|resumeAfter/u);
        let runs = await readRuns({ ref: "03/01", dir: parkedFx.storyDir });
        const parked = runs.find((record) => record.failureReason === "session_limit");
        assert.equal(parked?.resumeAfter, "2026-08-17T13:00:00.000Z");
        assert.equal(limited.spawnCalls.length, 1);
        reasonRows.add("r03");
        readinessRows.add("q01");

        const tooEarly = watcherDriver([]);
        const q02 = await runReported({ scope: "03", resume: true, now: "2026-08-17T12:59:59.999Z" }, parkedFx, { agentSessionDriverOptions: tooEarly.options });
        assert.equal(q02.state.act.stop, "retry-parked");
        assert.match(q02.report, /readyAt=2026-08-17T13:00:00.000Z/u);
        assert.equal(tooEarly.spawnCalls.length, 0);
        assert.equal((await readRuns({ ref: "03/01", dir: parkedFx.storyDir })).length, runs.length, "an early retry mints nothing");
        readinessRows.add("q02");

        const boundary = watcherDriver([{ outcome: "done" }, { outcome: "done" }, { outcome: "done" }], {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(parkedFx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(parkedFx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const q03 = await runReported({ scope: "03", resume: true, now: "2026-08-17T13:00:00.000Z" }, parkedFx, { agentSessionDriverOptions: boundary.options });
        assert.equal(q03.state.state, "done");
        runs = await readRuns({ ref: "03/01", dir: parkedFx.storyDir });
        const retry = runs.find((record) => record.retryOf === parked.runId);
        assert.equal(retry?.attempt, 2);
        assert.equal(retry?.createdAt, "2026-08-17T13:00:00.000Z");
        reasonRows.add("r04");
        readinessRows.add("q03");
      } finally { await parkedFx.cleanup(); }

      assert.deepEqual([...reasonRows].sort(), [...REASON_ROWS].sort());
      assert.deepEqual([...readinessRows].sort(), [...READINESS_ROWS].sort());
    },
  },
  {
    name: "loop command stops — a halt leaves later scope items untouched and a cleared condition resumes from fresh work:next state",
    async run() {
      const fx = await loopFixture();
      const secondDir = path.join(fx.milestoneDir, "stories", "02_story_later");
      try {
        await mkdir(path.join(secondDir, "tasks"), { recursive: true });
        await writeFile(path.join(secondDir, "STORY.md"), `---
type: story
number: 2
slug: later
title: Later
parent: 3
status: in-progress
depends: []
created: 2026-08-17
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
# Later
`);
        await writeFile(path.join(secondDir, "tasks", "00_ready.feature"), "@executable\nFeature: Later\n  Scenario: ready\n    Given a fixture\n    When it runs\n    Then it passes\n");

        const needs = watcherDriver([{ outcome: "needs-input" }]);
        const halted = await runReported({ scope: "03" }, fx, { agentSessionDriverOptions: needs.options });
        assert.equal(halted.state.act.stop, "session-needs-input");
        assert.equal(needs.spawnCalls.length, 1);
        assert.deepEqual(await readRuns({ ref: "03/02", dir: secondDir }), [], "nothing after the halt point was minted");

        replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
        const resumed = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/02") replaceStatus(path.join(secondDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const completed = await runReported({ scope: "03" }, fx, { agentSessionDriverOptions: resumed.options });
        assert.equal(completed.state.state, "done");
        assert.deepEqual(resumed.typed.slice(0, 2).map((t) => t.split("\n\n")[0]), ["/aof:continue 03/02", "/aof:verify 03/02"]);
        assert.ok((await readRuns({ ref: "03/02", dir: secondDir })).length > 0, "the cleared rerun starts at the next stream item");
      } finally { await fx.cleanup(); }
    },
  },

  // ══════════════ 130/02 task 02 — the shell reads the source, not a flag ══════════════
  {
    name: "130/02 task02 the shell registers no signal listener of its own any more, and starts and stops the source once around the drives",
    async run() {
      const fx = await loopFixture();
      try {
        const before = { SIGINT: process.listenerCount("SIGINT"), SIGTERM: process.listenerCount("SIGTERM") };
        const source = fakeStopSource();
        const sampled = [];
        const driver = completingDriver(fx, {
          onCommand(command) {
            sampled.push({ SIGINT: process.listenerCount("SIGINT"), SIGTERM: process.listenerCount("SIGTERM"), stops: source.calls.stop, starts: source.calls.start });
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const { state } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.equal(state.state, "done");
        assert.ok(sampled.length >= 3, "the drives ran");
        for (const sample of sampled) {
          assert.equal(sample.SIGINT, before.SIGINT, "no SIGINT listener of the shell's own during a drive");
          assert.equal(sample.SIGTERM, before.SIGTERM);
          assert.equal(sample.starts, 1, "started before the first drive");
          assert.equal(sample.stops, 0, "not stopped while a drive is live");
        }
        assert.equal(process.listenerCount("SIGINT"), before.SIGINT);
        assert.equal(process.listenerCount("SIGTERM"), before.SIGTERM);
        assert.deepEqual([source.calls.start, source.calls.stop], [1, 1], "start once, stop once, after the last drive");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task02 [outline] start and stop are balanced on every exit — done, a halt, an L1 invocation and a throw (4 rows)",
    async run() {
      // done
      {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource();
          const driver = completingDriver(fx, { onCommand: closing(fx) });
          const { state } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          assert.equal(state.state, "done");
          assert.deepEqual([source.calls.start, source.calls.stop], [1, 1]);
        } finally { await fx.cleanup(); }
      }
      // a halt
      {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource({ level: 1, producer: "SIGINT" });
          const driver = completingDriver(fx);
          const { state } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          assert.equal(state.act.stop, "operator-interrupt");
          assert.deepEqual([source.calls.start, source.calls.stop], [1, 1]);
        } finally { await fx.cleanup(); }
      }
      // L1
      {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource({ level: 1, producer: "SIGINT" });
          const driver = completingDriver(fx);
          const { state } = await runCollected({ scope: "03", level: "L1" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          assert.equal(state.level, "L1");
          assert.ok(source.calls.start <= 1, "at most once");
          assert.equal(source.calls.stop, source.calls.start, "exactly as many stops as starts");
        } finally { await fx.cleanup(); }
      }
      // a throw
      {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource();
          const driver = completingDriver(fx);
          const eperm = Object.assign(new Error("EPERM: operation not permitted"), { code: "EPERM" });
          await assert.rejects(
            runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source, report: () => {}, readChangeBaseline: async () => { throw eperm; } }),
            (error) => error === eperm,
          );
          assert.deepEqual([source.calls.start, source.calls.stop], [1, 1]);
        } finally { await fx.cleanup(); }
      }
    },
  },
  {
    name: "130/02 task02 an L1 invocation reads no level — its output at level 1 is byte-identical to level 0, it drives nothing and writes nothing",
    async run() {
      const outputs = [];
      for (const level of [0, 1]) {
        await resetLoopStops();
        const fx = await loopFixture();
        try {
          const dir = loopStopsDir();
          await requestLoopStop(dir, { loopRunId: "L-standing", scope: "03", workspaceId: null, by: { node: "win-host-a", pid: 4242 }, now: () => new Date("2026-09-13T12:00:00.000Z") });
          const bytes = await readFile(stopRequestPath(dir, "L-standing"), "utf8");
          const source = fakeStopSource(level === 0 ? {} : { level: 1, producer: "stop-request", request: JSON.parse(bytes) });
          const driver = completingDriver(fx);
          const { state, lines } = await runCollected({ scope: "03", level: "L1" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          assert.notEqual(state.act.stop, "operator-interrupt");
          assert.equal(driver.spawnCalls.length, 0);
          assert.equal(await readFile(stopRequestPath(dir, "L-standing"), "utf8"), bytes, "the request file is unchanged");
          outputs.push(lines.join("\n"));
        } finally { await fx.cleanup(); }
      }
      assert.equal(outputs[1], outputs[0], "byte-identical output at level 1 and level 0");
    },
  },
  {
    name: "130/02 task02 a real source is composed when none is injected — over the process, the aof home's loop-stops and the resolved loopRunId, with ADR-001 §5's poll interval",
    async run() {
      const fx = await loopFixture();
      try {
        // The loop's id is known ahead only on a resume: seed a done verify-phase run carrying
        // declaration L1, so the resolved loopRunId is "L1" and the standing-request clear finds
        // nothing (the request is written once the walk has begun).
        await writeDeclarationRun(fx, { declaration: { ...DECLARATION_L1, phase: "verify" }, state: "done", at: "2026-09-13T11:00:00.000Z" });
        const before = process.listenerCount("SIGINT");
        const dir = loopStopsDir();
        let sampledDuring = null;
        let asks = 0;
        const { invoke } = await import("../../src/command-core.mjs");
        const driver = completingDriver(fx);
        const ctx = {
          ...fx.ctx,
          agentSessionDriverOptions: driver.options,
          invokeRegistered: async (id, input, c) => {
            if (id === "work:next" && ++asks === 1) {
              sampledDuring = process.listenerCount("SIGINT");
              await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: null, by: { node: "win-host-a", pid: 4242 }, now: () => new Date() });
            }
            return await invoke(id, input, c);
          },
        };
        const { state, last } = await runCollected({ scope: "03", resume: true }, ctx);
        assert.equal(state.loopRunId, "L1");
        assert.equal(sampledDuring, before + 1, "the real source owns one SIGINT listener on THIS process while the body runs");
        assert.equal(process.listenerCount("SIGINT"), before, "…and removes it on the way out");
        assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" }, last);
        assert.match(last, new RegExp(`request=${stopRequestPath(dir, "L1").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`), "the file was read from loopStopsDir() under the resolved id");
        // The poll interval is ADR-001 §5's default decision, spelled at the one composition site.
        const shell = stripComments(await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8"));
        assert.equal((shell.match(/createStopSource\(/gu) ?? []).length, 1, "one composition site");
        assert.match(shell, /createStopSource\(\{ loopRunId, dir: stopsDir, process, pollMs: 2000 \}\)/u);
        assert.match(shell, /const stopsDir = loopStopsDir\(\);/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task02 every drive receives the source's signal beside the caller's options — three spawns, three registrations on the one signal, the caller's onSessionStop and env untouched",
    async run() {
      const fx = await loopFixture();
      try {
        const source = fakeStopSource();
        const stops = [];
        // The third spawn (the verify) raises a drain, so the walk halts after it rather than
        // going on to the milestone: exactly the three drives the scenario names.
        const driver = cancellableDriver(fx, { script: [{ outcome: "failed", failureReason: "timeout" }, { outcome: "done" }, { outcome: "done" }], onCommand(command, n) { if (n === 3) source.raise(1, "stop-request"); } });
        const { state } = await runCollected({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: { ...driver.options, onSessionStop: (event) => stops.push(event), env: { ...process.env, AOF_130_MARK: "x" } },
          stopSource: source,
        });
        assert.equal(driver.spawnCalls.length, 3, JSON.stringify(state.driven));
        assert.deepEqual(state.driven.map((row) => [row.phase, row.attempt, row.outcome]), [["continue", 1, "failed"], ["continue", 2, "done"], ["verify", 1, "done"]]);
        assert.deepEqual(source.registrations, ["abort", "abort", "abort"], "each spawn registered its abort listener on the source's own signal (===)");
        for (const call of driver.spawnCalls) assert.equal(call.options.env.AOF_130_MARK, "x", "the caller's env reached the spawn unchanged");
        assert.ok(stops.some((event) => event.phase === "stop-requested" && event.failureReason === "timeout"), `the caller's onSessionStop survived the spread: ${JSON.stringify(stops)}`);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task02 [outline] a level at the tick head halts before any drive, with the producer as data and the request in Details (5 rows)",
    async run() {
      const record = (level) => ({ loopRunId: "x", scope: "03", workspaceId: null, level, state: "requested", requestedAt: "2026-09-13T12:00:00.000Z", escalatedAt: null, honouredAt: null, cancelled: null, by: { node: "win-host-a", pid: 4242 } });
      const rows = [
        { level: 1, producer: "stop-request", request: record(1), details: "; request=<path>; by=win-host-a:4242" },
        { level: 2, producer: "stop-request", request: record(2), details: "; request=<path>; by=win-host-a:4242" },
        { level: 1, producer: "SIGINT", request: null, details: "" },
        { level: 1, producer: "SIGTERM", request: null, details: "" },
        { level: 2, producer: "SIGINT", request: null, details: "" },
      ];
      for (const row of rows) {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource({ level: row.level, producer: row.producer, request: row.request });
          const driver = completingDriver(fx);
          const { state, last } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          assert.equal(driver.spawnCalls.length, 0, JSON.stringify(row));
          assert.deepEqual(Object.keys(state), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
          assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: row.producer });
          const details = row.details.replace("<path>", stopRequestPath(loopStopsDir(), state.loopRunId));
          assert.equal(last, `03 — halted on operator-interrupt at 03/01 (producer ${row.producer}). Resume with: aof work loop 03 --resume Details: signal=${row.producer}; level=${row.level}${details}.`);
          assert.equal(source.calls.poll, 1, "the tick head awaited one poll before the halt was decided");
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task02 a level rising after a post-drive poll is caught at the next tick head, at the last driven ref rather than the item work:next was about to offer",
    async run() {
      const fx = await loopFixture();
      try {
        const source = fakeStopSource();
        // Polls: #1 the first tick head, #2 after the continue drive, #3 after the verify drive
        // (the cross to verify), #4 the next tick head — where the level now stands.
        source.onPoll = (n) => { if (n === 4) source.raise(1, "stop-request"); };
        const driver = completingDriver(fx, { onCommand(command) { if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done"); } });
        const { state } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.equal(driver.spawnCalls.length, 2);
        assert.deepEqual(state.driven.map((row) => [row.phase, row.outcome]), [["continue", "done"], ["verify", "done"]]);
        assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" });
        assert.equal(state.next?.ref, "03", "guard: work:next was about to offer the milestone");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task02 [outline] with the recorder installed first, the second signal cancels and settles and only the third reaches node (2 rows)",
    async run() {
      const rows = [
        { first: "SIGINT", second: "SIGINT", third: "SIGINT", producer: "SIGINT", exit: 130 },
        { first: "SIGINT", second: "SIGTERM", third: "SIGTERM", producer: "SIGTERM", exit: 143 },
      ];
      for (const row of rows) {
        const fx = await loopFixture();
        const proc = fakeProc();
        const diag = installLoopDiagnostics({ proc, fs: fakeDiagFs(), env: {}, aliveIntervalMs: 0, logDir: path.join(fx.projectRoot, "diag") });
        try {
          assert.ok(diag, "the recorder installed first");
          const timers = { setInterval: () => ({ unref() {} }), clearInterval() {} };
          const source = createStopSource({ loopRunId: "L-signals", dir: loopStopsDir(), process: proc, pollMs: 2000, timers });
          const driver = cancellableDriver(fx, { script: ["hold"], onCommand() { proc.emit(row.first); proc.emit(row.second); } });
          const { state, last } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          const [run] = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(run.state, "cancelled", JSON.stringify(row));
          assert.deepEqual(state.driven.map((r) => r.outcome), ["cancelled"], "the driver resolved cancelled");
          assert.deepEqual(proc.exited, [], "proc.exit was never called by the second signal");
          assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: row.producer });
          assert.ok(last.endsWith(`Details: signal=${row.producer}; level=2; cancelled=${run.runId}.`), last);
          proc.emit(row.third);
          assert.deepEqual(proc.exited, [row.exit], "the third signal reaches node's default through the recorder's last-listener repair");
        } finally {
          diag.uninstall();
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task02 the halt's producer is never a message match, the shell holds no listener or flag of its own, and the recorder precedes the source",
    async run() {
      const shell = stripComments(await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8"));
      const interruptHalts = (shell.match(/haltDecision\("operator-interrupt"/gu) ?? []).length;
      assert.ok(interruptHalts >= 1, "the halt is produced");
      assert.equal((shell.match(/haltDecision\("operator-interrupt", [^,]+, source\.producer\(\)\)/gu) ?? []).length, interruptHalts, "every operator-interrupt halt passes a value bound from source.producer() as its third argument");
      assert.doesNotMatch(shell, /process\.once\(/u);
      assert.doesNotMatch(shell, /\binterrupted\b/u);
      const body = functionBody(shell, "export async function runLoopBody(");
      assert.ok(body, "runLoopBody's body was found");
      assert.match(body, /signal: source\.signal/u, "the spread is in the body");
      const launchStart = shell.indexOf("launch: (options) =>");
      const launchEnd = shell.indexOf("render: renderLoopState", launchStart);
      assert.ok(launchStart > 0 && launchEnd > launchStart, "the launch body was found");
      const launch = shell.slice(launchStart, launchEnd);
      assert.doesNotMatch(launch, /\bsignal\b/u, "the launch body names no signal");
      assert.ok(launch.indexOf("installLoopDiagnostics(") > -1 && launch.indexOf("installLoopDiagnostics(") < launch.indexOf("runLoopLaunch("), "the recorder is installed before the body runs (131/03: the launch body is runLoopLaunch)");
      assert.equal((shell.match(/createStopSource\(/gu) ?? []).length, 1);
      assert.ok(body.includes("createStopSource("), "…and the one composition is inside runLoopBody");
    },
  },
  {
    name: "130/02 task02 LoopState and the stop vocabulary are unchanged — the frozen literal, operator-interrupt its twelfth member, the halt act's four keys",
    async run() {
      // 129 gate (2026-09-22): the frozen fifteen-member literal is pinned ONCE, by
      // test/arch/loop/acd-loop-probe-contract (its STOPS); a loop suite that spelled it would name the
      // grade stop, which grade/01 (test/grade/grade-unconfigured-no-op) forbids of loop/loop-command-stops.
      assert.equal(LOOP_STOPS.length, 15, "the vocabulary is the pinned fifteen; the literal itself lives in acd-loop-probe-contract");
      assert.equal(LOOP_STOPS[11], "operator-interrupt");
      const fx = await loopFixture();
      try {
        const source = fakeStopSource({ level: 2, producer: "SIGTERM", request: { level: 2, by: { node: "n", pid: 1 } } });
        const driver = completingDriver(fx);
        const { state } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.deepEqual(Object.keys(state.act).sort(), ["act", "producer", "ref", "stop"], "Details never enter the act");
        assert.equal(Object.keys(state).length, 10);
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ══════════════ 130/02 task 03 — the interrupt path always settles ══════════════
  {
    name: "130/02 task03 [outline] a drive that ended on its own settles as it ended before the halt (4 rows)",
    async run() {
      const rows = [
        { script: { outcome: "done" }, state: "done", reason: null, resumeAfter: null, outcome: "done" },
        { script: { outcome: "failed", failureReason: "timeout" }, state: "failed", reason: "timeout", resumeAfter: null, outcome: "failed" },
        { script: { outcome: "failed", failureReason: "agent_error" }, state: "failed", reason: "agent_error", resumeAfter: null, outcome: "failed" },
        { script: { outcome: "failed", failureReason: "session_limit" }, state: "failed", reason: "session_limit", resumeAfter: "set", outcome: "failed" },
      ];
      for (const row of rows) {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource();
          const driver = cancellableDriver(fx, { script: [row.script], onCommand() { source.raise(1, "stop-request"); } });
          const { state, lines, last } = await runCollected({ scope: "03", now: "2026-09-13T12:00:00.000Z" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(runs.length, 1, "no retry was minted");
          assert.equal(runs[0].state, row.state, JSON.stringify(row.script));
          assert.equal(runs[0].failureReason, row.reason);
          if (row.resumeAfter === "set") assert.ok(runs[0].resumeAfter, "resumeAfter is set"); else assert.equal(runs[0].resumeAfter, null);
          assert.equal(state.act.stop, "operator-interrupt");
          assert.deepEqual(state.driven, [{ ref: "03/01", phase: "continue", runId: runs[0].runId, outcome: row.outcome, attempt: 1, cycle: 1 }]);
          assert.ok(lines.indexOf(`Driven 03/01 — continue (${row.outcome}).`) > -1 && lines.indexOf(`Driven 03/01 — continue (${row.outcome}).`) < lines.indexOf(last), "the Driven row precedes the halt line");
          assert.equal(driver.spawnCalls.length, 1);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task03 [outline] a drive the source cancelled settles cancelled, and the halt names the run (2 rows)",
    async run() {
      const request = { loopRunId: "x", scope: "03", workspaceId: null, level: 2, state: "requested", requestedAt: "2026-09-13T12:00:00.000Z", escalatedAt: "2026-09-13T12:00:01.000Z", honouredAt: null, cancelled: null, by: { node: "win-host-a", pid: 4242 } };
      for (const row of [{ when: "live", sessionId: "sess-1", spawns: 1 }, { when: "pre-spawn", sessionId: null, spawns: 0 }]) {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource({ request });
          const driver = cancellableDriver(fx, { script: ["hold"], onCommand() { if (row.when === "live") source.raise(2, "stop-request"); } });
          const ctx = { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source };
          // After the tick-head poll and before the spawn: the change baseline is read between them.
          if (row.when === "pre-spawn") ctx.readChangeBaseline = async () => { source.raise(2, "stop-request"); return null; };
          const { state, last } = await runCollected({ scope: "03" }, ctx);
          assert.equal(driver.spawnCalls.length, row.spawns, row.when);
          const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(runs.length, 1);
          const [run] = runs;
          assert.equal(run.state, "cancelled", row.when);
          assert.equal(run.failureReason, null);
          assert.equal(run.sessionId, row.sessionId);
          assert.ok(run.updatedAt);
          assert.deepEqual(state.driven, [{ ref: "03/01", phase: "continue", runId: run.runId, outcome: "cancelled", attempt: 1, cycle: 1 }]);
          assert.ok(last.endsWith(`Details: signal=stop-request; level=2; request=${stopRequestPath(loopStopsDir(), state.loopRunId)}; by=win-host-a:4242; cancelled=${run.runId}.`), last);
          assert.equal(runs.filter((r) => r.state === "running").length, 0, "no running row is left behind");
          const item = await resolveItemExact(fx.ctx, "03/01");
          const fresh = await transitionRunStart(item, { now: new Date().toISOString() }, { workspace: fx.workspace });
          assert.ok(fresh?.record?.runId, "a fresh mint is admitted — the dedup guard is clear");
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task03 [outline] the order holds at every drive site — continue, the retry and the verify drive (5 rows)",
    async run() {
      const rows = [
        { site: "continue attempt 1", level: 2, script: ["hold"], at: 1, rows: [["continue", 1, "cancelled"]], spawns: 1, state: "cancelled", cancelled: 0 },
        { site: "retry attempt 2", level: 2, script: [{ outcome: "failed", failureReason: "timeout" }, "hold"], at: 2, rows: [["continue", 1, "failed"], ["continue", 2, "cancelled"]], spawns: 2, state: "cancelled", cancelled: 1 },
        { site: "retry attempt 2", level: 1, script: [{ outcome: "failed", failureReason: "timeout" }, { outcome: "done" }], at: 2, rows: [["continue", 1, "failed"], ["continue", 2, "done"]], spawns: 2, state: "done", cancelled: null },
        { site: "the verify drive", level: 2, script: [{ outcome: "done" }, "hold"], at: 2, rows: [["continue", 1, "done"], ["verify", 1, "cancelled"]], spawns: 2, state: "cancelled", cancelled: 1 },
        { site: "the verify drive", level: 1, script: [{ outcome: "done" }, { outcome: "done" }], at: 2, rows: [["continue", 1, "done"], ["verify", 1, "done"]], spawns: 2, state: "done", cancelled: null },
      ];
      for (const row of rows) {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource();
          const driver = cancellableDriver(fx, { script: row.script, onCommand(command, n) { if (n === row.at) source.raise(row.level, "stop-request"); } });
          const { state, last } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          const label = `${row.site} at level ${row.level}`;
          assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" }, `${label}: ${last}`);
          assert.deepEqual(state.driven.map((r) => [r.phase, r.attempt, r.outcome]), row.rows, label);
          assert.equal(driver.spawnCalls.length, row.spawns, label);
          const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(runs.length, row.spawns, `${label}: no attempt beyond the site was minted`);
          const siteRun = runs.find((r) => r.runId === state.driven.at(-1).runId);
          assert.equal(siteRun.state, row.state, label);
          if (row.cancelled == null) assert.doesNotMatch(last, /cancelled=/u, label);
          else assert.ok(last.endsWith(`cancelled=${state.driven[row.cancelled].runId}.`), `${label}: ${last}`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task03 the cancelled record's shape is the seventeen keys (131 appended asks), and the store is byte-identical to FF-5307's pin",
    async run() {
      const fx = await loopFixture();
      try {
        const source = fakeStopSource();
        const driver = cancellableDriver(fx, { script: ["hold"], onCommand() { source.raise(2, "stop-request"); } });
        await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        const [run] = await readRuns({ ref: "03/01", dir: fx.storyDir });
        assert.equal(run.state, "cancelled");
        assert.deepEqual(Object.keys(run), ["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend", "asks"]);
        const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
        const pin = /\["src\/run-store\.mjs", "([0-9a-f]{64})"\]/u.exec(await readFile(path.join(root, "test", "arch", "loop", "acd-loop-state-rides-the-run-record.test.mjs"), "utf8"));
        assert.ok(pin, "FF-5307 pins the store");
        const digest = createHash("sha256").update((await readFile(path.join(root, "src", "run-store.mjs"), "utf8")).replace(/\r\n/gu, "\n")).digest("hex");
        assert.equal(digest, pin[1], "src/run-store.mjs is untouched");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task03 [outline] needs-input is not settled, and an interrupt over it names the session (2 rows)",
    async run() {
      for (const level of [1, 2]) {
        const fx = await loopFixture();
        try {
          const source = fakeStopSource();
          // The level rises AFTER the drive returned: on the post-drive poll (#2), before the read.
          source.onPoll = (n) => { if (n === 2) source.raise(level, "stop-request"); };
          const driver = cancellableDriver(fx, { script: [{ outcome: "needs-input" }] });
          const { state, last } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
          const [run] = await readRuns({ ref: "03/01", dir: fx.storyDir });
          assert.equal(run.state, "running", `level ${level}: the parked session's record is the store's design`);
          assert.equal(run.sessionId, "sess-1");
          assert.equal(state.act.stop, "operator-interrupt", last);
          assert.match(last, /sessionId=sess-1/u);
          assert.doesNotMatch(last, /cancelled=/u);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task03 a cancel is never retried — a resume over the cancelled record mints no attempt 2, and readiness reads not-retryable",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        const source = fakeStopSource();
        const driver = cancellableDriver(fx, { script: ["hold"], onCommand() { source.raise(2, "stop-request"); } });
        await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        const [cancelled] = await readRuns({ ref: "03/01", dir: fx.storyDir });
        assert.equal(cancelled.state, "cancelled");
        assert.equal(retryReadiness(cancelled, 3, Date.now()).state, "not-retryable");
        const resumed = completingDriver(fx, { onCommand: closing(fx) });
        const { lines } = await runCollected({ scope: "03", resume: true }, { ...fx.ctx, agentSessionDriverOptions: resumed.options, stopSource: fakeStopSource() });
        assert.equal(lines.some((line) => line.startsWith("Resumed 03/01 — attempt 2")), false, lines.join("\n"));
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task03 the settle conflict narration still covers a record settled from under the shell, and the loop still halts on the interrupt",
    async run() {
      const fx = await loopFixture();
      try {
        const source = fakeStopSource();
        const item = await resolveItemExact(fx.ctx, "03/01");
        const driver = cancellableDriver(fx, {
          script: [{ outcome: "done" }],
          async onCommand() {
            const [run] = await readRuns(item);
            await completeRun(item, { runId: run.runId, outcome: "done", now: new Date().toISOString() });
            source.raise(1, "stop-request");
          },
        });
        const { state, lines } = await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.ok(lines.some((line) => line.startsWith("Settle conflict on 03/01 — ")), lines.join("\n"));
        assert.equal(state.act.stop, "operator-interrupt");
        assert.equal((await readRuns(item))[0].state, "done", "the record as it stands");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task03 the early return is gone — every drivePhase binding reaches settleDriven before any return, and a cancel settles cancelled with no reason",
    async run() {
      const shell = stripComments(await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8"));
      const sites = [...shell.matchAll(/(\w+) = await drivePhase\(/gu)];
      assert.ok(sites.length >= 1, "the shell drives");
      for (const site of sites) {
        const binding = site[1];
        const after = shell.slice(site.index + site[0].length);
        const settle = after.indexOf(`${binding} = await settleDriven(${binding}`);
        assert.ok(settle > -1, `${binding} is settled`);
        assert.doesNotMatch(after.slice(0, settle), /\breturn\b/u, `no return between the drive of ${binding} and its settle`);
      }
      const cycle = stripComments(await readFile(new URL("../../src/loop/cycle.mjs", import.meta.url), "utf8"));
      assert.match(cycle, /outcome\.failureReason === "cancelled" \? "cancelled" : "failed"/u, "the terminal word is computed from the driver's cancel");
      assert.match(cycle, /failureReason: terminal === "failed" \? outcome\.failureReason \?\? "agent_error" : null/u, "a cancel carries no reason");
    },
  },
  {
    name: "2026-09-24 the sequential drive is a child — spawnPhaseDrive gets the lent run in the primary, no PTY is spawned in-process, and needs-input still halts",
    async run() {
      const fx = await loopFixture();
      try {
        const pty = createFakePtySpawn();
        const child = fakePhaseChild([childDocument({ outcome: "needs-input", sessionId: "child-session" })]);
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: { ptySpawn: pty.spawn, which: createFakeWhich(["claude"]), commandDelayMs: 0 },
          spawnPhaseDrive: child.spawn,
          report: () => {},
        });
        assert.equal(state.act.stop, "session-needs-input");
        assert.equal(pty.spawnCalls.length, 0, "the loop's own process spawned no PTY");
        assert.equal(child.calls.length, 1);
        const [call] = child.calls;
        const item = await resolveItemExact(fx.ctx, "03/01");
        const [run] = await readRuns(item);
        assert.equal(call.ref, "03/01");
        assert.equal(call.phase, "continue");
        assert.equal(call.runId, run.runId, "the child is lent the run the parent minted");
        assert.equal(call.lane, fx.projectRoot, "the child runs in the primary");
        assert.equal(call.graceMs, LANE_CANCEL_GRACE_MS);
        assert.ok(call.signal instanceof AbortSignal, "the stop source's signal ends the child's stdin");
        assert.ok(Number.isSafeInteger(call.deadlineMs) && call.deadlineMs > 0, "the parent-side deadline");
        assert.equal("fixFile" in call, false, "no fix, no file");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "2026-09-24 a child death is the run's runtime_offline, retried on its lineage — never the loop's",
    async run() {
      const fx = await loopFixture({ cap: 2 });
      try {
        const child = fakePhaseChild([{ outcome: "died", document: null, exitCode: null, stderrTail: ["Error: AttachConsole failed"], spawn: {} }]);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, spawnPhaseDrive: child.spawn, report: () => {} });
        assert.equal(child.calls.length, 2, "the first attempt and its one retry");
        assert.notEqual(child.calls[0].runId, child.calls[1].runId, "each attempt is lent its own run");
        const runs = await readRuns(await resolveItemExact(fx.ctx, "03/01"));
        assert.deepEqual(runs.map((run) => [run.state, run.failureReason]), [["failed", "runtime_offline"], ["failed", "runtime_offline"]]);
        assert.equal(state.state, "halted");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "2026-09-24 drivePhase in a child — the fix rides a file for the one spawn and is removed after it",
    async run() {
      const fx = await loopFixture();
      try {
        const fix = { buildRun: "run-x", findings: ["F-1"] };
        let seen = null;
        const child = fakePhaseChild([childDocument({ outcome: "done", sessionId: "s", settlementContext: { projectsDir: "p" } })], {
          onSpawn: async (args) => { seen = JSON.parse(await readFile(args.fixFile, "utf8")); },
        });
        const driven = await drivePhase({ ref: "03/01", phase: "continue", cycle: 1, declaration: DECLARATION_L1, fix }, { ...fx.ctx, spawnPhaseDrive: child.spawn });
        assert.deepEqual(seen, fix, "the child read the fix transport from its file");
        await assert.rejects(readFile(child.calls[0].fixFile, "utf8"), { code: "ENOENT" }, "the file is gone after the spawn");
        assert.deepEqual(driven.outcome, { outcome: "done", sessionId: "s" });
        assert.deepEqual(driven.settlementContext, { projectsDir: "p" }, "the child's settlement context reaches the settle");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "2026-09-24 childDriveOutcome is the one mapping — and the foreground launch hands the child spawner to the body",
    async run() {
      assert.deepEqual(childDriveOutcome(childDocument({ outcome: "done", sessionId: "s" })), { outcome: "done", sessionId: "s" });
      assert.deepEqual(childDriveOutcome(childDocument({ outcome: "failed" })), { outcome: "failed", failureReason: "agent_error" });
      assert.deepEqual(childDriveOutcome({ outcome: "died" }), { outcome: "failed", failureReason: "runtime_offline" });
      assert.deepEqual(childDriveOutcome({ outcome: "timeout" }), { outcome: "failed", failureReason: "timeout" });
      assert.deepEqual(childDriveOutcome({ outcome: "aborted" }), { outcome: "cancelled" });
      assert.deepEqual(childDriveOutcome({ outcome: "refused", document: { ok: false, code: "x" } }), { outcome: "failed", failureReason: "agent_error", refusal: "x" });
      const shell = stripComments(await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8"));
      // 131/03 (task 06, ruling 7) — the launch hands the body to `runLoopLaunch`, which announces a halt.
      assert.match(shell, /return runLoopLaunch\(input, \{[^}]*spawnPhaseDrive: spawnLaneDrive/u,"the foreground launch drives the sequential phases in a child");
    },
  },
  ...composerTests(),
  ...primaryAskTests(),
];

// ── milestone 131 / story 03, task 00 — ONE COMPOSER ASKS, WAITS AND ANSWERS (`src/loop/ask.mjs`;
// ADR-001 §1, §3-§5, ADR-004 §1, §6). The needs-input stop's own suite (task 00, ruling 18).
// `awaitAnswer` is driven directly over a real run record in a temporary tree, a real transcript
// under an isolated `CLAUDE_CONFIG_DIR`, the isolated aof home's ask file, `notify` through an
// injected `fetch` spy, a collector for `narrate`, and a fake `askWait` whose clock the case moves.
// Built inside a hoisted function so the array above can spread it without a TDZ.
function composerTests() {
  const ASKED = Date.parse("2026-09-23T17:12:00.000Z");
  const HOOK = "https://discord.com/api/webhooks/131/composer";
  const QUESTION_TURN = { type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: "Decision needed: pick a store?" }, { type: "text", text: "NEEDS_INPUT" }] } };

  // A fake wait: `next()` advances the clock by `step`; `read` reads the real file unless a case
  // scripts it; `expired` answers from the check number, recording what it was asked.
  function fakeWait({ start = ASKED, step = 1000, expiredFrom = Infinity, read = null, onNext = null } = {}) {
    let t = start;
    let checks = 0;
    const asked = [];
    return {
      asked,
      checks: () => checks,
      now: () => new Date(t),
      next: async () => { checks += 1; t += step; await onNext?.(checks); },
      read: async (runId) => (read == null ? readAsk(loopAsksDir(), runId) : await read(checks, runId)),
      expired: (elapsedMs) => { asked.push(elapsedMs); return checks >= expiredFrom; },
    };
  }

  async function withComposer(body, { phase = "continue", transcript = [QUESTION_TURN], notifyBlock = { channels: { ops: { type: "discord", urlEnv: "HOOK" } } }, fetch = null } = {}) {
    const root = await mkdtemp(path.join(os.tmpdir(), "aof-131-03-"));
    try {
      const dir = path.join(root, "wiki", "work", "03_milestone_x", "stories", "01_story_y");
      await mkdir(dir, { recursive: true });
      const item = { ref: "03/01", dir };
      const { record } = await transitionRunStart(item, { now: "2026-09-23T17:00:00.000Z" }, {});
      const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude") };
      const cwd = path.join(root, "tree");
      if (transcript != null) {
        const projects = claudeProjectsDir({ cwd, env });
        await mkdir(projects, { recursive: true });
        await writeFile(path.join(projects, "S1.jsonl"), `${transcript.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");
      }
      const posts = [];
      const spy = fetch ?? (async (url, init) => { posts.push(JSON.parse(init.body)); return { status: 204, headers: { get: () => null }, json: async () => ({}) }; });
      const lines = [];
      const beats = [];
      const workspace = { config: notifyBlock == null ? {} : { work: { notify: notifyBlock } } };
      const deps = (over = {}) => ({
        workspace,
        env,
        notifyOptions: { env: { HOOK }, fetch: spy },
        narrate: (line) => lines.push(line),
        heartbeatMs: 300000,
        dir: loopAsksDir(),
        enqueueHeartbeat: async (i, runId, at) => { beats.push({ runId, at }); },
        ...over,
      });
      const phaseRun = { item, record, outcome: { outcome: "needs-input", sessionId: "S1" }, settlementContext: null };
      const site = (drive, over = {}) => ({ drive, ref: "03/01", phase, item, scope: "03", loopRunId: "L1", workspaceId: "w1", cwd, ...over });
      const redriveDone = (outcome = { outcome: "done" }) => {
        const calls = [];
        const drive = async (answer) => { calls.push(answer); return { item, record: (await readRuns(item))[0], outcome }; };
        drive.calls = calls;
        return drive;
      };
      return await body({ item, record, env, cwd, posts, lines, beats, deps, phaseRun, site, redriveDone, workspace });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  const answerIt = (text, actor = "umami") => answerAsk(loopAsksDir(), { workspaceId: "w1", ref: "03/01", text, by: { actor, via: "cli", node: "node-7297" }, now: () => new Date(ASKED + 60000) });
  const fileOf = (runId) => readAsk(loopAsksDir(), runId);
  const recordOf = async (item) => (await readRuns(item))[0];

  return [
    {
      name: "131/03 task00 — the ask is recorded, announced and narrated before the wait begins, and the halt is minted in one place",
      async run() {
        await withComposer(async ({ item, record, posts, lines, deps, phaseRun, site, redriveDone }) => {
          let release;
          const gate = new Promise((resolve) => { release = resolve; });
          const wait = fakeWait({ expiredFrom: 1 });
          const firstNext = wait.next;
          wait.next = async () => { await gate; await firstNext(); };
          const pending = awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait }));
          for (let i = 0; i < 50 && posts.length === 0; i += 1) await new Promise((r) => setTimeout(r, 10));
          const onRecord = await recordOf(item);
          assert.equal(onRecord.asks.length, 1);
          assert.equal(onRecord.asks[0].question, "Decision needed: pick a store?");
          assert.equal(onRecord.asks[0].phase, "build");
          const file = await fileOf(record.runId);
          assert.equal(file.state, "waiting");
          assert.equal(file.sessionId, "S1");
          assert.equal(posts.length, 1);
          assert.ok(posts[0].content.startsWith("**03/01 — waiting on you** (build, "), posts[0].content);
          assert.equal(lines.at(-1), "03/01 — waiting on you (build, 12m): Decision needed: pick a store?");
          release();
          assert.ok((await pending).parked != null);
        });
        const halt = parkedHalt([{ ref: "03/02", runId: "R2", askedAt: "2026-09-23T10:00:00.000Z" }, { ref: "03/01", runId: "R1", askedAt: "2026-09-23T09:00:00.000Z" }], (stop, ref, producer) => ({ act: "halt", stop, ref, producer }));
        assert.deepEqual(halt.act, { act: "halt", stop: "session-needs-input", ref: "03/01", producer: "driver:needs-input" });
        assert.deepEqual(halt.details.parked.map((p) => p.ref), ["03/01", "03/02"]);
        assert.deepEqual([...LOOP_STOPS].includes("session-needs-input"), true, "LOOP_STOPS is unchanged");
      },
    },
    {
      name: "131/03 task00 — an answer re-drives the same session with the answer typed verbatim, records who and when, then clears the file",
      async run() {
        await withComposer(async ({ item, record, lines, deps, phaseRun, site, redriveDone }) => {
          const drive = redriveDone();
          const wait = fakeWait({ onNext: async (n) => { if (n === 1) await answerIt("take option B"); } });
          const answered = await awaitAnswer(phaseRun, site(drive), deps({ askWait: wait }));
          assert.deepEqual(drive.calls, [{ runId: record.runId, sessionId: "S1", text: "take option B" }]);
          assert.equal(answered.phaseRun.outcome.outcome, "done");
          const last = (await recordOf(item)).asks.at(-1);
          assert.equal(last.answer, "take option B");
          assert.equal(last.by, "umami");
          assert.ok(last.answeredAt);
          assert.equal(await fileOf(record.runId), null, "the ask file is gone");
          assert.ok(lines.some((line) => line.startsWith("03/01 — answered by umami (build, ")), lines.join("\n"));
        });
      },
    },
    {
      name: "131/03 task00 — the bound parks the run and says so once; a stop parks and tells nobody; the record stays running",
      async run() {
        await withComposer(async ({ item, record, posts, deps, phaseRun, site, redriveDone }) => {
          const parked = await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: fakeWait({ expiredFrom: 3 }) }));
          assert.equal((await fileOf(record.runId)).state, "parked");
          assert.ok((await recordOf(item)).asks.at(-1).parkedAt);
          assert.equal(posts.length, 2);
          assert.ok(posts[1].content.includes("parked, unanswered"));
          assert.deepEqual(Object.keys(parked.parked), ["ref", "runId", "sessionId", "askedAt", "question"]);
          assert.deepEqual({ ref: parked.parked.ref, runId: parked.parked.runId, sessionId: parked.parked.sessionId, question: parked.parked.question }, { ref: "03/01", runId: record.runId, sessionId: "S1", question: "Decision needed: pick a store?" });
          assert.equal((await recordOf(item)).state, "running");
        });
        await withComposer(async ({ record, posts, deps, phaseRun, site, redriveDone }) => {
          const wait = fakeWait();
          const result = await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait, stopping: () => wait.checks() >= 2 }));
          assert.ok(result.parked != null);
          assert.equal((await fileOf(record.runId)).state, "parked");
          assert.equal(posts.length, 1, "only session-needs-input was sent");
        });
      },
    },
    {
      name: "131/03 task00 — one check reads the file, then the stop, then the bound, and the first that decides wins (thirteen rows)",
      async run() {
        const rows = [
          ["waiting", false, false, false, "waits", 1, "waiting"],
          ["answered b", false, false, false, "drives", 1, "gone"],
          ["answered b", true, false, true, "drives", 1, "gone"],
          ["answered b", true, true, false, "parks", 1, "answered"],
          ["waiting", true, false, true, "parks", 1, "parked"],
          ["waiting", true, false, false, "parks", 1, "parked"],
          ["waiting", false, false, true, "parks", 2, "parked"],
          ["parked", false, false, false, "waits", 1, "parked"],
          ["absent", false, false, false, "waits", 1, "absent"],
          ["absent", false, false, true, "parks", 2, "absent"],
          ["corrupt", false, false, false, "waits", 1, "corrupt"],
          ["answered empty", false, false, false, "waits", 1, "unchanged"],
          ["answered null", false, false, true, "parks", 2, "unchanged"],
        ];
        for (const [index, [file, stopping, aborted, expired, result, calls, after]] of rows.entries()) {
          await withComposer(async ({ item, record, posts, deps, phaseRun, site, redriveDone }) => {
            const dir = loopAsksDir();
            const arrange = async () => {
              const base = { runId: record.runId, ref: "03/01", workspaceId: "w1", loopRunId: "L1", scope: "03", sessionId: "S1", phase: "build", node: null, question: "Q", askedAt: new Date(ASKED).toISOString(), parkedAt: null, answer: null, answeredAt: null, by: null };
              const write = (value) => writeFile(askRequestPath(dir, record.runId), typeof value === "string" ? value : JSON.stringify(value), "utf8");
              if (file === "waiting") await write({ ...base, state: "waiting" });
              if (file === "answered b") await write({ ...base, state: "answered", answer: "b", answeredAt: base.askedAt, by: { actor: "umami" } });
              if (file === "parked") await write({ ...base, state: "parked", parkedAt: base.askedAt });
              if (file === "absent") await rm(askRequestPath(dir, record.runId), { force: true });
              if (file === "corrupt") await write("{ not json");
              if (file === "answered empty") await write({ ...base, state: "answered", answer: "", answeredAt: base.askedAt });
              if (file === "answered null") await write({ ...base, state: "answered", answer: null, answeredAt: base.askedAt });
            };
            const drive = redriveDone();
            let before = null;
            const wait = fakeWait({
              onNext: async (n) => { if (n === 1) { await arrange(); before = existsSync(askRequestPath(dir, record.runId)) ? await readFile(askRequestPath(dir, record.runId), "utf8") : null; } },
            });
            wait.expired = () => wait.checks() === 1 ? expired : true;
            const outcome = await awaitAnswer(phaseRun, site(drive), deps({ askWait: wait, stopping: () => (wait.checks() === 1 ? stopping : false), aborted: () => wait.checks() === 1 && aborted }));
            const label = `row ${index} (${file})`;
            if (result === "drives") {
              assert.equal(drive.calls[0]?.text, "b", label);
            } else if (result === "parks") {
              assert.ok(outcome.parked != null && wait.checks() === 1, `${label}: parked at the first check`);
              assert.equal(drive.calls.length, 0, label);
            } else {
              assert.ok(wait.checks() >= 2, `${label}: waited on to the next check`);
            }
            assert.equal(posts.length, result === "waits" ? posts.length : calls, `${label}: notices`);
            if (result !== "waits") {
              const onDisk = existsSync(askRequestPath(dir, record.runId)) ? await readFile(askRequestPath(dir, record.runId), "utf8") : null;
              if (after === "gone" || after === "absent") assert.equal(onDisk, null, `${label}: no file`);
              else if (after === "unchanged") assert.equal(onDisk, before, `${label}: byte-unchanged`);
              else assert.equal(JSON.parse(onDisk).state, after, `${label}: reads ${after}`);
            }
            if (file === "absent" && result === "parks") assert.ok((await recordOf(item)).asks.at(-1).parkedAt, `${label}: the record carries a parkedAt`);
          });
        }
      },
    },
    {
      name: "131/03 task00 — the beat and the re-narrated row keep their own cadences (six rows), and the wait is charged to nobody",
      async run() {
        for (const [heartbeatMs, step, checks, beats, rows] of [
          [300000, 100000, 10, 10, 4],
          [300000, 2000, 149, 3, 1],
          [300000, 2000, 150, 3, 2],
          [300000, 99999, 3, 2, 1],
          [2, 1, 3, 3, 2],
          [300000, 0, 5, 1, 1],
        ]) {
          await withComposer(async ({ lines, beats: seen, deps, phaseRun, site, redriveDone }) => {
            // The wait ends on an ANSWERED check, which beats and narrates nothing of its own.
            const wait = fakeWait({ step, read: async (n) => (n > checks ? { state: "answered", answer: "x", by: null } : null) });
            wait.expired = () => false;
            await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait, heartbeatMs }));
            const label = `heartbeatMs ${heartbeatMs}, step ${step}, ${checks} checks`;
            assert.equal(seen.length, beats, `${label}: ${beats} beats`);
            assert.equal(lines.filter((line) => line.includes("waiting on you")).length, rows, `${label}: ${rows} waiting rows`);
          });
        }
        await withComposer(async ({ item, deps, phaseRun, site, redriveDone }) => {
          const wait = fakeWait({ step: 100000, onNext: async (n) => { if (n === 10) await answerIt("go"); } });
          await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait, enqueueHeartbeat: undefined }));
          const record = await recordOf(item);
          assert.ok(Date.parse(record.heartbeatAt) >= ASKED + 8 * 100000, "the consumed heartbeatAt is no older than the checks it waited through");
          const ask = record.asks.at(-1);
          const charged = attemptElapsedMs({ record: { ...record, state: "running" }, now: new Date(ASKED + 10 * 100000).toISOString() });
          const whole = ASKED + 10 * 100000 - Date.parse(record.createdAt);
          assert.equal(charged, whole - (Date.parse(ask.answeredAt) - Date.parse(ask.askedAt)), "the ask interval is removed from the attempt");
        });
      },
    },
    {
      name: "131/03 task00 — every re-drive ends the loop except a fresh question (six rows)",
      async run() {
        const reask = (sessionId = "S1") => ({ outcome: "needs-input", sessionId });
        const rows = [
          [["done"], "done", 1, 1, 1],
          [["failed"], "failed", 1, 1, 1],
          [["cancelled"], "cancelled", 1, 1, 1],
          [["reask", "done"], "done", 2, 2, 2],
          [["reask", "park"], "parked", 1, 2, 2],
          [["reaskS2", "park"], "parkedS2", 1, 2, 2],
        ];
        for (const [script, answer, drives, asks, notices] of rows) {
          await withComposer(async ({ item, record, posts, deps, phaseRun, site }) => {
            const calls = [];
            const drive = async (reply) => {
              calls.push(reply);
              const step = script[calls.length - 1];
              const outcome = step === "reask" ? reask() : step === "reaskS2" ? reask("S2") : step === "failed" ? { outcome: "failed", failureReason: "agent_error" } : { outcome: step };
              return { item, record: await recordOf(item), outcome };
            };
            let answeredOnce = false;
            const wait = fakeWait({
              onNext: async (n) => {
                const standing = (await recordOf(item)).asks.length;
                if (!answeredOnce && n === 1) { answeredOnce = true; await answerIt("b"); }
                else if (standing === 2 && script[1] === "done" && (await fileOf(record.runId))?.state === "waiting") await answerIt("c");
              },
            });
            wait.expired = () => script[1] === "park" && (calls.length >= 1);
            const outcome = await awaitAnswer(phaseRun, site(drive), deps({ askWait: wait }));
            const label = script.join(" → ");
            assert.equal(calls.length, drives, `${label}: drives`);
            assert.equal((await recordOf(item)).asks.length, asks, `${label}: asks`);
            assert.equal(posts.filter((p) => p.content.includes("waiting on you")).length, notices, `${label}: needs-input notices`);
            if (answer === "parked" || answer === "parkedS2") {
              assert.ok(outcome.parked != null, label);
              assert.equal(outcome.parked.sessionId, answer === "parkedS2" ? "S2" : "S1", label);
              assert.equal((await fileOf(record.runId)).state, "parked", label);
            } else {
              assert.equal(outcome.phaseRun.outcome.outcome, answer, label);
              assert.equal(await fileOf(record.runId), null, `${label}: the file is gone`);
              if (drives === 2) assert.equal(calls[1].text, "c", label);
            }
          });
        }
      },
    },
    {
      name: "131/03 task00 — nothing the wait leans on can end it (seven rows), and a record that refuses the ask stops everything after it",
      async run() {
        const rows = [
          ["204", {}, [], "Decision needed: pick a store?"],
          ["500", { fetch: async () => ({ status: 500, headers: { get: () => null }, json: async () => ({}) }) }, ["notify-delivery-failed"], "Decision needed: pick a store?"],
          ["throws", { fetch: async () => { throw new TypeError("down"); } }, ["notify-delivery-failed"], "Decision needed: pick a store?"],
          ["no notify", { notifyBlock: null }, [], "Decision needed: pick a store?"],
          ["beat throws", { beatThrows: true }, ["loop-ask-heartbeat"], "Decision needed: pick a store?"],
          ["no transcript", { transcript: null }, ["ask-question-unreadable"], null],
          ["AskUserQuestion", { transcript: [{ type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "tool_use", name: "AskUserQuestion", input: { questions: [{ question: "Which store?", options: [{ label: "sqlite" }, { label: "json" }] }] } }] } }] }, [], "Which store?\n- sqlite\n- json"],
        ];
        for (const [label, options, degrades, question] of rows) {
          const events = [];
          setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
          try {
            await withComposer(async ({ item, lines, deps, phaseRun, site, redriveDone }) => {
              const drive = redriveDone();
              const wait = fakeWait({ onNext: async (n) => { if (n === 3) await answerIt("b"); } });
              await awaitAnswer(phaseRun, site(drive), deps({ askWait: wait, ...(options.beatThrows ? { enqueueHeartbeat: async () => { throw new Error("EACCES"); } } : {}) }));
              assert.equal(drive.calls[0]?.text, "b", label);
              assert.deepEqual(events.map((e) => e.code).filter((c) => degrades.includes(c) || c.startsWith("notify-") || c === "loop-ask-heartbeat" || c === "ask-question-unreadable"), degrades, `${label}: degrades`);
              assert.equal((await recordOf(item)).asks[0].question, question, `${label}: question`);
              const row = lines.find((line) => line.includes("waiting on you"));
              const oneLine = question == null ? "" : `: ${question.replace(/\s+/gu, " ")}`;
              assert.equal(row, `03/01 — waiting on you (build, 12m)${oneLine}`, `${label}: row`);
            }, { ...options });
          } finally {
            setDegradeSinkForTest(undefined);
          }
        }
        for (const [state, code] of [["failed", "no-running-run"], ["open", "run-ask-open"]]) {
          await withComposer(async ({ item, record, posts, lines, deps, phaseRun, site, redriveDone }) => {
            if (state === "failed") await completeRun(item, { runId: record.runId, outcome: "failed", failureReason: "agent_error", now: "2026-09-23T17:05:00.000Z" });
            else await openRunAsk(item, record.runId, { question: "earlier", phase: "build", now: "2026-09-23T17:05:00.000Z" });
            await assert.rejects(awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: fakeWait() })), (error) => error.code === code, state);
            assert.equal(await fileOf(record.runId), null, `${state}: no ask file`);
            assert.equal(posts.length, 0, `${state}: no notice`);
            assert.equal(lines.length, 0, `${state}: nothing narrated`);
          });
        }
      },
    },
    {
      name: "131/03 task00 — the bound counts from the later of the ask and the invocation (five rows), and the production wait holds the process",
      async run() {
        for (const [askedAt, invokedAt, nowIso, parks] of [
          ["2026-09-23T17:12:00.000Z", "2026-09-23T16:00:00.000Z", "2026-09-23T18:12:00.000Z", true],
          ["2026-09-23T17:12:00.000Z", "2026-09-23T16:00:00.000Z", "2026-09-23T18:11:59.999Z", false],
          ["2026-09-23T17:12:00.000Z", "2026-09-23T17:42:00.000Z", "2026-09-23T18:12:00.000Z", false],
          ["2026-09-23T17:12:00.000Z", null, "2026-09-23T17:12:30.000Z", false],
          ["2026-09-23T17:12:00.000Z", null, "2026-09-23T17:11:00.000Z", false],
        ]) {
          await withComposer(async ({ posts, deps, phaseRun, site, redriveDone }) => {
            let at = Date.parse(askedAt);
            const production = defaultAskWait({ bounds: { scheduleToCloseMs: 3600000 }, timers: { setTimeout: (fn) => { at = Date.parse(nowIso); fn(); return 1; }, clearTimeout: () => {} }, now: () => new Date(at) });
            let checks = 0;
            const wait = { ...production, next: async () => { checks += 1; await production.next(); } };
            const outcome = await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait, invokedAt, stopping: () => checks >= 2 }));
            const label = `${askedAt} / ${invokedAt} / ${nowIso}`;
            assert.equal(outcome.parked != null, true, label);
            assert.equal(posts.some((p) => p.content.includes("parked, unanswered")), parks, `${label}: ${parks ? "parks at the bound" : "still waits"}`);
            assert.equal(checks, parks ? 1 : 2, label);
          });
        }
        let handle = null;
        const production = defaultAskWait({ bounds: { scheduleToCloseMs: 3600000 }, pollMs: 60000, timers: { setTimeout: (fn, ms) => { handle = setTimeout(fn, ms); return handle; }, clearTimeout: (h) => clearTimeout(h) } });
        const pending = production.next();
        assert.equal(handle.hasRef(), true, "the production wait's timer is ref'd, so beforeExit cannot fire while the ask stands");
        production.close();
        await pending;
        const source = stripComments(await readFile(path.join(repoRoot, "src", "loop", "ask.mjs"), "utf8"));
        assert.doesNotMatch(source, /\bsetInterval\(/u, "ask.mjs arms no interval");
        assert.doesNotMatch(source, /agent-session-driver|terminal-input|\.write\(/u, "ask.mjs writes no PTY and reaches no terminal-input module");
      },
    },
    {
      name: "131/03 task00 — the drive phase maps onto the design's three words (seven rows), and the answered row names the actor or nobody",
      async run() {
        assert.ok(Object.isFrozen(PHASE_WORDS));
        for (const [phase, word, row] of [
          ["refine", "refine", "03/01 — waiting on you (refine, 12m): Decision needed: pick a store?"],
          ["continue", "build", "03/01 — waiting on you (build, 12m): Decision needed: pick a store?"],
          ["fix", "build", "03/01 — waiting on you (build, 12m): Decision needed: pick a store?"],
          ["verify", "verify", "03/01 — waiting on you (verify, 12m): Decision needed: pick a store?"],
          ["gate", null, "03/01 — waiting on you: Decision needed: pick a store?"],
          ["__proto__", null, "03/01 — waiting on you: Decision needed: pick a store?"],
          [undefined, null, "03/01 — waiting on you: Decision needed: pick a store?"],
        ]) {
          assert.equal(phaseWord(phase), word, String(phase));
          await withComposer(async ({ lines, deps, phaseRun, site, redriveDone }) => {
            await awaitAnswer(phaseRun, site(redriveDone(), { phase }), deps({ askWait: fakeWait({ expiredFrom: 1 }) }));
            assert.equal(lines[0], row, String(phase));
          }, { phase });
        }
        for (const [by, recorded, row] of [[{ actor: "umami", via: "cli", node: "node-7297" }, "umami", "03/01 — answered by umami (build, 3h 10m)"], [null, null, "03/01 — answered (build, 3h 10m)"]]) {
          await withComposer(async ({ item, record, lines, deps, phaseRun, site, redriveDone }) => {
            const wait = fakeWait({
              start: Date.parse("2026-09-23T20:10:00.000Z"),
              step: 0,
              onNext: async () => {
                const base = await fileOf(record.runId);
                await writeFile(askRequestPath(loopAsksDir(), record.runId), JSON.stringify({ ...base, state: "answered", answer: "b", answeredAt: "2026-09-23T20:10:00.000Z", by }), "utf8");
              },
            });
            await awaitAnswer(phaseRun, site(redriveDone()), deps({ askWait: wait }));
            assert.ok(lines.includes(row), `${JSON.stringify(by)}: ${lines.join(" | ")}`);
            assert.equal((await recordOf(item)).asks[0].by, recorded);
          });
        }
      },
    },
  ];
}

// ── milestone 131 / story 03, tasks 01, 05 and 06 — THE PRIMARY DRIVE WAITS IN PLACE, THE ACCOUNT
// NAMES THE QUESTION, AND THE LOOP REPORTS ITS OWN HALT AND DEATH (ADR-001 §1(b), ADR-004 §3-§4,
// ADR-005 §4). Driven through `runLoopBody` / `runLoopLaunch` over the stops fixture: the fake PTY,
// `ctx.askWait`, and `notify` through an injected `fetch` spy. Built inside a hoisted function so the
// array above can spread it without a TDZ.
function primaryAskTests() {
  const HOOK = "https://discord.com/api/webhooks/131/primary";
  const QUESTION = "Decision needed: split 03?\n\nOptions: A or B";
  // The stops fixture with one discord channel, a transcript home, and the story's own verify moving
  // it to done so a walk that gets there ends.
  async function withPrimary(body, { question = QUESTION } = {}) {
    const fx = await loopFixture();
    try {
      fx.workspace.config.work.notify = { channels: { ops: { type: "discord", urlEnv: "HOOK" } } };
      const env = { CLAUDE_CONFIG_DIR: path.join(fx.projectRoot, ".claude-test") };
      const projects = claudeProjectsDir({ cwd: fx.projectRoot, env });
      await mkdir(projects, { recursive: true });
      if (question != null) {
        for (const n of [1, 2, 3]) {
          await writeFile(path.join(projects, `session-${n}.jsonl`), `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: question }, { type: "text", text: "NEEDS_INPUT" }] } })}\n`);
        }
      }
      const posts = [];
      const fetch = async (url, init) => { posts.push(JSON.parse(init.body)); return { status: 204, headers: { get: () => null }, json: async () => ({}) }; };
      const workspaceId = resolveWorkspaceId(fx.workspace);
      return await body({ fx, env, posts, fetch, workspaceId });
    } finally {
      await fx.cleanup();
    }
  }
  // A wait that answers the ask with `text` at its first check, and never reaches the bound.
  const answeringWait = (workspaceId, text, actor = "umami") => ({
    now: () => new Date(),
    next: async () => {
      for (const ask of await readAsks(loopAsksDir(), { workspaceId })) {
        if (ask.state === "waiting") await answerAsk(loopAsksDir(), { workspaceId, ref: ask.ref, text, by: { actor, via: "cli", node: null }, now: () => new Date() });
      }
    },
    read: (runId) => readAsk(loopAsksDir(), runId),
    expired: () => false,
  });
  const storyOf = (fx) => resolveItemExact({ workspace: fx.workspace }, "03/01");
  const moveOnVerify = (fx) => (command) => {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  };

  return [
    {
      name: "131/03 task01 — a primary drive's question is answered and the loop carries on from the same session, settling that run once",
      async run() {
        await withPrimary(async ({ fx, env, fetch, workspaceId }) => {
          const driver = watcherDriver([{ outcome: "needs-input" }, { outcome: "done" }], { onCommand: moveOnVerify(fx) });
          const lines = [];
          const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, askWait: answeringWait(workspaceId, "yes, split it"), notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.act, "done", lines.join("\n"));
          assert.ok(driver.spawnCalls.length >= 2);
          const second = driver.spawnCalls[1].args;
          assert.deepEqual(second.slice(second.indexOf("--resume"), second.indexOf("--resume") + 2), ["--resume", "session-1"], "the re-drive resumed the waiting session");
          assert.equal(driver.typed[1], "yes, split it", "the answer was typed as the resumed session's input");
          const runs = await readRuns(await storyOf(fx));
          const waited = runs.find((run) => run.asks.length > 0);
          assert.equal(waited.state, "done", "the waiting run was settled done");
          assert.equal(waited.asks[0].answer, "yes, split it");
          assert.equal(runs.filter((run) => run.brief?.loop?.phase === "continue").length, 1, "no second continue run was minted for 03/01");
          assert.ok(driver.typed.some((typed) => typed.startsWith("/aof:verify 03/01")), "the walk went on to the act after the build");
        });
      },
    },
    {
      name: "131/03 task01+05 — an unanswered primary ask parks at the bound, the loop halts on it, and the account prints the ask and how to answer it",
      async run() {
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const driver = watcherDriver([{ outcome: "needs-input" }]);
          const lines = [];
          const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.stop, "session-needs-input");
          assert.equal(state.act.producer, "driver:needs-input");
          assert.equal(state.act.ref, "03/01");
          const run = (await readRuns(await storyOf(fx)))[0];
          assert.equal(run.state, "running", "the run is still running");
          assert.ok(run.asks[0].parkedAt && run.asks[0].answeredAt == null, "with one parked ask");
          const haltAt = lines.findIndex((line) => line.includes(" — halted on session-needs-input at 03/01 (producer driver:needs-input). Resume with: aof work loop 03 --resume"));
          assert.ok(haltAt > -1, lines.join("\n"));
          const halt = lines[haltAt];
          assert.match(halt, new RegExp(`parked=\\[\\{"ref":"03/01","runId":"${run.runId}","sessionId":"session-1","askedAt":"[^"]+"\\}\\]`, "u"), "the halt line names the parked entry in four keys");
          assert.ok(!halt.includes("split 03"), "…and not the question");
          assert.deepEqual(lines.slice(haltAt + 1), ["  Decision needed: split 03?", "", "  Options: A or B", '  answer: aof work answer 03/01 "…"'], "the ask block follows the halt line");
          assert.ok(lines.some((line) => line.startsWith("03/01 — parked, unanswered (build, ") && line.endsWith("): Decision needed: split 03? Options: A or B")), "the parked row");
          assert.equal(posts.filter((p) => p.content.includes("waiting on you")).length, 1);
          assert.equal(posts.filter((p) => p.content.includes("parked, unanswered")).length, 1);
        });
      },
    },
    {
      name: "131/03 task05 — --quiet keeps the account and drops the rows; no row carries a CR or an ESC byte",
      async run() {
        await withPrimary(async ({ fx, env, fetch }) => {
          const driver = watcherDriver([{ outcome: "needs-input" }]);
          const lines = [];
          await runLoopBody({ scope: "03", quiet: true }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.ok(!lines.some((line) => line.includes("waiting on you") || line.includes("parked, unanswered")), lines.join("\n"));
          assert.equal(lines.filter((line) => line.includes("halted on session-needs-input")).length, 1);
          assert.equal(lines.filter((line) => line === '  answer: aof work answer 03/01 "…"').length, 1);
          assert.ok(lines.every((line) => !line.includes("\r") && !line.includes(String.fromCharCode(27))));
        });
      },
    },
    {
      name: "131/03 task05 — the block prints each parked question indented, blank lines blank, then how to answer it (six rows)",
      run() {
        for (const [entries, lines] of [
          [[{ ref: "03/01", askedAt: "a", question: "Decision needed: split 03?\n\nOptions: A or B" }], ["  Decision needed: split 03?", "", "  Options: A or B", '  answer: aof work answer 03/01 "…"']],
          [[{ ref: "03/01", askedAt: "a", question: null }], ['  answer: aof work answer 03/01 "…"']],
          [[{ ref: "03/01", askedAt: "a", question: "a\r\nb" }], ["  a", "  b", '  answer: aof work answer 03/01 "…"']],
          [[{ ref: "03/01", askedAt: "a", question: "Options:\n  - A\n   \n  - B" }], ["  Options:", "    - A", "", "    - B", '  answer: aof work answer 03/01 "…"']],
          [[{ ref: "03/01", runId: "R1", askedAt: "2026-09-23T10:00:00.000Z", question: "Q1" }, { ref: "03/02", runId: "R2", askedAt: "2026-09-23T09:00:00.000Z", question: "Q2" }], ["  Q2", '  answer: aof work answer 03/02 "…"', "  Q1", '  answer: aof work answer 03/01 "…"']],
          [[{ ref: "07/01", askedAt: "a", question: "Q" }], ["  Q", '  answer: aof work answer 07/01 "…"']],
        ]) {
          assert.deepEqual(askBlockLines(entries), lines, JSON.stringify(entries));
        }
      },
    },
    {
      name: "131/03 task01 — a stop standing when the drive settles opens no ask; a stop during the wait parks it and halts on the stop",
      async run() {
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const source = fakeStopSource();
          const driver = watcherDriver([{ outcome: "needs-input" }], { onCommand: () => source.raise(1, "stop-request") });
          const lines = [];
          const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, stopSource: source, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.stop, "operator-interrupt");
          assert.match(lines.findLast((line) => line.includes("halted on")), /sessionId=session-1/u);
          const run = (await readRuns(await storyOf(fx)))[0];
          assert.equal(await readAsk(loopAsksDir(), run.runId), null, "no ask file exists");
          assert.equal(posts.length, 0);
        });
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const source = fakeStopSource();
          const driver = watcherDriver([{ outcome: "needs-input" }]);
          let checks = 0;
          const wait = { now: () => new Date(), next: async () => { checks += 1; if (checks === 2) source.raise(1, "stop-request"); }, read: (runId) => readAsk(loopAsksDir(), runId), expired: () => false };
          const lines = [];
          const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, askWait: wait, stopSource: source, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.stop, "operator-interrupt");
          const run = (await readRuns(await storyOf(fx)))[0];
          assert.equal((await readAsk(loopAsksDir(), run.runId)).state, "parked");
          const halt = lines.findLast((line) => line.includes("halted on"));
          assert.match(halt, /sessionId=session-1/u);
          assert.match(halt, /parked=\[\{"ref":"03\/01"/u);
          assert.deepEqual(posts.map((p) => p.content.includes("waiting on you")), [true], "only session-needs-input was sent");
          assert.ok(lines.includes('  answer: aof work answer 03/01 "…"'), "the ask block follows the stop's halt too");
        });
      },
    },
    {
      name: "131/03 task01 — the retry ladder's drive waits the same way, re-driving the retried attempt under its own run",
      async run() {
        await withPrimary(async ({ fx, env, fetch, workspaceId }) => {
          const driver = watcherDriver([{ outcome: "failed", failureReason: "timeout" }, { outcome: "needs-input" }, { outcome: "done" }], { onCommand: moveOnVerify(fx) });
          const lines = [];
          const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, askWait: answeringWait(workspaceId, "go"), notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.act, "done", lines.join("\n"));
          const runs = await readRuns(await storyOf(fx));
          const retried = runs.find((run) => run.asks.length > 0);
          assert.equal(retried.attempt, 2, "the attempt that asked is the retried one");
          assert.equal(retried.state, "done", "settled done once");
          assert.equal(runs.filter((run) => run.brief?.loop?.phase === "continue").length, 2, "no attempt 3 was minted");
          const third = driver.spawnCalls[2].args;
          assert.deepEqual(third.slice(third.indexOf("--resume"), third.indexOf("--resume") + 2), ["--resume", "session-2"]);
          assert.equal(driver.typed[2], "go");
        });
      },
    },
    {
      name: "131/03 task01 — a park at any primary site halts on the question and keeps the resume command (three rows)",
      async run() {
        for (const [site, script, attempt, phase] of [
          ["the refine drive", [{ outcome: "needs-input" }], 1, "continue"],
          ["attempt 2 of the build", [{ outcome: "failed", failureReason: "timeout" }, { outcome: "needs-input" }], 2, "continue"],
          ["the verify drive", [{ outcome: "done" }, { outcome: "needs-input" }], 1, "verify"],
        ]) {
          await withPrimary(async ({ fx, env, fetch }) => {
            const driver = watcherDriver(script);
            const lines = [];
            const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
            assert.equal(state.act.stop, "session-needs-input", `${site}: ${lines.join("\n")}`);
            const halt = lines.find((line) => line.startsWith("03 — halted on session-needs-input at 03/01 (producer driver:needs-input). Resume with: aof work loop 03 --resume"));
            assert.ok(halt, `${site}: the halt line`);
            const waiting = (await readRuns(await storyOf(fx))).find((run) => run.asks.length > 0);
            assert.equal(waiting.brief.loop.phase, phase, `${site}: the run that parked`);
            assert.equal(waiting.attempt, attempt, `${site}: its attempt`);
            assert.equal(waiting.state, "running", `${site}: still running`);
            assert.ok(halt.includes(`"runId":"${waiting.runId}"`), `${site}: Details.parked names that run`);
          });
        }
      },
    },
    {
      name: "131/03 task06 — the halt envelope names the scope, the stop, its producer and the halting ref, with the resume command",
      async run() {
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const driver = watcherDriver([{ outcome: "failed", failureReason: "agent_error" }]);
          await runLoopLaunch({ scope: "03", startedAt: "2026-09-23T17:00:00.000Z", now: "2026-09-23T18:30:00.000Z" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: () => {} });
          assert.equal(posts.length, 1);
          assert.deepEqual(posts[0].content.split("\n"), ["**03 — loop halted on run-not-retryable at 03/01**", "Resume: `aof work loop 03 --resume`"]);
        });
      },
    },
    {
      name: "131/03 task01 — an answer rides only the run that waited for it (three rows)",
      async run() {
        const fx = await loopFixture();
        try {
          const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
          const { record } = await transitionRunStart(item, { now: new Date().toISOString() });
          const seen = [];
          const registry = { "work:drive-continue": async (input, ctx) => { seen.push(ctx.loopDrive); return { outcome: "done" }; } };
          const ctx = { ...fx.ctx, invokeRegistered: async (id, input, c) => registry[id](input, c) };
          const answer = { runId: record.runId, sessionId: "S1", text: "go" };
          await drivePhase({ ref: "03/01", phase: "continue", cycle: 1, declaration: {}, brief: {}, retryRecord: record, answer }, ctx);
          await drivePhase({ ref: "03/01", phase: "continue", cycle: 1, declaration: {}, brief: {}, retryRecord: record, answer, fix: { buildRun: record } }, ctx);
          assert.deepEqual(seen.map((loopDrive) => ({ runId: loopDrive.runId, answer: loopDrive.answer, fix: loopDrive.fix })), [
            { runId: record.runId, answer, fix: undefined },
            { runId: record.runId, answer, fix: undefined },
          ]);
          assert.equal((await readRuns(item)).length, 1, "no run was minted");
          await assert.rejects(drivePhase({ ref: "03/01", phase: "continue", cycle: 1, declaration: {}, brief: {}, answer }, ctx), TypeError);
          assert.equal(seen.length, 2, "the driver was never called for an answer with no retryRecord");
        } finally {
          await fx.cleanup();
        }
      },
    },
    {
      name: "131/03 task06 — a halt is announced once after the account; a halt on a question, a finished loop and an L1 report are not",
      async run() {
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const driver = watcherDriver([{ outcome: "failed", failureReason: "agent_error" }, { outcome: "failed", failureReason: "agent_error" }, { outcome: "failed", failureReason: "agent_error" }]);
          const lines = [];
          let linesAtPost = null;
          const spy = async (url, init) => { linesAtPost = lines.length; return fetch(url, init); };
          const state = await runLoopLaunch({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch: spy }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.stop, "run-not-retryable");
          assert.equal(posts.length, 1);
          assert.ok(posts[0].content.startsWith("**03 — loop halted on run-not-retryable at 03/01**"), posts[0].content);
          assert.equal(linesAtPost, lines.length, "the post came after the last report line");
        });
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const driver = watcherDriver([{ outcome: "needs-input" }]);
          await runLoopLaunch({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: () => {} });
          assert.equal(posts.filter((p) => p.content.includes("loop halted")).length, 0, "a halt on a question is not announced again");
          assert.equal(posts.length, 2, "session-needs-input and session-parked-unanswered");
        });
        await withPrimary(async ({ fx, env, posts, fetch }) => {
          const driver = watcherDriver([], { onCommand: moveOnVerify(fx) });
          const state = await runLoopLaunch({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: () => {} });
          assert.equal(state.act.act, "done");
          assert.equal(posts.length, 0, "a finished loop announces nothing of its own");
          await runLoopLaunch({ scope: "03", level: "L1" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, report: () => {} });
          assert.equal(posts.length, 0, "an L1 report announces nothing");
        });
      },
    },
    {
      name: "131/03 task06 — a failing notify changes nothing, and a body that throws announces nothing",
      async run() {
        await withPrimary(async ({ fx, env }) => {
          const failing = async () => { throw new TypeError("down"); };
          const driver = watcherDriver([{ outcome: "failed", failureReason: "agent_error" }, { outcome: "failed", failureReason: "agent_error" }, { outcome: "failed", failureReason: "agent_error" }]);
          const state = await runLoopLaunch({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch: failing }, agentSessionDriverOptions: { ...driver.options, env }, report: () => {} });
          assert.equal(state.act.stop, "run-not-retryable");
        });
        await withPrimary(async ({ fx, posts, fetch }) => {
          const ctx = { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, invokeRegistered: async () => { throw new TypeError("mid-walk"); }, report: () => {} };
          await assert.rejects(runLoopLaunch({ scope: "03" }, ctx), TypeError);
          assert.equal(posts.length, 0);
        });
      },
    },
    {
      name: "131/03 task04 — a primary run waiting on a human is re-entered before the walk: the answer re-drives its own session, no retry is minted, and the walk goes on",
      async run() {
        await withPrimary(async ({ fx, env, posts, fetch, workspaceId }) => {
          const first = watcherDriver([{ outcome: "needs-input" }]);
          const parked = await runLoopBody({ scope: "03" }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...first.options, env }, report: () => {} });
          assert.equal(parked.act.stop, "session-needs-input", "guard: the first walk parked 03/01");
          const run = (await readRuns(await storyOf(fx)))[0];
          await recordSessionId(await storyOf(fx), { runId: run.runId, sessionId: "session-1" });
          await answerAsk(loopAsksDir(), { workspaceId, ref: "03/01", text: "split it", by: { actor: "you", via: "cli", node: null }, now: () => new Date() });
          const noticesBefore = posts.length;
          const driver = watcherDriver([{ outcome: "done" }], { onCommand: moveOnVerify(fx) });
          const lines = [];
          const state = await runLoopBody({ scope: "03", resume: true }, { ...fx.ctx, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: (line) => lines.push(line) });
          assert.equal(state.act.act, "done", lines.join("\n"));
          const args = driver.spawnCalls[0].args;
          assert.deepEqual(args.slice(args.indexOf("--resume"), args.indexOf("--resume") + 2), ["--resume", "session-1"]);
          assert.equal(driver.typed[0], "split it");
          const runs = await readRuns(await storyOf(fx));
          const redriven = runs.find((r) => r.runId === run.runId);
          assert.equal(redriven.state, "done", "the re-entered run settled done under its own record");
          assert.equal(redriven.attempt, run.attempt, "at the same attempt");
          assert.equal(runs.filter((r) => r.brief?.loop?.phase === "continue").length, 1, "no retry was minted");
          assert.equal(posts.slice(noticesBefore).filter((p) => p.content.includes("waiting on you")).length, 0, "the operator was not asked twice");
        });
      },
    },
    {
      name: "131/03 task06 — the next invocation reports a loop that died, or was relaunched, and never a wait",
      async run() {
        for (const [label, { supervised = false, ask = null, fresh = false }, expected] of [
          ["died", {}, "loop-died"],
          ["relaunched", { supervised: true }, "loop-relaunched"],
          ["waiting on a human", { ask: "open" }, null],
          ["parked and supervised", { ask: "parked", supervised: true }, null],
          ["answered", { ask: "answered" }, "loop-died"],
          ["fresh", { fresh: true }, null],
        ]) {
          await withPrimary(async ({ fx, env, posts, fetch }) => {
            const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
            const loop = { loopRunId: "L-dead", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-23T12:00:00.000Z", id: "id", supervised };
            const { record } = await transitionRunStart(item, { brief: { loop }, now: fresh ? new Date().toISOString() : "2026-09-23T12:00:00.000Z" });
            await recordSessionId(item, { runId: record.runId, sessionId: "session-dead", now: fresh ? new Date().toISOString() : "2026-09-23T12:00:00.000Z" });
            if (ask != null) {
              await openRunAsk(item, record.runId, { question: "Q", phase: "build", now: "2026-09-23T12:05:00.000Z" });
              if (ask === "parked") await parkRunAsk(item, record.runId, { now: "2026-09-23T12:10:00.000Z" });
            }
            if (ask === "answered") await answerRunAsk(item, record.runId, { answer: "b", by: "you", now: "2026-09-23T12:20:00.000Z" });
            const logs = loopDiagLogDir();
            await mkdir(logs, { recursive: true });
            await writeFile(path.join(logs, "loop-diag.03.2026-09-23T15-00-00-000Z.log"), "2026-09-23T15:00:00.000Z signal SIGHUP\n");
            const driver = watcherDriver([], { onCommand: moveOnVerify(fx) });
            // A fresh running run walls the walk's own mint (duplicate-run) — a refusal that predates
            // this story. The row asks only whether a death was announced before the walk.
            await runLoopLaunch({ scope: "03", resume: true, now: "2026-09-23T15:30:00.000Z" }, { ...fx.ctx, askWait: { now: () => new Date(), next: async () => {}, read: async () => ({ state: "answered", answer: "b", by: null }), expired: () => false }, notifyOptions: { env: { HOOK }, fetch }, agentSessionDriverOptions: { ...driver.options, env }, report: () => {} }).catch((error) => { if (!fresh || error?.code !== "duplicate-run") throw error; });
            const deaths = posts.filter((p) => /loop (died|relaunched)/u.test(p.content));
            if (expected == null) {
              assert.equal(deaths.length, 0, label);
            } else {
              assert.equal(deaths.length, 1, `${label}: ${posts.map((p) => p.content).join(" | ")}`);
              assert.ok(deaths[0].content.startsWith(`**03 — ${expected === "loop-died" ? "loop died" : "loop relaunched"}**`), label);
              assert.ok(deaths[0].content.includes("signal SIGHUP"), `${label}: the cause is the last diag line`);
            }
          });
        }
      },
    },
  ];
}
