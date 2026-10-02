import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 70 / story 01 — cache-stable-launch, the
// drive-path and record-report scenarios of tasks 00/01/02 (ADR-004, ADR-005).
//
// The launch-argv/env seam scenarios (the stable-prefix flag, the chosen model/effort
// argv, the held 1-hour cache-window env) live in the driver's own drives test file —
// the file the milestone-53 census already admits to name the driver seam. THIS file
// covers what is observable through the real drive command and the run record: that a
// phase drive resolves and passes the per-phase session model/effort, and that a run
// spawned with an explicit model and effort settles spend recording the passed values.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const continueDriverCommand = _aofApplication.getCommand("work:drive-continue");
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";

const store = await Promise.resolve(Object.freeze({
  COST_SOURCES: _aofApplication.execution.runs.COST_SOURCES,
  DEFAULT_PARK_MINUTES: _aofApplication.execution.runs.DEFAULT_PARK_MINUTES,
  EXIT_REASONS: _aofApplication.execution.runs.EXIT_REASONS,
  PRICE_TABLE_VERSION: _aofApplication.execution.runs.PRICE_TABLE_VERSION,
  SPEND_ENVELOPE_KEYS: _aofApplication.execution.runs.SPEND_ENVELOPE_KEYS,
  TOKEN_BUCKET_KEYS: _aofApplication.execution.runs.TOKEN_BUCKET_KEYS,
  answerRunAsk: _aofApplication.execution.runs.answerRunAsk,
  applyTransition: _aofApplication.execution.runs.applyTransition,
  completeRun: _aofApplication.execution.runs.completeRun,
  heartbeat: _aofApplication.execution.runs.heartbeat,
  isLegalTransition: _aofApplication.execution.runs.isLegalTransition,
  isRetryable: _aofApplication.execution.runs.isRetryable,
  isRunning: _aofApplication.execution.runs.isRunning,
  isStale: _aofApplication.execution.runs.isStale,
  mapVendorTokensToBuckets: _aofApplication.execution.runs.mapVendorTokensToBuckets,
  openRunAsk: _aofApplication.execution.runs.openRunAsk,
  parkRunAsk: _aofApplication.execution.runs.parkRunAsk,
  parseResumeAfter: _aofApplication.execution.runs.parseResumeAfter,
  priceVendorTokens: _aofApplication.execution.runs.priceVendorTokens,
  pruneRun: _aofApplication.execution.runs.pruneRun,
  readRuns: _aofApplication.execution.runs.readRuns,
  reclaimRun: _aofApplication.execution.runs.reclaimRun,
  reclaimStaleRuns: _aofApplication.execution.runs.reclaimStaleRuns,
  recordAnchorReading: _aofApplication.execution.runs.recordAnchorReading,
  recordAnswers: _aofApplication.execution.runs.recordAnswers,
  recordSessionId: _aofApplication.execution.runs.recordSessionId,
  retryReadiness: _aofApplication.execution.runs.retryReadiness,
  retryRun: _aofApplication.execution.runs.retryRun,
  rewriteRunItemRef: _aofApplication.execution.runs.rewriteRunItemRef,
  runNodeRecordPath: _aofApplication.execution.runs.runNodeRecordPath,
  runRecordPath: _aofApplication.execution.runs.runRecordPath,
  runsDir: _aofApplication.execution.runs.runsDir,
  settleRun: _aofApplication.execution.runs.settleRun,
  settleRunFromVendor: _aofApplication.execution.runs.settleRunFromVendor,
  staleRunningRuns: _aofApplication.execution.runs.staleRunningRuns,
  startRun: _aofApplication.execution.runs.startRun,
  shouldRetry: _aofApplication.execution.runs.shouldRetry,
}));

// ── a drive fixture with a session model/effort config ──
async function driveFixture({ session }) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-csl-drive-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const storyDir = path.join(workDir, "03_milestone_fixture", "stories", "01_story_ready");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  const config = { work: { dir: "wiki/work", autonomous: { maxAttempts: 3 } } };
  if (session !== undefined) config.work.agents = { session };
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config,
  };
  const item = { ref: "03/01", dir: storyDir, type: "story" };
  return { projectRoot, workspace, item, cleanup: () => rm(projectRoot, { recursive: true, force: true }) };
}

function scriptedDriver(sessionId = "session-csl") {
  const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
  return {
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => sessionId,
      commandDelayMs: 0,
    },
    spawnCalls: fake.spawnCalls,
  };
}

export const cacheStableLaunchTests = [
  // ═══════════ 01_model-and-effort-chosen.feature — the drive path ═══════════
  // Scenario Outline: resolving the session model per phase, through the local drive
  // command (one of the driver's two production callers).
  {
    name: "70/01 task01 outline the drive command passes the phase's session model — a continue drive with a session config resolves and passes the continue model/effort through to the launch",
    run: async () => {
      const fx = await driveFixture({ session: { models: { continue: "claude-opus-4-1" }, effort: { continue: "high" } } });
      try {
        const driver = scriptedDriver("session-drive-csl");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const args = driver.spawnCalls[0].args;
        assert.equal(args[args.indexOf("--model") + 1], "claude-opus-4-1", "the drive command passed the continue phase's model");
        assert.equal(args[args.indexOf("--effort") + 1], "high", "the drive command passed the continue phase's effort");
      } finally {
        await fx.cleanup();
      }
    },
  },
  // Scenario: an unconfigured phase launches exactly as it does today (drive path).
  // Story 141/00 moved the effort half: an unset effort now resolves to the `high` default,
  // so the model half is what stays absent.
  {
    name: "70/01 task01 an unconfigured drive launches exactly as it does today — no session config → the drive passes no --model, and the default --effort high (141/00)",
    run: async () => {
      const fx = await driveFixture({});
      try {
        const driver = scriptedDriver("session-drive-none");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const args = driver.spawnCalls[0].args;
        assert.equal(args.includes("--model"), false, "no --model is passed");
        assert.equal(args[args.indexOf("--effort") + 1], "high", "the unset effort launches at the high default (141/00)");
      } finally {
        await fx.cleanup();
      }
    },
  },
  // Scenario: what was chosen is what the record reports
  {
    name: "70/01 task01 what was chosen is what the record reports — a phase spawned with an explicit model and effort settles spend that records the passed model and effort",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-csl-ingest-"));
      const dir = path.join(repo, "wiki", "work", "70_milestone_warm-start");
      await mkdir(dir, { recursive: true });
      const projectsDir = path.join(repo, "claude-projects");
      await mkdir(projectsDir, { recursive: true });
      const item = { ref: "70", dir };
      try {
        const passed = { model: "claude-opus-4-1", effort: "high" };
        // The session runs on what was passed, so its transcript reports it; the ingest
        // records it. This is the "chosen, not inherited" alignment ADR-005 names.
        const record = await store.startRun(item, { sessionId: "sess-csl", now: "2026-08-20T10:00:00.000Z" });
        const assistant = JSON.stringify({
          type: "assistant",
          sessionId: "sess-csl",
          effort: passed.effort,
          message: {
            model: passed.model,
            usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: 500 },
            content: [{ type: "text", text: "ok" }],
          },
          timestamp: "2026-08-20T10:00:00.000Z",
        });
        await writeFile(path.join(projectsDir, "sess-csl.jsonl"), assistant, "utf8");
        const { settleSpendFromTranscript } = await Promise.resolve(Object.freeze({
  readTranscriptTree: _aofApplication.execution.runSpendIngest.readTranscriptTree,
  settleSpendFromTranscript: _aofApplication.execution.runSpendIngest.settleSpendFromTranscript,
  snapshotTranscriptTree: _aofApplication.execution.runSpendIngest.snapshotTranscriptTree,
}));
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the spend is ingested");
        assert.equal(envelope.model, passed.model, "the recorded model is the one that was passed");
        assert.equal(envelope.effort, passed.effort, "the recorded effort is the one that was passed");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
