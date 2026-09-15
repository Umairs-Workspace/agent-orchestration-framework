import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  composeFixInput,
  phaseCommand,
  PHASE_MODE_FLAGS,
  continueDriverCommand,
  refineDriverCommand,
  verifyDriverCommand,
} from "../../src/commands/drive.mjs";
// The driver is reached through the SINK, as every loop suite reaches it (53/ADR-015 §2: the set
// of test files that NAME the driver module is closed; the sink re-exports its bindings by identity).
import { driveInteractiveClaudeSession } from "../../src/mesh/worker-execution.mjs";
import { spawnLaneDrive } from "../../src/loop/child-drive.mjs";
import { setSeaSentinelForTest } from "../../src/asset-base.mjs";
import { DEFAULT_DEADLINE_MS } from "../../src/work-audit/spawn.mjs";
import { parseSpecArgv } from "../../src/spine/face.mjs";
import { spawnSyncHardened } from "../support/cli-spawn.mjs";
import { transitionRunStart } from "../../src/effects/run-transitions.mjs";
import { fixTransport } from "../../src/commands/loop.mjs";
import { SOURCE_DIRECTORY_EXEMPTIONS, FLAT_LAYER_THRESHOLD } from "../arch/testing/acd-source-directory-budget.test.mjs";
import { continueCommand, refineDoorCommand, verifyDoorCommand } from "../../src/commands/continue.mjs";
import { readRuns, recordSessionId } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

// The bracketed-paste protocol bytes, built here from char codes rather than
// imported: they are a TERMINAL PROTOCOL constant (like the carriage return that
// submits), not an export of the driver - and the driver's export set is frozen at
// seventeen by an enforced gate. Asserting them here is what keeps the gate honest.
const ESC = String.fromCharCode(27);
const BRACKETED_PASTE_START = `${ESC}[200~`;
const BRACKETED_PASTE_END = `${ESC}[201~`;
// The Enter byte the driver submits with (carriage return, never line feed).
const SUBMIT_KEY = String.fromCharCode(13);
import { claudeProjectsDir } from "../../src/work/observe.mjs";

const DECLARED_DONE_TRANSCRIPT_LINE = "AOF_DIRECTIVE_COMPLETE";
const DECLARED_DONE_IDLE_MS = 10_000;

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-loop-drive-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const storyDir = path.join(workDir, "03_milestone_fixture", "stories", "01_story_ready");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(path.join(workDir, "03_milestone_fixture", "SPEC.md"), `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: in-progress
depends: []
---
# Fixture
`);
  await writeFile(path.join(storyDir, "STORY.md"), `---
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
  await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), `@executable
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
  return { projectRoot, workspace, cleanup: () => rm(projectRoot, { recursive: true, force: true }) };
}

function scriptedDriver(outcome = "done", failureReason = undefined, sessionId = "session-drive") {
  // 70/06 - the directive now reaches the PTY as TWO writes: the body as one
  // bracketed paste, then the Enter that submits it. The double gives both views, so
  // neither is re-derived here: `rawChunk` is THE WIRE (framing included) and `chunk` is
  // THE INPUT the session received (frame already stripped). `writes` keeps the raw pair
  // so a test can assert the transport; `typed` keeps the directive BODIES, so every
  // content assertion below reads exactly as it did before.
  const writes = [];
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite: ({ chunk, rawChunk, emitExit }) => {
      writes.push(rawChunk);
      if (rawChunk === SUBMIT_KEY) {
        emitExit(outcome === "failed" ? 1 : 0);
        return;
      }
      typed.push(chunk.replace(/[\r\n]+$/u, ""));
    },
  });
  const options = {
    ptySpawn: fake.spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: async () => sessionId,
    commandDelayMs: 0,
    // the production drive wires the real 900ms settle; a scripted PTY needs none.
    submitDelayMs: 0,
    // the production drive wires the real trust pre-write; a test never touches ~/.claude.json.
    trustWorktree: async () => {},
    ...(outcome === "needs-input"
      ? { watchTranscriptCompletion: async () => ({ outcome: "needs-input" }) }
      : {}),
  };
  return { ...fake, typed, writes, options, failureReason };
}

// ── 129/02 — the drive is a child (tasks 00, 01, 03; ADR-005 §1-§4, ADR-008 §1-§2) ────────
// `COLD` — the settlement context a launch that resumed nothing reports: the projects dir the
// settle seam reads, no transcript baseline, and a spend baseline that is trivially available.
function coldSettlement(fx, env = process.env) {
  return { projectsDir: claudeProjectsDir({ cwd: fx.projectRoot, env }), transcriptBaseline: null, spendBaselineAvailable: true };
}

const TWO_FINDINGS = Object.freeze([
  { gate: "work:validate", case: "alpha", message: "alpha: missing-when" },
  { gate: "work:grade", case: "beta", message: "beta failed" },
]);

// `T` — the transport in memory, `fixTransport`'s exact shape; `F` — the same object as a file.
function fixBag(extra = {}) {
  return fixTransport({ buildRun: { runId: "b1", sessionId: "s-b1" }, findings: [...TWO_FINDINGS], ...extra });
}

async function writeFixFile(fx, name, content) {
  const file = path.join(fx.projectRoot, "loop-fixes", name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  return file;
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A fake session that stays OPEN until told: `onWrite` captures the double's `emitExit` /
// `emitData` on the directive's submit rather than exiting, so a test can hold the session
// live, end stdin or abort a signal against it, and only then let it exit. `live` resolves
// once the driver's `onPtyLive` fired (composed by the drive command with its own stdin
// gate); `written` once the directive has been typed and submitted — by then the session is
// unambiguously live. `trustWorktree` is stubbed so no test writes the real ~/.claude.json.
function heldSession({ sessionId = "sess-1", env } = {}) {
  const stops = [];
  const live = deferred();
  const written = deferred();
  const held = { emitExit: null, emitData: null };
  const fake = createFakePtySpawn({
    onWrite: ({ rawChunk, emitExit, emitData }) => {
      held.emitExit = emitExit;
      held.emitData = emitData;
      if (rawChunk === SUBMIT_KEY) written.resolve();
    },
  });
  const options = {
    ptySpawn: fake.spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: async () => sessionId,
    // The completion watch never settles a held session; it releases on the driver's abort.
    watchTranscriptCompletion: ({ signal }) => new Promise((resolve) => {
      if (signal.aborted) resolve(null);
      else signal.addEventListener("abort", () => resolve(null), { once: true });
    }),
    commandDelayMs: 0,
    submitDelayMs: 0,
    trustWorktree: async () => {},
    onSessionStop: (event) => { stops.push(event); },
    onPtyLive: () => { live.resolve(); },
    ...(env == null ? {} : { env }),
  };
  return {
    fake,
    options,
    stops,
    held,
    live: () => live.promise,
    written: () => written.promise,
    exit: (code = 0) => held.emitExit(code),
    stopPhases: () => stops.map((event) => event.phase),
  };
}

// The stdin double — a bare `Readable` in place of `process.stdin`, ended with `push(null)`.
function stdinDouble() {
  return new Readable({ read() {} });
}

async function mintRunning(fx) {
  const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
  const { record } = await transitionRunStart(item, { now: new Date().toISOString() });
  return { item, runId: record.runId };
}

// ── task 03's `spawnChild` double ─────────────────────────────────────────────────────────
// Records the command, args, cwd, env and stdio it was given and plays a scripted
// stdout/stderr/exit. `stdout` may be an array of chunks (a document split mid-key). A child
// with `exit: null` never exits on its own; its `kill()` closes it a turn later, as a real
// child's would, and its `stdin.end()` is recorded with a timestamp beside the kill's. The
// double holds the event loop while its child runs (a real child's handle would).
function laneChildDouble({ stdout = "", stderr = "", exit = { code: 0 }, throws = null } = {}) {
  const calls = [];
  const spawnChild = (command, args, options) => {
    if (throws) throw throws;
    const child = new EventEmitter();
    child.stdout = Object.assign(new EventEmitter(), { setEncoding() {} });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding() {} });
    child.stdin = { ends: [], end() { this.ends.push(Date.now()); } };
    child.kills = [];
    child.kill = (signal) => {
      child.kills.push({ signal, at: Date.now() });
      setImmediate(() => child.emit("close", null, "SIGKILL"));
    };
    const handle = setInterval(() => {}, 1_000);
    child.on("close", () => clearInterval(handle));
    calls.push({ command, args, options, child });
    setImmediate(() => {
      for (const chunk of [].concat(stdout)) if (chunk.length > 0) child.stdout.emit("data", chunk);
      for (const chunk of [].concat(stderr)) if (chunk.length > 0) child.stderr.emit("data", chunk);
      if (exit != null) child.emit("close", exit.code ?? null, exit.signal ?? null);
    });
    return child;
  };
  return { spawnChild, calls };
}

const LANE = "C:/lanes/dispatch-127-02";
const ENTRY = fileURLToPath(new URL("../../src/cli.mjs", import.meta.url));
const DOC = Object.freeze({
  ref: "127/02",
  phase: "continue",
  command: "/aof:continue 127/02",
  outcome: "done",
  sessionId: "s1",
  settlementContext: { projectsDir: "C:/p", transcriptBaseline: null, spendBaselineAvailable: true },
});
const REFUSAL = Object.freeze({ ok: false, code: "ref-not-found", error: 'No item resolves to ref "127/02".' });
// `attemptedCommand` quotes an element carrying whitespace (this machine's execPath does).
const RENDERED_EXEC_PATH = /\s/u.test(process.execPath) ? JSON.stringify(process.execPath) : process.execPath;

async function lane(overrides = {}) {
  const double = laneChildDouble(overrides.script ?? {});
  const { script: _script, ...args } = overrides;
  const answer = await spawnLaneDrive({ ref: "127/02", phase: "continue", runId: "r1", lane: LANE, spawnChild: double.spawnChild, ...args });
  return { answer, double };
}

export const driveCommandPhaseDriverTests = [
  {
    name: "loop phase drivers — each command spawns once and types only its own phase directive",
    async run() {
      const fx = await fixture();
      try {
        for (const [command, phase] of [
          [refineDriverCommand, "refine"],
          [continueDriverCommand, "continue"],
          [verifyDriverCommand, "verify"],
        ]) {
          const driver = scriptedDriver();
          const result = await command.run(
            { ref: "03/01" },
            { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
          );
          assert.equal(driver.spawnCalls.length, 1);
          assert.equal(driver.typed.length, 1, "the whole directive + brief is typed as ONE pty.write");
          // 70/06 - the transport itself, not just the content. The body arrives as ONE
          // bracketed paste (atomic against ConPTY chunking, which otherwise tore a
          // multi-line brief into eight user turns) and the Enter is a SEPARATE write
          // (an Enter inside the paste is swallowed by the end-of-paste handling and
          // never submits at all).
          assert.equal(driver.writes.length, 2, "the directive is a body write plus a separate submit");
          assert.ok(driver.writes[0].startsWith(BRACKETED_PASTE_START), "the body opens a bracketed paste");
          assert.ok(driver.writes[0].endsWith(BRACKETED_PASTE_END), "the body closes the bracketed paste");
          assert.equal(driver.writes[1], SUBMIT_KEY, "the Enter is its own write, after the paste");
          // milestone 70/00 (phase-brief) — the directive still LEADS the first input; the
          // compiled phase brief (task 02's by-value hand-off) follows it in the same write.
          assert.ok(driver.typed[0].startsWith(`/aof:${phase} 03/01`), "each command types only its own phase directive, first");
          assert.ok(driver.typed[0].includes("## TASK CONTRACTS"), "the compiled phase brief follows the directive");
          assert.equal(driver.spawnCalls[0].options.cwd, fx.projectRoot);
          assert.equal(result.outcome, "done");
          assert.equal(result.sessionId, "session-drive");
          assert.equal("where" in result, false);
          assert.equal("node" in result, false);
          assert.equal("assignmentId" in result, false);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — dry-run resolves the ref and reports without spawning",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver();
        const result = await continueDriverCommand.run(
          { ref: "03/01", dryRun: true },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        assert.deepEqual(result, { ref: "03/01", phase: "continue", command: "/aof:continue 03/01" });
        assert.equal(driver.spawnCalls.length, 0);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — the real default completion watch settles a declared transcript while the PTY remains live",
    async run() {
      const fx = await fixture();
      try {
        const sessionId = "session-default-watch";
        const claudeConfigDir = path.join(fx.projectRoot, "claude-config");
        const env = { ...process.env, CLAUDE_CONFIG_DIR: claudeConfigDir };
        const projectsDir = claudeProjectsDir({ cwd: fx.projectRoot, env });
        const transcript = path.join(projectsDir, `${sessionId}.jsonl`);
        await mkdir(projectsDir, { recursive: true });
        await writeFile(transcript, `${JSON.stringify({
          type: "assistant",
          message: {
            stop_reason: "end_turn",
            content: [{ type: "text", text: DECLARED_DONE_TRANSCRIPT_LINE }],
          },
        })}\n`);
        const aged = new Date(Date.now() - DECLARED_DONE_IDLE_MS - 1_000);
        await utimes(transcript, aged, aged);
        const fake = createFakePtySpawn();
        let ptyExitEmitted = false;
        const ptySpawn = async (...args) => {
          const pty = await fake.spawn(...args);
          const onExit = pty.onExit.bind(pty);
          pty.onExit = (handler) => onExit((event) => {
            ptyExitEmitted = true;
            handler(event);
          });
          return pty;
        };
        const options = {
          ptySpawn,
          which: createFakeWhich(["claude"]),
          watchTranscriptSessionId: async () => sessionId,
          commandDelayMs: 0,
          env,
        };
        assert.equal("watchTranscriptCompletion" in options, false, "the real default watch is selected");
        const result = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: options },
        );
        assert.deepEqual(result, {
          ref: "03/01",
          phase: "continue",
          command: "/aof:continue 03/01",
          outcome: "done",
          sessionId: "session-default-watch",
          // 129/02 (ADR-005 §2) — every real drive reports the baseline its launch took.
          settlementContext: { projectsDir, transcriptBaseline: null, spendBaselineAvailable: true },
        });
        assert.equal("failureReason" in result, false, "the default watch supplies no failure reason");
        assert.equal(fake.spawnCalls.length, 1);
        assert.equal(fake.ptys[0].killed, true, "the transcript watcher kills the still-live PTY");
        assert.equal(ptyExitEmitted, true, "the m69 fake confirms the watcher-requested kill through the PTY exit before settlement");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — provider absence is a reported failed outcome",
    async run() {
      const fx = await fixture();
      try {
        const fake = createFakePtySpawn();
        const result = await continueDriverCommand.run(
          { ref: "03/01" },
          {
            workspace: fx.workspace,
            agentSessionDriverOptions: {
              ptySpawn: fake.spawn,
              which: createFakeWhich([]),
              commandDelayMs: 0,
            },
          },
        );
        assert.equal(fake.spawnCalls.length, 0);
        assert.equal(result.outcome, "failed");
        assert.equal(result.failureReason, "agent_error");
        assert.equal(result.sessionId, null);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — done, failed, and needs-input outcomes pass through without reclassification",
    async run() {
      const fx = await fixture();
      try {
        const done = scriptedDriver("done", undefined, "session-done");
        const doneResult = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: done.options },
        );
        assert.equal(doneResult.outcome, "done");
        assert.equal(doneResult.sessionId, "session-done");

        const failed = scriptedDriver("failed", "agent_error", "session-failed");
        const failedResult = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: failed.options },
        );
        assert.equal(failedResult.outcome, "failed");
        assert.equal(failedResult.failureReason, "agent_error");
        assert.equal(failedResult.sessionId, "session-failed");

        const needsInputFake = createFakePtySpawn();
        const needsInputResult = await continueDriverCommand.run(
          { ref: "03/01" },
          {
            workspace: fx.workspace,
            agentSessionDriverOptions: {
              ptySpawn: needsInputFake.spawn,
              which: createFakeWhich(["claude"]),
              watchTranscriptSessionId: async () => "session-needs-input",
              watchTranscriptCompletion: async () => ({ outcome: "needs-input" }),
              commandDelayMs: 0,
            },
          },
        );
        assert.equal(needsInputResult.outcome, "needs-input");
        assert.equal(needsInputResult.sessionId, "session-needs-input");
        assert.equal(needsInputFake.spawnCalls.length, 1);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — bare drives mint a run carrying the captured session id while shipped doors retain their where contract",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver();
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1, "a bare drive mints one run record (68/01 attribution-at-spawn)");
        assert.equal(runs[0].sessionId, "session-drive", "the run record carries the session id the session published");
        assert.equal(runs[0].state, "done", "the run settles done");

        for (const [door, phase] of [
          [continueCommand, "continue"],
          [refineDoorCommand, "refine"],
          [verifyDoorCommand, "verify"],
        ]) {
          const result = await door.run({ ref: "03/01" }, { workspace: fx.workspace });
          assert.equal(result.where, "local");
          assert.equal(result.command, `/aof:${phase} 03/01`);
        }
        assert.equal(driver.spawnCalls.length, 1, "only the explicit driver spawned");
        assert.equal((await readRuns(item)).length, 1, "the shipped doors still mint no run — only the explicit driver does");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — missing and unknown refs refuse before the spawn seam",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver();
        for (const ref of ["", "99/99"]) {
          await assert.rejects(
            () => continueDriverCommand.run(
              { ref },
              { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
            ),
            (error) => error.code === (ref === "" ? "ref-required" : "ref-not-found"),
          );
        }
        assert.equal(driver.spawnCalls.length, 0);
      } finally {
        await fx.cleanup();
      }
    },
  },
  // ═══════════════ 02_settle-not-clobbered-by-attribution-write.feature (F-04) ═══════════════
  // The drive command persists the captured session id ONTO the run record before it
  // settles (ADR-005 §1). F-04 (`VERIFICATION.md`, blocker) — the pre-fix shape was a
  // fire-and-forget whole-record read-modify-write that could land AFTER `completeRun`
  // and rewrite the settled record backwards to `running` (silently, via
  // .catch(reportDegrade)). The fix awaits the persist inside `onSessionIdCaptured`,
  // which the driver awaits, so the id lands before the settle. These scenarios pin
  // the five F-04 guarantees over the real drive command.
  {
    name: "68/01 task02 a settled run stays settled when the attribution write lands late — the drive's run record ends settled with the session id on it",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "session-f04-late");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1, "one run is minted");
        assert.equal(runs[0].state, "done", "the run record's state is the settled state — not clobbered back to running by a late attribution write");
        assert.equal(runs[0].outcome, "done", "the run record's outcome is the settled outcome");
        assert.equal(runs[0].sessionId, "session-f04-late", "the record carries the session id");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "68/01 task02 the item is drivable again after a drive that settled — a second drive is not refused as a duplicate run, and the first run's record is still terminal",
    async run() {
      const fx = await fixture();
      try {
        const first = scriptedDriver("done", undefined, "session-f04-first");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: first.options },
        );
        const second = scriptedDriver("done", undefined, "session-f04-second");
        const secondResult = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: second.options },
        );
        assert.equal(secondResult.outcome, "done", "the second drive is not refused as a duplicate run (the settled first run did not leak a running row)");
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 2, "two runs exist");
        assert.equal(runs[0].state, "done", "the first run's record is still terminal");
        assert.equal(runs[0].outcome, "done", "the first run's outcome is still terminal");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "68/01 task02 a stamped spend survives the attribution write — the drive's settled run keeps its stamped spend envelope",
    async run() {
      const fx = await fixture();
      try {
        const sessionId = "session-f04-spend";
        // A production-shaped Claude projects directory for the session. Settlement
        // resolves it through the same claudeProjectsDir seam as the watcher.
        const env = { ...process.env, CLAUDE_CONFIG_DIR: path.join(fx.projectRoot, "claude-config") };
        const projectsDir = claudeProjectsDir({ cwd: fx.projectRoot, env });
        await mkdir(projectsDir, { recursive: true });
        await writeFile(path.join(projectsDir, `${sessionId}.jsonl`), `${JSON.stringify({
          type: "assistant",
          message: {
            model: "claude-sonnet",
            effort: "high",
            usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 500, cache_creation_input_tokens: 1000 },
            content: [{ type: "tool_use", name: "x", input: {} }],
          },
        })}\n`);
        const driver = scriptedDriver("done", undefined, sessionId);
        driver.options.env = env;
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1);
        assert.equal(runs[0].state, "done", "the run is settled");
        assert.equal(runs[0].spend?.tokens?.input, 100, "the stamped spend envelope survives the attribution write");
        assert.equal(runs[0].spend?.tokens?.cacheRead, 500, "the envelope's cache-read bucket survives");
        assert.equal(runs[0].spend?.model, "claude-sonnet", "no field of the envelope has been returned to its pre-settle value");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "68/01 task02 neither write is made conditional on the other by the fix — a failing assignment update does not stop the attribution persist or the settle",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "session-f04-independent");
        // The caller-provided hook (the assignment update) fails; the persist and the
        // settle must proceed regardless.
        driver.options.onSessionIdCaptured = async () => {
          throw new Error("up-channel down");
        };
        const result = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        assert.equal(result.outcome, "done", "the run still settles when the assignment update fails");
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs[0].state, "done", "the run settles");
        assert.equal(runs[0].sessionId, "session-f04-independent", "the attribution persist is not conditional on the assignment update");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "68/01 task02 the id is still written once and not churned — re-presenting the same id at settle does not rewrite the record",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "session-f04-once");
        await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const first = (await readRuns(item))[0];
        const firstUpdatedAt = first.updatedAt;
        // Re-presenting the SAME id at settle is a byte-identical no-op — recordSessionId
        // rewrites nothing, so state/attempt/retry lineage are untouched.
        await recordSessionId(item, { runId: first.runId, sessionId: "session-f04-once" });
        const after = (await readRuns(item))[0];
        assert.equal(after.sessionId, "session-f04-once", "the id is unchanged");
        assert.equal(after.updatedAt, firstUpdatedAt, "the record is not rewritten (updatedAt untouched)");
        assert.equal(after.state, first.state, "the run's state is untouched");
        assert.equal(after.attempt, first.attempt, "the run's attempt is untouched");
        assert.equal(after.retryOf, first.retryOf, "the run's retry lineage is untouched");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop phase drivers — factory freezes the three ids, routes, the dry-run flag, and (129/02) the run and fix flags",
    run() {
      for (const [command, phase] of [
        [refineDriverCommand, "refine"],
        [continueDriverCommand, "continue"],
        [verifyDriverCommand, "verify"],
      ]) {
        assert.equal(command.id, `work:drive-${phase}`);
        assert.deepEqual(command.cli.route, ["work", "drive", phase]);
        assert.equal(command.cli.spec.flags.dryRun.type, "boolean");
        assert.equal(command.cli.spec.flags.run.type, "string");
        assert.equal(command.cli.spec.flags.fix.type, "string");
        assert.deepEqual(command.cli.argv(["03/01"], { dryRun: true }), { ref: "03/01", dryRun: true });
        assert.deepEqual(command.cli.argv(["03/01"], { run: "r1", fix: "C:/tmp/fix.json" }), { ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" });
        assert.deepEqual(command.cli.argv(["03/01"], {}), { ref: "03/01" }, "absent flags map to nothing");
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 129 / story 02 — tasks/00_the-drive-takes-a-lent-run.feature (ADR-005 §2;
  // rulings 2026-09-13). `--run <id>` lends the run across the process boundary — the child
  // mints nothing, settles nothing, heartbeats the lent id and returns `settlementContext`;
  // `--fix <file>` is the fix transport as a file, read where `ctx.loopDrive.fix` is read.
  //
  // ONE OBSERVABLE, NAMED ONCE: the driver's brief `task` is not visible through the PTY
  // double (the interactive path never renders it), but it is derived from the SAME `fix ==
  // null` decision as the typed directive — `task: "fix"` ⇔ the directive is `composeFixInput`'s
  // `## REVIEW FINDINGS` composition; any other task ⇔ the bare `/aof:<phase> <ref>` followed
  // by the compiled phase brief. Every "task is …" step below reads it that way.
  //
  // EVERY CASE INJECTS `ctx.stdin` (an open `Readable`), even the bare ones: the seam is
  // `ctx.stdin ?? process.stdin`, and the runner's own stdin is an already-ended handle whose
  // `end` is delivered by I/O — after a microtask-fast fake spawn has gone live — which read
  // as a cancel the first time a `--run` case touched it (measured while writing this).
  // ═══════════════════════════════════════════════════════════════════════════════════════
  {
    name: "129/02 task00 a lent run is neither minted nor settled by the child — no record, the lent id in the launch env, the result's exact key set, and settlementContext equal to COLD",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "sess-1");
        const result = await continueDriverCommand.run(
          { ref: "03/01", run: "20260912T000000000Z-0000" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        assert.deepEqual(await readRuns(item), [], "the story's runs/ holds no record — the child minted nothing");
        assert.equal(driver.spawnCalls.length, 1);
        const env = driver.spawnCalls[0].options.env;
        assert.equal(env.AOF_RUN_ID, "20260912T000000000Z-0000", "the PTY launch env heartbeats the lent id");
        assert.equal(env.AOF_RUN_ITEM_DIR, item.dir, "…against the story's dir");
        assert.deepEqual(Object.keys(result).sort(), ["command", "outcome", "phase", "ref", "sessionId", "settlementContext"], "the result's key set is exactly the six");
        assert.deepEqual(result.settlementContext, coldSettlement(fx), "settlementContext deep-equals COLD");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 a lent id that names the parent's record is captured on it, never settled — one record, sessionId sess-1, state running",
    async run() {
      const fx = await fixture();
      try {
        const { item, runId } = await mintRunning(fx);
        const driver = scriptedDriver("done", undefined, "sess-1");
        const result = await continueDriverCommand.run(
          { ref: "03/01", run: runId },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
        );
        assert.equal(result.outcome, "done");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1, "runs/ still holds exactly that one record");
        assert.equal(runs[0].runId, runId);
        assert.equal(runs[0].sessionId, "sess-1", "the session id was captured on the parent's record");
        assert.equal(runs[0].state, "running", "…and the record was never settled by the child");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 the lent id wins over ctx.loopDrive — the flag's id reaches the launch env, and the recorder receives the same settlementContext the result carries",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "sess-1");
        let recorded = null;
        const result = await continueDriverCommand.run(
          { ref: "03/01", run: "flag-run" },
          {
            workspace: fx.workspace,
            agentSessionDriverOptions: driver.options,
            stdin: stdinDouble(),
            loopDrive: { runId: "ctx-run", recordSettlementContext(value) { recorded = value; } },
          },
        );
        assert.equal(driver.spawnCalls[0].options.env.AOF_RUN_ID, "flag-run", "--run wins over ctx.loopDrive.runId");
        assert.ok(recorded != null, "the recorder was called");
        assert.deepEqual(recorded, result.settlementContext, "the recorder received the same settlementContext value the result carries");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 the phase, the run's owner and the fix compose independently — eleven rows of phase × input × ctx.loopDrive",
    async run() {
      const commands = { refine: refineDriverCommand, continue: continueDriverCommand, verify: verifyDriverCommand };
      const rows = [
        // phase, input extra, loopDrive, task, records, runId
        ["continue", {}, null, "continue", "one", "minted"],
        ["continue", { run: "r1" }, null, "continue", "none", "r1"],
        ["continue", { run: "r1", fix: "F" }, null, "fix", "none", "r1"],
        ["continue", { fix: "F" }, null, "fix", "one", "minted"],
        ["continue", {}, { runId: "ctx-run", fix: "T" }, "fix", "none", "ctx-run"],
        ["continue", { run: "flag-run" }, { runId: "ctx-run", fix: "T" }, "fix", "none", "flag-run"],
        ["continue", { run: "" }, null, "continue", "one", "minted"],
        ["refine", { run: "r1", fix: "F" }, null, "refine", "none", "r1"],
        ["verify", { run: "r1", fix: "F" }, null, "verify", "none", "r1"],
        ["refine", {}, { runId: "ctx-run", fix: "T" }, "refine", "none", "ctx-run"],
        ["verify", { run: "r1" }, null, "verify", "none", "r1"],
      ];
      for (const [phase, extra, loopDrive, task, records, runId] of rows) {
        const fx = await fixture();
        try {
          const label = `${phase} ${JSON.stringify(extra)} loopDrive=${loopDrive == null ? "absent" : "{ctx-run, T}"}`;
          const F = await writeFixFile(fx, "fix.json", fixBag());
          const input = { ref: "03/01", ...extra, ...(extra.fix === "F" ? { fix: F } : {}) };
          const ctxLoopDrive = loopDrive == null ? {} : { loopDrive: { runId: loopDrive.runId, fix: fixBag() } };
          const driver = scriptedDriver("done", undefined, "sess-1");
          await commands[phase].run(input, { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble(), ...ctxLoopDrive });
          assert.equal(driver.spawnCalls.length, 1, `${label}: launched once`);
          const typed = driver.typed[0];
          assert.ok(typed.startsWith(`/aof:${phase} 03/01`), `${label}: the command starts with /aof:${phase} 03/01`);
          if (task === "fix") assert.match(typed, /## REVIEW FINDINGS/u, `${label}: the task is fix (the directive is the fix composition)`);
          else assert.doesNotMatch(typed, /## REVIEW FINDINGS/u, `${label}: the task is ${task} (no fix composition)`);
          const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
          const runs = await readRuns(item);
          const env = driver.spawnCalls[0].options.env;
          if (records === "none") {
            assert.deepEqual(runs, [], `${label}: runs/ holds no record`);
            assert.equal(env.AOF_RUN_ID, runId, `${label}: AOF_RUN_ID is the lent id`);
          } else {
            assert.equal(runs.length, 1, `${label}: runs/ holds one record`);
            assert.equal(runs[0].state, "done", `${label}: …settled done`);
            assert.equal(env.AOF_RUN_ID, runs[0].runId, `${label}: AOF_RUN_ID is the minted id`);
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "129/02 task00 a fix file is read as the fix transport for continue — the command equals composeFixInput over the file's findings, in the file's order",
    async run() {
      const fx = await fixture();
      try {
        const bag = fixBag();
        const F = await writeFixFile(fx, "fix.json", bag);
        const driver = scriptedDriver("done", undefined, "sess-1");
        await continueDriverCommand.run(
          { ref: "03/01", run: "r1", fix: F },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
        );
        const expected = composeFixInput("/aof:continue 03/01", { findings: bag.findings, changeUnderReview: bag.changeUnderReview });
        const typed = driver.typed[0];
        assert.ok(typed.startsWith(expected), `the brief command equals composeFixInput(...) (the compiled phase brief follows it)\n--- typed ---\n${typed.slice(0, expected.length + 40)}`);
        const findings = typed.indexOf("## REVIEW FINDINGS");
        assert.ok(findings >= 0, "the findings ride under ## REVIEW FINDINGS");
        const alpha = typed.indexOf("alpha: missing-when", findings);
        const beta = typed.indexOf("beta failed", findings);
        assert.ok(alpha >= 0 && beta > alpha, "the two findings appear in the file's order");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 the fix file is the transport or an unreadable refusal, and a refusal precedes the spawn — seven rows, one code, and no record leaked by an owned drive either",
    async run() {
      const fx = await fixture();
      try {
        const unreadable = [
          ["a path that does not exist", path.join(fx.projectRoot, "loop-fixes", "nowhere.json")],
          ["a directory", fx.projectRoot],
          ["a file holding `not json`", await writeFixFile(fx, "not-json.json", "not json")],
          ["a file holding `[]`", await writeFixFile(fx, "array.json", "[]")],
          ["an empty file", await writeFixFile(fx, "empty.json", "")],
        ];
        for (const [label, file] of unreadable) {
          const driver = scriptedDriver("done", undefined, "sess-1");
          await assert.rejects(
            () => continueDriverCommand.run({ ref: "03/01", run: "r1", fix: file }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() }),
            (error) => error.code === "drive-fix-unreadable" && error.status === 400,
            `${label}: a refusal with code drive-fix-unreadable`,
          );
          assert.equal(driver.spawnCalls.length, 0, `${label}: the driver was never launched`);
          // The refusal also precedes the MINT: an OWNED drive over the same bad file leaks no record.
          await assert.rejects(
            () => continueDriverCommand.run({ ref: "03/01", fix: file }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() }),
            (error) => error.code === "drive-fix-unreadable",
          );
          const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
          assert.deepEqual(await readRuns(item), [], `${label}: an owned drive refused on the fix file minted no record`);
        }

        // the transport with buildRun: null → a plain continue
        {
          const F = await writeFixFile(fx, "no-build-run.json", fixBag({ buildRun: null }));
          const driver = scriptedDriver("done", undefined, "sess-1");
          await continueDriverCommand.run({ ref: "03/01", run: "r1", fix: F }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() });
          assert.equal(driver.spawnCalls.length, 1, "buildRun: null — launched once");
          assert.doesNotMatch(driver.typed[0], /## REVIEW FINDINGS/u, "buildRun: null — the task is continue, not fix");
        }
        // the transport plus an undeclared key → a fix whose command holds no byte of it
        {
          const F = await writeFixFile(fx, "undeclared.json", { ...fixBag(), gradeRecord: { verdict: "fail", marker: "GRADE-RECORD-BYTES" } });
          const driver = scriptedDriver("done", undefined, "sess-1");
          await continueDriverCommand.run({ ref: "03/01", run: "r1", fix: F }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() });
          assert.equal(driver.spawnCalls.length, 1, "undeclared key — launched once");
          assert.match(driver.typed[0], /## REVIEW FINDINGS/u, "undeclared key — the task is fix");
          assert.doesNotMatch(driver.typed[0], /gradeRecord|GRADE-RECORD-BYTES/u, "…and the command holds no byte of the undeclared key");
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 settlementContext reports the baseline the launch actually took — cold, a resumable transcript, a missing transcript, and the availability seam answering true",
    async run() {
      const rows = [
        // resume, transcripts, seam, expects --resume, baseline, available
        [null, false, null, false, "null", true],
        [{ runId: "b1", sessionId: "s-b1" }, true, null, true, "snapshot", true],
        [{ runId: "b1", sessionId: "s-b1" }, false, null, false, "null", true],
        [{ runId: "b1", sessionId: "s-b1" }, false, async () => true, true, "empty", false],
      ];
      for (const [resume, transcripts, seam, resumes, baseline, available] of rows) {
        const fx = await fixture();
        try {
          const label = `resume=${JSON.stringify(resume)} transcripts=${transcripts} seam=${seam == null ? "absent" : "true"}`;
          const env = { ...process.env, CLAUDE_CONFIG_DIR: path.join(fx.projectRoot, "claude-config") };
          const projectsDir = claudeProjectsDir({ cwd: fx.projectRoot, env });
          if (transcripts) {
            await mkdir(projectsDir, { recursive: true });
            await writeFile(path.join(projectsDir, "s-b1.jsonl"), `${JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 1, output_tokens: 1 } } })}\n`);
          }
          const F2 = await writeFixFile(fx, "fix-resume.json", fixBag({ resumeBuildRun: resume }));
          const driver = scriptedDriver("done", undefined, "sess-1");
          driver.options.env = env;
          if (seam != null) driver.options.resumeSessionAvailable = seam;
          const result = await continueDriverCommand.run(
            { ref: "03/01", run: "r1", fix: F2 },
            { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
          );
          const args = driver.spawnCalls[0].args;
          if (resumes) {
            assert.deepEqual(args.slice(args.indexOf("--resume"), args.indexOf("--resume") + 2), ["--resume", "s-b1"], `${label}: the spawn args carry --resume s-b1`);
          } else {
            assert.equal(args.includes("--resume"), false, `${label}: the spawn args carry no --resume`);
          }
          const context = result.settlementContext;
          assert.equal(context.projectsDir, projectsDir, `${label}: projectsDir is the one the settle seam reads`);
          if (baseline === "null") assert.equal(context.transcriptBaseline, null, `${label}: transcriptBaseline is null`);
          if (baseline === "snapshot") assert.ok(context.transcriptBaseline != null && Object.hasOwn(context.transcriptBaseline, "s-b1.jsonl"), `${label}: a snapshot holding s-b1.jsonl`);
          if (baseline === "empty") assert.deepEqual(context.transcriptBaseline, {}, `${label}: an empty snapshot`);
          assert.equal(context.spendBaselineAvailable, available, `${label}: spendBaselineAvailable`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "129/02 task00 the CLI face carries both flags into the input — ten argv rows through parseSpecArgv and the argv mapper",
    async run() {
      const commands = { refine: refineDriverCommand, continue: continueDriverCommand, verify: verifyDriverCommand };
      const rows = [
        ["continue", ["03/01", "--run", "r1"], { ref: "03/01", run: "r1" }],
        ["continue", ["03/01", "--run", "r1", "--fix", "C:/tmp/fix.json"], { ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }],
        ["continue", ["03/01", "--run=r1", "--fix=C:/tmp/fix.json"], { ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }],
        ["continue", ["03/01", "--dry-run"], { ref: "03/01", dryRun: true }],
        ["continue", ["03/01", "--run", "r1", "--dry-run"], { ref: "03/01", run: "r1", dryRun: true }],
        ["continue", ["03/01"], { ref: "03/01" }],
        ["refine", ["03/01", "--run", "r1"], { ref: "03/01", run: "r1" }],
        ["verify", ["03/01", "--run", "r1", "--fix", "C:/tmp/fix.json"], { ref: "03/01", run: "r1", fix: "C:/tmp/fix.json" }],
      ];
      for (const [phase, argv, expected] of rows) {
        const command = commands[phase];
        const parsed = parseSpecArgv(argv, command.cli.spec, command.id);
        assert.deepEqual(await command.cli.argv(parsed._, parsed), expected, `${phase} ${argv.join(" ")}`);
      }
      for (const argv of [["03/01", "--run"], ["03/01", "--fix"]]) {
        assert.throws(
          () => parseSpecArgv(argv, continueDriverCommand.cli.spec, continueDriverCommand.id),
          (error) => error.code === "missing-flag-value",
          `${argv.join(" ")}: a refusal with code missing-flag-value`,
        );
      }
    },
  },
  {
    name: "129/02 task00 the closed input schema and the flag spec declare both flags on all three phases",
    run() {
      for (const command of [refineDriverCommand, continueDriverCommand, verifyDriverCommand]) {
        assert.deepEqual(Object.keys(command.input.properties), ["ref", "dryRun", "run", "fix"], `${command.id}: the schema's properties are exactly the four`);
        assert.deepEqual(command.input.properties.run, { type: "string" }, `${command.id}: run is a string`);
        assert.deepEqual(command.input.properties.fix, { type: "string" }, `${command.id}: fix is a string`);
        assert.equal(command.input.additionalProperties, false, `${command.id}: the schema stays closed`);
        assert.equal(command.cli.spec.flags.run.type, "string", `${command.id}: --run is a string flag`);
        assert.equal(command.cli.spec.flags.fix.type, "string", `${command.id}: --fix is a string flag`);
        assert.ok(command.cli.spec.usage.includes("--run <id>"), `${command.id}: usage names --run <id>`);
        assert.ok(command.cli.spec.usage.includes("--fix <file>"), `${command.id}: usage names --fix <file>`);
      }
    },
  },
  {
    name: "129/02 task00 a bare drive is byte-identical to today — one owned record settled done with the session id, and the result gains only settlementContext",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "sess-1");
        const result = await continueDriverCommand.run(
          { ref: "03/01" },
          { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
        );
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1, "exactly one run record is minted");
        assert.equal(runs[0].state, "done");
        assert.equal(runs[0].outcome, "done");
        assert.equal(runs[0].sessionId, "sess-1");
        assert.deepEqual(result, {
          ref: "03/01",
          phase: "continue",
          command: "/aof:continue 03/01",
          outcome: "done",
          sessionId: "sess-1",
          settlementContext: coldSettlement(fx),
        });
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 --dry-run reports the directive and starts nothing, lent or not — bare, with --run, and with a --fix that does not exist",
    async run() {
      const fx = await fixture();
      try {
        for (const extra of [{}, { run: "r1" }, { run: "r1", fix: "C:/nowhere/fix.json" }]) {
          const driver = scriptedDriver("done", undefined, "sess-1");
          const result = await continueDriverCommand.run(
            { ref: "03/01", dryRun: true, ...extra },
            { workspace: fx.workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() },
          );
          assert.deepEqual(result, { ref: "03/01", phase: "continue", command: "/aof:continue 03/01" }, `dry-run ${JSON.stringify(extra)}`);
          assert.equal(driver.spawnCalls.length, 0, `dry-run ${JSON.stringify(extra)}: never launched`);
          const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
          assert.deepEqual(await readRuns(item), [], `dry-run ${JSON.stringify(extra)}: no record`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task00 the flag wins over ctx.loopDrive.fix — the command carries the file's findings and not the ctx's",
    async run() {
      const fx = await fixture();
      try {
        const F = await writeFixFile(fx, "flag.json", fixBag({ findings: [{ gate: "work:grade", case: "flag-finding" }] }));
        const driver = scriptedDriver("done", undefined, "sess-1");
        await continueDriverCommand.run(
          { ref: "03/01", run: "r1", fix: F },
          {
            workspace: fx.workspace,
            agentSessionDriverOptions: driver.options,
            stdin: stdinDouble(),
            loopDrive: { runId: "ctx-run", fix: fixBag({ findings: [{ gate: "work:grade", case: "ctx-finding" }] }) },
          },
        );
        assert.match(driver.typed[0], /flag-finding/u, "the flag's findings are typed");
        assert.doesNotMatch(driver.typed[0], /ctx-finding/u, "…and the ctx's are not");
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 129 / story 02 — tasks/01_stdin-is-the-cancel-channel.feature (ADR-005 §2, §4;
  // rulings 2026-09-13). Under `--run` a closed stdin stops the live session through the
  // driver's own bracket; the seam is `ctx.stdin ?? process.stdin`; the listener is armed at
  // command start and the cancel is gated on liveness. The driver gains `signal`.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  {
    name: "129/02 task01 ending stdin under --run stops the live session gracefully, whatever the phase — the bracket in order, the PTY killed, the cancelled result, and the parent's record untouched",
    async run() {
      const commands = { refine: refineDriverCommand, continue: continueDriverCommand, verify: verifyDriverCommand };
      for (const phase of ["continue", "refine", "verify"]) {
        const fx = await fixture();
        try {
          const { item, runId } = await mintRunning(fx);
          const session = heldSession();
          const stdin = stdinDouble();
          const pending = commands[phase].run(
            { ref: "03/01", run: runId },
            { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin },
          );
          await session.written();
          stdin.push(null);
          const result = await pending;
          assert.deepEqual(session.stopPhases(), ["stop-requested", "pty-released", "exit-confirmed"], `${phase}: the driver's own bracket, in order`);
          assert.equal(session.stops[0].outcome, "failed", `${phase}: stop-requested names the outcome`);
          assert.equal(session.stops[0].failureReason, "cancelled", `${phase}: …and the reason`);
          assert.equal(session.stops[2].outcome, "failed", `${phase}: exit-confirmed carries the outcome`);
          assert.equal(session.fake.ptys[0].killed, true, `${phase}: the PTY double reports killed`);
          assert.deepEqual(result, {
            ref: "03/01",
            phase,
            command: `/aof:${phase} 03/01`,
            outcome: "failed",
            failureReason: "cancelled",
            sessionId: "sess-1",
            settlementContext: coldSettlement(fx),
          }, `${phase}: the command's result`);
          const runs = await readRuns(item);
          assert.equal(runs.length, 1, `${phase}: runs/ holds no other record`);
          assert.equal(runs[0].runId, runId);
          assert.equal(runs[0].state, "running", `${phase}: the parent's record still reads running`);
          assert.equal(runs[0].sessionId, "sess-1", `${phase}: …with the session id captured`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "129/02 task01 the end's timing, and the flag, decide whether it is a stop — five rows",
    async run() {
      // row 1: ended BEFORE the command started, under --run → observed, ignored (not live yet)
      {
        const fx = await fixture();
        try {
          const session = heldSession();
          const stdin = stdinDouble();
          stdin.push(null);
          const pending = continueDriverCommand.run({ ref: "03/01", run: "r1" }, { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin });
          await session.written();
          session.exit(0);
          const result = await pending;
          assert.equal(result.outcome, "done", "row 1: an end before liveness stops nothing");
          assert.deepEqual(session.stopPhases().filter((phase) => phase === "stop-requested"), [], "row 1: no stop-requested");
        } finally {
          await fx.cleanup();
        }
      }
      // row 2: open; live, then ended → cancelled; exactly one listener remains
      {
        const fx = await fixture();
        try {
          const session = heldSession();
          const stdin = stdinDouble();
          const pending = continueDriverCommand.run({ ref: "03/01", run: "r1" }, { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin });
          await session.written();
          stdin.push(null);
          const result = await pending;
          assert.equal(result.outcome, "failed", "row 2: the end after liveness is the stop");
          assert.deepEqual(session.stops.filter((event) => event.phase === "stop-requested").map((event) => event.failureReason), ["cancelled"], "row 2: exactly one stop-requested, cancelled");
          assert.equal(stdin.listenerCount("end"), 1, "row 2: one end listener");
        } finally {
          await fx.cleanup();
        }
      }
      // row 3: open; the session exits 0, THEN the double is ended → done, no stop
      {
        const fx = await fixture();
        try {
          const session = heldSession();
          const stdin = stdinDouble();
          const pending = continueDriverCommand.run({ ref: "03/01", run: "r1" }, { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin });
          await session.written();
          session.exit(0);
          const result = await pending;
          stdin.push(null);
          await sleep(10);
          assert.equal(result.outcome, "done", "row 3: done");
          assert.deepEqual(session.stopPhases().filter((phase) => phase === "stop-requested"), [], "row 3: no stop-requested");
        } finally {
          await fx.cleanup();
        }
      }
      // row 4: no --run; live, then ended → stdin was never touched
      {
        const fx = await fixture();
        try {
          const session = heldSession();
          const stdin = stdinDouble();
          const pending = continueDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin });
          await session.written();
          stdin.push(null);
          await sleep(10);
          session.exit(0);
          const result = await pending;
          assert.equal(result.outcome, "done", "row 4: done");
          assert.deepEqual(session.stopPhases().filter((phase) => phase === "stop-requested"), [], "row 4: no stop-requested");
          assert.equal(stdin.listenerCount("end"), 0, "row 4: no end listener");
          assert.equal(stdin.readableFlowing, null, "row 4: readableFlowing is null — never resumed");
        } finally {
          await fx.cleanup();
        }
      }
      // row 5: --run with dryRun → returns; stdin untouched
      {
        const fx = await fixture();
        try {
          const session = heldSession();
          const stdin = stdinDouble();
          const result = await continueDriverCommand.run({ ref: "03/01", run: "r1", dryRun: true }, { workspace: fx.workspace, agentSessionDriverOptions: session.options, stdin });
          assert.equal("outcome" in result, false, "row 5: the outcome is absent (a dry run)");
          assert.deepEqual(session.stops, [], "row 5: no breadcrumbs at all");
          assert.equal(stdin.listenerCount("end"), 0, "row 5: no end listener");
          assert.equal(stdin.readableFlowing, null, "row 5: readableFlowing is null");
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "129/02 task01 a caller-supplied abort signal reaches the bracket at the driver — live abort, abort after exit, abort behind an unconfirmed sentinel stop, and the two no-signal rows",
    async run() {
      const fx = await fixture();
      try {
        const brief = { itemRef: "03/01", worktreeCwd: fx.projectRoot, task: "continue", command: "/aof:continue 03/01" };
        // row 1: the signal aborts while the session is live
        {
          const controller = new AbortController();
          const session = heldSession();
          const pending = driveInteractiveClaudeSession(brief, { ...session.options, signal: controller.signal });
          await session.written();
          controller.abort();
          const result = await pending;
          assert.deepEqual(result, { outcome: "failed", failureReason: "cancelled", sessionId: "sess-1" }, "row 1: the cancelled result");
          assert.deepEqual(session.stopPhases(), ["stop-requested", "pty-released", "exit-confirmed"], "row 1: the bracket");
          assert.equal(session.stops[0].failureReason, "cancelled", "row 1: stop-requested carries cancelled");
        }
        // row 2: the session exits 0, then the signal aborts
        {
          const controller = new AbortController();
          const session = heldSession();
          const pending = driveInteractiveClaudeSession(brief, { ...session.options, signal: controller.signal });
          await session.written();
          session.exit(0);
          const result = await pending;
          controller.abort();
          await sleep(10);
          assert.deepEqual(result, { outcome: "done", sessionId: "sess-1" }, "row 2: done");
          assert.deepEqual(session.stopPhases(), ["exit-confirmed"], "row 2: exit-confirmed only");
        }
        // row 3: a sentinel stop is requested and unconfirmed, then the signal aborts
        {
          const controller = new AbortController();
          const session = heldSession();
          // A PTY whose kill is NOT confirmed until told: the fake's kill() normally emits exit at
          // once, which would confirm the sentinel stop before the abort could land behind it.
          let confirmKill = null;
          const ptySpawn = async (...args) => {
            const pty = await session.fake.spawn(...args);
            const realKill = pty.kill.bind(pty);
            pty.kill = () => { confirmKill = realKill; };
            return pty;
          };
          const pending = driveInteractiveClaudeSession(brief, { ...session.options, ptySpawn, signal: controller.signal, killConfirmationMs: 5_000 });
          await session.written();
          session.held.emitData("NEEDS_INPUT\n");
          assert.deepEqual(session.stopPhases(), ["stop-requested", "pty-released"], "row 3: the sentinel stop is requested and released, awaiting confirmation");
          controller.abort();
          await sleep(10);
          assert.equal(session.stops.filter((event) => event.phase === "stop-requested").length, 1, "row 3: the abort requests no second stop");
          confirmKill();
          const result = await pending;
          assert.deepEqual(result, { outcome: "needs-input", sessionId: "sess-1" }, "row 3: the first stop's outcome is the one confirmed");
          assert.deepEqual(session.stops.filter((event) => event.phase === "stop-requested").map((event) => event.outcome), ["needs-input"], "row 3: exactly one stop-requested, needs-input");
        }
        // rows 4 and 5: no signal option — done on exit 0, agent_error on exit 1
        for (const [code, expected] of [[0, { outcome: "done", sessionId: "sess-1" }], [1, { outcome: "failed", failureReason: "agent_error", sessionId: "sess-1" }]]) {
          const session = heldSession();
          assert.equal("signal" in session.options, false, "guard: no signal option");
          const pending = driveInteractiveClaudeSession(brief, session.options);
          await session.written();
          session.exit(code);
          const result = await pending;
          assert.deepEqual(result, expected, `exit ${code}: the result`);
          assert.deepEqual(session.stopPhases(), ["exit-confirmed"], `exit ${code}: exit-confirmed only`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task01 a signal already aborted at entry never spawns — cancelled, processStarted false, and no stop-requested breadcrumb",
    async run() {
      const fx = await fixture();
      try {
        const controller = new AbortController();
        controller.abort();
        const session = heldSession();
        const result = await driveInteractiveClaudeSession(
          { itemRef: "03/01", worktreeCwd: fx.projectRoot, task: "continue", command: "/aof:continue 03/01" },
          { ...session.options, signal: controller.signal },
        );
        assert.equal(session.fake.spawnCalls.length, 0, "the PTY spawn double was never called");
        assert.deepEqual(result, { outcome: "failed", failureReason: "cancelled", sessionId: null, processStarted: false });
        assert.deepEqual(session.stops, [], "no stop-requested breadcrumb (no breadcrumb at all)");
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 129 / story 02 — tasks/03_child-drive-spawns-and-parses.feature (ADR-005 §1,
  // ADR-008 §1-§2; FF-12902). `spawnLaneDrive` spawns `process.execPath` with the CLI entry
  // and the drive verb, no shell, cwd the lane; reads exactly one document; classifies the
  // exit from the parse, never the exit code alone.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  {
    name: "129/02 task03 the argument vector is the CLI entry and the drive verb, no shell — continue, refine, verify, and with a fix file (a Node runtime)",
    async run() {
      assert.ok(existsSync(ENTRY), `ENTRY exists on disk: ${ENTRY}`);
      const rows = [
        ["continue", undefined, []],
        ["refine", undefined, []],
        ["verify", undefined, []],
        ["continue", "C:/home/.aof/mesh/loop-fixes/r1.json", ["--fix", "C:/home/.aof/mesh/loop-fixes/r1.json"]],
      ];
      for (const [phase, fixFile, tail] of rows) {
        const { double } = await lane({ phase, ...(fixFile == null ? {} : { fixFile }), script: { stdout: JSON.stringify(DOC) } });
        assert.equal(double.calls.length, 1);
        const call = double.calls[0];
        assert.equal(call.command, process.execPath, `${phase}: the command is process.execPath`);
        assert.deepEqual(call.args, [ENTRY, "work", "drive", phase, "127/02", "--run", "r1", ...tail, "--json"], `${phase}: the argument vector`);
        assert.equal(call.options.cwd, LANE, `${phase}: cwd is the lane`);
        assert.deepEqual(call.options.stdio, ["pipe", "pipe", "pipe"], `${phase}: stdin piped`);
        assert.equal("shell" in call.options, false, `${phase}: no shell`);
        assert.deepEqual(Object.keys(call.options).sort(), ["cwd", "env", "stdio", "windowsHide"], `${phase}: the option key set`);
      }
    },
  },
  {
    // REVIEW ROUND 1 (2026-09-13, reproduced at the source): the first cut discriminated on
    // "cli.mjs exists on disk", and under the payload-first launcher `process.execPath` IS
    // `aof.exe` while `<exeDir>/src/cli.mjs` exists beside it — so the deployed binary was
    // handed `aof.exe …/cli.mjs work drive …`, answered `Unknown command`, exit 1, no document,
    // and every lane died at t=0. The discriminator is interpreter identity (`isPackaged()`,
    // the one SEA-detection home), flipped here through its own test sentinel: under a SEA —
    // payload or embedded — the exe is the CLI and the verb words are the whole argv. The
    // entry is resolved lazily on the Node branch only (an eager `import.meta.url` read would
    // throw at load under the embedded CJS bundle); that is not observable under Node, so it
    // is stated in the module rather than asserted here.
    name: "129/02 task03 under a SEA (payload or embedded) the argument vector is the verb alone — process.execPath is the CLI and no entry element is spawned",
    async run() {
      const rows = [
        ["continue", undefined, []],
        ["refine", undefined, []],
        ["verify", undefined, []],
        ["continue", "C:/home/.aof/mesh/loop-fixes/r1.json", ["--fix", "C:/home/.aof/mesh/loop-fixes/r1.json"]],
      ];
      setSeaSentinelForTest(true);
      try {
        for (const [phase, fixFile, tail] of rows) {
          const { double } = await lane({ phase, ...(fixFile == null ? {} : { fixFile }), script: { stdout: JSON.stringify(DOC) } });
          assert.equal(double.calls.length, 1);
          const call = double.calls[0];
          assert.equal(call.command, process.execPath, `${phase} (SEA): the command is process.execPath — the exe is the CLI`);
          assert.deepEqual(call.args, ["work", "drive", phase, "127/02", "--run", "r1", ...tail, "--json"], `${phase} (SEA): the verb words are the whole argv`);
          assert.equal(call.args.includes(ENTRY), false, `${phase} (SEA): no entry element`);
          assert.equal(call.args.some((arg) => arg.endsWith("cli.mjs")), false, `${phase} (SEA): nothing ending in cli.mjs`);
          assert.equal(call.options.cwd, LANE, `${phase} (SEA): cwd is the lane`);
          assert.deepEqual(call.options.stdio, ["pipe", "pipe", "pipe"], `${phase} (SEA): stdin piped`);
          assert.deepEqual(Object.keys(call.options).sort(), ["cwd", "env", "stdio", "windowsHide"], `${phase} (SEA): the option key set`);
        }
      } finally {
        setSeaSentinelForTest(undefined);
      }
      // And the sentinel really was reset: the Node vector is back.
      const { double } = await lane({ script: { stdout: JSON.stringify(DOC) } });
      assert.equal(double.calls[0].args[0], ENTRY, "after the reset the Node branch spawns the entry again");
    },
  },
  {
    name: "129/02 task03 the child's env is the parent's, plus the caller's additions — absent, an addition, and an override",
    async run() {
      const parent = { ...process.env };
      {
        const { double } = await lane({ script: { stdout: JSON.stringify(DOC) } });
        assert.deepEqual(double.calls[0].options.env, parent, "absent: deep-equal to process.env");
      }
      {
        const { double } = await lane({ env: { AOF_X: "1" }, script: { stdout: JSON.stringify(DOC) } });
        assert.deepEqual(double.calls[0].options.env, { ...parent, AOF_X: "1" }, "an addition rides beside the parent's");
      }
      {
        const { double } = await lane({ env: { AOF_GLOBAL_HOME: "C:/other" }, script: { stdout: JSON.stringify(DOC) } });
        assert.deepEqual(double.calls[0].options.env, { ...parent, AOF_GLOBAL_HOME: "C:/other" }, "an override replaces the parent's value");
        assert.equal(double.calls[0].options.env.AOF_GLOBAL_HOME, "C:/other");
      }
    },
  },
  {
    name: "129/02 task03 the child's exit is classified from its one document, never from its exit code alone — ten rows",
    async run() {
      const pretty = JSON.stringify(DOC, null, 2);
      const split = Math.floor(pretty.indexOf('"sessionId"') + 4);
      const rows = [
        [`${pretty}\n`, "", 0, "document", DOC],
        [JSON.stringify(DOC), "", 1, "document", DOC],
        [[pretty.slice(0, split), pretty.slice(split)], "", 0, "document", DOC],
        [JSON.stringify(REFUSAL, null, 2), "", 1, "refused", REFUSAL],
        [JSON.stringify(REFUSAL), "", 0, "refused", REFUSAL],
        ["", "boom\nstack\n", 1, "died", null],
        ["", "", 0, "died", null],
        ["not json", "", 0, "died", null],
        ['{"ref":"127/02","outcome":', "", 1, "died", null],
        ["", "killed", null, "died", null],
      ];
      for (const [stdout, stderr, code, outcome, document] of rows) {
        const label = `stdout=${JSON.stringify(stdout).slice(0, 40)} exit=${code}`;
        const { answer } = await lane({ script: { stdout, stderr, exit: { code } } });
        assert.deepEqual(Object.keys(answer).sort(), ["document", "exitCode", "outcome", "spawn", "stderrTail"], `${label}: the answer's key set`);
        assert.equal(answer.outcome, outcome, `${label}: outcome`);
        assert.deepEqual(answer.document, document, `${label}: document`);
        assert.equal(answer.exitCode, code, `${label}: exitCode`);
        assert.equal(answer.spawn.outcome, "exited", `${label}: spawn.outcome`);
      }
    },
  },
  {
    name: "129/02 task03 a child that cannot be started is died with the attempt named",
    async run() {
      const { answer } = await lane({ script: { throws: Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }) } });
      assert.equal(answer.outcome, "died");
      assert.equal(answer.document, null);
      assert.equal(answer.exitCode, null);
      assert.deepEqual(answer.stderrTail, []);
      assert.equal(answer.spawn.outcome, "not-started");
      assert.ok(answer.spawn.error.includes(RENDERED_EXEC_PATH), `spawn.error names process.execPath — got: ${answer.spawn.error}`);
      assert.ok(answer.spawn.error.includes("work drive"), "…and the drive verb");
      assert.match(answer.spawn.error, /EACCES/u, "…and the underlying reason");
    },
  },
  {
    name: "129/02 task03 stderrTail is the last twenty lines, on every outcome — six rows",
    async run() {
      const lines = (count) => Array.from({ length: count }, (_, index) => `line ${index + 1}`);
      const rows = [
        ["", "", 1, "died", []],
        [lines(3).join("\n"), "", 1, "died", lines(3)],
        [lines(20).join("\n"), "", 1, "died", lines(20)],
        [lines(40).join("\n"), "", 1, "died", lines(40).slice(20)],
        [`${lines(40).join("\n")}\n`, "", 1, "died", lines(40).slice(20)],
        [lines(3).join("\n"), JSON.stringify(DOC), 0, "document", lines(3)],
      ];
      for (const [stderr, stdout, code, outcome, tail] of rows) {
        const { answer } = await lane({ script: { stdout, stderr, exit: { code } } });
        assert.equal(answer.outcome, outcome);
        assert.deepEqual(answer.stderrTail, tail, `stderr of ${stderr.split("\n").length} line(s): the tail`);
      }
    },
  },
  {
    name: "129/02 task03 a deadline and an abort are their own outcomes, and the deadline is named — timeout, aborted with stdin ended before the kill, and the seam's default deadline",
    async run() {
      {
        const { answer } = await lane({ deadlineMs: 30, script: { exit: null } });
        assert.equal(answer.outcome, "timeout");
        assert.equal(answer.document, null);
        assert.equal(answer.spawn.outcome, "deadline-expired");
        assert.equal(answer.spawn.deadlineMs, 30, "spawn.deadlineMs is 30");
      }
      {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10);
        const { answer, double } = await lane({ signal: controller.signal, graceMs: 5, script: { exit: null } });
        assert.equal(answer.outcome, "aborted");
        assert.equal(answer.document, null);
        assert.equal(answer.spawn.outcome, "aborted");
        const child = double.calls[0].child;
        assert.equal(child.stdin.ends.length, 1, "the double's stdin was ended");
        assert.equal(child.kills.length, 1, "…and it was killed");
        assert.ok(child.stdin.ends[0] <= child.kills[0].at, "…the end before the kill");
      }
      {
        const { answer } = await lane({ script: { stdout: JSON.stringify(DOC), exit: { code: 0 } } });
        assert.equal(answer.outcome, "document");
        assert.equal(answer.spawn.outcome, "exited");
        assert.equal(answer.spawn.deadlineMs, DEFAULT_DEADLINE_MS, "no deadlineMs → runBounded's own default");
      }
    },
  },
  {
    name: "129/02 task03 the module touches no run record and mints no reason — the runs/ listing is unchanged after every outcome, and no answer carries failureReason",
    async run() {
      const fx = await fixture();
      try {
        const { item, runId } = await mintRunning(fx);
        const listing = async () => (await readRuns(item)).map((run) => `${run.runId}:${run.state}`);
        const before = await listing();
        assert.deepEqual(before, [`${runId}:running`], "guard: one running record to watch");
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10);
        const runs = [
          ["document", { script: { stdout: JSON.stringify(DOC) } }],
          ["refused", { script: { stdout: JSON.stringify(REFUSAL), exit: { code: 1 } } }],
          ["died", { script: { stdout: "", stderr: "boom", exit: { code: 1 } } }],
          ["timeout", { deadlineMs: 30, script: { exit: null } }],
          ["aborted", { signal: controller.signal, graceMs: 5, script: { exit: null } }],
        ];
        for (const [expected, overrides] of runs) {
          const { answer } = await lane({ ref: "03/01", runId, lane: fx.projectRoot, ...overrides });
          assert.equal(answer.outcome, expected, `${expected}: reached`);
          assert.deepEqual(await listing(), before, `${expected}: the runs/ listing is unchanged`);
          assert.equal("failureReason" in answer, false, `${expected}: no failureReason on the answer`);
          if (["died", "timeout", "aborted"].includes(expected)) {
            assert.equal(answer.document == null || !("failureReason" in answer.document), true, `${expected}: no failureReason on the document either`);
          }
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/02 task03 src/loop is a declared exemption — in SOURCE_DIRECTORY_EXEMPTIONS with a why naming the ninth file or the loop-* root-leaf move, and holding its members under the threshold",
    async run() {
      const exemption = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "src/loop");
      assert.ok(exemption != null, "src/loop appears in SOURCE_DIRECTORY_EXEMPTIONS");
      assert.match(exemption.why, /ninth file/u, "the why names the ninth file");
      assert.match(exemption.why, /loop-\*.*root-leaf move|root-leaf move/u, "…and the loop-* root-leaf move");
      assert.match(exemption.why, /129\/02/u, "…and the story that bore it");
      const loopDir = fileURLToPath(new URL("../../src/loop/", import.meta.url));
      const members = (await readdir(loopDir, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
      assert.ok(members.includes("child-drive.mjs"), `src/loop/ holds child-drive.mjs (${members.join(", ")})`);
      assert.ok(members.length <= FLAT_LAYER_THRESHOLD, `src/loop/ holds ${members.length} members, under FLAT_LAYER_THRESHOLD (${FLAT_LAYER_THRESHOLD}) — the size claim leg 6 re-checks`);
    },
  },
  {
    name: "129/02 task03 a parseable non-object or trailing bytes are not a document — [], \"x\", null, 42, and a document followed by stray bytes",
    async run() {
      for (const stdout of ["[]", '"x"', "null", "42", `${JSON.stringify(DOC)}stray`]) {
        const { answer } = await lane({ script: { stdout, exit: { code: 0 } } });
        assert.equal(answer.outcome, "died", `${stdout.slice(0, 30)}: died`);
        assert.equal(answer.document, null, `${stdout.slice(0, 30)}: no document`);
      }
    },
  },
  {
    name: "129/02 task03 a document printed before a timeout still reaches the parent",
    async run() {
      const { answer } = await lane({ deadlineMs: 30, script: { stdout: JSON.stringify(DOC), exit: null } });
      assert.equal(answer.outcome, "timeout");
      assert.deepEqual(answer.document, DOC, "the document captured before the kill rides the timeout answer");
    },
  },
  {
    name: "129/02 task03 a missing required argument is a caller error — ref, phase, runId, lane each throw a TypeError naming the key, before any spawn",
    async run() {
      for (const key of ["ref", "phase", "runId", "lane"]) {
        const double = laneChildDouble({ stdout: JSON.stringify(DOC) });
        const args = { ref: "127/02", phase: "continue", runId: "r1", lane: LANE, spawnChild: double.spawnChild };
        delete args[key];
        await assert.rejects(
          () => spawnLaneDrive(args),
          (error) => error instanceof TypeError && error.message.includes(key),
          `${key}: a TypeError naming the key`,
        );
        assert.equal(double.calls.length, 0, `${key}: the spawn double was never called`);
      }
    },
  },
  // ── 129/07 task 02 — the drive carries the phase mode ────────────────────────
  //
  // `…/07_story_the-loop-settings-are-self-contained/tasks/02_the-drive-carries-the-phase-mode.feature`.
  // The flag is composed from `work.loop.agents.<phase>.mode` through the bounds home; unset is
  // byte-identical to HEAD (no flag), so the prompt's own `work.agents.mode` read is the fallback.
  ...[
    ["refine", {}, "/aof:refine 03/01"],
    ["refine", { loop: { agents: { refine: { mode: "solo" } } } }, "/aof:refine 03/01 --solo"],
    ["refine", { loop: { agents: { refine: { mode: "orchestrated" } } } }, "/aof:refine 03/01 --orchestrated"],
    ["refine", { loop: { agents: { continue: { mode: "solo" } } } }, "/aof:refine 03/01"],
    ["continue", { loop: { agents: { continue: { mode: "solo" } } } }, "/aof:continue 03/01 --solo"],
    ["continue", { loop: { agents: { refine: { mode: "solo" } } } }, "/aof:continue 03/01"],
    ["continue", { loop: { agents: { continue: { mode: "Solo" } } } }, "/aof:continue 03/01"],
    ["continue", { agents: { mode: "solo" } }, "/aof:continue 03/01"],
    ["verify", { loop: { agents: { continue: { mode: "solo" } } } }, "/aof:verify 03/01"],
  ].map(([phase, work, command]) => ({
    name: `129/07 task02 the phase drive composes the flag from the loop key, and nothing when unset [${phase}, ${JSON.stringify(work)} → ${command}]`,
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver();
        const workspace = { ...fx.workspace, config: { work: { ...fx.workspace.config.work, ...work } } };
        const byPhase = { refine: refineDriverCommand, continue: continueDriverCommand, verify: verifyDriverCommand };
        const result = await byPhase[phase].run({ ref: "03/01", dryRun: true }, { workspace, agentSessionDriverOptions: driver.options });
        assert.deepEqual(result, { ref: "03/01", phase, command });
        assert.equal(driver.spawnCalls.length, 0);
        // …and off a REAL child process, the config on disk: the CLI composes the same command.
        await mkdir(path.dirname(fx.workspace.configPath), { recursive: true });
        await writeFile(fx.workspace.configPath, `${JSON.stringify({ name: "drive-fixture", work: workspace.config.work }, null, 2)}\n`, "utf8");
        const child = spawnSyncHardened(process.execPath, [ENTRY, "work", "drive", phase, "03/01", "--dry-run", "--json"], { cwd: fx.projectRoot, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: process.env.AOF_GLOBAL_HOME ?? await mkdtemp(path.join(tmpdir(), "aof-drive-home-")) } });
        assert.equal(child.status, 0, `the child exited 0: ${child.stderr}`);
        assert.equal(JSON.parse(child.stdout).command, command, "the real CLI composes the same command");
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "129/07 task02 the two phases are independent — refine solo, continue orchestrated, under a solo workspace",
    async run() {
      const fx = await fixture();
      try {
        const workspace = { ...fx.workspace, config: { work: { ...fx.workspace.config.work, agents: { mode: "solo" }, loop: { agents: { refine: { mode: "solo" }, continue: { mode: "orchestrated" } } } } } };
        const refine = await refineDriverCommand.run({ ref: "03/01", dryRun: true }, { workspace });
        const cont = await continueDriverCommand.run({ ref: "03/01", dryRun: true }, { workspace });
        assert.equal(refine.command, "/aof:refine 03/01 --solo");
        assert.equal(cont.command, "/aof:continue 03/01 --orchestrated");
        assert.equal(phaseCommand("continue", "03/01", "orchestrated"), "/aof:continue 03/01 --orchestrated");
        assert.equal(phaseCommand("continue", "03/01", null), "/aof:continue 03/01");
        assert.equal(phaseCommand("continue", "03/01", "inline"), "/aof:continue 03/01", "a non-member composes no flag");
        assert.deepEqual(PHASE_MODE_FLAGS, { solo: "--solo", orchestrated: "--orchestrated" });
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/07 task02 the composed command is what the driver is launched with",
    async run() {
      const fx = await fixture();
      try {
        const driver = scriptedDriver("done", undefined, "sess-1");
        const workspace = { ...fx.workspace, config: { work: { ...fx.workspace.config.work, loop: { agents: { continue: { mode: "solo" } } } } } };
        await continueDriverCommand.run({ ref: "03/01" }, { workspace, agentSessionDriverOptions: driver.options, stdin: stdinDouble() });
        assert.equal(driver.spawnCalls.length, 1);
        assert.ok(driver.typed[0].startsWith("/aof:continue 03/01 --solo"), `the typed directive carries the flag: ${driver.typed[0].slice(0, 60)}`);
        const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
        const runs = await readRuns(item);
        assert.equal(runs.length, 1);
        assert.equal(runs[0].brief.phase ?? runs[0].brief?.loop?.phase ?? "continue", "continue");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "129/07 task02 ADR-001 §5 records the amendment — the two phase keys, --orchestrated and the fallback to work.agents.mode, dated 2026-09-15",
    async run() {
      const adr = await readFile(new URL("../../wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md", import.meta.url), "utf8");
      const start = adr.indexOf("## ADR-001");
      const end = adr.indexOf("## ADR-002");
      const body = adr.slice(start, end);
      assert.ok(body.includes("AMENDED 2026-09-15 (129/07"), "a dated amendment");
      for (const needle of ["work.loop.agents.refine.mode", "work.loop.agents.continue.mode", "--orchestrated", "read of `work.agents.mode` is the fallback"]) assert.ok(body.includes(needle), `the amendment names ${needle}`);
    },
  },
];
