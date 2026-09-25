// The state-aware PRIMARY action for the detail panel (DESIGN — "Run agent" is
// state-aware; ARCHITECTURE ADR-006). The detail panel's primary button derives
// BOTH its label and the aof slash-command it runs from the selected item's
// DERIVED status along the ACD lifecycle (refine → continue → verify). The
// command is later typed into the spawned agent as ordinary PTY input
// (the one terminal control, mounted by the board dock). Pure data — no React, no
// IO — so the mapping is unit-testable headlessly. Authored as .mjs (+
// action.d.mts) so the test imports it on Node >=20 without type-stripping,
// matching the ui/src/terminal/*.mjs convention.

// The notifier's words (131/ADR-006 §1) — the ONE `ui/src` import that resolves outside `ui/src`.
import { eventPhrase, formatElapsed } from "../../../src/notify/form.mjs";

// Derive the primary action for an item. Pure: status + ctx in, action out.
//   ctx.liveForRef  — dock open + bound to THIS ref → "View terminal" (wins over status)
//   ctx.hasBreakdown— item already broken down (milestone w/ >=1 story; else true)
export function primaryAction(item, ctx) {
  // A live session bound to this item wins over status — view it, don't re-run.
  if (ctx.liveForRef) {
    return { kind: "view", label: "View terminal" };
  }

  // …and so does a run in flight on a WORKER (2026-07-26). `liveForRef` only knows
  // about a LOCAL dock session, so an item a worker was actively executing still
  // offered "Continue" — clicking it dispatched a second run, which the assign core
  // then refused ("already has an active assignment held by <node>"). The row already
  // carries the answer (`execution.active` + the node), so read it here rather than
  // letting the operator discover it by being refused. Running work is watched, not
  // restarted.
  // Its own kind, NOT "view": the board's terminal dock is a LOCAL pty, so reusing
  // "view" here would open an empty dock and look like it did something. Disabled and
  // labelled with the node — the honest answer is "this is running over there".
  if (item.execution?.active === true) {
    // With a captured session, running work is WATCHABLE — and, since m42's
    // terminal-input path, ANSWERABLE: the dock opens the worker's live session
    // over the tuple-bound terminal-view socket (one terminal surface; a remote
    // session is a SOURCE of the dock, never a second widget). A session the
    // worker reports as WAITING ON A HUMAN (code: needs-input) leads with that —
    // the affordance is the answer's door, not just a viewport. Without a
    // captured session (the pre-session window), the honest disabled state.
    // While the row carries an ask (131/05), the ask card is the answer's door, so the header
    // only ever offers the terminal: never a second, bare-keystroke answer.
    if (item.execution.sessionId && item.execution.nodeId) {
      const needsInput = item.execution.code === "needs-input";
      const askStands = item.ask != null && typeof item.ask === "object";
      return {
        kind: "mirror",
        label: needsInput && !askStands
          ? `Answer on ${item.execution.nodeId}`
          : `Open terminal — ${item.execution.nodeId}`,
        needsInput,
        nodeId: item.execution.nodeId,
        sessionId: item.execution.sessionId,
      };
    }
    return {
      kind: "running",
      label: item.execution.nodeId ? `Running on ${item.execution.nodeId}` : "Running",
      disabled: true,
    };
  }

  switch (item.status) {
    case "blocked":
      return { kind: "blocked", label: "Blocked", disabled: true };
    case "in-review":
      return { kind: "verify", label: "Verify", command: `/aof:verify ${item.ref}` };
    case "not-started":
      // No contract yet → refine it first; otherwise carry on (continue).
      return ctx.hasBreakdown
        ? { kind: "continue", label: "Continue", command: `/aof:continue ${item.ref}` }
        : { kind: "refine", label: "Refine", command: `/aof:refine ${item.ref}` };
    case "in-progress":
      return { kind: "continue", label: "Continue", command: `/aof:continue ${item.ref}` };
    case "done":
    default:
      // Done / null / unknown → an ad-hoc interactive agent (no command typed).
      return { kind: "adhoc", label: "Run agent" };
  }
}

// ---- the ask card (131/05, ADR-006 §4; DESIGN §1) ------------------------------------------------
//
// askCardState(ask, { ref, phase, error, sent, text, expanded, nowMs }) → the eleven things the ask
// card shows, or null when there is no ask. Every decision the card makes lives here, because the
// board has no React harness and a rule only a component exercises has no test. Pure: `nowMs` is
// the board's 1 s clock, so the wait ticks without a fetch. The words for a wait and for the
// answered event are the notifier's own (`formatElapsed`, `eventPhrase`), the one `ui/src` import
// from outside `ui/src`, so the card, Discord and the terminal can never spell them twice.
//   phase — the card's SEND phase: "idle", "sending" or "error" (the ask's own phase is ask.phase)
//   error — { code, message } from a rejected answer; sent — the answer document from a resolved one
const ANSWER_ERROR_NO_LONGER_WAITING = new Set(["ask-already-answered", "answer-not-waiting", "session-not-parked"]);
const ANSWER_ERROR_UNREACHABLE = new Set(["terminal-resume-not-started", "terminal-resume-target-not-connected", "session-target-not-connected"]);

const nonBlank = (value) => typeof value === "string" && value.trim() !== "";
const instantMs = (value) => (typeof value === "string" ? Date.parse(value) : Number.NaN);

// The wait between two instants in the one formatter's words, floored at 0 (an instant ahead of the
// board is clock skew, never a negative wait); null when either end cannot be read.
function waitWords(fromMs, toMs) {
  const delta = toMs - fromMs;
  return Number.isFinite(delta) ? formatElapsed(Math.max(0, delta)) : null;
}

export function askCardState(ask, { ref, phase = "idle", error = null, sent = null, text = "", expanded = false, nowMs } = {}) {
  if (ask == null) return null;
  const askedMs = instantMs(ask.askedAt);
  const state = sent != null || ask.state === "answered" ? "answered" : ask.parkedAt != null ? "parked" : "waiting";
  const answeredMs = instantMs(sent?.answeredAt ?? ask.answeredAt);
  const actor = [sent?.by?.actor, ask.by?.actor].find(nonBlank) ?? "you";
  const node = nonBlank(ask.node) ? ask.node : null;
  const remote = ask.local === false;

  let wait;
  if (state === "answered") wait = waitWords(askedMs, answeredMs);
  else if (state === "parked") {
    const asked = waitWords(askedMs, nowMs);
    const parked = waitWords(instantMs(ask.parkedAt), nowMs);
    wait = [asked == null ? null : `asked ${asked}`, parked == null ? null : `parked ${parked}`].filter(Boolean).join(" · ") || null;
  } else wait = waitWords(askedMs, nowMs);
  const cost = [nonBlank(ask.phase) ? ask.phase : null, wait, remote && node ? `on ${node}` : null].filter(Boolean).join(" · ") || null;

  const question = typeof ask.question === "string" ? ask.question : null;
  const heading = state === "answered"
    ? eventPhrase({ event: "session-answered", outcome: { by: actor } }).toUpperCase()
    : state === "parked" ? "PARKED — UNANSWERED" : eventPhrase({ event: "session-needs-input" }).toUpperCase();

  let receipt = null;
  if (state === "answered") {
    const resumesWithLoop = ask.parkedAt != null || sent?.delivery === "parked";
    const scope = nonBlank(ask.scope) ? ask.scope : String(ref ?? "").split("/")[0];
    const resume = nonBlank(sent?.resume) ? sent.resume : `aof work loop ${scope} --resume`;
    const tail = resumesWithLoop ? `resumes with the loop (${resume})` : "the session is resuming";
    receipt = `✓ Answered by ${actor}${wait == null ? "" : ` · ${wait}`} — ${tail}`;
  }

  const sending = phase === "sending";
  let message = null;
  if (phase === "error") {
    const code = error?.code;
    const reason = ANSWER_ERROR_NO_LONGER_WAITING.has(code)
      ? "the session is no longer waiting"
      : ANSWER_ERROR_UNREACHABLE.has(code) ? `${node} is unreachable` : error?.message;
    message = { text: `✕ Not sent — ${reason}`, title: error?.message ?? null };
  }

  return {
    state,
    heading,
    cost,
    question,
    unreadable: nonBlank(question) ? null : "The session's question could not be read — open its terminal to see it.",
    toggle: expanded ? "Show less" : "Show the full question",
    notice: state === "parked" ? "The session stopped waiting at its bound. Your answer resumes it." : null,
    helper: state === "answered" ? null : `Sent to the session word for word and kept on the run record.${remote && node ? ` Delivered to ${node}.` : ""}`,
    button: state === "answered"
      ? null
      : { label: sending ? "Sending…" : state === "parked" ? "Send answer and resume" : "Send answer", disabled: sending || !nonBlank(text), busy: sending },
    receipt,
    message,
  };
}
