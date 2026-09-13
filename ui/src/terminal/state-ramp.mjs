// Adapted from elirantutia/vibeyard (MIT) — the terminal connection-state ramp, reached here
// through ui/src/board/terminal/dock-state.mjs, which ported it first and which milestone 46 /
// story 04 deletes. vibeyard is MIT-licensed; see the repo NOTICE file. THE ATTRIBUTION TRAVELS
// WITH THE DERIVATION (ADR-001, and it is a licence obligation rather than housekeeping): the
// dock's `idle → connecting → running → exited/error` ramp and its exit-code clean/failure
// reading are the ancestors of the merged ramp below, so the notice moves here with the code and
// `test/arch/ui/acd-vibeyard-attribution.test.mjs` names this file.
//
// The ONE terminal control's CONNECTION-STATE RAMP (milestone 46 / story 03 / task 01 —
// DESIGN §THE ONE STATE VOCABULARY, with ADR-005 supplying the structure). A framework-free
// ESM module — no React, no DOM, no socket, no clock — so `node:test` drives it headlessly.
//
// TWO RAMPS SHIPPED AND NEITHER WAS A SUPERSET OF THE OTHER. The board dock's
// `idle → connecting → running → exited/error` carried an exit code with a clean/failure
// reading and a server error control-frame; the fleet peek's
// `waiting → streaming → ended/disconnected` carried "socket open, no byte yet", which the
// dock painted as `connecting…` — less honest. Both distinctions survive here.
//
// THE MERGED RAMP IS SEVEN STATES PLUS A SELF-LABELLING FALLBACK:
//   idle · connecting · waiting · streaming · ended · error · unavailable   (+ `unknown`)
// Where ADR-005's draft and DESIGN disagreed on the WORD list, DESIGN is binding (PO ruling,
// 2026-08-08): `streaming` names what a browser can OBSERVE (bytes on an open socket) where
// `running` asserted a far-end process state the mirror lane never observes at all; and
// `error` is the superset `disconnected` cannot cover, because a refused spawn on a
// perfectly healthy socket is not a disconnection. `disconnected` is NOT lost — it survives
// where it was always doing its real work, as the mandatory CAUSE line on a transport
// failure.
//
// THE STATE NAMES ARE SHARED; THE COPY IS NOT DERIVED FROM THE FLEET. The fleet's
// assignment-derived wording (*"no live output — assignment failed · reclaimed"*) is
// correct behaviour that must not be lost — but it is fleet-DOMAIN vocabulary, and a shared
// control importing `ui/src/fleet/assignments.mjs` would re-couple the two surfaces this
// milestone exists to decouple, invisibly, from inside a module named for terminals. So the
// describer takes an OPTIONAL `reason` STRING and the fleet call site injects it.
//
// COLOUR IS NEVER THE ONLY SIGNAL. Every descriptor carries four non-colour signals — the
// text label, the dot's fill and shape, motion (on exactly the two states that mean "expect
// this to change"), and the mandatory cause line on `error` and `unavailable`. Colour is the
// fifth and it only ever adds emphasis.

import { hasVisibleOwner } from "./pane-identity.mjs";
import {
  TERMINAL_DOT_CLASS_MUTED,
  TERMINAL_DOT_CLASS_SECONDARY,
  TERMINAL_DOT_CLASS_PRIMARY,
  TERMINAL_DOT_CLASS_DESTRUCTIVE,
  TERMINAL_DOT_CLASS_ABSENT,
  TERMINAL_LABEL_CLASS_MUTED,
  TERMINAL_LABEL_CLASS_PRIMARY,
  TERMINAL_LABEL_CLASS_FAILURE,
  TERMINAL_MOTION_CLASS,
} from "./palette.mjs";

// ─── The vocabulary ────────────────────────────────────────────────────────────────────
// SEVEN states. `unknown` is deliberately NOT a member: it is what a state the ramp has not
// learned resolves TO, never a state a caller can enter.
export const TERMINAL_STATES = Object.freeze({
  IDLE: "idle",
  CONNECTING: "connecting",
  WAITING: "waiting",
  STREAMING: "streaming",
  ENDED: "ended",
  ERROR: "error",
  UNAVAILABLE: "unavailable",
});

export const TERMINAL_STATE_LIST = Object.freeze(Object.values(TERMINAL_STATES));
export const UNKNOWN_STATE = "unknown";

// The five states that can HOLD a socket. `idle` (nothing bound) and `unavailable` (the
// origin never resolved, so nothing was ever opened) cannot — which is why no transport
// event can be delivered to either.
export const SOCKET_BEARING_STATES = Object.freeze([
  TERMINAL_STATES.CONNECTING,
  TERMINAL_STATES.WAITING,
  TERMINAL_STATES.STREAMING,
  TERMINAL_STATES.ENDED,
  TERMINAL_STATES.ERROR,
]);

// The non-colour signals, as values.
export const DOT_FILLED = "filled";
export const DOT_DASHED_HOLLOW = "dashed-hollow";
export const MOTION_NONE = "none";
export const MOTION_PULSE = "pulse";
export const READS_NORMAL = "normal";
export const READS_CLEAN = "clean";
export const READS_FAILURE = "failure";
export const READS_BLOCKED = "blocked";

// Why a pane FAILED. `transport` is a refused/dropped socket; `server-error` is a named
// error control-frame (a missing provider binary, a failed spawn — m03/ADR-003's honest
// degrade). The distinction is the whole reason `error` beat `disconnected`.
export const FAILURE_CAUSES = Object.freeze({
  TRANSPORT: "transport",
  SERVER_ERROR: "server-error",
});

// Why a pane is UNAVAILABLE. Two causes come from spike 44 sub-question 5; the THIRD is the one
// this milestone's own origin seam created and the designer ruled on 2026-08-08.
//
// THREE IS THE TOTAL SET FOR m46, and a cause outside the three may NEVER borrow one of their
// pairs. There is deliberately no "origin handed, fleet did not answer" cause: a resolved origin
// that will not connect is `error`.
export const UNAVAILABLE_CAUSES = Object.freeze({
  WORKSPACE_NOT_LOCAL: "workspace-not-local",
  ORIGIN_UNREACHABLE: "origin-unreachable",
  // NO FLEET ORIGIN WAS EVER HANDED OVER — nothing served one and no default resolved. The word
  // is `no fleet origin` rather than `fleet unreachable` on the same discipline that made
  // `streaming` beat `running`: the client asked the fleet nothing and was handed nothing, so
  // asserting a far-end state it never observed would be a lie.
  NO_FLEET_ORIGIN: "no-fleet-origin",
});

// The cause line a transport failure carries. The fleet's retired state WORD, doing the job
// it was always really doing.
export const TRANSPORT_CAUSE_LINE = "disconnected — the stream dropped";

// THE `waiting` PANE LINE, and it is a DIFFERENT STRING FROM THE CHIP WORD — the committed mock
// separates the two for the first time (PO ruling, 2026-08-08; `mocks/CONFORMANCE.md` §3b / PO-2).
// The chip stays the short scannable `waiting for output`; the PANE says what is actually known,
// which is exactly the distinction `connecting` vs `waiting` was created to carry: the SOCKET IS
// OPEN and the far end has said nothing.
//
// IT IS NOT ROUTED THROUGH `reason`, and that is the trap this constant exists to avoid. An
// injected `reason` on `waiting` ALSO rewrites the chip to `no live output` (below) — the V10
// assignment-derived copy — so carrying the mock's line as a `reason` would silently assert a
// fleet assignment fact that is not true. Two different facts, two different fields.
export const WAITING_PANE_LINE = "connected · waiting for first output";

// The EMPTY-HOST line: the dock is open and nothing is bound. Not an error, not a loading state.
// It lives here rather than in the component for the same reason every other string does — a
// sentence typed at a render site is a sentence no test in this repo can reach.
//
// IT IS THE DEFAULT AND NO LONGER THE ONLY ANSWER (m49/ADR-003's amendment). It names ONE HOST'S
// AFFORDANCE — "Run agent" is a board control that exists on neither the fleet card nor a grid
// tile — on a control that now has FOUR hosts, which is a latent m46 defect this milestone is the
// first to expose: `idle` became reachable on a surface where that sentence is false. The fix is
// the seam `reason` already is, widened below to `idle`, so a call site that knows better says so
// and one that does not still gets this line VERBATIM — which is what keeps the board dock and
// the fleet card byte-identical.
export const IDLE_PANE_LINE = "No session. Press Run agent on an item.";

// ─── WHAT THE BYTE AREA SHOWS ──────────────────────────────────────────────────────────────
// DESIGN §C3's table, as VALUES rather than as three booleans re-derived from state words at a
// render site. It was the render site at first review, which put DESIGN V11 — the hardest-won
// rule in this milestone, paid for by a measured overprint on two surfaces — inside JSX that no
// test in this repo can reach, and it is why the fullscreen overlay silently rendered one of the
// four treatments instead of all four.
//
//   `empty-host`         nothing is bound. The centred line, no terminal, no bar.
//   `bytes`              a terminal. The operator's output is what the pane is FOR.
//   `unavailable-block`  a centred dashed block naming the cause. There is no dimmed terminal
//                        underneath — there IS no terminal.
// WHERE THE PANE'S ONE LINE SITS, and it is a value rather than a render-site branch (m49/05 F5).
// `idle` is TWO treatments now — a terminal that is empty says so where the first byte would have
// appeared; a host with nothing in it says so in the middle of its box — and a component that
// chose between them would be choosing in JSX no test in this repo can reach.
export const PANE_LINE_TOP_LEFT = "top-left";
export const PANE_LINE_CENTRED = "centred";

export const PANE_EMPTY_HOST = "empty-host";
export const PANE_BYTES = "bytes";
export const PANE_UNAVAILABLE_BLOCK = "unavailable-block";
// The fallback cause line for an `error` that arrived with nothing attached. `error`'s cause
// is MANDATORY, so it may never be empty — but it must not claim a transport failure it
// cannot know about either.
export const UNNAMED_CAUSE_LINE = "terminal session failed";

// The events a socket can deliver. Six, and the ramp is TOTAL over the five socket-bearing
// states × these six — thirty cells, none of them undefined for a future event to fall into.
export const TERMINAL_EVENTS = Object.freeze({
  SOCKET_OPEN: "socket-open",
  BYTES: "bytes",
  CLOSE: "close",
  TRANSPORT_FAILURE: "transport-failure",
  EXIT_FRAME: "exit-frame",
  ERROR_FRAME: "error-frame",
});

// ─── The state VALUE ───────────────────────────────────────────────────────────────────
// A pane's state is a word PLUS the facts it was entered on. Nothing a pane ASSERTED is
// silently discarded: an exit code rides `ended`, a cause + message ride `error`, and each
// survives until a MORE SPECIFIC fact replaces it.
function state(word, extra = {}) {
  return Object.freeze({
    state: word,
    exitCode: null,
    cause: null,
    message: null,
    workspacePath: null,
    ...extra,
  });
}

export function initialTerminalState() {
  return state(TERMINAL_STATES.IDLE);
}

// `idle` is left by BINDING a source, never by a byte — there is no socket for a byte to
// arrive on.
export function bindSource() {
  return state(TERMINAL_STATES.CONNECTING);
}

// terminalEntryState(current, { bindable }) — THE STATE A PANE IS IN BEFORE ANY TRANSPORT EVENT
// HAS ARRIVED, derived from whether the pane can be bound at all rather than assumed to be
// `idle`.
//
// WHY IT EXISTS, and it is a BLOCKER measured on the running system (2026-08-09), not a
// refinement. `initialTerminalState()` is `idle` unconditionally, and a consumer that renders the
// ramp faithfully then renders `idle`'s pane — the centred *"No session. Press Run agent on an
// item."* line — for a pane that HAS a session bound. Two things were wrong with that at once:
//
//   1. IT IS A LIE TO THE OPERATOR. `idle` means "nothing is bound" — DESIGN gives it that copy
//      in terms. A bound session that is not yet connected is `connecting`, which is the word
//      this ramp already has for exactly that fact.
//   2. IT DEADLOCKED THE ONE CONSUMER. `idle`'s pane treatment is `empty-host`, so the byte area
//      rendered a `<p>` INSTEAD of the host div the xterm paints into; the host div carries the
//      ref the session effect reads; the effect early-returned on the null ref; and the one line
//      that would have moved the state off `idle` — `setState(bindSource())` — sat AFTER that
//      guard. Every session was dead on arrival, at both call sites, for both sources, with 537
//      tests green over it.
//
// THE FIX IS DERIVATION, NOT A RENDER-SITE EXCEPTION. Making the byte area render a hidden host
// at `idle` would have unwedged the loop and left the ramp lying — two rules for one fact, which
// is the defect class this whole module exists to remove. So the pane's ENTRY state is a function
// of bindability, `idle` keeps meaning exactly what it says, and `connecting` is already
// `emptyByDefinition` (its pane is `bytes` + the top-left line) so the host renders by the ramp's
// own existing rule rather than by a new one.
//
// IT IS ONE-WAY AND IT ONLY EVER SPEAKS FOR `idle`. Every other word is an OBSERVED fact — a
// socket opened, a byte arrived, an exit was asserted — and an observed fact outranks a
// derivation. A pane that streamed and then ended stays `ended` while it is still perfectly
// bindable; only "nothing has happened yet" is the ramp's to answer.
export function terminalEntryState(current, { bindable = false } = {}) {
  const value = valueOf(current);
  return bindable === true && value.state === TERMINAL_STATES.IDLE ? bindSource() : value;
}

// `unavailable` is entered BEFORE any socket exists, and is never reached from a pane that
// was live: a pane that streamed and then died is `error`, because unavailability is a
// statement about the ORIGIN and not about a session.
export function terminalStateUnavailable({ cause, workspacePath } = {}) {
  return state(TERMINAL_STATES.UNAVAILABLE, {
    // NO DEFAULT CAUSE. It used to be `?? ORIGIN_UNREACHABLE`, which is the same wrong-pair
    // defect one layer earlier than the describer's: a pane constructed without a named cause
    // would have said `board unreachable` and told the operator to run `aof work ui` on a board
    // that is already running. An unnamed cause stays unnamed and the describer says so.
    cause: cause ?? null,
    workspacePath: typeof workspacePath === "string" && workspacePath ? workspacePath : null,
  });
}

function wordOf(current) {
  if (current != null && typeof current === "object" && typeof current.state === "string") return current.state;
  return typeof current === "string" ? current : UNKNOWN_STATE;
}

function valueOf(current) {
  if (current != null && typeof current === "object" && typeof current.state === "string") {
    return { ...state(current.state), ...current };
  }
  return state(wordOf(current));
}

export function holdsSocket(current) {
  return SOCKET_BEARING_STATES.includes(wordOf(current));
}

// applyTerminalEvent(current, event) — the whole transition matrix, as ONE total function.
//
//   socket opens        → `connecting` becomes `waiting`; every other socket-bearing state
//                         is unchanged (a socket opens once — the idempotent cells are the
//                         total-function guarantee, not a production path)
//   a byte arrives      → `streaming`, from ANY state, INCLUDING `ended` and `error`. The
//                         source is asserting liveness again, and the honest-state axis is
//                         one-directional: it forbids showing a liveness the source no
//                         longer asserts, and says nothing against the reverse. The older
//                         fact (an exit code, a failure cause) is REPLACED, never shown
//                         beside a live stream.
//   a clean close       → `ended` — EXCEPT from `error`, which stays `error`. The close that
//                         follows a transport failure is that failure's own tail, and
//                         relabelling it would launder a failure into a clean finish.
//   a transport failure → `error`, from every state including `ended` (DESIGN's transition
//                         rule 2 protects a failure from being relabelled a clean finish,
//                         not the reverse).
//   an exit frame       → `ended` carrying the code, from every state including `error`: an
//                         ASSERTED exit carries more information than a transport guess and
//                         outranks it. A BARE close on an errored pane still stays `error` —
//                         an assertion outranks, a silence does not.
//   a named error frame → `error` carrying the server's own message; a later named failure
//                         replaces the earlier cause.
//
// A state that holds NO socket (`idle`, `unavailable`) is unchanged by every event, because
// there is no socket for one to arrive on.
export function applyTerminalEvent(current, event) {
  const value = valueOf(current);
  if (!holdsSocket(value)) return value;
  const kind = typeof event === "string" ? event : event?.kind;
  switch (kind) {
    case TERMINAL_EVENTS.SOCKET_OPEN:
      return value.state === TERMINAL_STATES.CONNECTING
        ? state(TERMINAL_STATES.WAITING)
        : value;
    case TERMINAL_EVENTS.BYTES:
      return state(TERMINAL_STATES.STREAMING);
    case TERMINAL_EVENTS.CLOSE:
      return value.state === TERMINAL_STATES.ERROR ? value : state(TERMINAL_STATES.ENDED, carriedExit(value));
    case TERMINAL_EVENTS.TRANSPORT_FAILURE:
      return state(TERMINAL_STATES.ERROR, {
        cause: FAILURE_CAUSES.TRANSPORT,
        message: TRANSPORT_CAUSE_LINE,
      });
    case TERMINAL_EVENTS.EXIT_FRAME:
      return state(TERMINAL_STATES.ENDED, { exitCode: toExitCode(event?.exitCode) });
    case TERMINAL_EVENTS.ERROR_FRAME:
      return state(TERMINAL_STATES.ERROR, {
        cause: FAILURE_CAUSES.SERVER_ERROR,
        message: nonEmpty(event?.message) ?? UNNAMED_CAUSE_LINE,
      });
    default:
      // An event this ramp does not know changes nothing. Raw PTY bytes are not control
      // messages, and a frame type a future server adds must not move a pane.
      return value;
  }
}

// An exit frame's information outranks a later BARE close, so a close on an already-`ended`
// pane carries the asserted code forward rather than overwriting it with `stream ended`.
function carriedExit(value) {
  return value.state === TERMINAL_STATES.ENDED && value.exitCode != null
    ? { exitCode: value.exitCode }
    : {};
}

// parseControlFrame(text) — the frozen m03/ADR-003 envelope's READER, extracted so the one
// decision it makes ("is this a control message or is it terminal bytes?") lives where a
// `node:test` can drive it rather than inside a `.tsx` no harness in this repo can reach.
//
// A control message is a JSON OBJECT and everything else is bytes — the rule its predecessor
// used, kept verbatim, including the cheap `{` prefix guard that keeps ordinary output off the
// JSON parser entirely. An ARRAY is bytes too: `[1,2]` parses, and `typeof [] === "object"`, so
// a naive check would swallow a line of output that happens to look like a list.
//
// WHOSE lane may be read this way is NOT this function's business — it is the source's, and
// `sourceCarriesControlFrames` in source-table.mjs answers it. A caller asks that first.
export function parseControlFrame(text) {
  if (typeof text !== "string" || !text.startsWith("{")) return null;
  try {
    const value = JSON.parse(text);
    return value != null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    // Not JSON: ordinary terminal bytes that merely started with a brace.
    return null;
  }
}

// applyControlFrame(current, frame) — the server→client control envelope, applied. The
// frozen m03/ADR-003 envelope carries `{type:'exit', exitCode}` and `{type:'error',
// message}`. A frame type this ramp does not know returns the SAME value: forward
// compatibility is the point, and an unknown control frame is the one event that changes
// nothing, from every state.
export function applyControlFrame(current, frame) {
  if (frame == null || typeof frame !== "object") return valueOf(current);
  if (frame.type === "exit") {
    return applyTerminalEvent(current, { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: frame.exitCode });
  }
  if (frame.type === "error") {
    return applyTerminalEvent(current, { kind: TERMINAL_EVENTS.ERROR_FRAME, message: frame.message });
  }
  return valueOf(current);
}

function toExitCode(code) {
  const n = Number(code);
  return Number.isFinite(n) ? n : null;
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ─── The describer ─────────────────────────────────────────────────────────────────────
// Every row's label, dot, motion and reading below was read out of DESIGN's merged-ramp
// table. No value here is new.
const RAMP = Object.freeze({
  [TERMINAL_STATES.IDLE]: {
    text: "idle",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_MUTED,
    labelClass: TERMINAL_LABEL_CLASS_MUTED,
    motion: MOTION_NONE,
    reads: READS_NORMAL,
    live: false,
  },
  [TERMINAL_STATES.CONNECTING]: {
    text: "connecting…",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_SECONDARY,
    labelClass: TERMINAL_LABEL_CLASS_MUTED,
    motion: MOTION_PULSE,
    reads: READS_NORMAL,
    live: false,
  },
  [TERMINAL_STATES.WAITING]: {
    text: "waiting for output",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_MUTED,
    labelClass: TERMINAL_LABEL_CLASS_MUTED,
    // NO MOTION, deliberately: the honest cold start must never render as a
    // spinner-forever. This is the predecessor's explicit rule, preserved.
    motion: MOTION_NONE,
    reads: READS_NORMAL,
    live: false,
  },
  [TERMINAL_STATES.STREAMING]: {
    text: "streaming",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_PRIMARY,
    labelClass: TERMINAL_LABEL_CLASS_PRIMARY,
    motion: MOTION_PULSE,
    reads: READS_NORMAL,
    live: true,
  },
  [TERMINAL_STATES.ENDED]: {
    text: "stream ended",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_MUTED,
    labelClass: TERMINAL_LABEL_CLASS_MUTED,
    motion: MOTION_NONE,
    reads: READS_NORMAL,
    live: false,
  },
  [TERMINAL_STATES.ERROR]: {
    text: "error",
    dot: DOT_FILLED,
    dotClass: TERMINAL_DOT_CLASS_DESTRUCTIVE,
    labelClass: TERMINAL_LABEL_CLASS_FAILURE,
    motion: MOTION_NONE,
    reads: READS_FAILURE,
    live: false,
  },
  [TERMINAL_STATES.UNAVAILABLE]: {
    text: "unavailable",
    // The house's absent/not-yet primitive, not a failure primitive. A workspace that is
    // not checked out on this machine is not broken; it is elsewhere.
    dot: DOT_DASHED_HOLLOW,
    dotClass: TERMINAL_DOT_CLASS_ABSENT,
    labelClass: TERMINAL_LABEL_CLASS_MUTED,
    motion: MOTION_NONE,
    reads: READS_BLOCKED,
    live: false,
  },
});

// An unrecognised or absent state LABELS ITSELF rather than impersonating one the ramp does
// recognise. Quiet, never red: "we do not recognise this" must never surface as an error,
// and it must never read `waiting for output`, which would assert that bytes are still
// plausibly coming.
const UNKNOWN_DESCRIPTOR = Object.freeze({
  text: UNKNOWN_STATE,
  dot: DOT_FILLED,
  dotClass: TERMINAL_DOT_CLASS_MUTED,
  labelClass: TERMINAL_LABEL_CLASS_MUTED,
  motion: MOTION_NONE,
  reads: READS_NORMAL,
  live: false,
});

// The THREE named unavailable causes and their fixed wording. A refusal names its own cause AND
// what to run — this codebase's rule for exactly this failure.
const UNAVAILABLE_COPY = Object.freeze({
  [UNAVAILABLE_CAUSES.WORKSPACE_NOT_LOCAL]: Object.freeze({
    causeLine: "not checked out on this machine",
    // The recovery is the workspace's own path — the operator's answer to "where is it,
    // then" — supplied by the caller, because only the caller knows it.
    recoveryFromWorkspacePath: true,
    recovery: null,
  }),
  [UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE]: Object.freeze({
    causeLine: "board unreachable",
    recoveryFromWorkspacePath: false,
    recovery: "aof work ui",
  }),
  // Designer's ruling, 2026-08-08, closing the design gap 46/04 raised. Neither existing pair
  // fits: `board unreachable` / `aof work ui` names the WRONG SERVER and gives the WRONG COMMAND
  // (the board is fine — it is the surface doing the rendering — and `aof work ui` does not
  // produce a fleet), and `not checked out on this machine` asserts something unknown. A refusal
  // naming the wrong cause is worse than one naming none. `aof mesh ui` is verified product fact:
  // the registered fleet serve-face command.
  [UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN]: Object.freeze({
    causeLine: "no fleet origin",
    recoveryFromWorkspacePath: false,
    recovery: "aof mesh ui",
  }),
});

// AN UNRECOGNISED CAUSE GETS NO PAIR AT ALL — it does NOT fall back to one of the three.
//
// This is the rule the design gap itself taught: defaulting an unrecognised cause to a
// wrong-but-plausible pair is precisely what produced it. A pane that says `board unreachable`
// about a fleet sends the operator to run `aof work ui` on a board that is already running. So an
// unrecognised cause degrades to the state's own WORD and no invented sentence — quiet, honest,
// and impossible to mistake for one of the three. It is still never blank: the chip reads
// `unavailable`, the header renders in full, and the cause line names the fact the module does
// have. (A blank pane, including a blank header, is the failure mode this whole state exists to
// prevent, so `null` is not an option here either.)
const UNAVAILABLE_UNNAMED = Object.freeze({
  causeLine: "unavailable",
  recoveryFromWorkspacePath: false,
  recovery: null,
});

// describeTerminalState(state, options) — the state → descriptor mapping every surface
// renders. `state` is either a state WORD or a state VALUE (the shape the transitions
// return); `options` may carry `exitCode`, a failure `cause`/`message`, an injected
// `reason` string, the pane's `owner`, and a `workspacePath`.
//
// THE CHIP/BAR SPLIT SURVIVES: `text` is the short state word for the header chip and
// `reason` is the full reason for the viewport bar, with the bar reading `reason ?? text`.
// An injected reason is honoured ONLY on `waiting` — a pane that actually received bytes
// keeps its own, stronger, observed fact whatever an assignment says.
export function describeTerminalState(current, options = {}) {
  const value = { ...valueOf(current), ...pickFacts(options) };
  const row = RAMP[value.state] ?? UNKNOWN_DESCRIPTOR;
  const descriptor = {
    state: RAMP[value.state] ? value.state : UNKNOWN_STATE,
    ...row,
    // Motion's class rides the descriptor beside the dot's and the label's, so a consumer
    // never re-derives `"pulse" → animate-pulse` at a render site.
    motionClass: TERMINAL_MOTION_CLASS[row.motion] ?? TERMINAL_MOTION_CLASS.none,
    exitCode: null,
    cause: null,
    reason: null,
    recovery: null,
    owner: hasVisibleOwner(options.owner) ? options.owner : null,
    // WHETHER ANYTHING RENDERS AT ALL IS DERIVED FROM THE OWNER, and both halves are rules
    // this milestone inherits rather than invents:
    //   · m38/ADR-014 invariant 4 / V1 — "a terminal with no visible owner is never rendered."
    //     A pane nothing can name is not a quieter pane; it is no pane. Its predecessor
    //     enforced this structurally by returning `null` instead of a header model, and the
    //     rule must survive the move or it survives as a comment.
    //   · DESIGN §The unavailable pane — an unavailable pane still HAS an owner, its header
    //     renders IN FULL, and "a pane that goes blank including its header is the failure
    //     mode this state exists to prevent."
    // So a descriptor handed an owner renders; one handed none renders NOTHING, and says so
    // as a value rather than leaving the caller to infer it from a null field.
    //
    // ONE DERIVATION, TWO READERS. The predicate is `pane-identity.mjs`'s — the module that owns
    // V1 and that production actually reads — rather than a second `nonEmpty(owner)` here. Two
    // modules computing the same rule from the same input is how they come to disagree; a
    // reviewer would have found them identical and a later edit would not.
    rendersPane: hasVisibleOwner(options.owner),
    rendersHeader: hasVisibleOwner(options.owner),
  };

  if (descriptor.state === TERMINAL_STATES.ENDED && value.exitCode != null) {
    // `ended` reads `normal` when the source asserted NO code, and clean/failure when it
    // did. The distinction is whether a code was ASSERTED — and a code the module has never
    // seen reads as a failure by the rule (N !== 0), never by a list.
    descriptor.exitCode = value.exitCode;
    descriptor.text = `exited (${value.exitCode})`;
    descriptor.reads = value.exitCode === 0 ? READS_CLEAN : READS_FAILURE;
    if (value.exitCode !== 0) {
      descriptor.dotClass = TERMINAL_DOT_CLASS_DESTRUCTIVE;
      descriptor.labelClass = TERMINAL_LABEL_CLASS_FAILURE;
    }
  }

  if (descriptor.state === TERMINAL_STATES.ERROR) {
    // The cause is MANDATORY on `error` — a failure that does not name itself is half a
    // signal, and `error` is only safe as the superset BECAUSE the cause line is there.
    descriptor.cause =
      nonEmpty(value.message) ??
      (value.cause === FAILURE_CAUSES.TRANSPORT ? TRANSPORT_CAUSE_LINE : UNNAMED_CAUSE_LINE);
    descriptor.failureCause = value.cause ?? null;
  }

  if (descriptor.state === TERMINAL_STATES.UNAVAILABLE) {
    // NOT `?? ORIGIN_UNREACHABLE` — see UNAVAILABLE_UNNAMED. Borrowing a named pair for a cause
    // the module does not know is how the wrong server and the wrong command reach an operator.
    const copy = UNAVAILABLE_COPY[value.cause] ?? UNAVAILABLE_UNNAMED;
    descriptor.cause = copy.causeLine;
    descriptor.recovery = copy.recoveryFromWorkspacePath ? nonEmpty(value.workspacePath) : copy.recovery;
    descriptor.unavailableCause = value.cause ?? null;
    // Nothing is coming, so nothing is opened. The structural half of "no socket is opened".
    descriptor.opensSocket = false;
  }

  if (descriptor.state === TERMINAL_STATES.IDLE) {
    // Nothing is bound, so nothing is opened — the structural half of "no socket is opened",
    // stated as the same VALUE `unavailable` already carries rather than left implied (m49/ADR-003
    // amendment). One derivation, two readers: a caller asking "does this state hold a socket"
    // reads the descriptor instead of re-deriving it from a word.
    descriptor.opensSocket = false;
  }

  // THE INJECTED-REASON SEAM, WIDENED FROM `waiting` TO `waiting` OR `idle` (m49/ADR-003's
  // amendment), and those two are exactly the states that have OBSERVED NOTHING — the precedence
  // rule is unchanged and unweakened: an observed fact outranks an injected one, so no other
  // state may be overwritten by a call site's sentence.
  //
  // WHY `idle` HAD TO JOIN IT, measured: DG-49-2 needs a pane nothing will ever feed to say
  // `no live output` AND open no socket, and on the shipped ramp those two could not meet —
  // `waiting` is reachable only from `connecting` via `SOCKET_OPEN`, so the wording could not be
  // reached without opening the very socket the rule forbids. `idle` is the ramp's own word for
  // "no source bound", and its `PANE_EMPTY_HOST` treatment is already a box with one centred line
  // and no terminal — the shape both DG-49-2 and DG-49-4's held tile ask for.
  if (descriptor.state === TERMINAL_STATES.WAITING || descriptor.state === TERMINAL_STATES.IDLE) {
    const reason = nonEmpty(options.reason);
    if (reason != null) {
      // The wording came from the call site and nowhere else: no assignment state was
      // computed here, no terminal-ness rule applied, no fleet vocabulary consulted.
      descriptor.text = "no live output";
      descriptor.reason = reason;
    }
  }

  // THE PANE LINE — what the BYTE AREA reads, as distinct from what the CHIP reads. One field,
  // computed once here, so no render site re-derives `cause ?? reason ?? text` and gets the
  // precedence subtly different on one of three surfaces.
  //
  // The precedence, and every step of it is a rule from somewhere:
  //   · an injected `reason` wins — it is the fleet's V10 sentence, the most specific thing anyone
  //     knows about this pane;
  //   · `error`'s `cause` is MANDATORY, so it is what an errored pane says;
  //   · `waiting` says the socket is open and nothing has been said — a richer line than its chip;
  //   · everything else says its own word (`stream ended`, `exited (0)`), which is what the bar
  //     carried before this field existed.
  // `unavailable` is deliberately absent: its cause and recovery are a two-line centred BLOCK, not
  // a pane line, and the descriptor already carries both separately.
  descriptor.paneLine =
    descriptor.reason ??
    (descriptor.state === TERMINAL_STATES.ERROR
      ? descriptor.cause
      : descriptor.state === TERMINAL_STATES.WAITING
        ? WAITING_PANE_LINE
        : descriptor.state === TERMINAL_STATES.IDLE
          ? IDLE_PANE_LINE
          : descriptor.text);

  // ─── The byte area's treatment, and the two chrome decisions that ride with it ───
  //
  // `showsTopLeftLine` is DESIGN's V11 split, and the split is by whether the pane CAN be
  // overprinted at all: a pane that is empty BY DEFINITION (nothing has ever been painted into
  // it) may carry the message inside the byte area, where the first line will appear. Every other
  // non-live state annotates a pane holding the operator's LAST OUTPUT LINE, and gets the opaque,
  // in-flow bar instead — paid for out of the byte area, so no glyph is ever covered.
  const emptyByDefinition =
    descriptor.state === TERMINAL_STATES.WAITING || descriptor.state === TERMINAL_STATES.CONNECTING;
  // …BUT ONLY ONE OF THE TWO HAS ANYTHING TO SAY IN THERE (design GAP G5, ruled by `aof-designer`
  // against the renders, 2026-08-09). `waiting` earns its line because the line says something the
  // chip does not — chip `waiting for output`, pane `connected · waiting for first output`: the
  // socket IS open and the far end is silent. `connecting`'s line was its own chip word echoed
  // back, and DESIGN §S1 fixes that state as "C2 empty" for a reason worth keeping: it is a
  // sub-150ms flicker (measured 14ms → 273ms on this machine), so a line there flashes two strings
  // in under a fifth of a second and only the second one carries information.
  //
  // NOT the pane TREATMENT — `connecting` stays `PANE_BYTES`, so the host div carrying the ref
  // still renders. That distinction is the whole of the 2026-08-09 blocker: withhold the host and
  // the session effect early-returns and no socket is ever opened. This withholds one LINE.
  // …AND `idle` IS NOW TWO TREATMENTS, WHICH IS WHAT m49/05's F5 FOUND (DESIGN DG-49-2 governs,
  // and this milestone's own ADR-003 amendment corrected itself here: it ruled the STATE — `idle`,
  // nothing bound, no socket — which stands, and it had no business also ruling the TREATMENT).
  //
  //   A TERMINAL THAT IS EMPTY — a real session nothing will ever relay (`emptyTerminal`). Its
  //   line sits TOP-LEFT, where the first byte would have appeared, because the pane IS a
  //   terminal viewport and DG-49-2 says so in three places.
  //   A HOST WITH NOTHING IN IT — the dock with no session, a tile the cap is holding. Its line is
  //   CENTRED, which is what `PANE_EMPTY_HOST` has always drawn and what DG-49-4 asks for in terms.
  //
  // The DIFFERENCE is a value the caller states, and the PLACEMENT is a descriptor field, because
  // "the bar never overprints; the top-left line is only for a pane empty BY DEFINITION" is this
  // module's hardest-won rule and it may not become a branch in a `.tsx` no test can reach.
  const emptyTerminal = options.emptyTerminal === true;
  const carriesTopLeftLine =
    descriptor.state === TERMINAL_STATES.WAITING || (descriptor.state === TERMINAL_STATES.IDLE && emptyTerminal);
  descriptor.pane =
    descriptor.state === TERMINAL_STATES.IDLE
      ? PANE_EMPTY_HOST
      : descriptor.state === TERMINAL_STATES.UNAVAILABLE
        ? PANE_UNAVAILABLE_BLOCK
        : PANE_BYTES;
  descriptor.showsTopLeftLine =
    (descriptor.pane === PANE_BYTES || descriptor.pane === PANE_EMPTY_HOST) && carriesTopLeftLine && !row.live;
  // WHERE THE ONE LINE GOES, as a VALUE — so the byte area renders it ONCE, at the stated place,
  // and cannot draw it twice or in the wrong one.
  descriptor.paneLinePlacement = descriptor.showsTopLeftLine
    ? PANE_LINE_TOP_LEFT
    : descriptor.pane === PANE_EMPTY_HOST
      ? PANE_LINE_CENTRED
      : null;
  descriptor.showsBar = descriptor.pane === PANE_BYTES && !row.live && !emptyByDefinition;
  // The frozen frame of a dead stream is dimmed — dead separated from live — and the dimming
  // NEVER travels alone (V6): the label always carries the meaning.
  descriptor.dims = descriptor.showsBar;
  // RESTART is offered from the two states a re-spawn is the operator's next move from. Whether
  // the HOST offers it, and whether this host owns the spawn at all, are the call site's to
  // declare — this is only the state half.
  descriptor.restartable = descriptor.state === TERMINAL_STATES.ENDED || descriptor.state === TERMINAL_STATES.ERROR;
  // Changing the provider RE-SPAWNS, so the picker is locked while the session is live — the
  // cheap data-loss guard, with exactly-one-selected preserved.
  descriptor.locksProviderPicker = row.live === true;

  return Object.freeze(descriptor);
}

function pickFacts(options) {
  const facts = {};
  if (options == null || typeof options !== "object") return facts;
  if (options.exitCode !== undefined) facts.exitCode = toExitCode(options.exitCode);
  if (options.cause !== undefined) facts.cause = options.cause;
  if (options.message !== undefined) facts.message = options.message;
  if (options.workspacePath !== undefined) facts.workspacePath = options.workspacePath;
  return facts;
}
