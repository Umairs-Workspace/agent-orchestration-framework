// THE GRID'S OWN DECISIONS (milestone 49 / story 05 — ADR-002's row set, ADR-006 amendment (3)'s
// display order, DESIGN §The focus model, DG-49-7's one live region).
//
// A framework-free ESM module — no React, no DOM, no global, no clock, no socket — because this
// repo has NO React test harness for logic and TECH_DEBT 29 measured what a decision in JSX costs:
// milestone 46 shipped its headline connecting to nothing past 537 green tests. Every decision the
// grid makes is a value a plain `node:test` reads: which rows become tiles, in what ORDER, which
// tile holds the keyboard, and what the ONE live region says.
//
// ═══ THREE DECISIONS, ONE MODULE, AND THAT IS ARGUED RATHER THAN CONVENIENT ══════════════════
// ADR-001 names this directory's members as the domain's NOUNS — "the grid, the pane's mount
// declaration, the feed axis, the subscription arbiter and the layout composer" — and THE GRID is
// one of them. Its rows, its order, its focus and its announcement are one noun's answers to one
// question ("what is on screen, where, and what changed"), and each reads the same two inputs.
// Three files would be three imports of one another and a fourth chance to disagree about what a
// "tile" is; the directory's own budget `why` asks this question in terms, and this is the answer.
//
// ═══ THE ROW SET IS `sessions[]` AND NOTHING ELSE (ADR-002) ══════════════════════════════════
// `buildSessionIndex` is the ONE enumerating authority over "what live sessions exist across the
// mesh". AN ASSIGNMENT IS NOT A SESSION: the union `sessions[] ∪ assignments-with-a-sessionId`
// makes this grid full TODAY with no producer work, and it is the one thing ADR-002 refuses — it
// puts a SECOND authority on liveness, and an assignment's `state` is dispatch lifecycle, not
// liveness (a `running` assignment on a dead node stays `running` forever). `items[]` is JOINED,
// never enumerated: a work item contributes a MARK to a row that already exists, never a row.
//
// ═══ AND THE ORDER IS THE OPERATOR'S, DECIDED IN EXACTLY ONE PLACE ═══════════════════════════
// `(nodeId, repo, sessionId)`, ascending, plain codepoint comparison — DESIGN §focus model rule 7,
// which ADR-006 amendment (3) rules over the index's own `(nodeId, sessionId)` on m46/ADR-005's
// precedent that DESIGN owns what the operator reads. Four constraints ride with it and all four
// are here: ONE sort site (neither the arbiter nor the layout composer sorts — both consume the
// order this hands them, because two sorts is two chances to disagree and the arbiter's priority
// ranking would then depend on which ran); a plain `<`/`>` comparison and NEVER `localeCompare` (a
// locale-sensitive collation makes two operators' grids differ, and `runs.mjs` avoids it by name
// for the same reason); a row with no stated `repo` sorts LAST within its node, never first and
// never under a fabricated `""`; and THE SERVER'S ORDER IS NOT CHANGED — the index keeps
// `(nodeId, sessionId)` because it is a wire contract with a second consumer (the desktop), and
// re-sorting it for one surface's reading preference would be the tail wagging the dog. The
// re-sort is safe HERE precisely because the index hands down a TOTAL order.
import { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE, feedAxisFor } from "./feed-axis.mjs";
import { paneTuple } from "./socket-cap.mjs";
// The SURFACE's count rule (GAP-6), imported rather than re-typed as a ternary — see the live
// region's own note below. `page-state.mjs` imports nothing from this directory.
import { countedPhrase } from "./page-state.mjs";
import { terminalPaneKey } from "../terminal/pane-identity.mjs";
import { sessionSourceFor } from "../terminal/source-table.mjs";

const EMPTY = Object.freeze([]);

// THE AGENT-STATE MARK, AND IT KEYS ON THE EXACT WORD (DG-49-3; PO ruling 2026-08-13).
//
// `code` is a MULTI-VALUED column — production also writes `resumed` and a family of settled codes
// — and story 00's projection copies it VERBATIM rather than filtering, because a whitelist on the
// wire would make the wire a second authority over the worker's vocabulary. So words that are not
// `needs-input` WILL arrive here, and a `code != null` test renders "needs input" for a RESUMED
// session: a false claim that a human is being waited on, which is the one failure this mark
// exists to prevent. An unfamiliar code asserts nothing at all, exactly as an absent one does —
// the vocabulary is one value long and "we do not know" is not a badge.
export const NEEDS_INPUT_CODE = "needs-input";
export const MARK_NEEDS_INPUT = "needs input";

export { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE };

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// A ROW IS ADDRESSABLE OR IT IS NOT A TILE, and the test is m48's inherited obligation: a NON-EMPTY
// STRING, never `!= null` and never truthiness. `"0"` is a legitimate session id and it fails both
// of the shorter spellings — `paneTuple` applies the same rule the index itself applies at
// `global-mesh-query.mjs:280`, so two spellings of one rule cannot disagree.
// THE TILE'S KEY IS THE CONTROL'S OWN PANE KEY, and that is DESIGN §rule 6 rather than a
// preference: the same string is the render key, the focus model's stop and the control's session
// identity, so a tile cannot be re-keyed by a re-order and focus cannot drift onto another agent.
// A second spelling here would be a fourth identity for one pane.
const MIRROR_SOURCE = sessionSourceFor("mirror").source;

function tileFor(row, axis, mark, retained) {
  const tuple = paneTuple(row);
  const key = tuple == null ? null : terminalPaneKey(MIRROR_SOURCE, tuple);
  if (key == null) return null;
  return Object.freeze({
    key,
    nodeId: tuple.nodeId,
    sessionId: tuple.sessionId,
    // The repo as STATED, or null. A fact nobody stated may not win a comparison, and it may not be
    // rendered as an empty field either.
    repo: nonEmpty(row?.repo),
    row,
    axis,
    mark,
    retained: retained === true,
  });
}

// The join, by `workItem.ref` into `items[]` — exactly what milestone 48 designed the entry's
// `workItem` pair for. It contributes a MARK and never a row, and a session whose ref matches
// NOTHING still renders its tile: a missing join loses a mark, never a session.
function markFor(row, items) {
  const ref = nonEmpty(row?.workItem?.ref);
  if (ref == null) return null;
  const assignmentId = nonEmpty(row?.workItem?.assignmentId);
  for (const item of items) {
    if (item?.ref !== ref) continue;
    const assignment = item?.assignment;
    if (assignment == null || typeof assignment !== "object") continue;
    // The tuple identifies the assignment; an item carrying a DIFFERENT assignment says nothing
    // about this session.
    if (assignmentId != null && nonEmpty(assignment.assignmentId) !== assignmentId) continue;
    return assignment.code === NEEDS_INPUT_CODE ? MARK_NEEDS_INPUT : null;
  }
  return null;
}

// THE ONE SORT SITE. `(nodeId, repo, sessionId)`, plain codepoint comparison, unstated repo last.
function compareTiles(left, right) {
  if (left.nodeId !== right.nodeId) return left.nodeId < right.nodeId ? -1 : 1;
  if (left.repo !== right.repo) {
    // A fact nobody stated cannot win a comparison — `buildSessionIndex`'s own `stated()` rule,
    // applied to the order the operator reads.
    if (left.repo == null) return 1;
    if (right.repo == null) return -1;
    return left.repo < right.repo ? -1 : 1;
  }
  if (left.sessionId === right.sessionId) return 0;
  return left.sessionId < right.sessionId ? -1 : 1;
}

/**
 * homeGridRows(status, { retained }) — the ordered tiles, from `status.sessions[]` alone.
 *
 * `retained` carries the ROWS of tuples that LEFT the index while their pane still held bytes;
 * they are merged here rather than appended by a render site so the order has ONE author. A
 * retained tuple that has come BACK is not duplicated: the live row wins, because the index is the
 * authority and the retention is only a courtesy to a pane the operator is reading.
 *
 * A payload with no `sessions` key, or one whose `sessions` is not an array, yields NO tiles and
 * throws nothing: `sessions` is always present from an m48 build, so its absence means a build that
 * does not report sessions, and the honest answer is an empty grid rather than a thrown surface
 * inside `SurfaceSlot`.
 */
export function homeGridRows(status, options = {}) {
  const sessions = Array.isArray(status?.sessions) ? status.sessions : EMPTY;
  const items = Array.isArray(status?.items) ? status.items : EMPTY;
  const tiles = [];
  const seen = new Set();
  for (const row of sessions) {
    // The axis is derived from the row's OWN wire fields (`workItem`), never from bytes and never
    // from a previous poll here: `roster-gone` is a property of a tuple that LEFT, which is the
    // `retained` list below.
    const tile = tileFor(row, feedAxisFor(row, null), markFor(row, items), false);
    if (tile == null || seen.has(tile.key)) continue;
    seen.add(tile.key);
    tiles.push(tile);
  }
  for (const row of Array.isArray(options?.retained) ? options.retained : EMPTY) {
    const tile = tileFor(row, FEED_ROSTER_GONE, markFor(row, items), true);
    if (tile == null || seen.has(tile.key)) continue;
    seen.add(tile.key);
    tiles.push(tile);
  }
  // A FRESH ARRAY EVERY CALL, and no memo: an answer held across polls is an answer that can go
  // stale, and the grid's whole job is to stop being stale.
  return Object.freeze(tiles.sort(compareTiles));
}

// EVERY TILE THAT CAN HOLD A SOCKET IS AN ARGUMENT TO THE ARBITER. A SOCKET IS A SOCKET.
//
// A `no-producer` row opens NONE — nothing feeds that tuple, and the socket would prove nothing
// the wire has not already said — so it does not take one of the cap's scarce slots. A RETAINED
// tile is the opposite case and it is the one this function got wrong (F1, measured: 20 live
// sockets at a cap of 16): its tuple left the index, so its axis is `roster-gone`, but it is
// STILL HOLDING AN OPEN SOCKET. Filtering it out told the arbiter its slot was vacant, the next
// arbitration refilled that slot, and the count grew without bound under ordinary churn — four
// leave and four arrive in one poll and the grid holds twenty.
//
// That breaks ADR-006's I1 (`|result| ≤ cap`), which is the obligation the mirror's 256 KiB replay
// burst and its 64-tuple LRU tail actually buy — and it fails in the direction ADR-006 calls
// unrecoverable, because an evicted tail is byte-indistinguishable from a silent worker. Handed
// in, a retained tile is an INCUMBENT: I2 keeps it until the cap itself cannot, which is exactly
// the rule that says the cap is the only thing that may cost a pane its socket.
export function dialableTiles(tiles) {
  return Object.freeze(
    (Array.isArray(tiles) ? tiles : EMPTY).filter((tile) => tile.axis === FEED_PRODUCER_KNOWN || tile.retained === true),
  );
}

// ─── THE FOCUS MODEL (DESIGN §The focus model rules 1, 2, 6 and 8) ───────────────────────────
//
// A grid of twelve tiles is ONE tab stop, not forty, and the stop is stored as a PANE KEY rather
// than an index — the whole of rule 6. Storing a position is the defect that rule exists to
// prevent: the payload re-polls every 5000ms, so a tile arriving ABOVE the focused one would
// silently move focus to a different agent four times a minute.
//
// MOVEMENT IS BY RENDERED POSITION, so it matches what the operator SEES at that width: at one
// column `→` and `↓` are the same move, because the model takes the rendered column count as an
// ARGUMENT rather than imagining a fixed grid.
export const FOCUS_KEYS = Object.freeze(["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]);

/**
 * homeGridFocus(keys, focused, columns, key) — the pane key focus moves to, ALWAYS one that is in
 * the rendered list. A key this model does not know returns the focused key unchanged, and
 * `Escape` is deliberately one of them (§rule 9: on the grid itself `Escape` does nothing — no
 * tile is a modal, and a key that sometimes closes a pane and sometimes types into one is exactly
 * the ambiguity that clause removes).
 *
 * EDGES CLAMP RATHER THAN WRAP. DESIGN does not settle it, so the only thing pinned is the
 * invariant the task file states — the answer is always a rendered key — and clamping is the
 * choice that never moves the operator somewhere they did not aim at. Routed as a design gap.
 */
export function homeGridFocus(keys, focused, columns, key) {
  const list = Array.isArray(keys) ? keys.filter((value) => typeof value === "string" && value !== "") : EMPTY;
  if (list.length === 0) return null;
  const width = Number.isInteger(columns) && columns > 0 ? columns : 1;
  const at = list.indexOf(focused);
  const from = at >= 0 ? at : 0;
  const clamp = (index) => list[Math.min(Math.max(index, 0), list.length - 1)];
  switch (key) {
    case "ArrowRight":
      return clamp(from + 1);
    case "ArrowLeft":
      return clamp(from - 1);
    case "ArrowDown":
      return clamp(from + width);
    case "ArrowUp":
      return clamp(from - width);
    case "Home":
      return list[0];
    case "End":
      return list[list.length - 1];
    default:
      return list[from];
  }
}

/**
 * homeGridFocusAfterPoll(keys, focused, previousKeys) — where the stop goes when the rows change.
 *
 * The focused SESSION keeps the stop wherever it moves in the order (rule 6). If it is genuinely
 * gone, the stop moves to the NEAREST SURVIVING TILE IN GRID ORDER — nearest by the position the
 * departed tile held, so the operator lands beside where they were rather than at the top.
 */
export function homeGridFocusAfterPoll(keys, focused, previousKeys) {
  const list = Array.isArray(keys) ? keys : EMPTY;
  if (list.length === 0) return null;
  if (list.includes(focused)) return focused;
  const previous = Array.isArray(previousKeys) ? previousKeys : EMPTY;
  const at = previous.indexOf(focused);
  if (at < 0) return list[0];
  for (let distance = 1; distance <= previous.length; distance += 1) {
    for (const index of [at + distance, at - distance]) {
      const candidate = previous[index];
      if (candidate != null && list.includes(candidate)) return candidate;
    }
  }
  return list[0];
}

// ─── THE ONE LIVE REGION'S SENTENCE (DG-49-7) ────────────────────────────────────────────────
//
// `aria-live="polite"` was per-pane, on the state chip, and it was right for ONE pane on ONE card.
// A dozen panes plus a 5s poll is a queue of polite announcements from panes the user is not
// looking at, with no way to tell which tile spoke. So the grid owns ONE region — and "one region"
// is only half the fix: funnelling twelve panes' narration through one node is the SAME failure
// with better markup, which is why THREE kinds of change are announced and everything else is
// silent.
//
// The composer is pure and takes the previous tiles, the next tiles and the focused key as
// ARGUMENTS. It counts the `needs input` marks from THE SAME ROWS the marks are rendered from —
// never from the DOM — so the number in the announcement and the number of pills on screen are one
// derivation with two readers.
export const ANNOUNCE_NOTHING = null;

function tileByKey(tiles) {
  const map = new Map();
  for (const tile of Array.isArray(tiles) ? tiles : EMPTY) map.set(tile.key, tile);
  return map;
}

function labelOf(tile) {
  const owner = nonEmpty(tile?.row?.workItem?.ref) ?? nonEmpty(tile?.repo) ?? tile?.sessionId ?? "session";
  return tile?.nodeId ? `${owner} → ${tile.nodeId}` : owner;
}

function needInputCount(tiles) {
  let count = 0;
  for (const tile of Array.isArray(tiles) ? tiles : EMPTY) if (tile.mark === MARK_NEEDS_INPUT) count += 1;
  return count;
}

/**
 * homeGridAnnouncement(previous, next, { focusedKey, previousState, state }) — the sentence to
 * announce, or `null`.
 *
 * The state pair is the FOCUSED tile's connection word before and after, because that is the only
 * pane whose transport changes are announced (DG-49-7 rule 2's first clause). A dozen tiles moving
 * from `waiting` to `streaming` announces NOTHING: that is rows 5-7 of the task's own table, and
 * without them this region is the per-pane defect with one node instead of twelve.
 */
export function homeGridAnnouncement(previous, next, context = {}) {
  const before = tileByKey(previous);
  const after = tileByKey(next);
  const focusedKey = context?.focusedKey ?? null;

  // 1 — THE FOCUSED PANE'S OWN STATE, named with its identity. Only the focused one.
  const focused = after.get(focusedKey) ?? null;
  const state = nonEmpty(context?.state);
  const previousState = nonEmpty(context?.previousState);
  if (focused != null && state != null && state !== previousState && before.has(focusedKey)) {
    return `${labelOf(focused)}: ${state}`;
  }

  // 2 — A SESSION LEFT. Named, because "one of your agents is gone" is useless without WHICH.
  for (const [key, tile] of before) {
    if (!after.has(key)) return `session ended: ${labelOf(tile)}`;
  }

  // 3 — A SESSION ARRIVED.
  for (const [key, tile] of after) {
    if (!before.has(key)) return `session appeared: ${labelOf(tile)}`;
  }

  // 4 — THE BLOCKED COUNT, as a NUMBER. One fact, two places (the tiles' marks and this count),
  // and they may not disagree: both are computed from the rows this function was handed.
  //
  // THROUGH THE SURFACE'S COUNT RULE (designer's GAP-6). This sentence already agreed with its
  // own value — it is the sentence GAP-3's ruling was measured AGAINST — and it is routed
  // through the shared rule anyway: a correct site outside the rule is a site the next sweep
  // cannot see, which is exactly how K3 survived GAP-3. Its plural `<K> panes need input` was
  // also unwritten in DESIGN's own template while its singular shipped; both forms are now
  // spelled in one place.
  const now = needInputCount(next);
  if (now !== needInputCount(previous)) {
    return countedPhrase(now, "pane needs input", "panes need input");
  }

  // …and an unchanged poll is SILENT, as is a byte arriving on a pane nobody is focused on.
  return ANNOUNCE_NOTHING;
}
