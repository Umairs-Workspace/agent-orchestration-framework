// src/terminal/claude-screens.mjs — THE SCREENS CLAUDE DRAWS, recorded (138/ADR-003 §1-§2). An
// ordered, frozen registry of `{ id, recognise(snapshot), action, option? }`, pure over a snapshot of
// the screen model (`screen.mjs`). The door (`session-screen.mjs`) runs it over every settled frame;
// the driver acts on what the door says and never reads a screen itself (FF-13801).
//
// `action` is one of four:
//   type     the frame is claude's input box: the directive is typed on it (ADR-002);
//   consent  a dialog whose answer the operator has already given: the door walks the menu to the
//            entry's `option` by the screen, one confirmed arrow at a time, then one Enter, and
//            only while the directive is untyped (§4, amended 2026-09-27);
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

// A DIALOG (§3), recorded from claude 2.1.283 (RESEARCH Q2, Q5): drawn on the NORMAL buffer, with a
// select menu whose `❯` is indented, and one line of the dialog's own words. Each is keyed on all
// three, and none holds where the input box does, so a working session that quotes a dialog's words
// above a live box is never that dialog (01/01, ruling 4).
const INDENTED_MENU_CURSOR = /^\s+❯\s/u;
function dialog(words) {
  return (snapshot) => snapshot?.buffer === "normal"
    && !isInputBox(snapshot)
    && (snapshot.rows ?? []).some((row) => INDENTED_MENU_CURSOR.test(row))
    && (snapshot.rows ?? []).some((row) => row.includes(words));
}

// usage-limit (§6, 129/06 F-58) — the provider's own wait, anywhere on screen. Answers the row.
function providerWaitRow(snapshot) {
  for (const row of snapshot?.rows ?? []) {
    if (PROVIDER_WAIT_RE.test(row)) return row.trim();
  }
  return false;
}

// The v1 registry, in ADR-003's order. `trust` is the one consent: the loop being pointed at this
// checkout is the operator's answer, which `ensureWorktreeTrusted` pre-writes, so the dialog means
// the pre-write lost (F24). claude opens it on `No, exit`, and the door walks to the option by the
// screen (ADR-003 §4 as amended 2026-09-27). The three fails are screens no retry can get past.
export const CLAUDE_SCREENS = Object.freeze([
  Object.freeze({ id: "ready", action: "type", recognise: isInputBox }),
  Object.freeze({ id: "trust", action: "consent", option: "Yes, I trust this folder", recognise: dialog("Quick safety check") }),
  Object.freeze({ id: "mcp-approval", action: "fail", recognise: dialog("New MCP server found in this project") }),
  Object.freeze({ id: "first-run", action: "fail", recognise: dialog("Choose the text style that looks best with your terminal") }),
  Object.freeze({ id: "login", action: "fail", recognise: dialog("Select login method") }),
  Object.freeze({ id: "usage-limit", action: "wait", recognise: providerWaitRow }),
]);
