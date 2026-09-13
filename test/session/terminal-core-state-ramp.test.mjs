// Traceability wiring for milestone 46 / story 03 / task 01 —
// tasks/01_the-merged-state-ramp.feature (@executable).
//
// THE CHANNEL. `ui/src/terminal/state-ramp.mjs` is PURE, so every scenario is confirmed by
// `node:test` importing it under plain `node` and asserting on RETURNED VALUES — the state a
// transition yields, and the descriptor a state yields (its label, its dot, its motion, how
// it reads, and its cause line where one is mandatory). No bundler, no DOM, no socket, no
// clock, no source read.
//
// The PIXEL half — whether the rendered chip paints the ruled token, whether the pulse
// honours `prefers-reduced-motion`, whether the cause line is legible on the dark chrome —
// is 46/04's design-conformance review and its `@uat` render verdict. The STRUCTURAL half —
// that neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` is defined anywhere in `ui/src`, and
// that the shared set imports nothing from `ui/src/fleet/` — is
// `acd-terminal-control-boundary`'s. What is below is the behavioural half of the injected
// reason: the shared describer produces the fleet's wording only from a string it was handed.
//
//   Scenario: the vocabulary is exactly the seven merged states
//   Scenario Outline: every state yields its text label and the non-colour signals DESIGN
//     ranks (12 rows)
//   Scenario: no two states share a word
//   Scenario Outline: the ramp moves along the honest-state axis under every event a socket
//     can deliver (30 rows — 5 socket-bearing states x 6 events, the total-function proof)
//   Scenario: `idle` is the state with nothing bound
//   Scenario: `unavailable` is entered before any socket exists
//   Scenario: bytes revive a pane that had ended and a pane that had failed
//   Scenario: a close after an error stays an error
//   Scenario Outline: an exit frame's information outranks a later bare close (4 rows)
//   Scenario Outline: an unrecognised state labels itself (6 rows)
//   Scenario: an unrecognised control frame leaves the pane exactly where it was
//   Scenario Outline: the fleet's assignment-derived wording arrives as an injected reason
//     string (7 rows)
//   Scenario Outline: `unavailable` names its own cause and the command that fixes it (2 rows)
import assert from "node:assert/strict";
import {
  TERMINAL_STATES,
  TERMINAL_STATE_LIST,
  TERMINAL_EVENTS,
  UNKNOWN_STATE,
  UNAVAILABLE_CAUSES,
  FAILURE_CAUSES,
  TRANSPORT_CAUSE_LINE,
  DOT_FILLED,
  DOT_DASHED_HOLLOW,
  MOTION_NONE,
  MOTION_PULSE,
  READS_NORMAL,
  READS_CLEAN,
  READS_FAILURE,
  READS_BLOCKED,
  initialTerminalState,
  bindSource,
  terminalStateUnavailable,
  holdsSocket,
  applyTerminalEvent,
  applyControlFrame,
  describeTerminalState,
} from "../../ui/src/terminal/state-ramp.mjs";
import { TERMINAL_MOTION_CLASS } from "../../ui/src/terminal/palette.mjs";

const SERVER_MESSAGE = "claude: command not found";

// A pane that has ASSERTED a fact, so the sentinel is unmistakable when it survives — or when
// it is silently dropped.
const ASSERTED_EXIT_CODE = 137;

// The five states that can hold a socket, each built the way production reaches it.
//
// `ended` AND `error` ARE REACHED BY THEIR **INFORMED** CONSTRUCTIONS BY DEFAULT, and that is
// load-bearing rather than tidy. Reaching `ended` by a bare close and `error` by an
// unadorned transport failure produces a FACTLESS pane, and a factless pane cannot show that
// a transition discarded a fact. A mutation probe found exactly that hole: a stale
// `socket-open` returning a freshly-built state instead of the value it was handed silently
// turned an `exited (137)` pane into `stream ended`, and stripped the cause line that is the
// only thing making `error` safe as the superset of `disconnected` — with all 30 matrix cells
// still green. So `ended` carries an ASSERTED exit code and `error` carries a NAMED server
// message, which is also what the matrix's own case labels promise ("the close that follows
// an exit frame", "a later named failure replaces the earlier cause").
function paneIn(word, informedBy) {
  const connecting = bindSource();
  if (word === TERMINAL_STATES.CONNECTING) return connecting;
  const waiting = applyTerminalEvent(connecting, TERMINAL_EVENTS.SOCKET_OPEN);
  if (word === TERMINAL_STATES.WAITING) return waiting;
  const streaming = applyTerminalEvent(waiting, TERMINAL_EVENTS.BYTES);
  if (word === TERMINAL_STATES.STREAMING) return streaming;
  if (word === TERMINAL_STATES.ENDED) {
    return informedBy === "bare-close"
      ? applyTerminalEvent(streaming, TERMINAL_EVENTS.CLOSE)
      : applyTerminalEvent(streaming, { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: ASSERTED_EXIT_CODE });
  }
  if (word === TERMINAL_STATES.ERROR) {
    return informedBy === "transport"
      ? applyTerminalEvent(streaming, TERMINAL_EVENTS.TRANSPORT_FAILURE)
      : applyControlFrame(streaming, { type: "error", message: SERVER_MESSAGE });
  }
  throw new Error(`paneIn: ${word} does not hold a socket`);
}

// The facts a pane is carrying, as the operator would read them: the state word, the exit code
// and the cause LINE off the descriptor. This is the shape the "no fact ASSERTED is silently
// discarded" clause is asserted over, because a fact that survives on the value but not on the
// descriptor has still vanished from the screen.
function factsOf(pane) {
  const descriptor = describeTerminalState(pane);
  return {
    state: pane.state,
    exitCode: pane.exitCode,
    cause: pane.cause,
    message: pane.message,
    text: descriptor.text,
    reads: descriptor.reads,
    causeLine: descriptor.cause,
  };
}

// The two `error` flavours the ramp must treat identically in the matrix — a NAMED server
// refusal on a healthy socket, and a transport failure. Every `error` row is driven through
// both: that is the distinction `error` exists to cover and `disconnected` could not.
const ERROR_FLAVOURS = [
  { label: "informed by a named server refusal", informedBy: "server-error" },
  { label: "informed by a transport failure", informedBy: "transport" },
];

// The three events that legitimately REPLACE a pane's facts with a more specific one, so a
// same-state cell driven by them is not expected to preserve what came before. Everything
// else — in particular the four idempotent `the socket opens` cells and a bare close on an
// errored pane — must hand the pane back with every asserted fact intact.
const REPLACES_THE_FACT = new Set(["a byte arrives", "an exit frame", "a named error frame", "a transport failure"]);

const SOCKET_EVENTS = [
  { label: "the socket opens", event: TERMINAL_EVENTS.SOCKET_OPEN },
  { label: "a byte arrives", event: TERMINAL_EVENTS.BYTES },
  { label: "a clean close", event: TERMINAL_EVENTS.CLOSE },
  { label: "a transport failure", event: TERMINAL_EVENTS.TRANSPORT_FAILURE },
  { label: "an exit frame", event: { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 0 } },
  { label: "a named error frame", event: { kind: TERMINAL_EVENTS.ERROR_FRAME, message: SERVER_MESSAGE } },
];

// THE MATRIX, transcribed cell for cell from the feature's Examples table.
const MATRIX = [
  ["the upgrade completes and nothing has been said yet", "connecting", "the socket opens", "waiting"],
  ["the far end speaks before the client noticed the open", "connecting", "a byte arrives", "streaming"],
  ["the far end closes before saying anything", "connecting", "a clean close", "ended"],
  ["the upgrade is refused", "connecting", "a transport failure", "error"],
  ["the session died the moment it was spawned", "connecting", "an exit frame", "ended"],
  ["the provider binary is missing", "connecting", "a named error frame", "error"],
  ["a second open event on an already-open socket", "waiting", "the socket opens", "waiting"],
  ["the first byte finally arrives", "waiting", "a byte arrives", "streaming"],
  ["the far end finishes without ever printing", "waiting", "a clean close", "ended"],
  ["the socket drops before the first byte", "waiting", "a transport failure", "error"],
  ["the far end exits without ever printing", "waiting", "an exit frame", "ended"],
  ["the server names a refusal before the first byte", "waiting", "a named error frame", "error"],
  ["a stale open event cannot un-live a live pane", "streaming", "the socket opens", "streaming"],
  ["more bytes on a live pane", "streaming", "a byte arrives", "streaming"],
  ["the far end finishes normally", "streaming", "a clean close", "ended"],
  ["the stream drops mid-flow", "streaming", "a transport failure", "error"],
  ["the far end reports its exit code", "streaming", "an exit frame", "ended"],
  ["the server names a failure mid-session", "streaming", "a named error frame", "error"],
  ["a stale open event after the session finished", "ended", "the socket opens", "ended"],
  ["bytes revive a pane that had ended", "ended", "a byte arrives", "streaming"],
  ["the close that follows an exit frame", "ended", "a clean close", "ended"],
  ["the socket errors after the session had finished", "ended", "a transport failure", "error"],
  ["an exit frame lands on a pane that had merely closed", "ended", "an exit frame", "ended"],
  ["the server names a failure after the session finished", "ended", "a named error frame", "error"],
  ["a stale open event cannot clear a failure", "error", "the socket opens", "error"],
  ["bytes revive a pane that had failed", "error", "a byte arrives", "streaming"],
  ["the close that follows a transport failure", "error", "a clean close", "error"],
  ["a second transport failure", "error", "a transport failure", "error"],
  ["the far end asserts an exit code after a named failure", "error", "an exit frame", "ended"],
  ["a later named failure replaces the earlier cause", "error", "a named error frame", "error"],
];

export const terminalCoreStateRampTests = [
  // ======================================================================
  // Scenario: the vocabulary is exactly the seven merged states
  // ======================================================================
  {
    name: "terminal-core/01 the vocabulary is exactly the seven merged states, and both predecessors' surplus words are retired AS STATES",
    run() {
      // Then they are exactly: idle, connecting, waiting, streaming, ended, error, unavailable
      assert.deepEqual([...TERMINAL_STATE_LIST], [
        "idle",
        "connecting",
        "waiting",
        "streaming",
        "ended",
        "error",
        "unavailable",
      ]);

      // And `running` is not among them (the board dock's live word becomes `streaming`);
      // `disconnected` is not among them (it survives as a mandatory cause line on `error`);
      // `exited` is not among them (an exit code is a LABEL on `ended`).
      for (const retired of ["running", "disconnected", "exited"]) {
        assert.ok(!TERMINAL_STATE_LIST.includes(retired), `${retired} is not a state`);
        const descriptor = describeTerminalState(retired);
        assert.equal(descriptor.state, UNKNOWN_STATE, `asking for ${retired} yields the unknown fallback`);
        assert.equal(descriptor.text, "unknown");
        assert.equal(descriptor.live, false, `${retired} never resolves to the live state`);
      }

      // And `unknown` is not a member of the declared set: it is what a state the ramp has
      // not learned resolves TO, never a state a caller can enter deliberately.
      assert.ok(!TERMINAL_STATE_LIST.includes(UNKNOWN_STATE), "`unknown` is not a declared state");
      for (const [, from, , ] of MATRIX) {
        for (const { event } of SOCKET_EVENTS) {
          assert.notEqual(applyTerminalEvent(paneIn(from), event).state, UNKNOWN_STATE, "no transition enters `unknown`");
        }
      }

      // And every one of the seven yields a descriptor with a non-empty text label, so no
      // state can render as a dot alone.
      for (const word of TERMINAL_STATE_LIST) {
        const descriptor = describeTerminalState(word);
        assert.equal(descriptor.state, word);
        assert.equal(typeof descriptor.text, "string");
        assert.ok(descriptor.text.length > 0, `${word} carries a word`);
      }
    },
  },

  // ======================================================================
  // Scenario Outline: every state yields its text label and the non-colour signals
  // ======================================================================
  ...[
    { case: "nothing is bound and no socket exists", informedBy: "nothing", state: () => initialTerminalState(), label: "idle", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_NORMAL },
    { case: "the transport is not yet established", informedBy: "nothing", state: () => paneIn("connecting"), label: "connecting…", dot: DOT_FILLED, motion: MOTION_PULSE, reads: READS_NORMAL },
    { case: "the socket is open and nothing has been said", informedBy: "nothing", state: () => paneIn("waiting"), label: "waiting for output", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_NORMAL },
    { case: "bytes are flowing", informedBy: "nothing", state: () => paneIn("streaming"), label: "streaming", dot: DOT_FILLED, motion: MOTION_PULSE, reads: READS_NORMAL },
    { case: "the far end closed without asserting a code", informedBy: "no exit code", state: () => paneIn("ended", "bare-close"), label: "stream ended", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_NORMAL },
    { case: "the far end asserted a clean exit", informedBy: "exit code 0", state: () => applyTerminalEvent(paneIn("streaming"), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 0 }), label: "exited (0)", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_CLEAN },
    { case: "the far end asserted a failing exit", informedBy: "exit code 1", state: () => applyTerminalEvent(paneIn("streaming"), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 1 }), label: "exited (1)", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_FAILURE },
    { case: "the far end was interrupted", informedBy: "exit code 130", state: () => applyTerminalEvent(paneIn("streaming"), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 130 }), label: "exited (130)", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_FAILURE },
    { case: "the server refused the session by name", informedBy: "a server error control-frame", state: () => applyControlFrame(paneIn("streaming"), { type: "error", message: SERVER_MESSAGE }), label: "error", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_FAILURE },
    { case: "the transport failed", informedBy: "a socket failure", state: () => applyTerminalEvent(paneIn("streaming"), TERMINAL_EVENTS.TRANSPORT_FAILURE), label: "error", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_FAILURE },
    { case: "the pane's origin could not be resolved", informedBy: "a named unresolvable origin", state: () => terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE }), label: "unavailable", dot: DOT_DASHED_HOLLOW, motion: MOTION_NONE, reads: READS_BLOCKED },
    { case: "a state this ramp has not learned", informedBy: "a state word from a future build", state: () => "some-future-state", label: "unknown", dot: DOT_FILLED, motion: MOTION_NONE, reads: READS_NORMAL },
  ].map((row) => ({
    name: `terminal-core/01 the state "${row.label}" yields its text label and DESIGN's ranked non-colour signals (${row.case}, informed by ${row.informedBy})`,
    run() {
      // When its descriptor is read
      const descriptor = describeTerminalState(row.state());

      // Then its text label is exactly <label> / its dot is <dot> / its motion is <motion> /
      // it reads as <reads>.
      assert.equal(descriptor.text, row.label);
      assert.equal(descriptor.dot, row.dot);
      assert.equal(descriptor.motion, row.motion);
      assert.equal(descriptor.reads, row.reads);

      // And the label is carried in full — never empty, never truncated to fit, never
      // abbreviated, never behind a hover.
      assert.equal(typeof descriptor.text, "string");
      assert.ok(descriptor.text.length > 0);
      assert.ok(!descriptor.text.includes("…") || descriptor.text === "connecting…", "no label is truncated with an ellipsis (the one `connecting…` is the WORD, not a truncation)");

      // And every one of these four signals is on the descriptor, so a consumer never has to
      // infer a state from a colour class.
      for (const signal of ["text", "dot", "motion", "reads"]) {
        assert.ok(signal in descriptor, `${signal} is a value on the descriptor`);
        assert.notEqual(descriptor[signal], null, `${signal} is answered`);
      }
      // MOTION IS `pulse` ON EXACTLY TWO STATES — in particular `waiting` carries none, so
      // the honest cold start can never render as a spinner-forever.
      assert.ok(descriptor.motion === MOTION_NONE || descriptor.motion === MOTION_PULSE);
      // …and its CLASS rides the descriptor from the palette's one home, so a consumer never
      // re-derives `"pulse" → animate-pulse` at a render site. A state with no motion emits no
      // animation class at all rather than an inert one.
      assert.equal(descriptor.motionClass, TERMINAL_MOTION_CLASS[descriptor.motion]);
      assert.equal(descriptor.motionClass, row.motion === MOTION_PULSE ? "animate-pulse" : "");
      // `unavailable` reads BLOCKED and never FAILURE: a workspace that is not checked out on
      // this machine is not broken, it is elsewhere.
      if (descriptor.state === TERMINAL_STATES.UNAVAILABLE) assert.notEqual(descriptor.reads, READS_FAILURE);
      // `unknown` reads normal, quiet, never red.
      if (descriptor.state === UNKNOWN_STATE) assert.equal(descriptor.reads, READS_NORMAL);
    },
  })),

  {
    name: "terminal-core/01 no two states share a word, so the label alone tells them apart",
    run() {
      // When the descriptor of each of the seven states and of the `unknown` fallback is read
      const words = [...TERMINAL_STATE_LIST, "some-future-state"].map((word) => describeTerminalState(word).text);

      // Then no two of them yield the same text label
      assert.equal(new Set(words).size, words.length, `every state has its own word: ${words.join(" / ")}`);
      assert.equal(words.length, 8, "seven states plus the fallback");

      // And a consumer that rendered only the words would still distinguish every state from
      // every other — so colour adds emphasis to signals that already carry the meaning.
      const byWord = new Map(words.map((word, index) => [word, [...TERMINAL_STATE_LIST, UNKNOWN_STATE][index]]));
      assert.equal(byWord.size, 8, "the word → state mapping is one-to-one");
      // Two states with different colour classes but the same word would defeat the point.
      const pulses = [...TERMINAL_STATE_LIST].filter((word) => describeTerminalState(word).motion === MOTION_PULSE);
      assert.deepEqual(pulses, ["connecting", "streaming"], "motion is on exactly the two states that mean `expect this to change`");
    },
  },

  // ======================================================================
  // Scenario Outline: the ramp moves along the honest-state axis under every event
  // ======================================================================
  ...MATRIX.map(([label, from, eventLabel, to]) => ({
    name: `terminal-core/01 ${from} + ${eventLabel} → ${to} (${label})`,
    run() {
      const { event } = SOCKET_EVENTS.find((candidate) => candidate.label === eventLabel);
      // An `error` row is driven through BOTH flavours of failure; every other row has one
      // informed construction.
      const flavours = from === "error" ? ERROR_FLAVOURS : [{ label: "", informedBy: undefined }];

      for (const flavour of flavours) {
        const suffix = flavour.label ? ` [${flavour.label}]` : "";
        // Given a pane in the state <from> / When <event>
        const before = paneIn(from, flavour.informedBy);
        assert.equal(before.state, from, `the starting state was actually reached${suffix}`);
        const factsBefore = factsOf(before);
        const after = applyTerminalEvent(before, event);

        // Then the pane's state is <to>, and the ramp answered with a state rather than
        // leaving the pane undefined.
        assert.equal(after.state, to, `state${suffix}`);
        assert.ok(TERMINAL_STATE_LIST.includes(after.state), "the answer is a declared state, never undefined");

        // THE STARTING PANE GENUINELY CARRIED A FACT, so the survival checks below are not
        // vacuous — this is the assertion the factless fixtures were missing.
        if (from === "ended") {
          assert.equal(before.exitCode, ASSERTED_EXIT_CODE, "the `ended` pane arrived by an ASSERTED exit frame");
          assert.equal(factsBefore.text, `exited (${ASSERTED_EXIT_CODE})`);
        }
        if (from === "error") {
          assert.ok(before.cause != null, `the \`error\` pane arrived with a named cause${suffix}`);
          assert.ok(factsBefore.causeLine != null && factsBefore.causeLine.length > 0, "…and a cause LINE, which is what makes `error` safe as the superset");
        }

        // And NO FACT THE PANE HAD ASSERTED IS SILENTLY DISCARDED: a state entered on an exit
        // code or a named error still carries that code or that cause unless a MORE SPECIFIC
        // fact replaces it.
        if (after.state === before.state && !REPLACES_THE_FACT.has(eventLabel)) {
          // The idempotent cells. A transition that answers "unchanged" must hand back the
          // pane's facts unchanged too — otherwise `exited (137)` silently becomes `stream
          // ended` and an errored pane loses its cause line, while the state word still reads
          // correctly and this matrix still passes.
          assert.deepEqual(
            factsOf(after),
            factsBefore,
            `an unchanged state must be an unchanged PANE: every asserted fact survives ${eventLabel}${suffix}`,
          );
        }
        if (eventLabel === "an exit frame") {
          assert.equal(after.exitCode, 0, "the asserted exit code rides the state it produced");
          assert.equal(describeTerminalState(after).text, "exited (0)", "…and the newer, more specific fact replaced the older one");
        }
        if (eventLabel === "a named error frame") {
          assert.equal(after.message, SERVER_MESSAGE, "the server's own message rides the failure");
          assert.equal(after.cause, FAILURE_CAUSES.SERVER_ERROR);
          assert.equal(describeTerminalState(after).cause, SERVER_MESSAGE, "…and it is the cause line an operator reads");
        }
        if (eventLabel === "a transport failure") {
          assert.equal(after.cause, FAILURE_CAUSES.TRANSPORT);
          assert.equal(after.message, TRANSPORT_CAUSE_LINE);
          assert.equal(describeTerminalState(after).cause, TRANSPORT_CAUSE_LINE);
        }
        if (eventLabel === "a clean close" && from === "error") {
          assert.equal(after.cause, before.cause, "the failure's cause survives its own tail");
          assert.equal(after.message, before.message);
          assert.equal(describeTerminalState(after).cause, factsBefore.causeLine, "…and so does the line that names it");
        }
        if (eventLabel === "a clean close" && from === "ended") {
          assert.equal(after.exitCode, ASSERTED_EXIT_CODE, "a BARE close never overwrites an asserted exit code with `stream ended`");
          assert.equal(describeTerminalState(after).text, `exited (${ASSERTED_EXIT_CODE})`);
        }
        if (eventLabel === "a byte arrives") {
          // The one transition that legitimately DROPS the older facts: the source is
          // asserting liveness again, and a live stream must not be shown beside a stale exit
          // code or a stale failure.
          assert.equal(after.exitCode, null, "the newer fact replaces the older one");
          assert.equal(after.cause, null);
          assert.equal(after.message, null);
        }
        // And the source value was not mutated on the way through.
        assert.deepEqual(factsOf(before), factsBefore, "the ramp is pure over the value it was handed");
      }
    },
  })),

  // ======================================================================
  // Scenario: `idle` is the state with nothing bound
  // ======================================================================
  {
    name: "terminal-core/01 `idle` is the state with nothing bound, and it is left by binding a source rather than by any event",
    run() {
      // Given a pane with no source bound / When its state is read
      const idle = initialTerminalState();

      // Then it is idle, and no socket exists for an event to arrive on.
      assert.equal(idle.state, TERMINAL_STATES.IDLE);
      assert.equal(holdsSocket(idle), false, "no socket exists for an event to arrive on");
      for (const { label, event } of SOCKET_EVENTS) {
        assert.equal(applyTerminalEvent(idle, event).state, TERMINAL_STATES.IDLE, `${label} cannot reach a pane with no socket`);
      }

      // And binding a source moves it to connecting — `idle` is left by binding, never by a byte.
      assert.equal(bindSource(idle).state, TERMINAL_STATES.CONNECTING);
      assert.equal(applyTerminalEvent(idle, TERMINAL_EVENTS.BYTES).state, TERMINAL_STATES.IDLE, "a byte does not leave idle");
    },
  },

  // ======================================================================
  // Scenario: `unavailable` is entered before any socket exists
  // ======================================================================
  {
    name: "terminal-core/01 `unavailable` is entered before any socket exists, and never from a pane that was live",
    run() {
      // Given a pane whose origin cannot be resolved / When its state is read
      const pane = terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE });

      // Then it is unavailable, and it was entered BEFORE any socket existed.
      assert.equal(pane.state, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(holdsSocket(pane), false);
      // And no socket is opened at all in that state.
      assert.equal(describeTerminalState(pane).opensSocket, false, "there is nothing to open, so there is nothing to fail");
      for (const { label, event } of SOCKET_EVENTS) {
        assert.equal(applyTerminalEvent(pane, event).state, TERMINAL_STATES.UNAVAILABLE, `${label} cannot reach a pane that opened no socket`);
      }

      // And a pane that was streaming, ended or failed can never be MOVED to unavailable:
      // unavailability is a statement about the ORIGIN, not about a session.
      for (const from of ["connecting", "waiting", "streaming", "ended", "error"]) {
        for (const { label, event } of SOCKET_EVENTS) {
          const after = applyTerminalEvent(paneIn(from), event);
          assert.notEqual(after.state, TERMINAL_STATES.UNAVAILABLE, `${from} + ${label} never becomes unavailable`);
        }
      }
      // A pane that was live and then died is `error`.
      assert.equal(applyTerminalEvent(paneIn("streaming"), TERMINAL_EVENTS.TRANSPORT_FAILURE).state, TERMINAL_STATES.ERROR);
    },
  },

  // ======================================================================
  // Scenario: bytes revive a pane that had ended and a pane that had failed
  // ======================================================================
  {
    name: "terminal-core/01 bytes revive a pane that had ended and a pane that had failed, and the revived pane can end again",
    run() {
      // Given a pane that streamed and then ended (with an asserted code) / When a byte arrives
      const ended = applyTerminalEvent(paneIn("streaming"), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 0 });
      assert.equal(describeTerminalState(ended).text, "exited (0)");
      const revivedFromEnded = applyTerminalEvent(ended, TERMINAL_EVENTS.BYTES);

      // Then the pane is streaming again, and its descriptor reads as live.
      assert.equal(revivedFromEnded.state, TERMINAL_STATES.STREAMING);
      assert.equal(describeTerminalState(revivedFromEnded).live, true);
      // And the exit code the `ended` state carried is GONE rather than shown beside a live
      // stream — the newer fact replaces the older one.
      assert.equal(revivedFromEnded.exitCode, null);
      assert.equal(describeTerminalState(revivedFromEnded).exitCode, null);
      assert.equal(describeTerminalState(revivedFromEnded).text, "streaming");

      // Given a pane that streamed and then failed on a transport error / When a byte arrives
      const failed = applyTerminalEvent(paneIn("streaming"), TERMINAL_EVENTS.TRANSPORT_FAILURE);
      assert.equal(describeTerminalState(failed).cause, TRANSPORT_CAUSE_LINE);
      const revivedFromError = applyTerminalEvent(failed, TERMINAL_EVENTS.BYTES);

      // Then the pane is streaming again — a reconnected stream that is genuinely flowing
      // must not keep reading as failed — and its failure cause is gone with the failure.
      assert.equal(revivedFromError.state, TERMINAL_STATES.STREAMING);
      assert.equal(describeTerminalState(revivedFromError).reads, READS_NORMAL);
      assert.equal(revivedFromError.cause, null);
      assert.equal(revivedFromError.message, null);
      assert.equal(describeTerminalState(revivedFromError).cause, null);

      // When the revived pane closes cleanly / Then it is ended again — the revive was a
      // genuine round trip and not a one-way door.
      const endedAgain = applyTerminalEvent(revivedFromError, TERMINAL_EVENTS.CLOSE);
      assert.equal(endedAgain.state, TERMINAL_STATES.ENDED);
      assert.equal(describeTerminalState(endedAgain).text, "stream ended");
    },
  },

  // ======================================================================
  // Scenario: a close after an error stays an error
  // ======================================================================
  {
    name: "terminal-core/01 a close after an error stays an error, and is never relaundered as a clean finish",
    run() {
      // Given a pane whose transport failed / When the socket then closes cleanly
      const failed = applyTerminalEvent(paneIn("streaming"), TERMINAL_EVENTS.TRANSPORT_FAILURE);
      const afterClose = applyTerminalEvent(failed, TERMINAL_EVENTS.CLOSE);

      // Then the pane is still in the error state, its label still reads `error`, and it
      // still reads as a failure.
      assert.equal(afterClose.state, TERMINAL_STATES.ERROR);
      const descriptor = describeTerminalState(afterClose);
      assert.equal(descriptor.text, "error");
      assert.equal(descriptor.reads, READS_FAILURE);

      // And it never reads `stream ended`, and it never acquires an exit code it was never given.
      assert.notEqual(descriptor.text, "stream ended");
      assert.equal(descriptor.exitCode, null);
      assert.equal(afterClose.exitCode, null);

      // And its cause line still names the failure.
      assert.equal(descriptor.cause, TRANSPORT_CAUSE_LINE, "`disconnected — the stream dropped` for a transport failure");

      // …and the server's own message for a named refusal.
      const refused = applyControlFrame(paneIn("streaming"), { type: "error", message: SERVER_MESSAGE });
      const refusedAfterClose = applyTerminalEvent(refused, TERMINAL_EVENTS.CLOSE);
      assert.equal(refusedAfterClose.state, TERMINAL_STATES.ERROR);
      assert.equal(describeTerminalState(refusedAfterClose).cause, SERVER_MESSAGE);
    },
  },

  // ======================================================================
  // Scenario Outline: an exit frame's information outranks a later bare close
  // ======================================================================
  ...[
    { case: "a clean finish", code: 0, label: "exited (0)", reads: READS_CLEAN },
    { case: "a failing command", code: 1, label: "exited (1)", reads: READS_FAILURE },
    { case: "an interrupted session", code: 130, label: "exited (130)", reads: READS_FAILURE },
    { case: "a signal-shaped high code", code: 137, label: "exited (137)", reads: READS_FAILURE },
  ].map((row) => ({
    name: `terminal-core/01 an exit frame carrying code ${row.code} outranks a later bare close, and the code survives it (${row.case})`,
    run() {
      // Given a streaming pane / When the far end sends an exit frame carrying code <code>
      const ended = applyTerminalEvent(paneIn("streaming"), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: row.code });

      // Then the pane is ended, its exit code is <code>, it reads as <reads>, its label is <label>.
      assert.equal(ended.state, TERMINAL_STATES.ENDED);
      assert.equal(ended.exitCode, row.code);
      const descriptor = describeTerminalState(ended);
      assert.equal(descriptor.exitCode, row.code);
      assert.equal(descriptor.reads, row.reads);
      assert.equal(descriptor.text, row.label);

      // When the socket then closes / Then the pane is still ended, still carrying the code,
      // and its label is unchanged — the bare close did not overwrite the asserted code with
      // `stream ended`.
      const afterClose = applyTerminalEvent(ended, TERMINAL_EVENTS.CLOSE);
      assert.equal(afterClose.state, TERMINAL_STATES.ENDED);
      assert.equal(afterClose.exitCode, row.code);
      const afterDescriptor = describeTerminalState(afterClose);
      assert.equal(afterDescriptor.text, row.label);
      assert.equal(afterDescriptor.reads, row.reads);
      assert.notEqual(afterDescriptor.text, "stream ended");
    },
  })),

  // ======================================================================
  // Scenario Outline: an unrecognised state labels itself
  // ======================================================================
  ...[
    { case: "a genuine cold start, for contrast", state: "waiting", label: "waiting for output" },
    { case: "a state word from a future build", state: "some-future-state", label: "unknown" },
    { case: "a state that is absent", state: undefined, label: "unknown" },
    { case: "a state that is explicitly null", state: null, label: "unknown" },
    { case: "a state that is the empty string", state: "", label: "unknown" },
    { case: "a state that is not a string at all", state: 7, label: "unknown" },
  ].map((row) => ({
    name: `terminal-core/01 the state ${JSON.stringify(row.state) ?? "(absent)"} labels itself "${row.label}" (${row.case})`,
    run() {
      // When its descriptor is read
      const descriptor = describeTerminalState(row.state);

      // Then its label is <label>, it reads as normal, and it carries no motion.
      assert.equal(descriptor.text, row.label);
      assert.equal(descriptor.reads, READS_NORMAL, "never a red failure — `we do not recognise this` must never surface as an error");
      assert.equal(descriptor.motion, MOTION_NONE);
      assert.equal(descriptor.live, false, "it does not claim to be live");

      // And it is distinguishable from a genuine cold start: its label is not
      // `waiting for output`, which would assert that bytes are still plausibly coming.
      if (row.label === "unknown") {
        assert.notEqual(descriptor.text, "waiting for output");
        assert.equal(descriptor.state, UNKNOWN_STATE);
      } else {
        assert.equal(descriptor.state, TERMINAL_STATES.WAITING, "the contrast row really is the cold start");
      }
    },
  })),

  {
    name: "terminal-core/01 an unrecognised control frame leaves the pane exactly where it was, from every state",
    run() {
      // Given a streaming pane / When a control frame of a type this ramp does not know arrives
      const streaming = paneIn("streaming");
      const after = applyControlFrame(streaming, { type: "telemetry", bytes: 42 });

      // Then the pane is still streaming, with every field unchanged, and nothing was thrown.
      assert.equal(after.state, TERMINAL_STATES.STREAMING);
      assert.deepEqual(after, streaming, "every field unchanged");

      // And the same is true from every state: an unknown control frame is the one event that
      // changes nothing. (Raw PTY bytes are not control messages, and a frame type a future
      // server adds must not move a pane.)
      for (const from of ["connecting", "waiting", "streaming", "ended", "error"]) {
        const before = paneIn(from);
        for (const frame of [{ type: "telemetry" }, { type: "ready" }, { type: "" }, {}, { type: 7 }, null, "not a frame", 7]) {
          const unchanged = applyControlFrame(before, frame);
          assert.deepEqual(unchanged, before, `${from} is unmoved by ${JSON.stringify(frame) ?? "(absent)"}`);
        }
      }
      // No state was invented for it.
      assert.equal(applyControlFrame(paneIn("waiting"), { type: "telemetry" }).state, TERMINAL_STATES.WAITING);
    },
  },

  // ======================================================================
  // Scenario Outline: the fleet's assignment-derived wording arrives as an injected reason
  // ======================================================================
  ...[
    { case: "a cold start with nothing injected", state: "waiting", reason: undefined, chip: "waiting for output", bar: null },
    { case: "a terminal assignment, the fleet's own V10 wording", state: "waiting", reason: "no live output — assignment failed · reclaimed", chip: "no live output", bar: "no live output — assignment failed · reclaimed" },
    { case: "a finished assignment", state: "waiting", reason: "no live output — assignment done", chip: "no live output", bar: "no live output — assignment done" },
    { case: "wording no fleet helper would ever produce, injected verbatim", state: "waiting", reason: "no live output — the operator stopped watching", chip: "no live output", bar: "no live output — the operator stopped watching" },
    { case: "a pane that actually received bytes keeps its own stronger fact", state: "streaming", reason: "no live output — assignment done", chip: "streaming", bar: null },
    { case: "so does one that ended", state: "ended", reason: "no live output — assignment done", chip: "stream ended", bar: null },
    { case: "and so does one that failed", state: "error", reason: "no live output — assignment done", chip: "error", bar: null },
  ].map((row) => ({
    name: `terminal-core/01 the injected reason ${row.reason == null ? "(none)" : `"${row.reason}"`} on a ${row.state} pane yields chip "${row.chip}" (${row.case})`,
    run() {
      // Given a pane in the state <state> / And the call site injects the reason <injected reason>
      // The `ended` row's expected chip is `stream ended`, so its fixture is the bare close
      // the Examples row describes rather than the exit-frame default.
      const pane = paneIn(row.state, row.state === "ended" ? "bare-close" : undefined);
      const descriptor = describeTerminalState(pane, { reason: row.reason });

      // Then its chip text is <chip text> / its viewport-bar reason is <bar reason>.
      assert.equal(descriptor.text, row.chip);
      assert.equal(descriptor.reason, row.bar);
      // The bar reads `reason ?? text` — V11's chip/bar split, unchanged.
      assert.equal(descriptor.reason ?? descriptor.text, row.bar ?? row.chip);

      // And the describer produced that wording only from the string it was handed. Row 4 is
      // the litmus: wording no fleet helper would ever compute comes back VERBATIM, which
      // could not happen if the describer were re-deriving it from an assignment.
      if (row.bar != null) assert.equal(descriptor.reason, row.reason, "verbatim, from the string it was handed");
      // Nothing about an assignment was consulted: the describer takes no assignment at all.
      const withAnAssignmentShapedObject = describeTerminalState(pane, {
        reason: row.reason,
        assignment: { state: "failed", reclaimedAt: "2026-08-08T00:00:00Z" },
      });
      assert.deepEqual(withAnAssignmentShapedObject, descriptor, "an assignment row changes nothing — this describer has no fleet vocabulary");
    },
  })),

  // ======================================================================
  // Scenario Outline: `unavailable` names its own cause and the command that fixes it
  // ======================================================================
  ...[
    {
      case: "the workspace lives on another machine",
      cause: UNAVAILABLE_CAUSES.WORKSPACE_NOT_LOCAL,
      workspacePath: "/Users/umamib/Source/personal/aof",
      causeLine: "not checked out on this machine",
      recovery: "/Users/umamib/Source/personal/aof",
    },
    {
      case: "the board's own origin did not answer",
      cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE,
      workspacePath: null,
      causeLine: "board unreachable",
      recovery: "aof work ui",
    },
  ].map((row) => ({
    name: `terminal-core/01 an unavailable pane reads "${row.causeLine}" and carries the recovery "${row.recovery}" (${row.case})`,
    run() {
      // Given a pane whose origin cannot be resolved because <cause> / When its descriptor is read
      const pane = terminalStateUnavailable({ cause: row.cause, workspacePath: row.workspacePath });
      const descriptor = describeTerminalState(pane, { owner: "46/03 → aof-wsl" });

      // Then its state is unavailable and its chip label is `unavailable`.
      assert.equal(descriptor.state, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(descriptor.text, "unavailable");
      // And its cause line reads exactly <cause line>, and it carries the recovery line.
      assert.equal(descriptor.cause, row.causeLine);
      assert.equal(descriptor.recovery, row.recovery);

      // And it reads as blocked, never as a failure — never on the destructive ramp, never red.
      assert.equal(descriptor.reads, READS_BLOCKED);
      assert.notEqual(descriptor.reads, READS_FAILURE);
      assert.equal(descriptor.dot, DOT_DASHED_HOLLOW, "the house's absent/not-yet primitive, not a failure primitive");

      // And it carries no motion: never a spinner, never `connecting…`, never `waiting for output`.
      assert.equal(descriptor.motion, MOTION_NONE);
      assert.notEqual(descriptor.text, "connecting…");
      assert.notEqual(descriptor.text, "waiting for output");

      // And it still names its owner, so one unavailable pane among several is identifiable —
      // a pane that goes blank INCLUDING its header is the failure mode this state prevents.
      assert.equal(descriptor.owner, "46/03 → aof-wsl");
      assert.equal(descriptor.rendersHeader, true);
    },
  })),
];
