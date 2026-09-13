// The terminals home's SOCKET-CAP ARBITER (milestone 49 / story 02 / task 01 —
// ARCHITECTURE ADR-006 and its 2026-08-13 AMENDMENTS). ONE pure, set-valued function over
// the WHOLE row set, so the number of live terminal sockets is a value a test can read
// rather than a property of whichever React child committed first.
//
// FRAMEWORK-FREE BY CONTRACT, like every decision in `ui/src/home/` (ADR-001): no React, no
// DOM, no global, no clock, no store. It is imported by no component in this story — the
// grid that calls it lands later — and that is deliberate: this repo has no React test
// harness, so a rule that can only be exercised through a component is a rule with no test.
//
// ───────────────────────────────────────────────────────────────────────────────────────
// WHY THE NUMBER IS 16, AND THE FIRST THING TO SAY IS WHAT THE CONSTRAINT IS NOT.
//
// It is NOT a platform ceiling, and a build that re-derives the number from one has got it
// wrong. RESEARCH §Q3 measured it at m49's refine: one headless Chromium page held 255
// concurrent WebSockets to a single origin, the 256th refused, with the server independently
// reporting `peak=255`. The commonly-cited "6" is the HTTP/1.1 per-host cap and does not
// govern WebSocket upgrades — it is not the wall here and never was. Nor is the server the
// wall: `serveMeshUi` accepts every valid tuple with no admission cap and no
// `bufferedAmount` gate, so nothing upstream will refuse on our behalf.
//
// THE THREE CONSTRAINTS THAT ARE BINDING, all of them costs this product actually pays:
//
//   1. THE REPLAY BURST. `src/mesh/terminal-mirror.mjs` replays a bounded per-tuple tail
//      SYNCHRONOUSLY to each new subscriber before live frames, at up to
//      `MAX_TAIL_BYTES_PER_KEY = 256 KiB` per tuple. Opening N panes at once — which is what
//      grid open IS — pushes up to N x 256 KiB of ANSI through one control-node event loop
//      and into N xterms. 16 x 256 KiB = 4 MiB, once, in the worst instant, which is the
//      instant the operator judges the product on.
//   2. THE 64-TUPLE TAIL BUDGET. `MAX_TAIL_KEYS = 64`, LRU-evicted head-first. Past 64
//      distinct tuples the control drops the least-recently-fed tail, and a pane whose tail
//      was evicted is byte-indistinguishable, from a browser, from a genuinely silent
//      worker. 16 is 64/4 — four full rotations of this grid before its own churn can cost
//      a pane its opening screen. `acd-home-socket-cap-single-arbiter` ties the two numbers
//      across the build boundary, because `ui/**` is bundled for a browser and `src/**` runs
//      under node and neither can import the other's constant.
//   3. MAIN-THREAD CONTENTION. xterm.js is main-thread bound and m46/ADR-003 forbids a
//      canvas/webgl addon for this control (`scale` depends on the DOM renderer scaling
//      crisply), so every pane is committed to the slower renderer at a fixed 1,920 cells
//      that does not shrink with tile size.
//
// Readability is the fourth, and it is a product judgement rather than a measurement: 16
// panes at a legible 80-column tile is a 4x4 on a large display, and beyond that the operator
// is scanning chips rather than reading terminals.
// ───────────────────────────────────────────────────────────────────────────────────────
export const MAX_LIVE_PANES = 16;

// THE TWO WAYS A LISTED PANE IS NOT WATCHING, and they are DIFFERENT frames on screen
// (DESIGN DG-49-4): with a slot free the tile offers `Watch terminal ->`; at the cap the
// worded toggle is ABSENT and the line names the recovery instead. A naive boolean
// `subscribed: false` cannot tell them apart, so the distinction is a RETURNED VALUE — or
// sixteen render sites re-derive it, sixteen times, with sixteen chances to disagree.
export const HELD_AT_CAP = "at-cap";
export const HELD_HIDDEN = "hidden";

// The recovery a declined watch names, as a CODE and never as copy. DESIGN owns the sentence
// (`not streaming — <N> live panes already · hide one to watch this`) and fixes that `<N>` is
// rendered from the configured number, never typed into the copy — so the arbiter hands back
// the code and the cap VALUE, and the render site turns the pair into words.
export const RECOVERY_HIDE_ONE = "hide-one-to-watch";

// AN INCUMBENT'S SOCKET IS RELEASED FOR EXACTLY THREE REASONS, and none of them is a RANKING
// (ADR-006 amendment (5), 2026-08-13): the operator hid the pane (`HELD_HIDDEN`); the mesh
// stopped listing the session (`RELEASED_LEFT_INDEX`), which is not a demotion because there is
// no session left to demote; or the CALLER handed in a ceiling below the retained count
// (`RELEASED_CAP_LOWERED`). The third used to be reported as the first — twelve live panes losing
// their socket to a shrunk cap, each labelled as something the operator did, which sends them
// looking for an action nobody took.
//
// `cap-lowered` AND `at-cap` ARE DELIBERATELY DIFFERENT STRINGS FOR TWO DIFFERENT QUESTIONS, and
// a render site may legitimately see both about one pane in one answer: a release cause says WHAT
// CHANGED (this pane stopped watching, and why), a hold cause says WHAT IS (it is not watching
// now, and why). Naming them alike is how a surface comes to report a change as a state.
export const RELEASED_LEFT_INDEX = "left-the-index";
export const RELEASED_CAP_LOWERED = "cap-lowered";

const EMPTY = Object.freeze([]);

function nonBlank(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// The addressing tuple and nothing else. `MeshSession` carries exactly two addressing-shaped
// strings (ADR-002), so a pane's identity here is those two and never a position, an index or
// a whole row.
export function paneTuple(value) {
  try {
    if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
    const nodeId = nonBlank(value.nodeId);
    const sessionId = nonBlank(value.sessionId);
    return nodeId != null && sessionId != null ? { nodeId, sessionId } : null;
  } catch {
    return null;
  }
}

// A key with a separator NO id can carry — a NUL — so ("a-b", "c") and ("a", "b-c") are not
// the same pane. A key joined on a dash or a space is how two different sessions become one,
// and sixteen live sockets are keyed off this. Real ids in this mesh are dash-bearing
// (`worker-1`, `aof-wsl`, `sess-A`), so a dash separator is not a theoretical collision.
//
// IT IS WRITTEN AS THE ESCAPE `\0` AND NEVER AS THE RAW BYTE, and that is not a style
// preference: a source file holding a literal U+0000 is BINARY to git — no diff, no `log -p`,
// no PR review, no blame — and ripgrep skips it SILENTLY, so a sweep over this directory
// reports "no hits" and a reviewer believes it. `acd-ui-surface-file-budget`'s binary clause
// refuses the raw byte for both halves of that reason. The runtime key is identical.
export function paneKeyOf(tuple) {
  return tuple == null ? null : `${tuple.nodeId}\0${tuple.sessionId}`;
}

function keySetOf(values) {
  const keys = new Map();
  if (!Array.isArray(values)) return keys;
  for (const value of values) {
    const tuple = paneTuple(value);
    const key = paneKeyOf(tuple);
    if (key != null && !keys.has(key)) keys.set(key, tuple);
  }
  return keys;
}

// THE CAP IS AN ARGUMENT, AND A MALFORMED ONE FAILS CLOSED TO ZERO.
//
// The tempting alternative — falling back to `MAX_LIVE_PANES` — is exactly the spelling that
// makes "the cap is an argument" unprovable, because every malformed call would then quietly
// produce the shipped number and look right. Zero live sockets is a visible, recoverable,
// honest failure; a silent fallback to a module constant is the emergent count SPEC forbids,
// wearing an argument's clothes.
//
// `2.5 -> 2` is the one coercion allowed and it is a TRUNCATION, never a round: a cap is a
// count of sockets and half a socket is not one. A numeric STRING is not a number — an
// unreadable ceiling is not an absent one.
export function effectiveCap(cap) {
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0) return 0;
  return Math.trunc(cap);
}

// ───────────────────────────────────────────────────────────────────────────────────────
// THE ARBITER. FOUR arguments, and the fourth is the one ADR-006's original three-argument
// form could not express (its AMENDMENT (1), 2026-08-13):
//
//   subscribedPaneSet(rows, cap, intents, currentlySubscribed)
//
// PRIORITY ALLOCATES FREE SLOTS; IT NEVER EVICTS. A pure function of (rows, cap, intents)
// alone can only recompute a ranking, and every recomputation is a potential eviction: 16
// incumbents at cap 16, a 17th row arrives that sorts first, and the "top 16 by priority"
// answer silently drops an incumbent — closing its socket and taking scrollback the mirror's
// bounded replay cannot give back, for a reason the operator never saw, in a tile that may be
// scrolled off screen. The currently-subscribed set is what makes "do not demote" statable.
//
// THE OBLIGATIONS, total and testable for every input, writing
// `retainable = (incumbents ∩ live) \ hidden` — the incumbents with a claim on their socket
// (ADR-006 AMENDMENT (5), which SUPERSEDES the containment this comment used to state):
//
//   I1  BOUND          |result| <= limit — and it WINS every collision, because it is the
//                      obligation the mirror's 64-tuple tail budget and its replay burst buy.
//   I2  RETENTION      |result ∩ retainable| = min(|retainable|, limit)
//   I2′ NO-AUTO-DEMOTE result \ retainable ≠ ∅ ⟹ retainable ⊆ result — no NON-incumbent holds a
//                      socket while any retainable incumbent does not.
//   I3  SHRINK         limit >= 1 ∧ focused ∈ retainable ⟹ focused ∈ result, and survivors are
//                      ranked by the SAME priority order that fills free slots.
//
// `result ⊇ currentlySubscribed ∩ liveRows` was the old spelling and it is FALSE at any cap below
// the retained count — a state this function is REQUIRED to answer in, since `effectiveCap(null)`
// is 0. I2 says what it was reaching for and says it totally: THE CAP IS THE ONLY THING THAT CAN
// COST AN INCUMBENT ITS SOCKET, AND THEN ONLY DOWN TO THE CAP. A ranking never can.
//
// The arbiter consumes an ORDERED row set; it does not produce one. The sort is exactly one
// question and it belongs to the ordered-array producer (ADR-006 amendment (3)) — two sorts
// would be two chances to disagree, and this ranking would then depend on which ran.
// ───────────────────────────────────────────────────────────────────────────────────────
export function subscribedPaneSet(rows, cap, intents, currentlySubscribed) {
  const cells = Array.isArray(rows) ? rows : EMPTY;
  const limit = effectiveCap(cap);

  const focusKey = paneKeyOf(paneTuple(intents?.focused));
  const watchKeys = keySetOf(intents?.watched);
  const hiddenKeys = keySetOf(intents?.hidden);
  const incumbentKeys = keySetOf(currentlySubscribed);

  // The live rows, in the order they were handed. A row with no readable tuple is not
  // addressable and therefore is not a pane (ADR-002) — it still gets a decision, so nothing
  // is dropped, filtered or hidden from the caller.
  const identified = cells.map((row) => {
    const tuple = paneTuple(row);
    return { row, tuple, key: paneKeyOf(tuple) };
  });
  const liveKeys = new Set(identified.map((cell) => cell.key).filter((key) => key != null));

  const rank = (cell) => {
    if (cell.key != null && cell.key === focusKey) return 0;
    if (cell.key != null && watchKeys.has(cell.key)) return 1;
    return 2;
  };

  // RETAINED FIRST — the whole point of the fourth argument. An incumbent that is still a
  // live row keeps its socket; one whose row LEFT the index is released, which is not a
  // demotion because there is no session left to demote; one the operator hid is released
  // because hide closes the socket and that is the operator's own spend (COST_SUBSCRIPTION).
  //
  // THIS IS `retainable` — the set every obligation above is stated over — and it is built ONCE
  // here rather than recomputed where the causes are named, because two derivations of one
  // population is the mechanism ADR-006 amendment (5c) names. ONE PANE TAKES ONE SLOT: two rows
  // carrying the same tuple are the same socket, so the second is not a second retention.
  const retained = [];
  const retainableKeys = new Set();
  for (const cell of identified) {
    if (cell.key == null) continue;
    if (hiddenKeys.has(cell.key)) continue;
    if (!incumbentKeys.has(cell.key)) continue;
    if (retainableKeys.has(cell.key)) continue;
    retainableKeys.add(cell.key);
    retained.push(cell);
  }
  // A cap the CALLER shrank is still a hard bound; the arbiter never shrinks one on its own,
  // and the highest-priority incumbents are the ones that survive a shrink. In every ordinary
  // poll `retained.length <= limit` already holds and this slice is a no-op.
  const retainedRanked = retained
    .map((cell, index) => ({ cell, index, priority: rank(cell) }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.cell);
  const subscribedKeys = new Set(retainedRanked.map((cell) => cell.key));

  // …then PRIORITY fills what is left over: focus, then explicit watches, then the handed
  // order. Never arrival order — mounting order is the nondeterminism m48 removed one layer
  // down, and re-introducing it here would make which panes stream depend on which React
  // child committed first.
  const candidates = identified
    .filter((cell) => cell.key != null && !subscribedKeys.has(cell.key) && !hiddenKeys.has(cell.key))
    .map((cell, index) => ({ cell, index, priority: rank(cell) }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index);

  for (const entry of candidates) {
    if (subscribedKeys.size >= limit) break;
    if (subscribedKeys.has(entry.cell.key)) continue;
    subscribedKeys.add(entry.cell.key);
  }

  const slotFree = subscribedKeys.size < limit;

  // THE CAUSE IS A STATED FACT OR IT IS `null` — IT IS NEVER INVENTED.
  //
  // A row with no readable tuple is not addressable and therefore is not a pane (ADR-002):
  // there is no socket it could have held, so the cap did not hold it and the operator did not
  // hide it. `at-cap` on such a row is a FABRICATION with a visible cost — DG-49-4 renders
  // that cause as `<N> live panes already · hide one to watch this`, which would send the
  // operator to hide a live pane to make room for a row that can never take the slot.
  // This is `buildSessionIndex`'s own `stated()` rule: a fact nobody stated cannot win.
  const decisions = identified.map((cell) => {
    const subscribed = cell.key != null && subscribedKeys.has(cell.key);
    const cause =
      subscribed || cell.key == null ? null : hiddenKeys.has(cell.key) ? HELD_HIDDEN : HELD_AT_CAP;
    return Object.freeze({
      nodeId: cell.tuple?.nodeId ?? null,
      sessionId: cell.tuple?.sessionId ?? null,
      row: cell.row,
      subscribed,
      cause,
      slotFree,
      cap: limit,
    });
  });

  // WHAT CHANGED, NAMED. `released` is EVERY incumbent that no longer holds a socket — exactly
  // `incumbents \ result`, no more and no fewer, which is half the invariant: a pane that kept
  // its socket is never in it, and nothing loses one silently. `declined` is an explicit watch
  // the cap could not honour, carrying the recovery as a code and the cap as a value.
  //
  // THERE IS NO `demoted` FIELD, and it was DELETED rather than corrected (ADR-006 amendment
  // (5c)). It returned a frozen module constant while a shrunk cap was releasing twelve live
  // panes two statements earlier, and the two halves of one object could not detect their own
  // disagreement because only one of them was computed: A FIELD WHOSE VALUE IS A LITERAL CAN
  // NEVER BE WRONG, SO IT CAN NEVER BE RIGHT. The population it claimed to name is the one
  // `released` already owns — `released.filter((entry) => entry.cause === RELEASED_CAP_LOWERED)`
  // — and the no-auto-demote rule is now read as I2′, computed from the same inputs as the
  // answer it describes.
  //
  // THREE CAUSES, THREE PRECONDITIONS, EACH A BICONDITIONAL over this function's own arguments
  // and each independently true, so NONE of them is "whatever is left" (amendment (5b)/(5d)):
  //
  //   left-the-index  ⟺  k ∉ live
  //   hidden          ⟺  k ∈ live ∧ k ∈ hidden
  //   cap-lowered     ⟺  k ∈ retainable       (i.e. k ∈ live ∧ k ∉ hidden — and by I2 this can
  //                                            only happen when |retainable| > limit)
  //
  // The three are mutually exclusive and exhaustive over `incumbents \ result` BY THE DEFINITION
  // of `retainable`, so there is no unclassified case for a last branch to absorb. If that ever
  // stopped being true, this loop would OMIT the key rather than invent an actor to blame for it,
  // and the conservation assertion (`keys(released)` is exactly `incumbents \ result`) turns that
  // into a red test — which is the honest trade, because a fabricated cause sends an operator
  // after an action nobody took.
  const RELEASE_CAUSES = [
    [RELEASED_LEFT_INDEX, (key) => !liveKeys.has(key)],
    [HELD_HIDDEN, (key) => liveKeys.has(key) && hiddenKeys.has(key)],
    [RELEASED_CAP_LOWERED, (key) => retainableKeys.has(key)],
  ];
  const released = [];
  for (const [key, tuple] of incumbentKeys) {
    if (subscribedKeys.has(key)) continue;
    for (const [cause, precondition] of RELEASE_CAUSES) {
      if (!precondition(key)) continue;
      released.push(Object.freeze({ nodeId: tuple.nodeId, sessionId: tuple.sessionId, cause }));
      break;
    }
  }

  // ONE PANE, ONE DECLINED WATCH — the same set-valued rule the retained pass applies: two rows
  // carrying one tuple are one socket the cap could not honour, and a surface that read both
  // would offer the recovery twice for one pane.
  const declined = [];
  const declinedKeys = new Set();
  for (const cell of identified) {
    if (cell.key == null) continue;
    if (subscribedKeys.has(cell.key)) continue;
    if (!watchKeys.has(cell.key) && cell.key !== focusKey) continue;
    if (hiddenKeys.has(cell.key)) continue;
    if (declinedKeys.has(cell.key)) continue;
    declinedKeys.add(cell.key);
    declined.push(
      Object.freeze({
        nodeId: cell.tuple.nodeId,
        sessionId: cell.tuple.sessionId,
        cause: HELD_AT_CAP,
        recovery: RECOVERY_HIDE_ONE,
        cap: limit,
      }),
    );
  }

  // THE SUBSCRIBED SET IS A SET. `decisions` is per-ROW (one for every row handed in, so a
  // caller can find its own row's answer); `subscribed` is per-PANE, because it counts SOCKETS
  // and that is the quantity I1 bounds. Two rows naming one tuple are one socket, so listing
  // both would make `|result| <= limit` false on an input this function is required to answer.
  const subscribed = [];
  const subscribedSeen = new Set();
  for (const decision of decisions) {
    if (!decision.subscribed) continue;
    const key = paneKeyOf({ nodeId: decision.nodeId, sessionId: decision.sessionId });
    if (key == null || subscribedSeen.has(key)) continue;
    subscribedSeen.add(key);
    subscribed.push(Object.freeze({ nodeId: decision.nodeId, sessionId: decision.sessionId }));
  }

  return Object.freeze({
    cap: limit,
    decisions: Object.freeze(decisions),
    subscribed: Object.freeze(subscribed),
    slotFree,
    released: Object.freeze(released),
    declined: Object.freeze(declined),
  });
}
