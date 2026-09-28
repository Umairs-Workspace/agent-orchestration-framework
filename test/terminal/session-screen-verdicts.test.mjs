// test/terminal/session-screen-verdicts.test.mjs — milestone 138 / story 00, task 04
// (04_every-verdict-the-screen-can-give-is-acted-on.feature; 138/ADR-003 §1 §4 §5 §6, ADR-006).
//
// Story 01 adds the real consent and fail entries and never edits the driver, so every action is
// wired and proved HERE through an injected registry (QA 1): `ready`, then `test-consent`
// (`consent`, option `Yes, I trust this folder`), `test-fail` (`fail`) and the real `usage-limit`.
// Each test entry recognises a frame by a marker row drawn on the alternate buffer. The suite asserts
// nothing about the shipped registry beyond entry zero, `usage-limit` and the shape (QA 3), so story
// 01's entries do not redden it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAUDE_SCREENS } from "../../src/terminal/claude-screens.mjs";
import { isRetryable } from "../../src/run-store.mjs";
import { loadFixture } from "./screen-model.test.mjs";
import { BRIEF, ESC, SUBMIT_KEY, READY_CHUNKS, drive, frame, pasteOf, sleep, waitUntil, withRegistry } from "./session-screen-ready.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROMPT = "❯";

const marked = (marker) => (snapshot) => snapshot.buffer === "alternate" && snapshot.rows.some((row) => row.includes(marker));
const usageLimit = CLAUDE_SCREENS.find((entry) => entry.id === "usage-limit");
const REGISTRY = [
  CLAUDE_SCREENS[0],
  Object.freeze({ id: "test-consent", action: "consent", option: "Yes, I trust this folder", recognise: marked("TEST-CONSENT") }),
  Object.freeze({ id: "test-fail", action: "fail", recognise: marked("TEST-FAIL") }),
  usageLimit,
];

const blank = () => Array.from({ length: 24 }, () => "");
const consentFrame = (menuRow = `${PROMPT} 1. Yes, I trust this folder`) => {
  const rows = blank();
  rows[3] = "TEST-CONSENT: do you trust the files in this folder?";
  rows[5] = menuRow;
  rows[6] = "  2. No, exit";
  return frame({ rows, cursor: { row: 5, col: 0 } });
};
const failFrame = () => {
  const rows = blank();
  rows[3] = "TEST-FAIL: a screen no retry gets past";
  return frame({ rows, cursor: { row: 3, col: 0 } });
};
const blankFrame = () => frame({ rows: blank(), cursor: { row: 0, col: 0 } });
// READY after a test frame: back to the normal buffer first, so the recording's own `?1049h` enters a
// fresh alternate screen exactly as claude's did.
const emitReady = async (pty) => pty.emitAll([`${ESC}[?1049l`, ...(await READY_CHUNKS())]);

const BLOCKED = (id, sessionId = null) => ({ outcome: "failed", failureReason: "blocked_screen", screen: { id }, sessionId });

export const sessionScreenVerdictsTests = [
  {
    name: "138/00 task04 — the shipped registry has the shape the door relies on",
    run: () => {
      assert.ok(Object.isFrozen(CLAUDE_SCREENS), "the registry is frozen");
      for (const entry of CLAUDE_SCREENS) assert.ok(Object.isFrozen(entry), `${entry.id} is frozen`);
      assert.equal(CLAUDE_SCREENS[0].id, "ready");
      assert.equal(CLAUDE_SCREENS[0].action, "type");
      const ids = CLAUDE_SCREENS.map((entry) => entry.id);
      assert.equal(new Set(ids).size, ids.length, "the ids are unique");
      assert.equal(usageLimit?.action, "wait", "one entry is `usage-limit`, a wait");
      for (const entry of CLAUDE_SCREENS) {
        assert.ok(["type", "consent", "fail", "wait"].includes(entry.action), `${entry.id}: its action is one of the four`);
        assert.equal(typeof entry.recognise, "function", `${entry.id}: it recognises`);
        if (entry.action === "consent") assert.ok(typeof entry.option === "string" && entry.option.length > 0, `${entry.id}: a consent names its option`);
      }
    },
  },
  {
    name: "138/00 task04 — a consent is answered with one Enter, and then the directive is typed on the box",
    run: async () => {
      const { pty, pending } = drive({ options: withRegistry(REGISTRY) });
      await waitUntil(() => pty.subscribed);
      pty.emit(consentFrame());
      await waitUntil(() => pty.writes.length >= 1);
      await emitReady(pty);
      await waitUntil(() => pty.writes.length >= 3);
      await sleep(30);
      assert.deepEqual(pty.writes, [SUBMIT_KEY, pasteOf(BRIEF.command), SUBMIT_KEY], "exactly the Enter, then the paste, then its Enter");
      pty.exit(0);
      assert.equal((await pending).outcome, "done");
    },
  },
  {
    name: "138/00 task04 — a consent frame repainted before claude takes the Enter is not a return",
    run: async () => {
      const { pty, pending } = drive({ options: withRegistry(REGISTRY) });
      await waitUntil(() => pty.subscribed);
      pty.emit(consentFrame());
      await waitUntil(() => pty.writes.length >= 1);
      pty.emit(consentFrame());
      await sleep(40);
      await emitReady(pty);
      await waitUntil(() => pty.writes.length >= 3);
      await sleep(30);
      assert.deepEqual(pty.writes, [SUBMIT_KEY, pasteOf(BRIEF.command), SUBMIT_KEY], "exactly one Enter precedes the paste");
      assert.equal(pty.killed, false, "the session is not stopped");
      pty.exit(0);
      await pending;
    },
  },
  ...[
    {
      label: "the `TEST-CONSENT` frame is emitted with its menu row `❯ 2. No, exit` → no write at all",
      play: async (pty) => pty.emit(consentFrame(`${PROMPT} 2. No, exit`)),
      writes: [],
    },
    {
      label: "`TEST-CONSENT` is answered, a blank alternate frame follows, then `TEST-CONSENT` returns → exactly one Enter",
      play: async (pty) => {
        pty.emit(consentFrame());
        await waitUntil(() => pty.writes.length >= 1);
        pty.emit(blankFrame());
        await sleep(40);
        pty.emit(consentFrame());
      },
      writes: [SUBMIT_KEY],
    },
    {
      label: "`READY` is emitted, the paste and its Enter are written, then `TEST-CONSENT` is emitted → the paste and its Enter only",
      play: async (pty) => {
        await emitReady(pty);
        await waitUntil(() => pty.writes.length >= 2);
        pty.emit(consentFrame());
      },
      writes: [pasteOf(BRIEF.command), SUBMIT_KEY],
    },
  ].map(({ label, play, writes }) => ({
    name: `138/00 task04 outline — a consent that cannot be given safely is a named failure [${label}]`,
    run: async () => {
      const { pty, pending } = drive({ options: withRegistry(REGISTRY) });
      await waitUntil(() => pty.subscribed);
      await play(pty);
      assert.deepEqual(await pending, BLOCKED("test-consent"));
      assert.deepEqual(pty.writes, writes, "what was written before the stop");
    },
  })),
  ...[
    { label: "before any ready frame", phase: "unready" },
    { label: "after the directive was typed, while the session-id watch is pending", phase: "typed" },
    { label: "after the session id was captured", phase: "captured" },
  ].map(({ label, phase }) => ({
    name: `138/00 task04 outline — a blocking screen stops the session by name within a frame, whatever the phase [${label}]`,
    run: async () => {
      let releaseId = () => {};
      const idWatch = phase === "captured"
        ? { watchTranscriptSessionId: () => new Promise((resolve) => { releaseId = resolve; }), watchTranscriptCompletion: ({ signal }) => new Promise((resolve) => signal.addEventListener("abort", () => resolve(null))) }
        : {};
      const { pty, pending, stops } = drive({ options: { ...withRegistry(REGISTRY), ...idWatch } });
      await waitUntil(() => pty.subscribed);
      if (phase !== "unready") {
        await emitReady(pty);
        await waitUntil(() => pty.writes.length >= 2);
      }
      if (phase === "captured") {
        releaseId("sess-x");
        await sleep(20);
      }
      const writesBefore = pty.writes.length;
      const emittedAt = Date.now();
      pty.emit(failFrame());
      await waitUntil(() => stops.some((event) => event.phase === "stop-requested"), 1000);
      const requested = stops.find((event) => event.phase === "stop-requested");
      assert.equal(requested.failureReason, "blocked_screen", "the stop names the reason");
      assert.ok(Date.now() - emittedAt < 1000, "within a frame, not a deadline");
      const result = await pending;
      assert.deepEqual(result, BLOCKED("test-fail", phase === "captured" ? "sess-x" : null), "the drive resolves by the screen's name, with the session id it had");
      assert.equal(pty.killed, true, "the PTY was killed");
      assert.deepEqual(stops.map((event) => event.phase).filter((name) => ["stop-requested", "pty-released", "exit-confirmed"].includes(name)), ["stop-requested", "pty-released", "exit-confirmed"], "through the stop bracket");
      assert.equal(pty.writes.length, writesBefore, "nothing more was written");
    },
  })),
  {
    name: "138/00 task04 — a blocked session is not retried: the closed classifier fails closed, and its vocabulary is unedited",
    run: async () => {
      assert.equal(isRetryable("blocked_screen"), false);
      for (const reason of ["runtime_offline", "timeout", "session_limit"]) assert.equal(isRetryable(reason), true, reason);
      const source = await readFile(path.join(repoRoot, "src", "run-store.mjs"), "utf8");
      const declared = /const RETRYABLE_REASONS = new Set\(\[([^\]]*)\]\);/u.exec(source);
      assert.ok(declared != null, "RETRYABLE_REASONS is declared where it always was");
      assert.deepEqual(declared[1].split(",").map((token) => token.trim().replace(/^"|"$/gu, "")), ["runtime_offline", "timeout", "session_limit"]);
    },
  },
  ...[
    ["Usage limit reached · continuing automatically at 1:40pm", "Usage limit reached"],
    ["You've hit your session limit · resets 1:40pm (Europe/London)", "You've hit your session limit"],
    ["Refine of 127/03 · Archive is a move is complete.", null],
  ].map(([line, beginning]) => ({
    name: `138/00 task04 outline — the provider wait is read from the screen [${line.slice(0, 40)}… → ${beginning == null ? "never" : "once"}]`,
    run: async () => {
      const { pty, pending, stops } = drive();
      await waitUntil(() => pty.subscribed);
      pty.emit(`${ESC}[?1049h${ESC}[2J${ESC}[6;1H${ESC}[33m${line}${ESC}[39m`);
      await sleep(40);
      // A second frame with the line still up is a second sighting, not a second report.
      pty.emit(`${ESC}[1;1Hrepaint`);
      await sleep(60);
      const waits = stops.filter((event) => event.phase === "provider-wait");
      if (beginning == null) {
        assert.equal(waits.length, 0, "never recorded");
      } else {
        assert.equal(waits.length, 1, "recorded once");
        assert.ok(waits[0].detail.startsWith(beginning), `its detail begins \`${beginning}\`: ${JSON.stringify(waits[0].detail)}`);
      }
      pty.exit(0);
      await pending;
    },
  })),
  {
    name: "138/00 task04 — a wait still on screen is not refreshed by the clock: a newer heartbeat restores the rule, and the session stops on it before start-to-close",
    run: async () => {
      const recording = await loadFixture("usage-limit");
      let emittedAt = null;
      const startedAt = Date.now();
      const { pty, pending, stops } = drive({
        options: {
          deadlinePolicy: { startToCloseMs: 2000, heartbeatMs: 30, startupGraceMs: 5 },
          readHeartbeatAt: async () => (emittedAt == null ? null : new Date(emittedAt + 50).toISOString()),
        },
      });
      await waitUntil(() => pty.subscribed);
      emittedAt = Date.now();
      pty.emitAll(recording.chunks.map((chunk) => chunk.d));
      const result = await pending;
      assert.equal(result.outcome, "failed");
      assert.equal(result.failureReason, "timeout");
      assert.ok(Date.now() - startedAt < 1500, `stopped by the heartbeat rule (${Date.now() - startedAt} ms), not by start-to-close at 2,000 ms`);
      assert.ok(stops.some((event) => event.phase === "provider-wait"), "the wait was on screen");
    },
  },
];
