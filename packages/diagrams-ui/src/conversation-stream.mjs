// THE LIVE TURN (milestone 172 / ADR-002 §3, ADR-003 §2) — pure: no React, no DOM, no SDK. The board
// forwards the architect's headless session as `conversation` events on the diagram's one events stream
// (`snapshot`, `session`, `turn`, `text`, `activity`, `turn-end`); this reducer says what each means for
// the editor: the session's state for the panel's chip, and the turn being written for each note. Which
// thread a live turn rides, and when the recorded turn replaces it, is `conversation-model.mjs`'s
// `withLiveTurns` — this module never reads a record.
//
// A batch turn (`requestId: null`, the review of every open note) is kept apart under `batch` and shown
// on the panel's header line: it answers several notes, so it is never guessed onto one thread.

export const SESSION = Object.freeze({
  notStarted: "not-started", starting: "starting", answering: "answering", idle: "idle", ended: "ended", unavailable: "unavailable",
});
export const CONVERSATION_INITIAL = Object.freeze({ session: SESSION.notStarted, reason: null, queued: [], current: undefined, live: {}, batch: null });

const freshTurn = (requestId, at) => ({ requestId, text: "", activity: [], denials: [], outcome: null, startedAt: at ?? null });
const keyOf = (requestId) => (typeof requestId === "string" && requestId.length > 0 ? requestId : null);
// The turn an event names, created when the stream first names it.
function turnFor(state, requestId, at) {
  const key = keyOf(requestId);
  const existing = key == null ? state.batch : state.live[key];
  return existing ?? freshTurn(key, at);
}
function withTurn(state, turn) {
  return turn.requestId == null ? { ...state, batch: turn } : { ...state, live: { ...state.live, [turn.requestId]: turn } };
}
const SNAPSHOT_STATE = { none: SESSION.notStarted, starting: SESSION.starting, idle: SESSION.idle, answering: SESSION.answering, ended: SESSION.ended };

// conversationStep(state, event) -> the next state. `event.at` is when the editor received it.
export function conversationStep(state, event) {
  const prior = state ?? CONVERSATION_INITIAL;
  switch (event?.type) {
    // A connection's first event: the session as the server holds it, replacing what this editor had.
    case "snapshot": {
      const session = SNAPSHOT_STATE[event.state] ?? SESSION.notStarted;
      const next = { ...CONVERSATION_INITIAL, session, reason: event.reason ?? null };
      if (session !== SESSION.answering) return next;
      const turn = { ...freshTurn(keyOf(event.requestId), event.at), text: String(event.text ?? "") };
      return { ...withTurn(next, turn), current: turn.requestId };
    }
    case "session": {
      // The board's session says it started or ended; the editor adds what it alone knows: a delivery
      // answered `queued`, and a server with no architect session to launch.
      if (event.state === "started" || event.state === "starting") return { ...prior, session: SESSION.starting, reason: null };
      if (event.state === SESSION.ended) {
        // A turn still in flight ended with the session; its `turn-end` normally comes first.
        const live = Object.fromEntries(Object.entries(prior.live).map(([key, turn]) => [key, turn.outcome ? turn : { ...turn, outcome: "failed" }]));
        return { ...prior, session: SESSION.ended, reason: event.reason ?? null, live, queued: [], current: undefined };
      }
      if (event.state === SESSION.unavailable) return { ...prior, session: SESSION.unavailable, reason: event.reason ?? null };
      if (Array.isArray(event.queued)) return { ...prior, queued: [...new Set([...prior.queued, ...event.queued.filter((id) => typeof id === "string")])] };
      return prior;
    }
    case "turn": {
      const turn = freshTurn(keyOf(event.requestId), event.at);
      const session = prior.session === SESSION.starting ? SESSION.starting : SESSION.answering;
      return { ...withTurn(prior, turn), session, current: turn.requestId, queued: prior.queued.filter((id) => id !== turn.requestId) };
    }
    case "text": {
      const turn = turnFor(prior, event.requestId, event.at);
      return { ...withTurn(prior, { ...turn, text: turn.text + String(event.text ?? "") }), session: SESSION.answering };
    }
    case "activity": {
      const turn = turnFor(prior, event.requestId, event.at);
      return withTurn(prior, { ...turn, activity: [...turn.activity, { tool: event.tool ?? null, label: event.label ?? "" }] });
    }
    case "turn-end": {
      const turn = turnFor(prior, event.requestId, event.at);
      const ended = withTurn(prior, { ...turn, outcome: event.outcome === "done" ? "done" : "failed", denials: Array.isArray(event.denials) ? event.denials : [] });
      return { ...ended, session: prior.queued.length > 0 ? SESSION.answering : SESSION.idle, current: undefined };
    }
    default:
      return prior;
  }
}

// What a denied tool reads in its thread: a command is named by what it ran, anything else by its tool.
export function denialLine(denial) {
  const tool = String(denial?.tool ?? "a tool");
  const input = String(denial?.input ?? "").trim();
  return tool === "Bash" && input ? `The architect was not allowed to run ${input}` : `The architect was not allowed to use ${tool}`;
}

// The panel's header line while a batch review is being written: its latest line, never a thread's.
export function batchLine(state) {
  const text = String(state?.batch?.outcome ? "" : state?.batch?.text ?? "");
  return text.split("\n").map((line) => line.trim()).filter(Boolean).at(-1) ?? null;
}

// The chip beside the panel's title: one or two words, `live` while the session is working.
const CHIP = {
  [SESSION.notStarted]: "Not started", [SESSION.starting]: "Starting…", [SESSION.answering]: "Answering",
  [SESSION.idle]: "Idle", [SESSION.ended]: "Ended", [SESSION.unavailable]: "Unavailable",
};
export function sessionChip(state) {
  const session = state?.session ?? SESSION.notStarted;
  return { label: CHIP[session] ?? CHIP[SESSION.notStarted], live: session === SESSION.starting || session === SESSION.answering, title: state?.reason ?? undefined };
}
