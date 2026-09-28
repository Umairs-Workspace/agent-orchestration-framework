// test/terminal/screen-model.test.mjs — milestone 138 / story 00, task 02
// (02_one-screen-model-renders-what-claude-drew.feature; 138/ADR-001 §1-§4, ADR-003 §7).
//
// The model is proved against claude's own recordings: each fixture's chunks are written in order,
// each write awaited (QA 1: `t` is never waited on), and one snapshot is read. The load seam is how
// the degrade is proved: each case injects a FRESH loader, so the per-loader memo needs no reset.
//
// This file also exports the replay helpers the other terminal suites read the recordings through,
// so a recording is loaded and rendered one way everywhere.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScreen } from "../../src/terminal/screen.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "claude-screens");

// loadFixture(id) — `test/fixtures/claude-screens/<id>.json`: `{ claude, cols, rows, chunks }`.
export async function loadFixture(id) {
  return JSON.parse(await readFile(path.join(fixtureDir, `${id}.json`), "utf8"));
}

// replay(fixture, model?) — writes every chunk in order, awaiting each, and answers the snapshot.
export async function replay(fixture, model = null) {
  const screen = model ?? await createScreen({ cols: fixture.cols, rows: fixture.rows });
  for (const chunk of fixture.chunks) await screen.write(chunk.d);
  const snapshot = screen.snapshot();
  if (model == null) screen.dispose();
  return snapshot;
}

// captureDegrades() — the injected test sink (QA 2): every event it receives, until `restore()`.
export function captureDegrades() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return { events, restore: () => setDegradeSinkForTest(undefined) };
}

const PROMPT = "❯";
const RULE = "─";

export const screenModelTests = [
  {
    name: "138/00 task02 — the REPL recording renders as the frame claude drew: the alternate buffer, 24 rows, the cursor on the `❯` row between two full rules",
    run: async () => {
      const snapshot = await replay(await loadFixture("ready"));
      assert.equal(snapshot.buffer, "alternate");
      assert.equal(snapshot.rows.length, 24);
      const { row, col } = snapshot.cursor;
      assert.ok(snapshot.rows[row].startsWith(PROMPT), `the cursor's row begins with the prompt at column 0: ${JSON.stringify(snapshot.rows[row])}`);
      assert.equal(col, 2, "the cursor sits after `❯ `");
      assert.equal(snapshot.rows[row - 1], RULE.repeat(80), "the row above is 80 rules");
      assert.equal(snapshot.rows[row + 1], RULE.repeat(80), "the row below is 80 rules");
    },
  },
  {
    name: "138/00 task02 — the first-run recording renders on the normal buffer, its menu `❯` indented and its rules dashed",
    run: async () => {
      const fixture = await loadFixture("first-run");
      const snapshot = await replay(fixture);
      assert.equal(snapshot.buffer, "normal");
      assert.equal(snapshot.rows.length, fixture.rows);
      assert.equal(snapshot.rows.filter((row) => row === ` ${PROMPT} 2. Dark mode ✔`).length, 1, "one row holds ` ❯ 2. Dark mode ✔`");
      assert.ok(snapshot.rows.some((row) => row.trim().length > 0 && [...row.trim()].every((char) => char === "╌")), "one row is a run of `╌`");
    },
  },
  {
    name: "138/00 task02 — a write settles only after the chunk is parsed",
    run: async () => {
      const screen = await createScreen({ cols: 80, rows: 24 });
      try {
        await screen.write("hello");
        const snapshot = screen.snapshot();
        assert.equal(snapshot.rows[0], "hello");
        assert.deepEqual(snapshot.cursor, { row: 0, col: 5 });
      } finally {
        screen.dispose();
      }
    },
  },
  {
    name: "138/00 task02 — the model holds no history: it is constructed with the PTY's size and `scrollback: 0`",
    run: async () => {
      const constructed = [];
      class RecordingTerminal {
        constructor(options) { constructed.push(options); }
      }
      const screen = await createScreen({ cols: 80, rows: 24, load: async () => ({ Terminal: RecordingTerminal }) });
      assert.notEqual(screen, null, "a module with a Terminal export is a model");
      assert.equal(constructed.length, 1);
      assert.equal(constructed[0].cols, 80);
      assert.equal(constructed[0].rows, 24);
      assert.equal(constructed[0].scrollback, 0);
    },
  },
  {
    name: "138/00 task02 — a line pushed off the top is gone",
    run: async () => {
      const screen = await createScreen({ cols: 80, rows: 24 });
      try {
        for (let n = 1; n <= 30; n += 1) await screen.write(`line ${n}\r\n`);
        const { rows } = screen.snapshot();
        assert.equal(rows.includes("line 7"), false, "no row is `line 7`");
        assert.equal(rows[0], "line 8");
        assert.equal(rows[22], "line 30");
        assert.equal(rows[23], "");
      } finally {
        screen.dispose();
      }
    },
  },
  ...[
    ["ready", (claude) => /^\d+\.\d+\.\d+$/u.test(claude), "a version string"],
    ["first-run", (claude) => /^\d+\.\d+\.\d+$/u.test(claude), "a version string"],
    ["usage-limit", (claude) => claude.startsWith("synthetic:"), "a string beginning `synthetic:`"],
  ].map(([id, source, expected]) => ({
    name: `138/00 task02 outline — every fixture records its source and replays at its own size [${id}.json → ${expected}]`,
    run: async () => {
      const fixture = await loadFixture(id);
      assert.equal(typeof fixture.claude, "string");
      assert.ok(source(fixture.claude), `${id}.json's \`claude\` is ${expected}: ${JSON.stringify(fixture.claude)}`);
      assert.ok(Array.isArray(fixture.chunks) && fixture.chunks.length > 0, "chunks is a non-empty array");
      for (const [index, chunk] of fixture.chunks.entries()) {
        assert.equal(typeof chunk.t, "number", `chunk ${index} has an offset`);
        assert.equal(typeof chunk.d, "string", `chunk ${index} has its data`);
        if (index > 0) assert.ok(chunk.t >= fixture.chunks[index - 1].t, `offsets are non-decreasing at chunk ${index}`);
      }
      const snapshot = await replay(fixture);
      assert.equal(snapshot.rows.length, fixture.rows);
    },
  })),
  ...[
    ["throws an Error whose code is ERR_MODULE_NOT_FOUND", () => { throw Object.assign(new Error("Cannot find package '@xterm/headless'"), { code: "ERR_MODULE_NOT_FOUND" }); }, ["Error", "Cannot find package '@xterm/headless'"]],
    ["rejects with a TypeError", async () => { throw new TypeError("the loader went wrong"); }, ["TypeError", "the loader went wrong"]],
    ["answers a module with no Terminal export", async () => ({ default: {} }), ["Terminal"]],
  ].map(([behaviour, body, named]) => ({
    name: `138/00 task02 outline — an absent emulator is no model, said once [a load that ${behaviour}]`,
    run: async () => {
      const sink = captureDegrades();
      try {
        let calls = 0;
        const load = () => { calls += 1; return body(); };
        const first = await createScreen({ cols: 80, rows: 24, load });
        const second = await createScreen({ cols: 80, rows: 24, load });
        assert.equal(first, null, "the first answers no model");
        assert.equal(second, null, "the second answers no model, from memory");
        assert.equal(calls, 1, "the load is called once in the process");
        const unavailable = sink.events.filter((event) => event.code === "screen-model-unavailable");
        assert.equal(unavailable.length, 1, "exactly one screen-model-unavailable event");
        for (const text of named) assert.ok(unavailable[0].message.includes(text), `the event names ${text}: ${unavailable[0].message}`);
        const live = await createScreen({ cols: 80, rows: 24 });
        assert.notEqual(live, null, "the default load is not poisoned by a failing injected one");
        live.dispose();
      } finally {
        sink.restore();
      }
    },
  })),
  {
    name: "138/00 task02 — a disposed model is quiet: a late write resolves and nothing is thrown",
    run: async () => {
      const screen = await createScreen({ cols: 80, rows: 24 });
      screen.dispose();
      await assert.doesNotReject(screen.write("late"));
    },
  },
];
