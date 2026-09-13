import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { runLoopBody, renderLoopState } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import { readRuns } from "../../src/run-store.mjs";
import { seedActive, withItemLockFixture } from "../support/item-lock-fixture.mjs";

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
          assert.equal(runs[0].state, "running", "the interrupted run stays resumable");
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
];
