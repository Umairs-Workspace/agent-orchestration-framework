// src/notify/form.mjs — THE ONE SHAPE OF AN ASK, SHARED BY EVERY FACE (milestone 131; ADR-006 §1,
// DESIGN "The one shape"). The terminal's account line, the Discord message and the board's card
// all read these six functions, so the event phrases and the elapsed ladder are spelled HERE and
// nowhere else. Pure and zero-import on purpose: the board imports this file from outside `ui/src`
// (the one such import, fenced by FF-13108), and a formatter that imported anything would drag that
// dependency into the browser bundle.
//
// `eventPhrase`, `headline`, `cost` and `accountLine` take the ENVELOPE (`buildNotifyEnvelope`,
// `src/notify/notify.mjs`), never loose arguments. A part a face lacks is omitted whole — never a
// placeholder, never `null` or `[object Object]` printed into a line.

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const ONE_LINE_MAX = 100;
const ONE_LINE_WINDOW = 20;

const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

// formatElapsed(ms) → the wait, floored at each rung: `<n>s` under a minute, `<n>m` under an hour,
// `<h>h <m>m` under a day (`<h>h` at 0 minutes), `<d>d <h>h` beyond (`<d>d` at 0 hours). No `ago`:
// it is a wait, not a timestamp. A negative, non-finite or non-number `ms` has no elapsed (`null`).
export function formatElapsed(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < MINUTE_MS) return `${Math.floor(ms / SECOND_MS)}s`;
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

// oneLineAsk(text) → the question as one line: every whitespace run collapsed to one space and the
// ends trimmed. Up to 100 code points it is whole; longer, it is cut at the last space inside the
// first 100 when that space is in the last 20 of them, else hard-cut at 100, then right-trimmed and
// given `…`. A non-string or blank question is `null`.
export function oneLineAsk(text) {
  if (!nonBlank(text)) return null;
  const points = [...text.replace(/\s+/gu, " ").trim()];
  if (points.length <= ONE_LINE_MAX) return points.join("");
  const window = points.slice(0, ONE_LINE_MAX);
  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace >= ONE_LINE_MAX - ONE_LINE_WINDOW ? window.slice(0, lastSpace) : window;
  return `${cut.join("").trimEnd()}…`;
}

// eventPhrase(envelope) → the event's words, or `null` for an event that is not one of the seven.
export function eventPhrase(envelope) {
  switch (envelope?.event) {
    case "session-needs-input": return "waiting on you";
    case "session-answered": {
      const by = envelope.outcome?.by;
      return nonBlank(by) ? `answered by ${by}` : "answered";
    }
    case "session-parked-unanswered": return "parked, unanswered";
    case "loop-halted": {
      const id = envelope.stop?.id;
      return nonBlank(id) ? `loop halted on ${id}` : "loop halted";
    }
    case "loop-died": return "loop died";
    case "loop-relaunched": return "loop relaunched";
    case "milestone-accepted": return "accepted";
    default: return null;
  }
}

// headline(envelope) → `<ref> — <phrase>`, or `null` when there is no phrase.
export function headline(envelope) {
  const phrase = eventPhrase(envelope);
  return phrase == null ? null : `${envelope.ref} — ${phrase}`;
}

// cost(envelope) → `(<phase>, <elapsed>)`, `(<phase>)` when the wait has no elapsed, or `null` when
// there is no phase — omitted whole, never a pair of empty brackets.
export function cost(envelope) {
  const phase = envelope?.phase;
  if (!nonBlank(phase)) return null;
  const elapsed = formatElapsed(envelope.elapsedMs);
  return elapsed == null ? `(${phase})` : `(${phase}, ${elapsed})`;
}

// accountLine(envelope) → the terminal's one line: headline, then ` <cost>`, then `: <one-line ask>`,
// each only when present. `null` when there is no headline.
export function accountLine(envelope) {
  const head = headline(envelope);
  if (head == null) return null;
  const price = cost(envelope);
  const ask = oneLineAsk(envelope.question);
  return `${head}${price == null ? "" : ` ${price}`}${ask == null ? "" : `: ${ask}`}`;
}
