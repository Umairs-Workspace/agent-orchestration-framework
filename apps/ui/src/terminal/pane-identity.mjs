// The ONE terminal control's PER-PANE IDENTITY (milestone 46 / story 03 — ADR-002's "the
// control derives from the descriptor", carrying forward m38/ADR-014 invariant 4's V1 and V8).
// A framework-free ESM module — no React, no DOM, no socket.
//
// WHAT THIS ANSWERS, and it is two questions the rest of the core could not:
//   1. WHICH pane is this? A stable key, so two panes open at once can never cross-wire.
//   2. May it be rendered AT ALL? V1: "a terminal with no visible owner is never rendered."
//
// WHY THE KEY IS GENERIC RATHER THAN `(nodeId, sessionId)`. Its predecessor was a fleet-shaped
// join of exactly those two values, which is the same conflation ADR-002 removes everywhere
// else: the tuple that addresses a pane is the SOURCE's declared `params`, whatever they are.
// Keying on the descriptor's own params means a third source is a table row here too, and
// nothing in this module learns a new word. The V8 property is preserved exactly and is the
// reason the key exists: two panes on the SAME node with different sessions get two DIFFERENT
// keys, and a half-tuple gets NO key — never an accidental `node-a::undefined` that would
// match a real subscription and bleed another session's bytes into this pane.
//
// WHY THE OWNER IS INJECTED. The identity LINE names the owner and, for a source whose far end
// is elsewhere, the far end. "Elsewhere" is domain wording — the fleet says `node-a`, and a
// future source will say something else — so the call site hands it in, exactly as it hands in
// the state ramp's `reason`. This module composes; it does not reach for a vocabulary that
// belongs to a surface.

export const NOT_RENDERED = Object.freeze({
  // The source's declared params are not all present, so there is no pane to address.
  UNADDRESSED: "unaddressed",
  // Nothing can name who this terminal belongs to. V1 refuses to render it.
  NO_OWNER: "no-owner",
  // There is no source bound at all.
  NO_SOURCE: "no-source",
});

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// hasVisibleOwner(owner) — V1's PREDICATE, exported so there is exactly ONE derivation of "a
// terminal with no visible owner is never rendered" in this codebase.
//
// It had two at 46/04's first review: this module's `terminalPaneIdentity` (which production
// reads) and a second `nonEmpty(options.owner)` inside the state ramp's descriptor. Two modules
// computing one rule from one input is how they come to disagree — and a reviewer comparing them
// finds them identical, so the disagreement arrives later, in an edit nobody reviews against the
// other copy. The ramp now imports this.
export function hasVisibleOwner(owner) {
  return nonEmpty(owner) != null;
}

// terminalPaneKey(source, params) — the ONE identity string for a pane, or `null` when the
// source's declared params are not all present.
//
// Each part is percent-encoded before joining, so a value containing the separator cannot
// forge another pane's key — the same reason the socket URL encodes its params rather than
// concatenating them.
export function terminalPaneKey(source, params) {
  if (source == null || typeof source !== "object") return null;
  const declared = Array.isArray(source.params) ? source.params : [];
  const kind = nonEmpty(source.kind);
  if (kind == null || declared.length === 0) return null;
  const parts = [];
  for (const name of declared) {
    const value = nonEmpty(params?.[name]);
    if (value == null) return null;
    parts.push(encodeURIComponent(value));
  }
  return [encodeURIComponent(kind), ...parts].join("::");
}

// terminalPaneLabel({ posture, identity, ref, detail, siblings }) — THE ACCESSIBLE NAME.
//
// DESIGN §Accessibility 4: it names the SESSION, never the widget class — `aria-label="Terminal"`
// on twelve tiles is a GAP. It lives here rather than beside the JSX because the fullscreen
// request carries the same string, so one name serves the inline region and the presented dialog.
//
// `siblings` IS THE m49 ADDITION AND IT IS A MEASURED FIX, not a flourish. `<owner> → <node>` is
// unambiguous on a surface holding ONE pane, and it is NOT on a surface holding twelve: two
// sessions of one work item on one node — or two free sessions in one repo, which is exactly the
// case m48/DG-49-8 measured on the fleet card — produce the SAME name, and a screen-reader user
// cannot tell the tiles apart at all. Where the surface says its panes have siblings, the tail
// (`session 7f3a91c`) joins the name; the three hosts that hold one pane are byte-identical.
export function terminalPaneLabel({ posture, identity, ref, detail, siblings } = {}) {
  const named = identity?.rendered === true ? identity.label : (nonEmpty(ref) ?? "no session");
  const tail = siblings === true ? nonEmpty(detail) : null;
  return `${posture} terminal for ${named}${tail == null ? "" : ` · ${tail}`}`;
}

// terminalPaneIdentity({ source, params, ref, farEnd }) — the identity MODEL, and the V1 gate.
//
// Returns `{ rendered: false, reason }` when the pane cannot be addressed or cannot name an
// owner — "no stream" is a first-class, honest outcome and not an error — and otherwise the
// whole model. The `rendered: false` answer is the STRUCTURAL half of "the surface renders no
// terminal at all": a caller that renders on `rendered` cannot accidentally paint a pane whose
// owner nothing can name.
//
// `ref` prefers the human work-item ref (`46/03`) and degrades to an id only because the
// caller passes one — this module invents no fallback owner, because an invented owner is
// precisely the bare session hash V1 exists to keep off the screen.
export function terminalPaneIdentity({ source, params, ref, farEnd } = {}) {
  if (source == null || typeof source !== "object") {
    return Object.freeze({ rendered: false, reason: NOT_RENDERED.NO_SOURCE, key: null, ref: null, label: null });
  }
  const key = terminalPaneKey(source, params);
  if (key == null) {
    return Object.freeze({ rendered: false, reason: NOT_RENDERED.UNADDRESSED, key: null, ref: null, label: null });
  }
  const owner = nonEmpty(ref);
  if (owner == null) {
    return Object.freeze({ rendered: false, reason: NOT_RENDERED.NO_OWNER, key: null, ref: null, label: null });
  }
  const far = nonEmpty(farEnd);
  const declared = Array.isArray(source.params) ? source.params : [];
  return Object.freeze({
    rendered: true,
    reason: null,
    key,
    ref: owner,
    farEnd: far,
    // The one-line identity a header renders. A source whose far end is somewhere else names
    // it; one whose far end is its own origin does not need to.
    label: far == null ? owner : `${owner} → ${far}`,
    // The address, as data, so a caller can render a tail (`session 7f3a`) without this module
    // owning that sentence.
    address: Object.freeze(declared.map((name) => Object.freeze([name, params?.[name] ?? null]))),
  });
}
