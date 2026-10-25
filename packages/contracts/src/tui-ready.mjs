// THE TUI'S OWN "READY FOR INPUT" SIGNAL, READ FROM ITS OUTPUT BYTES — the byte gate's one home.
// Moved out of execution's `terminal/session-screen.mjs` (138/ADR-002 §4) at 171 F-171-01, so the
// browser's terminal types a mount's command on the same rule the session driver pastes on: the
// board's dock had typed it on the FIRST painted bytes, before claude's REPL mounted, and the
// carriage return was lost (the invocation sat unsubmitted in the input box).
//
// 2026-09-24 — READINESS IS OBSERVED, NOT ASSUMED. The TUI announces its own readiness by enabling
// bracketed paste (`TUI_READY_MARKER`).
//
// 2026-09-27 — THE FIRST MARKER IS NOT THE PROMPT. claude 2.1.283 enables bracketed paste TWICE: at
// ~1.2s for a short pre-REPL capability probe (it queries `CSI >0q` and `CSI ?u`, draws nothing),
// turns it OFF again at ~1.5s (`TUI_PASTE_OFF_MARKER`), then back ON at ~2.3s when the REPL mounts
// and draws its banner. Input written in between is echoed by ConPTY in cooked mode and lost. So the
// TUI is READY only while the mode is ON and something VISIBLE has been drawn since it went ON. The
// probe draws nothing between its ON and its OFF, and the REPL draws its frame right after its own
// ON. Pasting the instant that holds, with no floor at all, landed 6 of 6 on 2.1.283 and 2 of 2 on
// 2.1.282.
//
// Pure and dependency-free: it runs in Node (the driver's door) and in the browser (the dock).
const ESC = String.fromCharCode(27);
export const TUI_READY_MARKER = `${ESC}[?2004h`;
export const TUI_PASTE_OFF_MARKER = `${ESC}[?2004l`;
// A terminal escape sequence, stripped to read what the TUI DREW: a CSI with ANY parameter bytes
// (0x30-0x3F, so the private `<`, `=`, `>` forms claude 2.1.283 emits for its keyboard modes, such
// as `CSI <u` and `CSI >5u`, are stripped too, not left as text), an OSC ended by BEL or ST (the
// window title, hyperlinks), or a two-byte escape. `]` is left out of the two-byte class so an OSC
// still in flight is `PARTIAL_ESCAPE_RE`'s to drop rather than half-stripped here.
export const ANSI_ESCAPE_RE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\^_])/gu;
// The same sequences cut off at the end of what has arrived so far: their tail is still in flight
// and must not read as drawn text.
const PARTIAL_ESCAPE_RE = /\u001b(?:\[[0-?]*[ -/]*|\][^\u0007\u001b]*)?$/u;

// hasVisibleText(output) — whether the TUI drew anything a person would see: text left over once
// every escape sequence (complete or still in flight) and control character is gone.
export function hasVisibleText(output) {
  return output.replace(ANSI_ESCAPE_RE, "").replace(PARTIAL_ESCAPE_RE, "").replace(/[\u0000-\u001f\u007f]/gu, "").trim().length > 0;
}

// WHAT A READY TUI IS TYPED: the body as ONE bracketed paste, and the Enter as a SEPARATE write once
// the paste has settled. 70/06 measured both halves on claude 2.1.241 (2026-08-24): a body written raw
// arrived torn into several turns, and an Enter in the SAME write as a pasted body was consumed by
// the paste's end handling and never submitted. 171 F-171-01 met the raw half again on 2.1.310: the
// dock's `text\r`, written as one input once the REPL was up, landed with its carriage return as a
// NEW LINE in the input box. One home, so the driver and the dock cannot drift apart again.
export const BRACKETED_PASTE_START = `${ESC}[200~`;
export const BRACKETED_PASTE_END = `${ESC}[201~`;
export const SUBMIT_KEY = String.fromCharCode(13);
export const PASTE_SUBMIT_SETTLE_MS = 900;
// pasteFrame(text) — `text` as one bracketed paste. The body cannot close its own paste: an end
// marker inside it is stripped (bracketed paste has no escape form).
export function pasteFrame(text) {
  return `${BRACKETED_PASTE_START}${String(text).split(BRACKETED_PASTE_END).join("")}${BRACKETED_PASTE_END}`;
}

// createTuiReadyGate() => { feed(text) => boolean, ready, pasteModeOn } — the gate over a session's
// output, fed every chunk in order. `feed` answers whether the TUI is ready once this chunk is read;
// readiness, once reached, is kept and nothing more is read. Markers are found across a chunk
// boundary, and a marker already read is never read twice: what is carried between chunks is the
// output since the mode last went ON, or, while it is OFF, one byte short of a marker.
export function createTuiReadyGate() {
  let carried = "";
  let pasteModeOn = false;
  let ready = false;
  return {
    feed(text) {
      if (ready || typeof text !== "string" || text.length === 0) return ready;
      const seen = carried + text;
      const on = seen.lastIndexOf(TUI_READY_MARKER);
      const off = seen.lastIndexOf(TUI_PASTE_OFF_MARKER);
      let since = pasteModeOn ? seen : "";
      if (on > off) { pasteModeOn = true; since = seen.slice(on + TUI_READY_MARKER.length); }
      else if (off > on) { pasteModeOn = false; since = ""; }
      if (pasteModeOn && hasVisibleText(since)) ready = true;
      carried = pasteModeOn ? since : seen.slice(-(TUI_READY_MARKER.length - 1));
      return ready;
    },
    get ready() { return ready; },
    get pasteModeOn() { return pasteModeOn; },
  };
}
