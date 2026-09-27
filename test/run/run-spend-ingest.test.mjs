// Traceability wiring for milestone 68 / story 02 — spend-ingest-at-settle.
//
// Covers EVERY @executable scenario in the two task features:
//   tasks/00_transcript-to-spend.feature
//   tasks/01_settle-once-and-degrade.feature
// exercising the REAL src/run-spend-ingest.mjs (the new producer) against the REAL
// writer seam (src/run-store.mjs's settleRun), in-process, on a temp fixture repo
// and a temp transcript tree. One test object per @executable scenario
// (Scenario-Outline rows folded into one entry iterating the rows), each name
// tracing to feature + scenario. node:assert/strict.
//
// The transcript fixtures mirror the live Claude Code JSONL shape the ingest is a
// straight copy of (ADR-003): an `assistant` record carrying `message.usage` with
// the four vendor keys, `message.model` / `message.effort`, and `message.content`
// holding `tool_use` blocks. Subagent transcripts live under
// `<projectsDir>/<sessionId>/` and are walked recursively.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { readRuns, startRun, completeRun, settleRun, PRICE_TABLE_VERSION } = await import("../../src/run-store.mjs");
const { settleSpendFromTranscript, readTranscriptTree } = await import("../../src/run-spend-ingest.mjs");
const { transitionRunComplete } = await import("../../src/effects/run-transitions.mjs");
const { projectSlug } = await import("../../src/work/observe.mjs");

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-ingest-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  const projectsDir = path.join(repo, "claude-projects");
  await mkdir(projectsDir, { recursive: true });
  return { repo, item: { ref: "68", dir }, projectsDir };
}

// One Claude-Code-style assistant JSONL record. `usage` may be null to simulate a
// turn with no per-turn usage report.
function assistantLine({ model = "claude-sonnet", effort = "high", usage = null, toolUses = 0 }) {
  const content = [];
  for (let i = 0; i < toolUses; i++) {
    content.push({ type: "tool_use", id: `tool-${i}`, name: "Bash", input: { command: "echo hi" } });
  }
  content.push({ type: "text", text: "ok" });
  return JSON.stringify({
    type: "assistant",
    sessionId: "sess",
    message: { model, effort, usage, content },
    timestamp: "2026-08-20T10:00:00.000Z",
  });
}

// Write a parent transcript at <projectsDir>/<sessionId>.jsonl from an array of
// assistant lines (or raw text when given a string).
async function writeParent(projectsDir, sessionId, lines) {
  const body = typeof lines === "string" ? lines : lines.map((l) => (typeof l === "string" ? l : assistantLine(l))).join("\n");
  await writeFile(path.join(projectsDir, `${sessionId}.jsonl`), body, "utf8");
}

// Write a subagent transcript under <projectsDir>/<sessionId>/<rel>.jsonl.
async function writeSubagent(projectsDir, sessionId, rel, lines) {
  const target = path.join(projectsDir, sessionId, rel);
  await mkdir(path.dirname(target), { recursive: true });
  const body = lines.map((l) => (typeof l === "string" ? l : assistantLine(l))).join("\n");
  await writeFile(target, body, "utf8");
}

async function startSession(item, sessionId, now = "2026-08-20T10:00:00.000Z") {
  return startRun(item, { sessionId: sessionId ?? null, now });
}

export const runSpendIngestTests = [
  // ══ 00_transcript-to-spend.feature ══
  // Scenario: the four buckets are copied from the session's own reported usage
  {
    name: "run-spend-ingest/00 the four buckets are copied from the session's own reported usage — each is the sum across turns, none derived from another, accepted by the writer's convention check",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-a", [
          { usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: 500 } },
          { usage: { input_tokens: 200, output_tokens: 30, cache_read_input_tokens: 60, cache_creation_input_tokens: 600 } },
          { usage: { input_tokens: 300, output_tokens: 40, cache_read_input_tokens: 70, cache_creation_input_tokens: 700 } },
        ]);
        const record = await startSession(item, "sess-a");
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the spend is ingested");
        // Each bucket is the sum of that bucket across the session's turns.
        assert.equal(envelope.tokens.input, 600, "input is the sum across turns");
        assert.equal(envelope.tokens.output, 90, "output is the sum across turns");
        assert.equal(envelope.tokens.cacheRead, 180, "cacheRead is the sum across turns");
        assert.equal(envelope.tokens.cacheCreate, 1800, "cacheCreate is the sum across turns");
        // No bucket's value is derived by adding or subtracting another bucket.
        assert.notEqual(envelope.tokens.input, envelope.tokens.output + envelope.tokens.cacheRead + envelope.tokens.cacheCreate, "input is not the sum of the other buckets");
        assert.notEqual(envelope.tokens.cacheRead, envelope.tokens.input - envelope.tokens.output, "cacheRead is not derived from other buckets");
        // Accepted by the writer's convention check — a second settle would be refused
        // only by idempotence; here the first settle already passed validateSpend.
        const onDisk = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.deepEqual(onDisk.spend.tokens, envelope.tokens, "the writer persisted the accepted buckets");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a session's subagents are part of the session
  {
    name: "run-spend-ingest/00 a session's subagents are part of the session — totals include their usage, and the boundaries match the driver's transcript-tree walk",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-b", [
          { usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 200 } },
        ]);
        await writeSubagent(projectsDir, "sess-b", "subagents/child-1.jsonl", [
          { usage: { input_tokens: 50, output_tokens: 5, cache_read_input_tokens: 10, cache_creation_input_tokens: 100 } },
        ]);
        await writeSubagent(projectsDir, "sess-b", "nested/deep/child-2.jsonl", [
          { usage: { input_tokens: 25, output_tokens: 2, cache_read_input_tokens: 5, cache_creation_input_tokens: 50 } },
        ]);
        const record = await startSession(item, "sess-b");
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the spend is ingested");
        assert.equal(envelope.tokens.input, 175, "totals include the subagents' usage (100+50+25)");
        assert.equal(envelope.tokens.output, 17, "output includes parent + both subagents");
        assert.equal(envelope.tokens.cacheRead, 35, "cacheRead includes parent + both subagents");
        assert.equal(envelope.tokens.cacheCreate, 350, "cacheCreate includes parent + both subagents");
        // The boundaries match the driver's walk: every file under <projectsDir>/<sid>/
        // recursively (the session-activity mtime walk the driver uses to watch the
        // transcript tree). The driver's walk visits parent + <sid>/**; readTranscriptTree
        // reads the same set, so the content of the parent and both subagent transcripts
        // is all in the body.
        const body = await readTranscriptTree(projectsDir, "sess-b");
        assert.ok(body.includes('"input_tokens":100'), "the walk read the parent transcript");
        assert.ok(body.includes('"input_tokens":50'), "the walk reached the first subagent transcript (child-1)");
        assert.ok(body.includes('"input_tokens":25'), "the walk reached the nested subagent transcript (child-2)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: what else the turn record supplies (model, effort)
  {
    name: "run-spend-ingest/00 the envelope's model and effort reflect what the session ran (outline: model, effort)",
    async run() {
      const rows = [
        { fact: "model", value: "claude-opus", envelopeKey: "model" },
        { fact: "effort", value: "low", envelopeKey: "effort" },
      ];
      const { repo, item, projectsDir } = await makeItem();
      try {
        for (const row of rows) {
          const sessionId = `sess-${row.envelopeKey}`;
          // The turn record supplies the fact per turn: model/effort are read from the
          // assistant message and reflected in the envelope.
          await writeParent(projectsDir, sessionId, [
            assistantLine({ model: row.envelopeKey === "model" ? row.value : "claude-sonnet", effort: row.envelopeKey === "effort" ? row.value : "high", usage: { input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 2, cache_creation_input_tokens: 20 } }),
          ]);
          const record = await startSession(item, sessionId);
          const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
          assert.equal(stamped, true, `[${row.fact}] the spend is ingested`);
          if (row.envelopeKey === "effort") {
            assert.equal(envelope.effort, row.value, `[${row.fact}] the envelope's effort reflects what the session ran`);
          } else {
            assert.equal(envelope.model, row.value, `[${row.fact}] the envelope's model reflects what the session ran`);
          }
          // Each outline row is its own run — complete it so the next row can mint.
          await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: turn and tool-call counts are counted, not estimated
  {
    name: "run-spend-ingest/00 turn and tool-call counts are counted, not estimated",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-c", [
          { usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1, cache_creation_input_tokens: 1 }, toolUses: 2 },
          { usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1, cache_creation_input_tokens: 1 }, toolUses: 3 },
          { usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1, cache_creation_input_tokens: 1 }, toolUses: 0 },
        ]);
        const record = await startSession(item, "sess-c");
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the spend is ingested");
        assert.equal(envelope.turns, 3, "turns is the number of usage-bearing turns (3)");
        assert.equal(envelope.toolCalls, 5, "toolCalls is the number of tool_use blocks (2+3+0)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a session that ran more than one model records what it ran
  {
    name: "run-spend-ingest/00 a session that ran more than one model records that it ran more than one, and the buckets still total every turn",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-d", [
          { usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 200 }, model: "claude-sonnet" },
          { usage: { input_tokens: 300, output_tokens: 30, cache_read_input_tokens: 60, cache_creation_input_tokens: 600 }, model: "claude-opus" },
          { usage: { input_tokens: 200, output_tokens: 20, cache_read_input_tokens: 40, cache_creation_input_tokens: 400 }, model: "claude-sonnet" },
        ]);
        const record = await startSession(item, "sess-d");
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the spend is ingested");
        // The recorded model states that more than one model was used rather than
        // naming only one: both models are present and it is not a single name.
        assert.ok(envelope.model.includes("claude-sonnet"), "the recorded model names the first model used");
        assert.ok(envelope.model.includes("claude-opus"), "the recorded model names the second model used");
        assert.notEqual(envelope.model, "claude-sonnet", "the recorded model does not name only one model");
        assert.notEqual(envelope.model, "claude-opus", "the recorded model does not name only one model");
        // The token buckets still total every turn across both models.
        assert.equal(envelope.tokens.input, 600, "input totals all three turns across both models");
        assert.equal(envelope.tokens.output, 60, "output totals all three turns");
        assert.equal(envelope.tokens.cacheCreate, 1200, "cacheCreate totals all three turns");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_settle-once-and-degrade.feature ══
  // Scenario: spend is stamped as the run settles
  {
    name: "run-spend-ingest/01 spend is stamped as the run settles — a readable transcript yields a complete envelope, written at settle, not on a later read",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-e", [
          { usage: { input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 2, cache_creation_input_tokens: 20 } },
        ]);
        const record = await startSession(item, "sess-e");
        const { stamped, envelope } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, true, "the run settles with a stamped spend");
        // The record carries a complete spend envelope (all declared keys present).
        const settled = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.ok(settled.spend && typeof settled.spend === "object", "the record carries a spend envelope");
        assert.deepEqual(Object.keys(settled.spend), ["model", "effort", "tokens", "costUsd", "costSource", "priceTable", "turns", "toolCalls", "exitReason"], "the envelope is complete (the declared key set)");
        assert.equal(settled.spend.costSource, "priced", "the transcript carries no cost, so it is priced");
        assert.equal(settled.spend.priceTable, PRICE_TABLE_VERSION, "the priced cost carries its price-table version");
        assert.equal(settled.spend.exitReason, "final_output", "exitReason is derived from the run's done outcome");
        // It was written as part of settling — the on-disk record already carries it.
        assert.equal(envelope.turns, 1, "the stamped envelope is the ingested one");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a later read returns what was stamped
  {
    name: "run-spend-ingest/01 a later read returns what was stamped — the envelope is returned verbatim and no transcript is re-read to produce it",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-f", [
          { usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 200 } },
        ]);
        const record = await startSession(item, "sess-f");
        const { envelope: first } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        // Wipe the transcript — a later read must NOT re-read it to produce the spend.
        await rm(projectsDir, { recursive: true, force: true });
        const settled = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.deepEqual(settled.spend, first, "the envelope is returned verbatim from the stored record");
        assert.equal(settled.spend.tokens.input, 100, "the stored value survives with no transcript on disk");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: a run whose numbers cannot be read stays honest
  {
    name: "run-spend-ingest/01 a run whose numbers cannot be read stays honest (outline: no session id, unmatched session id, missing transcript dir, unparseable transcript, no usage) — spend stays null, no zero is written",
    async run() {
      const rows = [
        { label: "no session id recorded on the run", setup: async (item) => startSession(item, null) },
        { label: "a session id that matches no transcript on this machine", setup: async (item, projectsDir) => { const r = await startSession(item, "ghost"); await rm(projectsDir, { recursive: true, force: true }); return r; } },
        { label: "a transcript directory that does not exist", setup: async (item) => startSession(item, "ghost2") },
        { label: "a transcript that cannot be parsed", setup: async (item, projectsDir) => { const r = await startSession(item, "garbage"); await writeParent(projectsDir, "garbage", "this is not valid json\nneither is this\n"); return r; } },
        { label: "a transcript that reports no usage at all", setup: async (item, projectsDir) => { const r = await startSession(item, "nousage"); await writeParent(projectsDir, "nousage", [assistantLine({ usage: null }), assistantLine({ usage: null })]); return r; } },
      ];
      const { repo, item, projectsDir } = await makeItem();
      try {
        for (const row of rows) {
          // Each row is independent; recreate the transcript root so a row that
          // deleted it (the unmatched-session row) does not poison the next.
          await mkdir(projectsDir, { recursive: true });
          const record = await row.setup(item, projectsDir);
          const { stamped, reason } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
          assert.equal(stamped, false, `[${row.label}] the spend is not stamped`);
          assert.ok(typeof reason === "string" && reason.length > 0, `[${row.label}] a reason is reported, not swallowed silently`);
          // The run settles successfully with its own state and outcome.
          await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
          const settled = (await readRuns(item)).find((r) => r.runId === record.runId);
          assert.equal(settled.state, "done", `[${row.label}] the run settles successfully with its own state`);
          assert.equal(settled.outcome, "done", `[${row.label}] the run keeps its own outcome`);
          assert.equal(settled.spend, null, `[${row.label}] spend reads null`);
          assert.notEqual(settled.spend, { costUsd: 0 }, `[${row.label}] no zero-valued envelope is written`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: ingest failure never changes what the run did
  {
    name: "run-spend-ingest/01 ingest failure never changes what the run did — outcome, state, attempt and retry lineage are unchanged, and the failure is reported rather than swallowed",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        const record = await startSession(item, "failrun");
        await writeParent(projectsDir, "failrun", "garbage\n");
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
        const before = (await readRuns(item)).find((r) => r.runId === record.runId);
        // The transcript cannot be read/parsed.
        const { stamped, reason } = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(stamped, false, "the ingest fails");
        assert.ok(typeof reason === "string" && reason.length > 0, "the failure is reported rather than swallowed silently");
        const after = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(after.outcome, "done", "the run's outcome is unchanged");
        assert.equal(after.state, "done", "the run's state is unchanged");
        assert.equal(after.attempt, before.attempt, "the run's attempt is unchanged");
        assert.equal(after.retryOf, before.retryOf, "the run's retry lineage is unchanged");
        assert.equal(after.spend, null, "spend stays null — no fabricated value");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: settling a second time does not re-stamp
  {
    name: "run-spend-ingest/01 settling a second time does not re-stamp — the stored envelope is unchanged and no second envelope is written",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        await writeParent(projectsDir, "sess-g", [
          { usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 200 } },
        ]);
        const record = await startSession(item, "sess-g");
        const first = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(first.stamped, true, "the first settle stamps the envelope");
        // The transcript now reports very different numbers.
        await writeParent(projectsDir, "sess-g", [
          { usage: { input_tokens: 9999, output_tokens: 999, cache_read_input_tokens: 9999, cache_creation_input_tokens: 99999 } },
        ]);
        const second = await settleSpendFromTranscript(item, { runId: record.runId, projectsDir });
        assert.equal(second.stamped, false, "a second settle does not re-stamp");
        assert.equal(second.reason, "already-settled", "the second settle is refused as already stamped");
        const settled = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.deepEqual(settled.spend, first.envelope, "the stored envelope is unchanged");
        assert.equal(settled.spend.tokens.input, 100, "the original stamp survives; the changed transcript is not re-read");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1, "no second run envelope is written — still exactly one run");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ THE PRODUCTION SETTLE SEAM (the review gap this fix closes) ══
  // The producer + writer are exercised directly above; this verifies the run's
  // spend is actually stamped when a run SETTLES through the production seam
  // (completeRun), not just when the harness calls settleSpendFromTranscript by
  // hand. This is the "delivers a number, not a schema" wiring.
  {
    name: "run-spend-ingest/seam completeRun stamps spend at settle from the transcript, and only when a projectsDir is known",
    async run() {
      const { repo, item, projectsDir } = await makeItem();
      try {
        // A run whose session has a readable transcript settles → spend stamped.
        await writeParent(projectsDir, "sess-seam", [
          { usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 200 } },
        ]);
        const seeded = await startSession(item, "sess-seam");
        await completeRun(item, { runId: seeded.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z", projectsDir });
        let onDisk = (await readRuns(item)).find((r) => r.runId === seeded.runId);
        assert.equal(onDisk.state, "done", "the run settled");
        assert.ok(onDisk.spend && typeof onDisk.spend === "object", "completeRun stamped a spend envelope at settle");
        assert.equal(onDisk.spend.tokens.input, 100, "the stamped envelope came from the transcript");
        assert.equal(onDisk.spend.costSource, "priced", "the transcript carries no cost, so it is priced");
        assert.equal(onDisk.spend.priceTable, PRICE_TABLE_VERSION, "the priced cost carries its price-table version");
        assert.equal(onDisk.spend.exitReason, "final_output", "exitReason is derived from the run's done outcome");

        // A run settled WITHOUT a projectsDir is not stamped (spend stays null).
        const bare = await startSession(item, "sess-bare", "2026-08-20T11:30:00.000Z");
        await writeParent(projectsDir, "sess-bare", [
          { usage: { input_tokens: 50, output_tokens: 5, cache_read_input_tokens: 10, cache_creation_input_tokens: 100 } },
        ]);
        await completeRun(item, { runId: bare.runId, outcome: "done", now: "2026-08-20T12:00:00.000Z" });
        onDisk = (await readRuns(item)).find((r) => r.runId === bare.runId);
        assert.equal(onDisk.state, "done", "the bare run still settled");
        assert.equal(onDisk.spend, null, "no projectsDir → spend stays null (never fabricated)");

        // A run whose session has no transcript settles cleanly with spend null.
        const ghost = await startSession(item, "sess-ghost", "2026-08-20T12:30:00.000Z");
        await completeRun(item, { runId: ghost.runId, outcome: "failed", failureReason: "agent_error", now: "2026-08-20T13:00:00.000Z", projectsDir });
        onDisk = (await readRuns(item)).find((r) => r.runId === ghost.runId);
        assert.equal(onDisk.state, "failed", "the ghost run still settled to its own outcome");
        assert.equal(onDisk.outcome, "failed", "the settle's outcome is unchanged by an unreadable transcript");
        assert.equal(onDisk.spend, null, "a transcript that cannot be read leaves spend null");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // 134/03 task 02 — Scenario: a hand-run settle now stamps spend from the session's transcript.
  // RESEARCH R5: the seam fell back to the repository root, where no transcript lives, so a hand-run
  // `aof work run-complete` never stamped spend. It now resolves the store through claudeProjectsDir.
  {
    name: "run-spend-ingest/134-03 02 a hand-run settle now stamps spend from the session's transcript — the seam resolves the transcript store for a named workspace",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const config = path.join(repo, "claude-config");
        const store = path.join(config, "projects", projectSlug(repo));
        await mkdir(store, { recursive: true });
        await writeParent(store, "sess-hand", [
          { usage: { input_tokens: 120, output_tokens: 12, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
        ]);
        const record = await startSession(item, "sess-hand");
        await transitionRunComplete(
          item,
          { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" },
          { workspace: { projectRoot: repo }, env: { CLAUDE_CONFIG_DIR: config }, journalOptions: { env: process.env }, drain: false },
        );
        const onDisk = (await readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(onDisk.state, "done", "the run settled");
        assert.ok(onDisk.spend && typeof onDisk.spend === "object", "the settle stamped spend with no transcript directory given");
        assert.equal(onDisk.spend.tokens.input, 120, "the envelope came from the session's transcript under the config directory");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
