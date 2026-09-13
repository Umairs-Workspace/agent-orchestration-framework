// Traceability wiring for milestone 68 / story 01 — attribution-at-spawn.
//
// Covers the @executable scenarios in the two task features that are exercised over
// the run store and the local drive command:
//   tasks/00_session-id-persisted.feature
//   tasks/01_otel-attributes-at-spawn.feature
//
// The story's scenarios that must drive the REAL mesh-worker handler (the assignment
// still receives the id, neither-update-is-conditional, and the worker spawn-path
// outline row) live in test/mesh/worker/mesh-worker-driver-session-id.test.mjs — the file that
// already imports the handler, so the milestone-53 frozen census of the handler's
// dependents stays untouched. The OTel spawn-env driver-seam scenarios live in the
// driver's own drives test file (for the same frozen-allowlist reason). This file
// covers the rest: the run-store `recordSessionId` seam (ADR-005 §1), the drive-
// command spawn path, and the no-collector completion.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { continueDriverCommand } from "../../src/commands/drive.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";

const store = await import("../../src/run-store.mjs");

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-attrib-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  return { repo, item: { ref: "68", dir } };
}

const NOW = "2026-08-20T10:00:00.000Z";

// ── a fixture for the drive command's spawn-path outline row ──
async function driveFixture() {
  const fs = await import("node:fs/promises");
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-attrib-drive-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const storyDir = path.join(workDir, "03_milestone_fixture", "stories", "01_story_ready");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await fs.writeFile(path.join(workDir, "03_milestone_fixture", "SPEC.md"), `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: in-progress
depends: []
---
# Fixture
`);
  await fs.writeFile(path.join(storyDir, "STORY.md"), `---
type: story
number: 1
slug: ready
title: Ready
parent: 3
status: in-progress
depends: []
---
# Ready
`);
  await fs.writeFile(path.join(storyDir, "tasks", "00_ready.feature"), `@executable
Feature: Ready
  Scenario: ready
    Given a fixture
    When it runs
    Then it passes
`);
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: { work: { dir: "wiki/work", autonomous: { maxAttempts: 3 } } },
  };
  const item = { ref: "03/01", dir: storyDir, type: "story" };
  return { projectRoot, workspace, item, cleanup: () => rm(projectRoot, { recursive: true, force: true }) };
}

function scriptedDriver(sessionId = "session-drive") {
  const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
  return {
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => sessionId,
      commandDelayMs: 0,
    },
  };
}

export const attributionAtSpawnTests = [
  // ═══════════════ 00_session-id-persisted.feature ═══════════════
  // Scenario: a spawned run records the session it is running as
  {
    name: "68/01 task00 a spawned run records the session it is running as — the run record's sessionId is the id, byte-identical to the one the session published",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await store.startRun(item, { now: NOW });
        assert.equal(record.sessionId, null, "the run starts with no session id recorded");
        const id = "sess-abc-123-xyz";
        await store.recordSessionId(item, { runId: record.runId, sessionId: id });
        const after = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(after.sessionId, id, "the run record's sessionId is the id the session reported");
        assert.ok(after.sessionId === id, "the id on the record is byte-identical to the one the session published");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a run whose session never reports an id stays honest
  {
    name: "68/01 task00 a run whose session never reports an id stays honest — sessionId reads null, no id invented, derived or copied",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await store.startRun(item, { now: NOW });
        // The session never publishes an id — recordSessionId is never called with a real id.
        const after = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(after.sessionId, null, "the run record's sessionId reads null");
        // Even a defensive empty-id write stays honest.
        await store.recordSessionId(item, { runId: record.runId, sessionId: "" });
        const again = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(again.sessionId, null, "an empty id is recorded as null — never invented, derived from a path, or copied from another run");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the id is written once and not churned
  {
    name: "68/01 task00 the id is written once and not churned — reporting the same id again leaves the record unchanged and the state/attempt/retry lineage untouched",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await store.startRun(item, { now: NOW });
        await store.recordSessionId(item, { runId: record.runId, sessionId: "sess-once" });
        const first = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        const firstUpdatedAt = first.updatedAt;
        const firstState = first.state;
        const firstAttempt = first.attempt;
        const firstRetryOf = first.retryOf;

        // The same id is reported again mid-run.
        await store.recordSessionId(item, { runId: record.runId, sessionId: "sess-once" });
        const second = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(second.sessionId, "sess-once", "the record's sessionId is unchanged");
        assert.equal(second.updatedAt, firstUpdatedAt, "the id is not churned — a byte-identical re-report rewrites nothing (updatedAt untouched)");
        assert.equal(second.state, firstState, "the run's state is untouched");
        assert.equal(second.attempt, firstAttempt, "the run's attempt is untouched");
        assert.equal(second.retryOf, firstRetryOf, "the run's retry lineage is untouched");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: which spawn paths record the id — the local drive command
  {
    name: "68/01 task00 outline the local drive command records the id — a run started through work:drive carries the session id its session published",
    async run() {
      const fx = await driveFixture();
      try {
        const driver = scriptedDriver("session-drive-path");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const runs = await store.readRuns(fx.item);
        assert.equal(runs.length, 1, "the drive command mints a run record");
        assert.equal(runs[0].sessionId, "session-drive-path", "the drive command's run record carries the session id its session published");
        assert.equal(runs[0].state, "done", "the drive run settles done");
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ═══════════════ 01_otel-attributes-at-spawn.feature ═══════════════
  // Scenario: every figure this milestone produces is correct with no collector running
  {
    name: "68/01 task01 every figure this milestone produces is correct with no collector running — a full run settles and reports with no OTLP endpoint anywhere in the path",
    async run() {
      // Nothing in this process's environment points at a collector, and nothing in the
      // run path waits on, retries against, or fails because of one.
      assert.equal(process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "", "", "no OTLP collector endpoint is configured in the environment");
      const { repo, item } = await makeItem();
      try {
        const record = await store.startRun(item, { now: NOW });
        await store.recordSessionId(item, { runId: record.runId, sessionId: "sess-nocollector" });
        await store.settleRun(item, {
          runId: record.runId,
          spend: {
            model: "claude-sonnet",
            effort: "high",
            tokens: { input: 1000, output: 200, cacheRead: 50000, cacheCreate: 900000 },
            costUsd: 1.23,
            costSource: "priced",
            priceTable: "v1",
            turns: 5,
            toolCalls: 3,
            exitReason: "final_output",
          },
          now: "2026-08-20T11:00:00.000Z",
        });
        await store.completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:05:00.000Z" });
        const run = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        // Spend, attribution and per-phase reporting are complete with NO collector.
        assert.equal(run.sessionId, "sess-nocollector", "attribution is complete (the run carries its session id)");
        assert.equal(run.spend.costUsd, 1.23, "spend is complete");
        assert.equal(run.spend.exitReason, "final_output", "the phase/exit reporting is complete");
        assert.equal(run.state, "done", "the run settled done");
        // The structural half — no src module is a receiver — is FF-6808's lane.
        assert.ok(!("otlp" in run) && !("collector" in run), "the run record carries no collector dependency key");
        assert.ok(!("otlp" in run.spend) && !("collector" in run.spend), "the spend envelope carries no collector dependency key");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
