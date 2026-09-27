// src/terminal/claude-screens.mjs — THE SCREENS CLAUDE DRAWS, recorded (138/ADR-003 §1-§2). An
// ordered, frozen registry of `{ id, recognise(snapshot), action, option? }`, pure over a snapshot of
// the screen model (`screen.mjs`). The door (`session-screen.mjs`) runs it over every settled frame;
// the driver acts on what the door says and never reads a screen itself (FF-13801).
//
// `action` is one of four:
//   type     the frame is claude's input box: the directive is typed on it (ADR-002);
//   consent  a dialog whose answer the operator has already given: one Enter, but only when the
//            highlighted row is the entry's `option` and the directive is still untyped (§4);
//   fail     a screen no retry can get past: the session stops `failed / blocked_screen` by name (§5);
//   wait     the provider's own wait, which suspends the heartbeat deadline (§6).
// `recognise` answers a truthy value when the frame is this screen: a `wait` entry answers the text
// of the row it matched, which the driver's `provider-wait` breadcrumb carries.
//
// NO ENTRY WITHOUT A RECORDING (§2). Every entry is proved against a committed fixture,
// `test/fixtures/claude-screens/<id>.json`, recorded from a real claude (the version in the file); a
// screen nobody has observed is not guessed at. Registering a screen is a fixture plus an entry here,
// never a driver change (ADR-006). This module's one import is `loop-bounds.mjs`, where the provider
// wait's pattern keeps its home.
import { PROVIDER_WAIT_RE } from "../loop-bounds.mjs";

// The glyph claude's prompt starts with, and the rule its input box sits between (RESEARCH Q2). Its
// select menus use the SAME `❯`, indented by one column, between DASHED rules on the normal buffer,
// so the glyph alone would call a dialog ready and type the directive into it.
const PROMPT = "❯";
const RULE = "─";

// ready (ADR-002 §1) — all four hold: the alternate buffer is active; the cursor's row R begins
// with `❯` at column 0; rows R−1 and R+1 are each `─` across all cols; and both are inside the
// viewport. Structural, never textual: the placeholder after the glyph changes with every release
// and is never read. A resumed session's earlier turns begin with `❯` too, but the cursor is not on
// them and no rules hold them, so the live box is the only one that passes.
function isInputBox(snapshot) {
  if (snapshot?.buffer !== "alternate") return false;
  const row = snapshot.cursor?.row;
  const rows = snapshot.rows ?? [];
  if (!Number.isInteger(row) || row - 1 < 0 || row + 1 > rows.length - 1) return false;
  if (!Number.isInteger(snapshot.cols) || snapshot.cols < 1) return false;
  if (!String(rows[row]).startsWith(PROMPT)) return false;
  const rule = RULE.repeat(snapshot.cols);
  return rows[row - 1] === rule && rows[row + 1] === rule;
}

// usage-limit (§6, 129/06 F-58) — the provider's own wait, anywhere on screen. Answers the row.
function providerWaitRow(snapshot) {
  for (const row of snapshot?.rows ?? []) {
    if (PROVIDER_WAIT_RE.test(row)) return row.trim();
  }
  return false;
}

export const CLAUDE_SCREENS = Object.freeze([
  Object.freeze({ id: "ready", action: "type", recognise: isInputBox }),
  Object.freeze({ id: "usage-limit", action: "wait", recognise: providerWaitRow }),
]);
