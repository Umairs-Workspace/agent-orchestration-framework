// Adapted from elirantutia/vibeyard (MIT) — the per-session provider selection
// (vibeyard's providerId on a SessionRecord), re-homed as a framework-free
// radio-semantics picker. vibeyard is MIT-licensed; see the repo NOTICE file.
// m03/DESIGN §4: the provider picker offers claude / codex / gemini with EXACTLY ONE
// selected at all times (never two-on, never zero-on).
//
// No React — pure state, so the @executable scenarios run headlessly. Moved to the ONE
// terminal control's home (milestone 46 / ADR-001) with its coverage; WHETHER the picker is
// offered at all is now derived from the source's declared params and the mount's posture
// (input-policy.mjs), never from a conditional at a call site.

// The exclusive provider vocabulary (mirrors src/terminal-providers.mjs).
export const PROVIDER_IDS = ["claude", "codex", "gemini"];

// The DESIGN default, and the value a picker falls back to rather than reaching zero-on.
export const DEFAULT_PROVIDER_ID = "claude";

// The initial picker: exactly one provider selected.
export function initialPicker() {
  return { selected: DEFAULT_PROVIDER_ID };
}

// Select a provider — moves the single selection to `id`. An unknown id is a NO-OP that
// leaves the selection VALID rather than clearing it: a picker that can reach zero-on is a
// picker that can start a session with no provider.
export function selectProvider(state, id) {
  if (!PROVIDER_IDS.includes(id)) return { selected: state?.selected ?? DEFAULT_PROVIDER_ID };
  return { selected: id };
}

// True iff `id` is the one selected provider.
export function isSelected(state, id) {
  return (state?.selected ?? null) === id;
}

// The count of selected providers — always exactly 1 for a valid picker state.
export function selectedCount(state) {
  return PROVIDER_IDS.filter((id) => isSelected(state, id)).length;
}

// The providers the picker OFFERS today. claude-only at the operator's request (codex/gemini are
// paused); the seam still supports all three, so re-enabling is widening this list.
//
// It lives here rather than in the component because it is a decision, and a decision in JSX is a
// decision no test in this repo can reach (ADR-001). It is a SUBSET of the vocabulary, never a
// second one: the assertion that keeps it honest is that every visible id is a known id.
export const VISIBLE_PROVIDER_IDS = Object.freeze(["claude"]);

// withSelectedProvider(source, params, picker) — the PICKER'S SELECTION JOINS THE ADDRESSING
// TUPLE, and only for a source that DECLARES `provider` as one of its params.
//
// WHY THIS IS A FUNCTION AND NOT A LINE IN THE COMPONENT. The `provider` half of a `local-pty`'s
// tuple is chrome state — it lives in the picker, which lives in the control — so the CALL SITE
// cannot supply it and the mount modules deliberately do not. That leaves exactly one seam where
// the tuple is completed, and at 46/04's first review that seam was an inline ternary in the
// `.tsx` while the mount module carried a dead `{ provider }` option that production never used:
// the tested path and the production path were different lines. This is the production one.
//
// NOTHING IS DEFAULTED HERE. The picker's own invariant is exactly-one-selected — it can never
// reach zero-on — so the selection is READ, not fallen back to. A `?? "claude"` here would spawn
// `claude` for an operator who had chosen otherwise, and the tuple would look complete while it
// did it.
export function withSelectedProvider(source, params, picker) {
  const declared = Array.isArray(source?.params) ? source.params : [];
  if (!declared.includes("provider")) return params ?? {};
  // A KNOWN id, or nothing. `picker.selected` is validated against the vocabulary rather than
  // trusted: a malformed picker completing the tuple with `"banana"` would build a socket URL to
  // a provider the server does not have, and the URL would look perfectly well-formed doing it.
  const selected = PROVIDER_IDS.includes(picker?.selected) ? picker.selected : null;
  return selected == null ? { ...(params ?? {}) } : { ...(params ?? {}), provider: selected };
}
