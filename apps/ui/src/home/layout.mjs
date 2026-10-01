// The terminals home's LAYOUT COMPOSER (milestone 49 / story 02 / task 02 — ARCHITECTURE
// ADR-009, DESIGN DG-49-9). A per-operator, per-origin browser preference that can FILTER the
// live index and can never CONTRIBUTE to it.
//
// THE LOAD-BEARING NEGATIVE, first, because everything else follows from it: a persisted
// layout that can contribute a row is a screen showing sessions that no longer exist. Storage
// is the ONE place in this whole milestone where that lie can be manufactured locally, with no
// producer, no node and no wire involved at all. So the composer SELECTS from the array it was
// handed and never CONSTRUCTS a row: every composed entry is one of the live rows by object
// identity, which is what makes "never a SOURCE" checkable — a composer that rebuilt a row
// from a stored tuple would satisfy a deep-equal check and would be manufacturing exactly the
// ghost this milestone exists to remove.
//
// STORAGE IS AN ARGUMENT, NOT A GLOBAL THIS MODULE REACHES FOR. That is the house pattern, not
// a new one: `withScopeParam`/`scopeFromSearch` take a `location.search`-shaped STRING and the
// socket-URL builder takes its origins, both for the reason stated in their own headers — this
// repo has no browser harness, so a module that reached for a browser global would be a module
// no `node:test` could drive. Private modes and some embeddings throw on ACCESS rather than on
// write, so `typeof <global>` is not a safe probe either. The module takes it.
//
// WHAT IS PERSISTED IS A WATCHED SET, NEVER A HIDDEN SET (DG-49-9). Every failure here
// degrades in the direction of SHOWING a live row — the opposite direction from every other
// fail-closed rule in this milestone, and deliberately so: a session appearing for the first
// time must never be pre-suppressed by a preference an operator set weeks ago, on the one
// screen built so they do not lose track of an agent. And a stored SUBSCRIPTION flag is not a
// preference this module honours: subscription is arbitrated against a cap and a live row set
// the composer cannot see (ADR-006), so a stored one is a stale answer to another module's
// question.
//
// EVERY FAILURE IS THE SAME ANSWER: the live rows, in the order they arrived, and no focus.
// Absent, empty, corrupt, unparseable, wrong-shaped, throwing on read, throwing on the property
// ACCESS, a schema version behind, a schema version ahead — one answer. Never an error, never a
// blank grid, never a retry, and never a repair: a parse failure is treated as ABSENT, not as a
// corruption to surface. "The grid is fully functional with storage unavailable — which is also
// how every headless test drives it" (ADR-009). That is not a fallback path; it is the default
// one.
//
// AND THE COMPOSER NEVER SORTS. It permutes the survivors into the operator's stored order and
// leaves the newcomers in the order they were handed, behind them. The grid's sort key is
// exactly one question and it belongs to the ordered-array producer — a second comparison here
// would be a second chance to disagree with it.
//
// WHAT A PANE IS, AND WHAT ITS KEY IS, ARE IMPORTED — they are not re-derived here. Both
// answers already have a home three files away in this same directory, `feed-axis.mjs` already
// imports that pair, and a second copy of the KEY RULE in particular is the defect worth
// naming: the separator is what stops ("a-b","c") and ("a","b-c") being one pane, sixteen live
// sockets are keyed off it, and two copies of it in one directory are two chances to disagree
// about which two agents share a tile. They had already diverged in SHAPE before they diverged
// in rule (object tuples there, array tuples here), which is how that starts.
import { paneKeyOf, paneTuple } from "./socket-cap.mjs";

export const LAYOUT_STORAGE_KEY = "aof.home.layout";

// THE KEY CARRIES A SCHEMA VERSION so a shape change is a SILENT RESET rather than a crash on a
// value written by another build. BOTH directions reset: the version that has not been written
// yet is the one that arrives when an operator opens an older tab against a newer build.
// `localStorage` is already per-origin, so no origin is encoded here — the same bundle served
// from three origins keeps three independent layouts, which is correct.
export const LAYOUT_SCHEMA_VERSION = 1;

const EMPTY = Object.freeze([]);

// THE PERSISTED FORM IS A PAIR, THE RULE IS THE ARBITER'S. A stored pane is TWO STRINGS and
// nothing else — persisting a ROW instead of a tuple is how the browser becomes a second, stale
// authority over what the mesh says exists, a stored `repo` still saying `demo` after the
// session moved. JSON has no object-shorthand worth defending here, so the WIRE shape stays an
// array; what `paneTuple` decides is what a readable tuple IS, and `paneKeyOf` what its key is.
const asPair = (tuple) => (tuple == null ? null : [tuple.nodeId, tuple.sessionId]);

function storedTupleOf(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  return asPair(paneTuple({ nodeId: value[0], sessionId: value[1] }));
}

function liveTupleOf(row) {
  return asPair(paneTuple(row));
}

// ONE key rule for the whole directory, imported. The separator is what keeps ("a-b","c") and
// ("a","b-c") two panes, and this module must not hold a second opinion about it.
function keyOf(tuple) {
  return tuple == null ? null : paneKeyOf({ nodeId: tuple[0], sessionId: tuple[1] });
}

// READING STORAGE IS ONE TRY/CATCH AROUND EVERYTHING, INCLUDING THE PROPERTY ACCESS. A build
// that probed with `typeof storage.getItem === "function"` before the try/catch is caught by
// the property-getter case: the ACCESS itself is what throws in a private mode.
function readRaw(storage) {
  try {
    if (storage == null) return null;
    const getItem = storage.getItem;
    if (typeof getItem !== "function") return null;
    const raw = getItem.call(storage, LAYOUT_STORAGE_KEY);
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

// A payload that cannot be USED is a payload that is ABSENT. Unknown top-level keys are ignored
// rather than treated as corruption — a later build writing one must not blank an operator's
// grid — but nothing unknown can ever REMOVE a live row, which is the watched-set rule.
function readLayout(storage) {
  const raw = readRaw(storage);
  if (raw == null || raw === "") return null;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.version !== LAYOUT_SCHEMA_VERSION) return null;
  const panes = [];
  if (Array.isArray(payload.panes)) {
    for (const entry of payload.panes) {
      const tuple = storedTupleOf(entry);
      if (tuple != null) panes.push(tuple);
    }
  }
  return { panes, focus: storedTupleOf(payload.focus) };
}

/**
 * Compose the grid's rows and focus from the live index and a stored preference.
 *
 * Returns exactly `{ rows, focus }` — no ghost, no placeholder, no tombstone, no `missing` or
 * `dropped` entry a render site could turn into a tile, and nothing that reports an absence as
 * an error, a warning or a degraded state. A stored tuple the live index does not carry leaves
 * NO trace at all, and it is FILTERED rather than erased: composing again after it returns to
 * the index puts it back where the operator left it. A composer that pruned storage on every
 * compose would silently rewrite an operator's layout from a five-second network blip.
 *
 * COMPOSING IS A READ. It writes nothing, ever — a read that repairs storage is a write nobody
 * asked for.
 *
 * `rows` is always a PERMUTATION of the live rows it was handed — same length, same elements by
 * identity, in the operator's order where they had one. A preference may reorder the index; it
 * may never shorten it, and the stored and unstored paths answer with the same rows.
 */
export function composeHomeLayout(rows, storage) {
  const live = Array.isArray(rows) ? rows : EMPTY;
  const layout = readLayout(storage);

  if (layout == null) return Object.freeze({ rows: Object.freeze([...live]), focus: null });

  // O(live + stored), never O(live x stored): a composer that filtered 200,000 stored tuples
  // against three live rows pairwise would hang the first render, and the honest answer is
  // still just the three live rows.
  //
  // THE INDEX IS THE IDENTITY, NOT THE KEY, and that is the difference between a permutation and
  // a quiet deletion. Two live rows can share a tuple (a malformed poll, a merge, a bug one
  // layer down); keyed bookkeeping emits the first, then skips the second as "already placed"
  // and returns FEWER rows than it was handed — so the mere PRESENCE of a stored preference
  // would remove a live row, which is the exact direction ADR-009 and DG-49-9 forbid. Positions
  // are unambiguous where keys are not, so the result is always a PERMUTATION of `live`: every
  // handed row appears exactly once, and the `layout == null` path above returns the same rows
  // for the same input.
  const indexByKey = new Map();
  live.forEach((row, index) => {
    const key = keyOf(liveTupleOf(row));
    if (key != null && !indexByKey.has(key)) indexByKey.set(key, index);
  });

  const ordered = [];
  const placed = new Set();
  for (const tuple of layout.panes) {
    const key = keyOf(tuple);
    if (key == null || !indexByKey.has(key)) continue;
    const index = indexByKey.get(key);
    if (placed.has(index)) continue;
    placed.add(index);
    ordered.push(live[index]);
  }
  // The newcomers follow in the order they were handed — un-re-sorted, and never behind a
  // comparison of `repo`, `assistant`, `lastPingAt`, connection state or recency.
  live.forEach((row, index) => {
    if (placed.has(index)) return;
    ordered.push(row);
  });

  // FOCUS IS NEVER A DANGLING REFERENCE. It is answered with `null` or with a tuple that is on
  // screen — and it is stored as a TUPLE, never as an index or a position, because a tile
  // arriving above the focused one would otherwise silently move focus to a different agent.
  const focusKey = keyOf(layout.focus);
  const focus = focusKey != null && indexByKey.has(focusKey) ? Object.freeze([...layout.focus]) : null;

  return Object.freeze({ rows: Object.freeze(ordered), focus });
}

/**
 * Persist the layout: an ordered list of tuples, the focused tuple, and the schema version.
 * Nothing else — no `repo`, no `assistant`, no `workItem`, no `lastPingAt`, no bytes, no
 * scrollback, no connection word, no subscription flag and no timestamp. The payload carries no
 * clock and no nonce, so saving the same layout twice writes a byte-identical string.
 *
 * A save that cannot be written is a NO-OP and the grid stays fully functional: a quota error,
 * a security error, a storage with no `setItem`, a read-only storage and no storage at all are
 * one behaviour, and none of them is reported to the caller as an error state.
 */
export function saveHomeLayout(rows, storage, options) {
  const live = Array.isArray(rows) ? rows : EMPTY;
  const panes = [];
  const seen = new Set();
  for (const row of live) {
    const tuple = liveTupleOf(row);
    const key = keyOf(tuple);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    panes.push(tuple);
  }
  const requested = storedTupleOf(options?.focus) ?? liveTupleOf(options?.focus);
  const focus = requested != null && seen.has(keyOf(requested)) ? requested : null;
  const payload = { version: LAYOUT_SCHEMA_VERSION, panes, focus };

  try {
    if (storage == null) return;
    const setItem = storage.setItem;
    if (typeof setItem !== "function") return;
    setItem.call(storage, LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Degrade silently. ADR-009: never an error, never a blank grid, never a retry.
  }
}
