import { defaultSessionDriver as _aofSessions } from "aof/session-services";
import { defaultFoundation as _aofFoundation } from "aof/foundation-services";
// test/terminal/session-screen-evidence.test.mjs — milestone 138 / story 00, task 05
// (05_every-stop-but-done-leaves-the-screen.feature; 138/ADR-004).
//
// Every case resets the sink with `setDegradeSinkForTest` and reads the events it wrote (QA 1). "Before
// the kill" is proved by the rows: the case draws `LAST-FRAME` on row 3 of the alternate buffer before
// each stop, and the event's rows are that frame, not a blank screen (QA 2). `packages/core/src/degrade.mjs` has no
// suite of its own, so the throttle cases live here, beside the evidence the key exists for (QA 4).
import assert from "node:assert/strict";
const driveInteractiveClaudeSession = _aofSessions.agentSessionDriver.driveInteractiveClaudeSession;
const openSessionScreen = _aofSessions.terminalSessionScreen.openSessionScreen;
import { CLAUDE_SCREENS } from "@aof/execution/terminal/claude-screens";
const reportDegrade = _aofFoundation.degrade.reportDegrade;
import { createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { captureDegrades } from "./screen-model.test.mjs";
import { BYTE_PATH, ESC, READY_CHUNKS, drive, screenPty, sleep, waitUntil, withRegistry } from "./session-screen-ready.test.mjs";

// Row 3 of the alternate buffer, erased first so it reads exactly `LAST-FRAME` over whatever was up,
// and ended by a newline so a line the case prints next is a line of its own.
const LAST_FRAME = `${ESC}[?1049h${ESC}[4;1H${ESC}[2KLAST-FRAME\r\n`;
const DEAD_PID = 0x7ffffffe;
const screenEvents = (sink) => sink.events.filter((event) => event.screen != null);
const neverWatch = ({ signal }) => new Promise((resolve) => signal.addEventListener("abort", () => resolve(null)));

// scripted({ ... }) — a SCRIPTED launch (commandDelayMs 0, no observeReadiness) over the case's PTY:
// the directive is typed on the next tick and the screen is whatever the case draws.
function scripted({ options = {}, pid, pty: given } = {}) {
  const { pty, spawn } = given ?? screenPty({ pid });
  const stops = [];
  const pending = driveInteractiveClaudeSession({ itemRef: "53/00", worktreeCwd: "/tmp/wt", command: "/aof:verify 53/00" }, {
    ptySpawn: spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: neverWatch,
    commandDelayMs: 0,
    killConfirmationMs: 50,
    onSessionStop: (event) => stops.push(event),
    ...options,
  });
  return { pty, pending, stops };
}

const failEntry = Object.freeze({ id: "test-fail", action: "fail", recognise: (snapshot) => snapshot.rows.some((row) => row.includes("TEST-FAIL")) });

const STOPS = [
  {
    stop: "heartbeat silence past the startup grace",
    outcome: "failed/timeout",
    code: "session-screen",
    start: () => scripted({ options: { deadlinePolicy: { startToCloseMs: 5000, heartbeatMs: 60, startupGraceMs: 60 }, readHeartbeatAt: async () => null } }),
    after: async () => {},
  },
  {
    stop: "start-to-close",
    outcome: "failed/timeout",
    code: "session-screen",
    start: () => scripted({ options: { deadlinePolicy: { startToCloseMs: 100 } } }),
    after: async () => {},
  },
  {
    stop: "the cap with no ready frame (a real launch)",
    outcome: "failed/timeout",
    code: "screen-not-ready",
    start: () => drive({ options: { readyCapMs: 120 } }),
    after: async () => {},
  },
  {
    stop: "no session id `acceptTimeoutMs` after the submit (a real launch)",
    outcome: "failed/timeout",
    code: "directive-not-accepted",
    start: () => drive({ options: { acceptTimeoutMs: 150 } }),
    before: async (pty) => {
      pty.emitAll(await READY_CHUNKS());
      await waitUntil(() => pty.writes.length >= 2);
    },
    after: async () => {},
  },
  {
    stop: "a `NEEDS_INPUT` line in the output",
    outcome: "needs-input",
    code: "session-screen",
    start: () => scripted(),
    after: async (pty) => pty.emit("NEEDS_INPUT\r\n"),
  },
  {
    stop: "the completion watch answering `needs-input`",
    outcome: "needs-input",
    code: "session-screen",
    start: () => {
      let answer = () => {};
      const run = scripted({
        options: {
          watchTranscriptSessionId: async () => "sess-x",
          watchTranscriptCompletion: () => new Promise((resolve) => { answer = resolve; }),
        },
      });
      return { ...run, answer: () => answer({ outcome: "needs-input", declared: true }) };
    },
    after: async (pty, run) => run.answer(),
  },
  {
    stop: "an injected `fail` entry's frame",
    outcome: "failed/blocked_screen",
    code: "session-screen",
    start: () => scripted({ options: withRegistry([CLAUDE_SCREENS[0], failEntry]) }),
    after: async (pty) => pty.emit(`${ESC}[7;1HTEST-FAIL`),
  },
  {
    stop: "the caller's signal aborting",
    outcome: "failed/cancelled",
    code: "session-screen",
    start: () => {
      const controller = new AbortController();
      return { ...scripted({ options: { signal: controller.signal } }), controller };
    },
    after: async (pty, run) => run.controller.abort(),
  },
  {
    stop: "the liveness probe finding the pid gone",
    outcome: "failed/agent_died",
    code: "session-screen",
    start: () => scripted({ pid: DEAD_PID, options: { livenessIntervalMs: 150 } }),
    after: async () => {},
  },
  {
    stop: "the PTY exiting 1 unasked",
    outcome: "failed/agent_error",
    code: "session-screen",
    start: () => scripted(),
    after: async (pty) => pty.exit(1),
  },
];

const ended = (result) => (result.failureReason == null ? result.outcome : `${result.outcome}/${result.failureReason}`);

export const sessionScreenEvidenceTests = [
  ...STOPS.map(({ stop, outcome, code, start, before, after }) => ({
    name: `138/00 task05 outline — each stop writes one event under its code, carrying the screen as drawn [${stop} → ${outcome}, ${code}]`,
    run: async () => {
      const sink = captureDegrades();
      try {
        const run = start();
        await waitUntil(() => run.pty.subscribed);
        await before?.(run.pty);
        run.pty.emit(LAST_FRAME);
        await sleep(20);
        await after(run.pty, run);
        const result = await run.pending;
        assert.equal(ended(result), outcome);
        const events = screenEvents(sink);
        assert.equal(events.length, 1, `exactly one screen event: ${JSON.stringify(events.map((event) => event.code))}`);
        assert.equal(events[0].code, code);
        assert.ok(events[0].message.includes("53/00") && events[0].message.includes(outcome), `the message names the ref and the outcome: ${events[0].message}`);
        assert.equal(events[0].screen.source, "screen");
        assert.ok(events[0].screen.rows.includes("LAST-FRAME"), `the rows are the frame as drawn, before the kill: ${JSON.stringify(events[0].screen.rows)}`);
        assert.equal("key" in events[0], false, "the throttle key is not written");
        // Ruling 7: the breadcrumb that carried the byte tail carries the event's evidence object now.
        if (code === "directive-not-accepted") {
          const breadcrumb = run.stops.find((event) => event.phase === "directive-not-accepted");
          assert.deepEqual(breadcrumb?.screen, events[0].screen, "the directive-not-accepted breadcrumb carries the same evidence as the event");
        }
      } finally {
        sink.restore();
      }
    },
  })),
  ...[
    {
      ending: "the PTY exits 0",
      outcome: "done",
      run: async () => {
        const run = scripted();
        await waitUntil(() => run.pty.subscribed);
        run.pty.emit(LAST_FRAME);
        await sleep(20);
        run.pty.exit(0);
        return run.pending;
      },
    },
    {
      ending: "the completion watch answers `done`",
      outcome: "done",
      run: async () => {
        let answer = () => {};
        const run = scripted({ options: { watchTranscriptSessionId: async () => "sess-x", watchTranscriptCompletion: () => new Promise((resolve) => { answer = resolve; }) } });
        await waitUntil(() => run.pty.subscribed);
        run.pty.emit(LAST_FRAME);
        await sleep(20);
        answer({ outcome: "done", declared: true });
        return run.pending;
      },
    },
    {
      ending: "the provider binary is absent",
      outcome: "failed/agent_error",
      run: async () => scripted({ options: { which: createFakeWhich([]) } }).pending,
    },
    {
      ending: "the caller's signal is already aborted before the spawn",
      outcome: "failed/cancelled",
      run: async () => scripted({ options: { signal: AbortSignal.abort() } }).pending,
    },
  ].map(({ ending, outcome, run }) => ({
    name: `138/00 task05 outline — a done settle and a session that never started leave nothing [${ending} → ${outcome}]`,
    run: async () => {
      const sink = captureDegrades();
      try {
        const result = await run();
        assert.equal(ended(result), outcome);
        await sleep(20);
        assert.deepEqual(screenEvents(sink), [], "no screen event");
      } finally {
        sink.restore();
      }
    },
  })),
  ...[
    {
      goesWrong: "throws from `term.kill()`",
      outcome: "failed/pty_kill_failed",
      pty: () => {
        const made = screenPty();
        made.pty.kill = () => { throw new Error("the pty would not die"); };
        return made;
      },
    },
    {
      goesWrong: "never sees an exit within the bound",
      outcome: "failed/pty_kill_unconfirmed",
      pty: () => {
        const made = screenPty();
        made.pty.kill = () => { made.pty.killed = true; };
        return made;
      },
    },
  ].map(({ goesWrong, outcome, pty }) => ({
    name: `138/00 task05 outline — a stop that goes wrong after it was asked for writes no second event [the release ${goesWrong} → ${outcome}]`,
    run: async () => {
      const sink = captureDegrades();
      try {
        const run = scripted({ pty: pty(), options: { deadlinePolicy: { startToCloseMs: 100 } } });
        await waitUntil(() => run.pty.subscribed);
        run.pty.emit(LAST_FRAME);
        const result = await run.pending;
        assert.equal(ended(result), outcome);
        await sleep(20);
        const events = screenEvents(sink);
        assert.equal(events.length, 1, "still exactly one screen event");
        assert.equal(events[0].code, "session-screen");
      } finally {
        sink.restore();
      }
    },
  })),
  {
    name: "138/00 task05 — evidence holds the visible screen and nothing above it",
    run: async () => {
      const sink = captureDegrades();
      try {
        const run = scripted({ options: { deadlinePolicy: { startToCloseMs: 150 } } });
        await waitUntil(() => run.pty.subscribed);
        run.pty.emit(Array.from({ length: 1000 }, (_, index) => `line ${index + 1}\r\n`).join(""));
        await run.pending;
        const [event] = screenEvents(sink);
        assert.ok(event.screen.rows.length <= 24, `at most 24 rows: ${event.screen.rows.length}`);
        assert.equal(event.screen.rows.filter((row) => row !== "").at(-1), "line 1000", "the last non-blank row is the last line drawn");
        assert.equal(event.screen.rows.includes("line 976"), false, "nothing above the viewport");
      } finally {
        sink.restore();
      }
    },
  },
  {
    name: "138/00 task05 — trailing blank rows are dropped, blank rows between are kept",
    run: async () => {
      const door = openSessionScreen({ cols: 80, rows: 24 });
      try {
        door.feed(`${ESC}[?1049h${ESC}[1;1Htop${ESC}[6;1Hmiddle`);
        const evidence = await door.evidence();
        assert.deepEqual(evidence, { source: "screen", buffer: "alternate", cursor: { row: 5, col: 6 }, rows: ["top", "", "", "", "", "middle"] });
      } finally {
        door.dispose();
      }
    },
  },
  {
    name: "138/00 task05 — with no model, the evidence is the byte tail, marked as such",
    run: async () => {
      const sink = captureDegrades();
      try {
        const run = scripted({ options: { ...BYTE_PATH, deadlinePolicy: { startToCloseMs: 100 } } });
        await waitUntil(() => run.pty.subscribed);
        run.pty.emit(`${"x".repeat(2000)}${LAST_FRAME}`);
        await run.pending;
        const [event] = screenEvents(sink);
        assert.equal(event.screen.source, "bytes");
        assert.deepEqual(Object.keys(event.screen).sort(), ["source", "tail"]);
        assert.ok(event.screen.tail.includes("LAST-FRAME"), event.screen.tail);
        assert.ok(event.screen.tail.length <= 600, `at most 600 characters: ${event.screen.tail.length}`);
      } finally {
        sink.restore();
      }
    },
  },
  {
    name: "138/00 task05 — two sessions in one process both leave their screens",
    run: async () => {
      const sink = captureDegrades();
      try {
        const runs = [scripted({ options: { deadlinePolicy: { startToCloseMs: 100 } } }), scripted({ options: { deadlinePolicy: { startToCloseMs: 100 } } })];
        await waitUntil(() => runs.every((run) => run.pty.subscribed));
        runs[0].pty.emit(`${ESC}[?1049h${ESC}[4;1HFRAME-A`);
        runs[1].pty.emit(`${ESC}[?1049h${ESC}[4;1HFRAME-B`);
        await Promise.all(runs.map((run) => run.pending));
        const events = screenEvents(sink).filter((event) => event.code === "session-screen");
        assert.equal(events.length, 2, "one session-screen event per drive");
        assert.deepEqual(events.map((event) => event.screen.rows.find((row) => row.startsWith("FRAME-"))).sort(), ["FRAME-A", "FRAME-B"], "each with its own rows");
      } finally {
        sink.restore();
      }
    },
  },
  ...[
    { first: undefined, second: undefined, events: 1, label: "no extra, then no extra → one event" },
    { first: { key: "a" }, second: { key: "b" }, events: 2, label: "`{ key: \"a\" }`, then `{ key: \"b\" }` → two events" },
    { first: { key: "a" }, second: { key: "a" }, events: 1, label: "`{ key: \"a\" }` twice → one event" },
    { first: { path: "p" }, second: { path: "p" }, events: 1, label: "`{ path: \"p\" }` twice → one event, carrying `path`, no `key`" },
    { first: { key: "a", screen: { source: "screen", rows: ["S"] } }, second: undefined, events: 2, label: "`{ key: \"a\", screen: S }`, then no extra → two events, the first carrying `screen`" },
  ].map(({ first, second, events, label }) => ({
    name: `138/00 task05 outline — the throttle is per code without a key, and per code and key with one [${label}]`,
    run: () => {
      const sink = captureDegrades();
      try {
        reportDegrade("c", new Error("one"), first);
        reportDegrade("c", new Error("two"), second);
        assert.equal(sink.events.length, events);
        for (const event of sink.events) assert.equal("key" in event, false, "the key is not written");
        if (first?.path != null) assert.equal(sink.events[0].path, "p");
        if (first?.screen != null) {
          assert.deepEqual(sink.events[0].screen, first.screen, "the first carries `screen`");
          assert.equal("screen" in sink.events[1], false, "the second carries none");
        }
      } finally {
        sink.restore();
      }
    },
  })),
];
