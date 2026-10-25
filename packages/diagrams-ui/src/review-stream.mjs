// THE EDITOR'S SIDE OF THE "LOOK NOW" STREAM (milestone 171 / ADR-003) — pure: no React, no DOM, no
// EventSource. The board face says only WHAT moved; this reducer says what the editor does about it,
// given what the editor knows: the revision it last read or wrote, whether the canvas has unsaved
// edits, and whether one of its own writes is in flight. `ExcalidrawEditor.tsx` owns the EventSource
// and carries out the effects; the suite drives the same code.
//
// Effects: `refresh` (re-read the proposals), `replace` (re-read the draft into a clean canvas),
// `offer-reload` (keep the unsaved canvas, show the changed-elsewhere line), `close-line`, `defer`
// (an own write is in flight: decide again once it has answered), `connect` and `disconnect`.

export const STREAM_INITIAL = Object.freeze({ stream: "connecting", review: null, offered: null });
export const CANVAS_UPDATED = "Updated from the saved draft";
export const CHANGED_ELSEWHERE = "The saved draft changed in another window. Reload to see it — your unsaved edits will be replaced.";

const step = (state, effects = []) => ({ state, effects });

// A saved draft at `revision`: nothing if it is the one the editor has (it read or wrote it); held
// while an own write is in flight, whose answer may be that very revision; otherwise taken in place by
// a clean canvas, or offered to one with unsaved edits.
function sceneMoved(state, revision, facts) {
  if (!revision || revision === facts?.revision) return step(state);
  if (facts?.writing) return step(state, ["defer"]);
  if (facts?.dirty) return step({ ...state, offered: revision }, ["offer-reload"]);
  return step({ ...state, offered: null }, ["replace"]);
}

export function streamStep(state, event, facts) {
  const current = state ?? STREAM_INITIAL;
  switch (event?.type) {
    case "connect": return step({ ...current, stream: "connecting" }, ["connect"]);
    case "open": return step({ ...current, stream: "open" });
    // The first event of every connection. A review stamp that moved while the editor was not
    // listening is one refresh; the first connection only learns the baseline.
    case "stamp": {
      const refreshed = current.review !== null && event.review !== current.review;
      const next = sceneMoved({ ...current, stream: "open", review: event.review ?? null }, event.revision, facts);
      return step(next.state, [...(refreshed ? ["refresh"] : []), ...next.effects]);
    }
    case "review":
      if (event.review === current.review) return step(current);
      return step({ ...current, review: event.review ?? null }, ["refresh"]);
    case "scene": return sceneMoved(current, event.revision, facts);
    // The stream is down — answered 404, never reached, or dropped. The poll covers it until it is back.
    case "error": return step({ ...current, stream: "down" });
    case "hidden": return step({ ...current, stream: "closed" }, ["disconnect"]);
    // Shown again: one refresh for whatever moved while hidden, and a new connection whose first stamp
    // is then only the baseline.
    case "visible": return step({ ...current, stream: "connecting", review: null }, ["refresh", "connect"]);
    case "reload": return step({ ...current, offered: null }, ["replace", "close-line"]);
    default: return step(current);
  }
}
