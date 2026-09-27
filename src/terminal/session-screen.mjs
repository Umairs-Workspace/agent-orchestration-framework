// src/terminal/session-screen.mjs — THE DOOR (138/ADR-001 §5). The session driver's one way to
// know what is on claude's screen. It owns the session's one screen model (`screen.mjs`), runs the
// registry (`claude-screens.mjs`) over every settled frame, and hands the driver VERDICTS; the driver
// keeps the PTY, its timers, the stop bracket and the transcript watches, and reads no screen
// content itself (FF-13801).
//
//   openSessionScreen({ cols, rows, registry, load, onVerdict }) => door, synchronously. The model
//   loads in the background, and a chunk fed before it arrives waits in order, so opening the door
//   never moves the spawn.
//
//   door.feed(chunk)    every chunk the PTY emits, in order;
//   door.markPaste()    the directive's paste is about to be written;
//   door.parked()       => Promise<boolean>: is the paste parked in the input box, unsubmitted?
//   door.evidence({ final }) => Promise<object|null>: the screen as it stands once every chunk fed so
//                       far has been parsed (ADR-004 §1); `final` freezes it there, for a stop;
//   door.gate()         => { mode: "pending" | "screen" | "bytes", pasteModeOn };
//   door.dispose()      releases the model.
//
// Verdicts, through `onVerdict`:
//   { kind: "ready", id, source }   the input box is on screen ("screen"), or the byte gate's
//                                   readiness holds ("bytes", ADR-002 §4);
//   { kind: "consent", id, keys }   answer a standing-consent dialog with `keys`, as one write;
//   { kind: "blocked", id }         a screen the session cannot get past: stop it by that name;
//   { kind: "wait", id, detail }    the provider's wait is on screen, on this frame.
//
// WITH NO MODEL — the package absent, or failing to load (ADR-001 §4) — the door is today's byte gate,
// moved out of the driver verbatim: readiness, the provider wait, the parked paste and the evidence
// all read the escape-stripped byte string exactly as the driver read it, and the registry is not
// consulted.
import { createScreen } from "./screen.mjs";
import { CLAUDE_SCREENS } from "./claude-screens.mjs";
import { reportDegrade } from "../degrade.mjs";
import { PROVIDER_WAIT_RE } from "../loop-bounds.mjs";

const ESC = String.fromCharCode(27);

// ── the byte gate, moved verbatim from src/agent-session-driver.mjs (138/ADR-001 §5) ─────────────
//
// 2026-09-24 — READINESS IS OBSERVED, NOT ASSUMED. `INTERACTIVE_COMMAND_READY_DELAY_MS` is a
// guess about how long claude takes to start, and under load the guess was wrong: three lanes
// launched together in a downstream project (plus the repo's MCP servers starting) had the
// directive pasted before the TUI was listening — no transcript, no session id, and each lane
// idled to the 20-minute heartbeat deadline, three attempts running. The TUI announces its own
// readiness by enabling bracketed paste (`TUI_READY_MARKER`); a real launch now types only
// once BOTH the delay has passed (the measured-good floor) AND the marker has been seen,
// bounded by `INTERACTIVE_READY_CAP_MS` — after which it types anyway and says so.
//
// 2026-09-27 — THE FIRST MARKER IS NOT THE PROMPT. claude 2.1.283 enables bracketed paste
// TWICE: at ~1.2s for a short pre-REPL capability probe (it queries `CSI >0q` and `CSI ?u`,
// draws nothing), turns it OFF again at ~1.5s (`TUI_PASTE_OFF_MARKER`), then back ON at
// ~2.3s when the REPL mounts and draws its banner. Input written in between is echoed by
// ConPTY in cooked mode and lost: pasted on the first marker, 4 of 4 directives were dropped,
// one of them only 140ms before the mount. Keyed on the first marker, only the floor protected
// the paste, and a slow start (language-tutor 03/03 and a downstream 02/02, 2026-09-26) burned
// three attempts each on `directive-not-accepted`. So the TUI is READY only while the mode is
// ON and something VISIBLE has been drawn since it went ON. The probe draws nothing between
// its ON and its OFF, and the REPL draws its frame right after its own ON. Pasting the instant
// that holds, with no floor at all, landed 6 of 6 on 2.1.283 and 2 of 2 on 2.1.282.
//
// With a model, readiness is the input box itself (ADR-002 §1); this gate is the fallback.
const TUI_READY_MARKER = `${ESC}[?2004h`;
const TUI_PASTE_OFF_MARKER = `${ESC}[?2004l`;
// 129/06 F-58 — THE PROVIDER-WAIT LINE is read with `PROVIDER_WAIT_RE`, defined in `loop-bounds.mjs`
// beside the heartbeat deadline it suspends. On the byte path it is read off the tail of the output,
// escapes stripped, since the TUI colours it and a chunk boundary can fall inside the phrase.
const PROVIDER_WAIT_WINDOW = 4096;
// A terminal escape sequence, stripped to read what the TUI DREW: a CSI with ANY parameter bytes
// (0x30-0x3F, so the private `<`, `=`, `>` forms claude 2.1.283 emits for its keyboard modes, such
// as `CSI <u` and `CSI >5u`, are stripped too, not left as text), an OSC ended by BEL or ST (the
// window title, hyperlinks), or a two-byte escape. `]` is left out of the two-byte class so an OSC
// still in flight is `PARTIAL_ESCAPE_RE`'s to drop rather than half-stripped here.
const ANSI_ESCAPE_RE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\^_])/gu;
// The same sequences cut off at the end of what has arrived so far: their tail is still in flight
// and must not read as drawn text.
const PARTIAL_ESCAPE_RE = /\u001b(?:\[[0-?]*[ -/]*|\][^\u0007\u001b]*)?$/u;

// hasVisibleText(output) — whether the TUI drew anything a person would see: text left over once
// every escape sequence (complete or still in flight) and control character is gone.
function hasVisibleText(output) {
  return output.replace(ANSI_ESCAPE_RE, "").replace(PARTIAL_ESCAPE_RE, "").replace(/[\u0000-\u001f\u007f]/gu, "").trim().length > 0;
}

// What the byte path records of the screen at a stop: its escape-stripped tail.
const SCREEN_TAIL_CHARS = 600;
// 2026-09-27 — ONE MORE ENTER FOR A PARKED PASTE (the driver's DIRECTIVE_RESUBMIT_AFTER_MS). The
// placeholder is claude's own rendering of a paste it holds, so the raw echo of a paste the TUI never
// received (the body text itself) never passes for it.
const PARKED_PASTE_RE = /\[Pasted text #\d+/u;

// ── the screen path (ADR-002, ADR-003) ─────────────────────────────────────────────────────────
const RULE = "─";
const MENU_CURSOR = "❯";
// A numbered menu item under the cursor glyph, indented or not: `❯ 1. Yes, I trust this folder`.
const MENU_ITEM_RE = /^\s*❯\s*\d+\./u;
// A consent is one Enter: the driver never sends an arrow key (ADR-003 §4).
const CONSENT_KEYS = String.fromCharCode(13);

const isRule = (row, cols) => row === RULE.repeat(cols);

// The input box around the cursor: the nearest full-width rule above the cursor's row and the
// nearest below. Answers the rows strictly between them, or null when the cursor is not inside a box.
function inputBoxRows(snapshot) {
  const { row } = snapshot.cursor;
  let above = row - 1;
  while (above >= 0 && !isRule(snapshot.rows[above], snapshot.cols)) above -= 1;
  let below = row + 1;
  while (below < snapshot.rows.length && !isRule(snapshot.rows[below], snapshot.cols)) below += 1;
  if (above < 0 || below >= snapshot.rows.length) return null;
  return snapshot.rows.slice(above + 1, below);
}

// The menu's highlighted row: a numbered item under `❯` when there is one, else the first `❯` row.
function highlightedRow(snapshot) {
  const numbered = snapshot.rows.find((row) => MENU_ITEM_RE.test(row));
  return numbered ?? snapshot.rows.find((row) => row.includes(MENU_CURSOR)) ?? null;
}

export function openSessionScreen({ cols = 80, rows = 24, registry = CLAUDE_SCREENS, load, onVerdict } = {}) {
  let mode = "pending";
  let model = null;
  let disposed = false;
  // Set by a stop's `evidence({ final: true })`: the frame it records is the one at the decision.
  let frozen = false;
  // Chunks fed while the model loads, replayed in order once it has (or has not) arrived.
  let queue = [];
  // Every character fed so far: the byte path's paste offset is measured in it.
  let received = 0;

  // The screen path: writes the model has not parsed yet, and a promise settled when there are none.
  let inFlight = 0;
  let drained = Promise.resolve();
  let settleDrained = null;
  let typed = false;
  // Consents answered, by id: `cleared` once a frame arrives on which the entry does not recognise.
  const answered = new Map();

  // The byte path: the driver's byte string and its readiness state, verbatim.
  let buffer = "";
  let tuiReadySeen = false;
  let pasteModeOnAt = null;
  let pastedAt = null;

  const say = (verdict) => {
    if (disposed) return;
    try {
      onVerdict?.(verdict);
    } catch (error) {
      reportDegrade("session-screen-verdict", error);
    }
  };

  // ── bytes ──
  const screenTail = () => buffer.slice(-4 * SCREEN_TAIL_CHARS).replace(ANSI_ESCAPE_RE, "").replace(/\s+/gu, " ").trim().slice(-SCREEN_TAIL_CHARS);

  const readBytes = (text) => {
    buffer += text;
    // The TUI's own readiness signal, read across a chunk boundary: the mode's latest toggle, then
    // something visible drawn since it went ON (2026-09-27, see TUI_READY_MARKER). The window reaches
    // back one byte short of a marker, so it only finds markers that END in this chunk, and a marker
    // already read is never read twice. Both markers are the same length.
    if (!tuiReadySeen) {
      const window = buffer.slice(-(text.length + TUI_READY_MARKER.length - 1));
      const on = window.lastIndexOf(TUI_READY_MARKER);
      const off = window.lastIndexOf(TUI_PASTE_OFF_MARKER);
      if (on > off) pasteModeOnAt = buffer.length - window.length + on + TUI_READY_MARKER.length;
      else if (off > on) pasteModeOnAt = null;
      if (pasteModeOnAt != null && hasVisibleText(buffer.slice(pasteModeOnAt))) {
        tuiReadySeen = true;
        say({ kind: "ready", id: "ready", source: "bytes" });
      }
    }
    const providerWait = PROVIDER_WAIT_RE.exec(buffer.slice(-PROVIDER_WAIT_WINDOW).replace(ANSI_ESCAPE_RE, ""));
    if (providerWait != null) say({ kind: "wait", id: "usage-limit", detail: providerWait[0].trim() });
  };

  // ── screen ──
  const decide = (entry, snapshot) => {
    switch (entry.action) {
      case "type":
        say({ kind: "ready", id: entry.id, source: "screen" });
        return;
      case "fail":
        say({ kind: "blocked", id: entry.id });
        return;
      case "consent": {
        // A consent after the directive was typed, or on a highlighted row that is not the named
        // option, is not an answer anybody gave: it is a named failure (ADR-003 §4).
        const highlighted = highlightedRow(snapshot);
        if (typed || typeof entry.option !== "string" || highlighted == null || !highlighted.includes(entry.option)) {
          say({ kind: "blocked", id: entry.id });
          return;
        }
        const state = answered.get(entry.id);
        if (state == null) {
          answered.set(entry.id, { cleared: false });
          say({ kind: "consent", id: entry.id, keys: CONSENT_KEYS });
          return;
        }
        // The dialog RETURNED after it went away: its answer did not hold. A repaint before claude
        // took the Enter (never cleared) is not a return, and is ignored.
        if (state.cleared) say({ kind: "blocked", id: entry.id });
        return;
      }
      default:
        reportDegrade("session-screen-unknown-action", new Error(`screen ${entry.id}: unknown action ${entry.action}`));
    }
  };

  // One recognition pass over a settled frame (ADR-002 §3, ADR-003 §5): `wait` entries are read on
  // their own; among the rest, the first entry in registry order that recognises decides the frame,
  // and a frame nobody claims gives no verdict.
  const recognise = () => {
    if (disposed || model == null) return;
    try {
      const snapshot = model.snapshot();
      for (const entry of registry) {
        if (entry.action !== "wait") continue;
        const hit = entry.recognise(snapshot);
        if (hit) say({ kind: "wait", id: entry.id, detail: typeof hit === "string" ? hit : entry.id });
      }
      for (const [id, state] of answered) {
        const entry = registry.find((candidate) => candidate.id === id);
        if (entry != null && !entry.recognise(snapshot)) state.cleared = true;
      }
      const decider = registry.find((entry) => entry.action !== "wait" && entry.recognise(snapshot));
      if (decider != null) decide(decider, snapshot);
    } catch (error) {
      reportDegrade("session-screen-recognise", error);
    }
  };

  // A burst of chunks is ONE pass: the count of unparsed writes returns to zero once, after the last.
  const writeToModel = (text) => {
    inFlight += 1;
    if (inFlight === 1) drained = new Promise((resolve) => { settleDrained = resolve; });
    model.write(text).then(() => {
      inFlight -= 1;
      if (inFlight > 0) return;
      recognise();
      settleDrained?.();
    });
  };

  const feedNow = (text) => {
    if (mode === "screen") writeToModel(text);
    else readBytes(text);
  };

  const opened = createScreen({ cols, rows, load }).then((created) => {
    if (disposed) {
      created?.dispose();
      return;
    }
    model = created;
    mode = created == null ? "bytes" : "screen";
    const early = queue;
    queue = [];
    for (const text of early) feedNow(text);
  }).catch((error) => {
    // Never a rejection the driver has to handle: a door that could not open is the byte gate.
    reportDegrade("session-screen-open", error);
    if (mode === "pending") mode = "bytes";
  });

  return {
    feed(chunk) {
      if (disposed || frozen) return;
      const text = String(chunk);
      received += text.length;
      if (mode === "pending") queue.push(text);
      else feedNow(text);
    },
    markPaste() {
      typed = true;
      pastedAt = received;
    },
    async parked() {
      await opened;
      if (disposed) return false;
      if (mode === "bytes") return PARKED_PASTE_RE.test(buffer.slice(pastedAt ?? 0).replace(ANSI_ESCAPE_RE, ""));
      await drained;
      if (disposed || model == null) return false;
      const box = inputBoxRows(model.snapshot());
      return box != null && box.some((row) => PARKED_PASTE_RE.test(row));
    },
    async evidence({ final = false } = {}) {
      // `final`: this is a stop's screen, so the frame is FROZEN at the call — every chunk already
      // fed is still parsed, and nothing fed afterwards (the dying session's own exit drawing) is.
      if (final) frozen = true;
      // The byte tail is read at the call, synchronously, so a caller that types next records the
      // screen it decided on.
      if (mode === "bytes") return { source: "bytes", tail: screenTail() };
      await opened;
      if (disposed) return null;
      if (mode === "bytes") return { source: "bytes", tail: screenTail() };
      await drained;
      if (disposed || model == null) return null;
      const snapshot = model.snapshot();
      let end = snapshot.rows.length;
      while (end > 0 && snapshot.rows[end - 1] === "") end -= 1;
      return { source: "screen", buffer: snapshot.buffer, cursor: snapshot.cursor, rows: snapshot.rows.slice(0, end) };
    },
    gate() {
      return { mode, pasteModeOn: pasteModeOnAt != null };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queue = [];
      settleDrained?.();
      model?.dispose();
    },
  };
}
