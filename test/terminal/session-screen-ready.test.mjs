// test/terminal/session-screen-ready.test.mjs — milestone 138 / story 00, task 03
// (03_the-directive-is-typed-on-the-input-box.feature; 138/ADR-002).
//
// The recogniser's cases are frames built by writing escape sequences into a REAL model, or the
// committed recordings replayed (QA 1); no case hand-builds a snapshot. The driver's cases inject
// `openSessionScreen`: the real door over the real model for the screen path, and the real door with
// a `load` that throws for the byte path (QA 2). A case that must reach the cap draws a frame no v1
// entry claims, never `first-run.json`, which story 01 registers as blocking (QA 5). Every wait is
// bounded by a wall limit far above what it needs (QA 4).
//
// This file also exports the driven-PTY double and the frame builder the verdict and evidence suites
// share, so one double drives every screen case.
import assert from "node:assert/strict";
import { driveInteractiveClaudeSession } from "../../packages/core/src/agent-session-driver.mjs";
import { openSessionScreen } from "../../packages/core/src/terminal/session-screen.mjs";
import { CLAUDE_SCREENS } from "@aof/execution/terminal/claude-screens";
import { createScreen } from "../../packages/core/src/terminal/screen.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";
import { captureDegrades, loadFixture, replay } from "./screen-model.test.mjs";

export const ESC = String.fromCharCode(27);
export const SUBMIT_KEY = String.fromCharCode(13);
export const BRIEF = { itemRef: "53/00", worktreeCwd: "/tmp/wt", task: "the driver reads the screen", command: "/aof:verify 53/00" };
export const pasteOf = (text) => `${ESC}[200~${text}${ESC}[201~`;
const PROMPT = "❯";
const RULE = "─";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function waitUntil(predicate, ms = 10_000) {
  const until = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > until) throw new Error(`waitUntil: condition never held within ${ms}ms`);
    await sleep(5);
  }
}

// screenPty({ onWrite, pid }) — a PTY the CASE drives: `emit(chunk)` plays claude's output when the
// case chooses, `exit(code)` ends it unasked, and `kill()` confirms through onExit as node-pty does.
// `onWrite(chunk, pty)` runs inside `write`, so a case can react to the exact bytes the driver typed.
// No pid by default: the liveness probe stays off unless a case names one.
export function screenPty({ onWrite, pid } = {}) {
  const data = [];
  const exits = [];
  const pty = {
    pid,
    writes: [],
    killed: false,
    onData(cb) { data.push(cb); return { dispose() { data.splice(data.indexOf(cb), 1); } }; },
    onExit(cb) { exits.push(cb); return { dispose() { exits.splice(exits.indexOf(cb), 1); } }; },
    write(chunk) { pty.writes.push(chunk); onWrite?.(chunk, pty); },
    resize() {},
    kill() { pty.killed = true; exits.slice().forEach((cb) => cb({ exitCode: 0 })); },
    emit(chunk) { data.slice().forEach((cb) => cb(chunk)); },
    emitAll(chunks) { for (const chunk of chunks) pty.emit(chunk); },
    exit(code = 0) { exits.slice().forEach((cb) => cb({ exitCode: code })); },
    get subscribed() { return data.length > 0; },
  };
  return { pty, spawn: async () => pty };
}

// A session-id watch that never resolves on its own (the Background's), released by the abort.
export const pendingWatch = ({ signal }) => new Promise((resolve) => signal.addEventListener("abort", () => resolve(null)));

// drive({ options, onWrite, pid }) — a REAL launch over the case's PTY: `observeReadiness`, a
// positive floor, the Enter on the next tick (`submitDelayMs: 0`), and the never-resolving watch.
export function drive({ options = {}, onWrite, pid, brief = BRIEF } = {}) {
  const { pty, spawn } = screenPty({ onWrite, pid });
  const stops = [];
  const startedAt = Date.now();
  const pending = driveInteractiveClaudeSession(brief, {
    ptySpawn: spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: pendingWatch,
    observeReadiness: true,
    commandDelayMs: 10,
    readyCapMs: 5000,
    submitDelayMs: 0,
    onSessionStop: (event) => stops.push(event),
    ...options,
  });
  return { pty, pending, stops, startedAt };
}

export const withRegistry = (registry) => ({ openSessionScreen: (options) => openSessionScreen({ ...options, registry }) });
const noScreenModel = () => { throw Object.assign(new Error("Cannot find package '@xterm/headless'"), { code: "ERR_MODULE_NOT_FOUND" }); };
export const BYTE_PATH = { openSessionScreen: (options) => openSessionScreen({ ...options, load: noScreenModel }) };

// frame({ alternate, rows, cursor }) — the escape sequences that draw `rows` on a cleared screen of
// the chosen buffer and leave the cursor at `cursor` (zero-based).
export function frame({ alternate = true, rows, cursor }) {
  let out = `${alternate ? `${ESC}[?1049h` : `${ESC}[?1049l`}${ESC}[2J${ESC}[H`;
  rows.forEach((text, index) => {
    if (text) out += `${ESC}[${index + 1};1H${text}`;
  });
  return `${out}${ESC}[${cursor.row + 1};${cursor.col + 1}H`;
}

// The REPL frame as recorded, as rows and a cursor to rebuild variants from.
export async function readyFrame() {
  const snapshot = await replay(await loadFixture("ready"));
  return { rows: [...snapshot.rows], cursor: { ...snapshot.cursor } };
}

export const READY_CHUNKS = async () => (await loadFixture("ready")).chunks.map((chunk) => chunk.d);

async function recognisedAsReady(chunks) {
  const screen = await createScreen({ cols: 80, rows: 24 });
  try {
    for (const chunk of chunks) await screen.write(chunk);
    return Boolean(CLAUDE_SCREENS[0].recognise(screen.snapshot()));
  } finally {
    screen.dispose();
  }
}

const READY_ROW = async () => (await readyFrame()).cursor.row;

export const sessionScreenReadyTests = [
  ...[
    ["the `ready.json` recording", async () => READY_CHUNKS(), true],
    ["the `ready.classic.json` recording: the classic renderer's box on the normal buffer", async () => (await loadFixture("ready.classic")).chunks.map((chunk) => chunk.d), true],
    ["the `first-run.json` recording", async () => (await loadFixture("first-run")).chunks.map((chunk) => chunk.d), false],
    ["the `ready.json` frame redrawn on the normal buffer", async () => {
      const base = await readyFrame();
      return [frame({ alternate: false, ...base })];
    }, true],
    ["the `ready.json` frame redrawn on the normal buffer with the `❯` row indented by one space", async () => {
      const base = await readyFrame();
      base.rows[base.cursor.row] = ` ${base.rows[base.cursor.row]}`;
      return [frame({ alternate: false, rows: base.rows, cursor: { row: base.cursor.row, col: base.cursor.col + 1 } })];
    }, false],
    ["the `ready.json` frame with the `❯` row indented by one space", async () => {
      const base = await readyFrame();
      base.rows[base.cursor.row] = ` ${base.rows[base.cursor.row]}`;
      return [frame({ rows: base.rows, cursor: { row: base.cursor.row, col: base.cursor.col + 1 } })];
    }, false],
    ["the `ready.json` frame with both rules drawn in `╌`", async () => {
      const base = await readyFrame();
      base.rows[base.cursor.row - 1] = "╌".repeat(80);
      base.rows[base.cursor.row + 1] = "╌".repeat(80);
      return [frame(base)];
    }, false],
    ["the `ready.json` frame with the lower rule 79 characters wide", async () => {
      const base = await readyFrame();
      base.rows[base.cursor.row + 1] = RULE.repeat(79);
      return [frame(base)];
    }, false],
    ["the `ready.json` frame with the cursor moved two rows up", async () => {
      const base = await readyFrame();
      return [frame({ rows: base.rows, cursor: { row: base.cursor.row - 2, col: base.cursor.col } })];
    }, false],
    ["a resumed frame: earlier turns above, each user turn a row beginning `❯`, the live box at the cursor", async () => {
      const base = await readyFrame();
      base.rows[8] = `${PROMPT} refine the first story`;
      base.rows[9] = "● Refined.";
      base.rows[11] = `${PROMPT} and the second`;
      base.rows[12] = "● Refined too.";
      return [frame(base)];
    }, true],
    ["that resumed frame with the live box erased and the cursor left on the last earlier `❯` row", async () => {
      const base = await readyFrame();
      base.rows[8] = `${PROMPT} refine the first story`;
      base.rows[9] = "● Refined.";
      base.rows[11] = `${PROMPT} and the second`;
      base.rows[12] = "● Refined too.";
      for (const row of [base.cursor.row - 1, base.cursor.row, base.cursor.row + 1]) base.rows[row] = "";
      return [frame({ rows: base.rows, cursor: { row: 11, col: 2 } })];
    }, false],
    ["an alternate buffer whose cursor row is `❯` on the top row, with nothing above it", async () => {
      const rows = Array.from({ length: 24 }, () => "");
      rows[0] = `${PROMPT} Try "anything"`;
      rows[1] = RULE.repeat(80);
      return [frame({ rows, cursor: { row: 0, col: 2 } })];
    }, false],
  ].map(([label, chunks, ready]) => ({
    name: `138/00 task03 outline — only the input box is ready [${label} → ${ready ? "yes" : "no"}]`,
    run: async () => {
      assert.equal(await recognisedAsReady(await chunks()), ready, label);
    },
  })),
  {
    name: "138/00 task03 — the directive is pasted on the first ready frame, without waiting for the floor, and the Enter is its own write",
    run: async () => {
      const chunks = await READY_CHUNKS();
      const { pty, pending, startedAt } = drive({ options: { commandDelayMs: 5000, readyCapMs: 10_000, submitDelayMs: undefined } });
      await sleep(20);
      pty.emitAll(chunks);
      await waitUntil(() => pty.writes.length >= 1, 10_000);
      const pastedAfterMs = Date.now() - startedAt;
      assert.equal(pty.writes[0], pasteOf(BRIEF.command), "the first write is the directive's bracketed paste");
      assert.ok(pastedAfterMs < 1000, `pasted ${pastedAfterMs} ms after the spawn — the 5,000 ms floor was not waited for`);
      await waitUntil(() => pty.writes.length >= 2, 10_000);
      assert.equal(pty.writes[1], SUBMIT_KEY, "the Enter is the second write, on its own");
      pty.exit(0);
      assert.equal((await pending).outcome, "done");
    },
  },
  {
    name: "138/00 task03 — on the classic renderer the directive is pasted on the box on the normal buffer, not at the cap",
    run: async () => {
      const chunks = (await loadFixture("ready.classic")).chunks.map((chunk) => chunk.d);
      const sink = captureDegrades();
      try {
        const { pty, pending, startedAt } = drive({ options: { commandDelayMs: 5000, readyCapMs: 10_000, submitDelayMs: undefined } });
        await sleep(20);
        pty.emitAll(chunks);
        await waitUntil(() => pty.writes.length >= 1, 10_000);
        const pastedAfterMs = Date.now() - startedAt;
        assert.equal(pty.writes[0], pasteOf(BRIEF.command), "the first write is the directive's bracketed paste");
        assert.ok(pastedAfterMs < 1000, `pasted ${pastedAfterMs} ms after the spawn — neither the floor nor the 10,000 ms cap was waited for`);
        pty.exit(0);
        assert.equal((await pending).outcome, "done");
        assert.deepEqual(sink.events.map((event) => event.code).filter((code) => code === "screen-not-ready" || code === "tui-ready-marker-absent"), [], "no cap and no byte-gate line");
      } finally {
        sink.restore();
      }
    },
  },
  {
    name: "138/00 task03 — nothing ready, nothing typed: the cap stops the session `failed / timeout`, with the screen recorded under `screen-not-ready`",
    run: async () => {
      const sink = captureDegrades();
      try {
        const { pty, pending } = drive({ options: { commandDelayMs: 10, readyCapMs: 80 } });
        await waitUntil(() => pty.subscribed);
        pty.emit(`${ESC}[?1049h`);
        pty.emit(`${ESC}[1;1HStarting…`);
        const result = await pending;
        assert.equal(result.outcome, "failed");
        assert.equal(result.failureReason, "timeout");
        assert.deepEqual(pty.writes, [], "the PTY received no write at all");
        const notReady = sink.events.filter((event) => event.code === "screen-not-ready");
        assert.equal(notReady.length, 1, "one screen-not-ready event");
        assert.ok(notReady[0].screen.rows[0].startsWith("Starting…"), `its rows begin with the frame that was up: ${JSON.stringify(notReady[0].screen.rows)}`);
      } finally {
        sink.restore();
      }
    },
  },
  {
    name: "138/00 task03 — a ready frame in several chunks is one recognition pass and one paste",
    run: async () => {
      let calls = 0;
      const ready = { ...CLAUDE_SCREENS[0], recognise: (snapshot) => { calls += 1; return CLAUDE_SCREENS[0].recognise(snapshot); } };
      const chunks = await READY_CHUNKS();
      assert.ok(chunks.length > 1, "the recording arrives in several chunks");
      const { pty, pending } = drive({ options: withRegistry([ready]) });
      await waitUntil(() => pty.subscribed);
      pty.emitAll(chunks);
      await waitUntil(() => pty.writes.length >= 2);
      await sleep(30);
      assert.equal(calls, 1, "recognise ran once for the burst");
      assert.equal(pty.writes.filter((write) => write === pasteOf(BRIEF.command)).length, 1, "the paste was written once");
      pty.exit(0);
      await pending;
    },
  },
  {
    name: "138/00 task03 — a scripted launch keeps its fixed write whatever is on screen",
    run: async () => {
      const scripted = createFakePtySpawn({ onWrite: ({ chunk, emitExit }) => { if (chunk === SUBMIT_KEY) emitExit(0); } });
      const pending = driveInteractiveClaudeSession(BRIEF, { ptySpawn: scripted.spawn, which: createFakeWhich(["claude"]), watchTranscriptSessionId: async () => null, commandDelayMs: 0 });
      await sleep(0);
      await sleep(0);
      assert.equal(scripted.ptys[0].writes[0], pasteOf(BRIEF.command), "the paste is written on the next tick, as it is today, with nothing on screen");
      assert.equal((await pending).outcome, "done");
    },
  },
  ...[
    {
      label: "paste ON split across two chunks, then ` prompt` → the paste is written once the ON is seen, after the floor",
      cap: 5000,
      play: async (pty) => {
        const on = `${ESC}[?2004h`;
        pty.emit(`startup${on.slice(0, 4)}`);
        pty.emit(`${on.slice(4)} prompt`);
        await waitUntil(() => pty.writes.length >= 1);
        assert.equal(pty.writes[0], pasteOf(BRIEF.command));
      },
    },
    {
      label: "the pre-REPL ON, keyboard modes and queries, then OFF → nothing is written",
      cap: 5000,
      play: async (pty) => {
        pty.emit(`${ESC}[?2004h${ESC}[?2031h${ESC}[?1004h${ESC}[<u${ESC}[>5u`);
        pty.emit(`${ESC}[>0q${ESC}[?u`);
        pty.emit(`${ESC}[>4m${ESC}[<u${ESC}[?2031l${ESC}[?2004l`);
        await sleep(100);
        assert.deepEqual(pty.writes, [], "nothing is written");
      },
    },
    {
      label: "the pre-REPL ON…OFF, the REPL's ON and title, then `ESC[?1049h` and the banner → the paste is written after the banner",
      cap: 5000,
      play: async (pty) => {
        pty.emit(`${ESC}[?2004h${ESC}[>0q${ESC}[?u${ESC}[?2004l`);
        pty.emit(`${ESC}[?2004h${ESC}]0;✳ Claude Code${String.fromCharCode(7)}`);
        await sleep(40);
        assert.deepEqual(pty.writes, [], "a title is not a drawn frame");
        pty.emit(`${ESC}[?1049h${ESC}[2J${ESC}[H ▐▛███▛█ Claude Code v2.1.283`);
        await waitUntil(() => pty.writes.length >= 1);
        assert.equal(pty.writes[0], pasteOf(BRIEF.command));
      },
    },
    {
      label: "nothing → the paste is written at the cap, and `tui-ready-marker-absent` is recorded",
      cap: 60,
      play: async (pty, stops) => {
        await waitUntil(() => pty.writes.length >= 1);
        assert.equal(pty.writes[0], pasteOf(BRIEF.command));
        assert.ok(stops.some((event) => event.phase === "tui-ready-marker-absent"), stops.map((event) => event.phase).join(","));
      },
    },
  ].map(({ label, cap, play }) => ({
    name: `138/00 task03 outline — with no model, the byte gate is today's [${label}]`,
    run: async () => {
      const { pty, pending, stops } = drive({ options: { ...BYTE_PATH, commandDelayMs: 10, readyCapMs: cap } });
      await waitUntil(() => pty.subscribed);
      await play(pty, stops);
      pty.exit(0);
      await pending;
    },
  })),
  {
    name: "138/00 task03 — the resubmit reads the parked paste from the input box: one more Enter, `directive-resubmitted`, and never a third",
    run: async () => {
      const chunks = await READY_CHUNKS();
      const row = await READY_ROW();
      let enters = 0;
      const { pty, pending, stops } = drive({
        options: { acceptTimeoutMs: 400, resubmitAfterMs: 60 },
        // claude parks the paste: its placeholder is drawn on the input row the moment the Enter lands.
        onWrite: (chunk, target) => {
          if (chunk !== SUBMIT_KEY) return;
          enters += 1;
          if (enters === 1) target.emit(`${ESC}[${row + 1};3H[Pasted text #1 +1 lines]${ESC}[K`);
        },
      });
      await waitUntil(() => pty.subscribed);
      pty.emitAll(chunks);
      const result = await pending;
      assert.equal(result.failureReason, "timeout", "still no session: the acceptance watch settles it as before");
      assert.deepEqual(pty.writes, [pasteOf(BRIEF.command), SUBMIT_KEY, SUBMIT_KEY], "one more Enter, and never a third");
      assert.ok(stops.some((event) => event.phase === "directive-resubmitted"), stops.map((event) => event.phase).join(","));
    },
  },
  ...[
    ["nothing more is drawn", () => null],
    ["`[Pasted text #1 +1 lines]` is drawn on row 2, above the upper rule", () => `${ESC}7${ESC}[2;1H[Pasted text #1 +1 lines]${ESC}8`],
    ["the directive's own text is echoed on the input row", (row) => `${ESC}[${row + 1};3H${BRIEF.command}${ESC}[K`],
    ["the input box is replaced by a select menu whose highlighted row is `❯ 1. Use this server`", (row) => `${ESC}7${ESC}[${row};1H${ESC}[2KNew MCP server found in .mcp.json: example-mcp${ESC}[${row + 1};1H${ESC}[2K${PROMPT} 1. Use this server${ESC}[${row + 2};1H${ESC}[2K  2. Continue without${ESC}8`],
  ].map(([label, draw]) => ({
    name: `138/00 task03 outline — nothing parked in the box, no extra Enter [${label}]`,
    run: async () => {
      const chunks = await READY_CHUNKS();
      const row = await READY_ROW();
      let drawn = false;
      const { pty, pending, stops } = drive({
        options: { acceptTimeoutMs: 300, resubmitAfterMs: 60 },
        onWrite: (chunk, target) => {
          if (chunk !== SUBMIT_KEY || drawn) return;
          drawn = true;
          const bytes = draw(row);
          if (bytes != null) target.emit(bytes);
        },
      });
      await waitUntil(() => pty.subscribed);
      pty.emitAll(chunks);
      const result = await pending;
      assert.equal(result.outcome, "failed");
      assert.equal(result.failureReason, "timeout");
      assert.equal(pty.writes.length, 2, `the paste and its one Enter, nothing more: ${JSON.stringify(pty.writes)}`);
      assert.equal(stops.some((event) => event.phase === "directive-resubmitted"), false);
    },
  })),
  {
    // 138/02's live leg: from a shell with no TERM, claude 2.1.283 on Windows drew `>` for `❯`, so
    // nothing on screen could be recognised and the drive ran to the cap. node-pty sets TERM from
    // the spawn's `name` off Windows only, so the launch env carries it on every platform.
    name: "138/02 — the session is told the terminal the model emulates: TERM is the PTY's name, whatever the launching shell's was",
    run: async () => {
      const spawned = [];
      const { pty, spawn } = screenPty();
      const pending = driveInteractiveClaudeSession(BRIEF, {
        ptySpawn: async (bin, args, options) => { spawned.push(options); return spawn(); },
        which: createFakeWhich(["claude"]),
        watchTranscriptSessionId: pendingWatch,
        env: { PATH: "/stub/bin", TERM: "dumb", TERM_PROGRAM: "vscode" },
      });
      await waitUntil(() => spawned.length === 1 && pty.subscribed);
      pty.exit(0);
      await pending;
      assert.equal(spawned[0].name, "xterm-256color", "the PTY is an xterm-256color, the terminal the model emulates");
      assert.equal(spawned[0].env.TERM, spawned[0].name, "the session's TERM names the PTY, not the launching shell's `dumb`");
      assert.equal(Object.hasOwn(spawned[0].env, "TERM_PROGRAM"), false, "the editor-attachment scrub still removes TERM_PROGRAM");
    },
  },
];
