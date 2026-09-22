import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { runLoopBody, renderLoopState } from "../../src/commands/loop.mjs";
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
import { completeRun, readRuns, retryReadiness } from "../../src/run-store.mjs";
import { LOOP_STOPS } from "../../src/work/loop.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { transitionRunStart } from "../../src/effects/run-transitions.mjs";
import { installLoopDiagnostics } from "../../src/loop-diag.mjs";
import { createStopSource, loopStopsDir, requestLoopStop, stopRequestPath } from "../../src/loop/stop-request.mjs";
import { functionBody, stripComments } from "../support/source-slice.mjs";
import { seedActive, withItemLockFixture } from "../support/item-lock-fixture.mjs";

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
  return { state, report: lines.at(-1) ?? "", lines };
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
        record("s07", "p07", result, { stop: "session-needs-input", producer: "driver:needs-input", ref: "03/01" }, /sessionId=session-1/u);
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
          await requestLoopStop(dir, { loopRunId: "L-standing", scope: "03", workspaceId: null, by: { node: "umamis-msi", pid: 4242 }, now: () => new Date("2026-09-13T12:00:00.000Z") });
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
              await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: null, by: { node: "umamis-msi", pid: 4242 }, now: () => new Date() });
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
      const record = (level) => ({ loopRunId: "x", scope: "03", workspaceId: null, level, state: "requested", requestedAt: "2026-09-13T12:00:00.000Z", escalatedAt: null, honouredAt: null, cancelled: null, by: { node: "umamis-msi", pid: 4242 } });
      const rows = [
        { level: 1, producer: "stop-request", request: record(1), details: "; request=<path>; by=umamis-msi:4242" },
        { level: 2, producer: "stop-request", request: record(2), details: "; request=<path>; by=umamis-msi:4242" },
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
      assert.ok(launch.indexOf("installLoopDiagnostics(") > -1 && launch.indexOf("installLoopDiagnostics(") < launch.indexOf("runLoopBody("), "the recorder is installed before the body runs");
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
      const request = { loopRunId: "x", scope: "03", workspaceId: null, level: 2, state: "requested", requestedAt: "2026-09-13T12:00:00.000Z", escalatedAt: "2026-09-13T12:00:01.000Z", honouredAt: null, cancelled: null, by: { node: "umamis-msi", pid: 4242 } };
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
          assert.ok(last.endsWith(`Details: signal=stop-request; level=2; request=${stopRequestPath(loopStopsDir(), state.loopRunId)}; by=umamis-msi:4242; cancelled=${run.runId}.`), last);
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
    name: "130/02 task03 the cancelled record's shape is the sixteen keys, and the store is byte-identical to FF-5307's pin",
    async run() {
      const fx = await loopFixture();
      try {
        const source = fakeStopSource();
        const driver = cancellableDriver(fx, { script: ["hold"], onCommand() { source.raise(2, "stop-request"); } });
        await runCollected({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        const [run] = await readRuns({ ref: "03/01", dir: fx.storyDir });
        assert.equal(run.state, "cancelled");
        assert.deepEqual(Object.keys(run), ["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend"]);
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
];
