// test/terminal/claude-screens-registry.test.mjs — milestone 138 / story 01, tasks 01 and 02
// (01_the-registry-holds-the-six-v1-screens.feature, 02_trust-is-answered-and-the-rest-stop-by-name
// .feature; 138/ADR-003 §1-§5, §4 as amended 2026-09-27, RESEARCH Q5).
//
// Task 01 asks the shipped registry about each recording and about the quoted-words frames, built by
// writing escape sequences into a real model. Task 02 drives `driveInteractiveClaudeSession` over the
// real door, the real model and the shipped registry, as a real launch (QA 1). Its PTY double answers
// an arrow the way claude did in RESEARCH Q5 — the measured redraw that moves `❯` one item — unless a
// case scripts it to misbehave (QA 3). A synthetic trust menu is `trust.json` followed by a chunk that
// redraws its menu rows, so the dialog's words stay the recording's (QA 4).
import assert from "node:assert/strict";
import { CLAUDE_SCREENS } from "../../packages/core/src/terminal/claude-screens.mjs";
import { openSessionScreen, readConsentMenu } from "../../packages/core/src/terminal/session-screen.mjs";
import { createScreen } from "../../packages/core/src/terminal/screen.mjs";
import { isRetryable } from "../../packages/core/src/run-store.mjs";
import { captureDegrades, loadFixture, replay } from "./screen-model.test.mjs";
import { BRIEF, ESC, SUBMIT_KEY, drive, pasteOf, sleep, waitUntil } from "./session-screen-ready.test.mjs";

const PROMPT = "❯";
const OPTION = "Yes, I trust this folder";
const IDS = ["ready", "trust", "mcp-approval", "first-run", "login", "usage-limit"];
const DOWN = `${ESC}[B`;
const UP = `${ESC}[A`;
const chunksOf = async (id) => (await loadFixture(id)).chunks.map((chunk) => chunk.d);
const claimedBy = (snapshot) => CLAUDE_SCREENS.filter((entry) => entry.recognise(snapshot)).map((entry) => entry.id);

// The row of the recording's upper rule, so a quoted line can be drawn on the conversation above it.
async function readyWithQuotedLine(words) {
  const screen = await createScreen({ cols: 80, rows: 24 });
  try {
    for (const chunk of await chunksOf("ready")) await screen.write(chunk);
    await screen.write(`${ESC}7${ESC}[11;1H● They asked me: "${words}"${ESC}8`);
    return screen.snapshot();
  } finally {
    screen.dispose();
  }
}

// ── the claude-shaped menu double ──────────────────────────────────────────────────────────────
// `menuChunk` redraws a menu's rows from `start` with `❯` on item `at`, as a dialog of claude's lays
// them out (the cursor glyph in column 1, the text in column 3).
const menuChunk = (texts, at, start) => texts.map((text, index) => `${ESC}[${start + index + 1};1H${ESC}[2K${index === at ? ` ${PROMPT} ` : "   "}${text}`).join("");

// The redraw claude 2.1.283 made for one arrow (RESEARCH Q5): the old row's glyph blanked, the new
// row's drawn, each followed by its item's text.
const measuredRedraw = (texts, from, to, start) => `${ESC}[m${ESC}[${start + from + 1};2H ${ESC}[1C${texts[from]}${ESC}[38;2;177;185;249m${ESC}[${start + to + 1};2H${PROMPT}${ESC}[1C${texts[to]}${ESC}[m`;

// trustDrive({ menu, answer, options, afterEnter }) — the real launch over a PTY that plays claude:
// it draws `trust.json`, then `menu.redraw` if the case redraws the menu, and answers every arrow by
// `answer(direction)` → the index claude moves `❯` to (or null to draw nothing, or "repaint").
function trustDrive({ menu, answer = (direction, at) => at + direction, options = {}, afterEnter = null }) {
  const state = { at: menu.at };
  const writes = [];
  const run = drive({
    options,
    onWrite: (chunk, pty) => {
      writes.push(chunk);
      if (chunk === SUBMIT_KEY && afterEnter != null && !state.entered) {
        state.entered = true;
        afterEnter(pty);
        return;
      }
      const direction = chunk === DOWN || chunk === `${ESC}OB` ? 1 : chunk === UP || chunk === `${ESC}OA` ? -1 : 0;
      if (direction === 0) return;
      const to = answer(direction, state.at);
      if (to == null) return;
      if (to === "repaint") {
        pty.emit(menuChunk(menu.texts, state.at, menu.start));
        return;
      }
      pty.emit(measuredRedraw(menu.texts, state.at, to, menu.start));
      state.at = to;
    },
  });
  return { ...run, writes };
}

async function showTrust(pty, menu, prefix = "") {
  await waitUntil(() => pty.subscribed);
  pty.emitAll([prefix, ...(await chunksOf("trust")), menu.redraw ? menuChunk(menu.texts, menu.at, menu.start) : ""].filter(Boolean));
}

const AS_RECORDED = { texts: ["No, exit", OPTION], at: 0, start: 15, redraw: false };
const MENUS = {
  recorded: AS_RECORDED,
  onYes: { texts: ["No, exit", OPTION], at: 1, start: 15, redraw: true },
  above: { texts: [OPTION, "No, exit"], at: 1, start: 15, redraw: true },
  threeBelow: { texts: ["No, exit", "Not now", "Ask me later", OPTION], at: 0, start: 15, redraw: true },
  nineBelow: { texts: ["No, exit", ...Array.from({ length: 8 }, (_, index) => `Later ${index + 1}`), OPTION], at: 0, start: 12, redraw: true },
  noOption: { texts: ["No, exit", "Maybe later"], at: 0, start: 15, redraw: true },
  awayRoom: { texts: ["Review first", "No, exit", OPTION], at: 1, start: 14, redraw: true },
};
const BLOCKED = (id, sessionId = null) => ({ outcome: "failed", failureReason: "blocked_screen", screen: { id }, sessionId });

export const claudeScreensRegistryTests = [
  // ── task 01 — the registry holds the six v1 screens ──────────────────────────────────────────
  {
    name: "138/01 task01 — the registry is the six v1 entries in ADR-003's order, with their actions and trust's option, and no update-notice",
    run: () => {
      assert.deepEqual(CLAUDE_SCREENS.map((entry) => entry.id), IDS);
      assert.deepEqual(CLAUDE_SCREENS.map((entry) => entry.action), ["type", "consent", "fail", "fail", "fail", "wait"]);
      assert.equal(CLAUDE_SCREENS.find((entry) => entry.id === "trust").option, OPTION);
      assert.equal(CLAUDE_SCREENS.some((entry) => entry.id === "update-notice"), false);
    },
  },
  ...[
    ["ready.json", ["ready"]],
    ["trust.json", ["trust"]],
    ["mcp-approval.json", ["mcp-approval"]],
    ["first-run.json", ["first-run"]],
    ["login.json", ["login"]],
    ["usage-limit.json", ["ready", "usage-limit"]],
  ].map(([fixture, claimed]) => ({
    name: `138/01 task01 outline — each recording is claimed by its own entry [${fixture} → ${claimed.join(" and ")}]`,
    run: async () => {
      const snapshot = await replay(await loadFixture(fixture.replace(/\.json$/u, "")));
      assert.deepEqual(claimedBy(snapshot), claimed);
    },
  })),
  ...[
    ["trust", "Quick safety check: Is this a project you created or one you trust?"],
    ["mcp-approval", "New MCP server found in this project: probe-mcp"],
    ["first-run", "Choose the text style that looks best with your terminal"],
    ["login", "Select login method:"],
  ].map(([entry, words]) => ({
    name: `138/01 task01 outline — a working session that quotes a dialog is not that dialog [${entry}]`,
    run: async () => {
      assert.deepEqual(claimedBy(await readyWithQuotedLine(words)), ["ready"]);
    },
  })),
  {
    name: "138/01 task01 — the trust recording opens on another option, and its named option is the item directly below it",
    run: async () => {
      const snapshot = await replay(await loadFixture("trust"));
      const menu = readConsentMenu(snapshot, OPTION);
      assert.notEqual(menu, null, "the named option is an item of the menu");
      assert.equal(snapshot.rows[menu.items[menu.highlighted]].trim(), `${PROMPT} No, exit`, "the highlighted item is `No, exit`");
      assert.equal(menu.option, menu.highlighted + 1, "Yes is the item directly below it");
      assert.equal(snapshot.cursorKeys, "normal", "no application cursor keys: the arrow toward it is `ESC [ B`");
    },
  },

  // ── task 02 — trust is navigated to; the other three stop by name ─────────────────────────────
  {
    name: "138/01 task02 — trust is answered by moving to its option, then one Enter, and the directive follows on the input box",
    run: async () => {
      const sink = captureDegrades();
      try {
        const ready = await chunksOf("ready");
        const run = trustDrive({ menu: AS_RECORDED, afterEnter: (pty) => pty.emitAll(ready) });
        await showTrust(run.pty, AS_RECORDED);
        await waitUntil(() => run.pty.writes.length >= 4);
        await sleep(30);
        assert.deepEqual(run.pty.writes, [DOWN, SUBMIT_KEY, pasteOf(BRIEF.command), SUBMIT_KEY]);
        assert.equal(run.pty.killed, false, "the session is not stopped");
        run.pty.exit(0);
        assert.equal((await run.pending).outcome, "done");
        assert.deepEqual(sink.events.filter((event) => event.screen != null), [], "no screen event is written");
      } finally {
        sink.restore();
      }
    },
  },
  ...[
    { label: "`trust.json` as recorded: `❯ No, exit`, with Yes below", menu: MENUS.recorded, prefix: "", keys: [DOWN, SUBMIT_KEY] },
    { label: "`trust.json` redrawn with `❯` already on Yes", menu: MENUS.onYes, prefix: "", keys: [SUBMIT_KEY] },
    { label: "a trust menu drawn with Yes above the highlighted item", menu: MENUS.above, prefix: "", keys: [UP, SUBMIT_KEY] },
    { label: "a trust menu whose Yes is three items below `❯`", menu: MENUS.threeBelow, prefix: "", keys: [DOWN, DOWN, DOWN, SUBMIT_KEY] },
    { label: "`trust.json` drawn with application cursor keys on", menu: MENUS.recorded, prefix: `${ESC}[?1h`, keys: [`${ESC}OB`, SUBMIT_KEY] },
  ].map(({ label, menu, prefix, keys }) => ({
    name: `138/01 task02 outline — the order is read from the screen, not assumed [${label}]`,
    run: async () => {
      const seen = [];
      const run = trustDrive({
        menu,
        // Record what the screen showed when each key arrived: an arrow may only follow a frame on
        // which the previous arrow had already moved the highlight.
        answer: (direction, at) => { seen.push(at); return at + direction; },
      });
      await showTrust(run.pty, menu, prefix);
      await waitUntil(() => run.pty.writes.includes(SUBMIT_KEY));
      await sleep(30);
      assert.deepEqual(run.pty.writes, keys, "the keys written before the directive");
      const arrows = keys.filter((key) => key !== SUBMIT_KEY).length;
      assert.deepEqual(seen, Array.from({ length: arrows }, (_, step) => menu.at + step * Math.sign(menu.texts.indexOf(OPTION) - menu.at)), "each arrow followed the frame showing the previous one's move");
      run.pty.exit(0);
      await run.pending;
    },
  })),
  ...[
    { label: "a trust menu with no Yes item is on screen", menu: MENUS.noOption, answer: undefined, stepMs: undefined, writes: [] },
    { label: "a trust menu whose Yes is nine items below `❯` is on screen", menu: MENUS.nineBelow, answer: undefined, stepMs: undefined, writes: [] },
    { label: "claude answers the Down by moving `❯` away from the option", menu: MENUS.awayRoom, answer: (direction, at) => at - direction, stepMs: undefined, writes: [DOWN] },
    { label: "claude draws nothing after the Down, with consentStepMs 100", menu: MENUS.recorded, answer: () => null, stepMs: 100, writes: [DOWN] },
    { label: "claude repaints the menu unchanged after the Down, with consentStepMs 100", menu: MENUS.recorded, answer: () => "repaint", stepMs: 100, writes: [DOWN] },
  ].map(({ label, menu, answer, stepMs, writes }) => ({
    name: `138/01 task02 outline — a navigation that cannot be confirmed on the screen is a named failure [${label}]`,
    run: async () => {
      const options = stepMs == null ? {} : { openSessionScreen: (door) => openSessionScreen({ ...door, consentStepMs: stepMs }) };
      const run = trustDrive({ menu, ...(answer == null ? {} : { answer }), options });
      await showTrust(run.pty, menu);
      assert.deepEqual(await run.pending, BLOCKED("trust"));
      assert.deepEqual(run.pty.writes, writes);
    },
  })),
  {
    name: "138/01 task02 — trust returning after its answer is a named failure",
    run: async () => {
      const trust = await chunksOf("trust");
      const run = trustDrive({
        menu: AS_RECORDED,
        afterEnter: (pty) => {
          pty.emit(`${ESC}[2J${ESC}[H`);
          setTimeout(() => pty.emitAll(trust), 40);
        },
      });
      await showTrust(run.pty, AS_RECORDED);
      assert.deepEqual(await run.pending, BLOCKED("trust"));
      assert.deepEqual(run.pty.writes, [DOWN, SUBMIT_KEY]);
    },
  },
  {
    name: "138/01 task02 — a trust dialog after the directive was typed is a named failure",
    run: async () => {
      const run = trustDrive({ menu: AS_RECORDED });
      await waitUntil(() => run.pty.subscribed);
      run.pty.emitAll(await chunksOf("ready"));
      await waitUntil(() => run.pty.writes.length >= 2);
      run.pty.emitAll([`${ESC}[?1049l`, ...(await chunksOf("trust"))]);
      assert.deepEqual(await run.pending, BLOCKED("trust"));
      assert.deepEqual(run.pty.writes, [pasteOf(BRIEF.command), SUBMIT_KEY]);
    },
  },
  ...["mcp-approval", "first-run", "login"].map((id) => ({
    name: `138/01 task02 outline — a screen the operator's consent does not cover stops the session by name [${id}.json]`,
    run: async () => {
      const sink = captureDegrades();
      try {
        const { pty, pending, stops } = drive();
        await waitUntil(() => pty.subscribed);
        const emittedAt = Date.now();
        pty.emitAll(await chunksOf(id));
        await waitUntil(() => stops.some((event) => event.phase === "stop-requested"), 1000);
        assert.ok(Date.now() - emittedAt < 1000, "within a frame");
        assert.equal(stops.find((event) => event.phase === "stop-requested").failureReason, "blocked_screen");
        assert.deepEqual(await pending, BLOCKED(id));
        assert.deepEqual(pty.writes, [], "nothing written");
        const events = sink.events.filter((event) => event.screen != null);
        assert.equal(events.length, 1);
        assert.equal(events[0].code, "session-screen");
        const frame = (await replay(await loadFixture(id))).rows;
        while (frame.length > 0 && frame.at(-1) === "") frame.pop();
        assert.deepEqual(events[0].screen.rows, frame, "the event's rows are the recording's frame");
      } finally {
        sink.restore();
      }
    },
  })),
  {
    name: "138/01 task02 — MCP approval after the directive was typed is still named",
    run: async () => {
      const { pty, pending } = drive();
      await waitUntil(() => pty.subscribed);
      pty.emitAll(await chunksOf("ready"));
      await waitUntil(() => pty.writes.length >= 2);
      pty.emitAll([`${ESC}[?1049l`, ...(await chunksOf("mcp-approval"))]);
      assert.deepEqual(await pending, BLOCKED("mcp-approval"));
      assert.deepEqual(pty.writes, [pasteOf(BRIEF.command), SUBMIT_KEY]);
    },
  },
  {
    name: "138/01 task02 — a blocked run is not retried",
    run: () => {
      assert.equal(isRetryable("blocked_screen"), false);
      for (const reason of ["runtime_offline", "timeout", "session_limit"]) assert.equal(isRetryable(reason), true, reason);
    },
  },
];
