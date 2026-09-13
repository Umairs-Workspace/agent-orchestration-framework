// THE GRID OF LIVE PANES (milestone 49 / story 05 — the milestone's heart, and the whole arc's).
//
// ONE screen showing every live session across the fleet as a tile that opens a REAL socket, says
// honestly whether anything will ever arrive on it, and can be typed into. Milestones 44, 46 and
// 48 exist to make this buildable; this is the reader milestone 48's index has never had.
//
// ═══ WHAT THIS COMPONENT IS, AND WHAT IT DELIBERATELY IS NOT ════════════════════════════════
// A THIN consumer (ADR-001's invariant): JSX, five pieces of state and one measurement only a
// browser can make. Every DECISION is imported and is a value `node:test` reads —
//   · WHICH ROWS become tiles, and in WHAT ORDER   → `grid.mjs` (ADR-002, ADR-006 amendment (3))
//   · WHICH tiles hold a socket                     → `socket-cap.mjs` (ADR-006)
//   · WHAT each tile declares                       → `session-mount.mjs` (ADR-007)
//   · WHERE the keyboard goes                       → `grid.mjs`'s focus model
//   · WHAT the ONE live region says                 → `grid.mjs`'s announcement composer
// TECH_DEBT 29 measured what a decision in JSX costs: milestone 46 shipped a control that opened
// NO SOCKET AT ALL past 537 green tests, because the whole defect was a closed loop inside a
// `.tsx` no harness could reach.
//
// ═══ THE STATE, EACH PIECE BECAUSE THE ANSWER DEPENDS ON WHAT CAME BEFORE ═══════════════════
//   · `intents`    — the operator's own watches and hides. The exchange is theirs (DG-49-4).
//   · `subscribed` — the PREVIOUS arbitration, handed back as the arbiter's fourth argument.
//                    "Priority allocates free slots; it never evicts" is unstatable without it
//                    (ADR-006 amendment (1)), and holding it HERE rather than inside the arbiter
//                    is what keeps that function pure and drivable at every cap.
//   · `focusedKey` — the roving stop, stored as a PANE KEY and never an index (§rule 6): a tile
//                    arriving above the focused one would otherwise move focus to a different
//                    agent four times a minute.
//   · `painted`    — which tiles have ever received a byte, so a pane the operator is READING is
//                    never removed by a 5s poll (§rule 8). Reported by the pane, because the grid
//                    cannot see bytes and must not guess about them.
//   · `announcement` — the last sentence the one live region was given.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HELD_HIDDEN, MAX_LIVE_PANES, paneKeyOf, subscribedPaneSet } from "./socket-cap.mjs";
import { dialableTiles, homeGridAnnouncement, homeGridFocus, homeGridFocusAfterPoll, homeGridRows, FOCUS_KEYS } from "./grid.mjs";
import { ROSTER_GONE_REASON } from "./session-mount.mjs";
import { SessionPane } from "./SessionPane";
import type { HomeSessionRow } from "./session-mount.mjs";
import type { HomeGridTile } from "./grid.mjs";
import { TERMINAL_STATES } from "../terminal/state-ramp.mjs";
import type { TerminalOrigins } from "../terminal/socket-url.mjs";

// The grid's track is the house's EXISTING responsive vocabulary, not a second one: the same
// `repeat(auto-fill, minmax(320px, 1fr))` + `gap-4` the fleet's milestone cards already use. This
// milestone introduces no second breakpoint system (DESIGN §S1).
//
// `min-h-0` is load-bearing and `overflow-y-auto` is the whole point of `content:fixed`: the PAGE
// never scrolls, the GRID does. A flex child defaults to `min-height: auto`, so without it an
// overflowing grid silently grows the column and the shell's bounded content box stops being
// bounded — the failure that only shows up with real content, which is sixteen panes.
//
// `auto-rows-min` is the tile's own answer to the same question: a stretched row would make every
// tile as tall as the tallest, so one pane's non-live bar would move its neighbours' geometry.
export const HOME_GRID_CLASS =
  "grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(320px,1fr))] content-start gap-4 overflow-y-auto";

// HOW MANY COLUMNS ARE RENDERED — the one browser measurement this component makes, and it is a
// measurement rather than a breakpoint table because the track is `auto-fill`: the answer is a
// property of the box the shell handed us, not of the viewport. Movement by RENDERED position is
// what makes `→` and `↓` the same move at one column (§rule 2), and a model that imagined a fixed
// grid would move the operator somewhere they cannot see.
function renderedColumns(element: HTMLElement | null): number {
  if (element == null || typeof getComputedStyle !== "function") return 1;
  const tracks = getComputedStyle(element).getPropertyValue("grid-template-columns").trim().split(/\s+/).filter(Boolean);
  return tracks.length > 0 ? tracks.length : 1;
}

type Tuple = { nodeId: string; sessionId: string };
type Intents = { watched: readonly Tuple[]; hidden: readonly Tuple[] };

export function SessionGrid({
  status,
  origins,
  onSummary,
}: {
  status: unknown;
  origins: TerminalOrigins;
  // The page's G0 slot reads the SAME counts these tiles render — one derivation, two readers.
  onSummary?: (counts: { sessions: number; live: number; needInput: number }) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [intents, setIntents] = useState<Intents>({ watched: [], hidden: [] });
  const [subscribed, setSubscribed] = useState<readonly Tuple[]>([]);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [painted, setPainted] = useState<readonly string[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  // The previous poll's tiles, for the two things only knowable ACROSS polls: which sessions left,
  // and what to announce. A ref rather than state — it is an INPUT to the next render's decisions,
  // never a thing rendered.
  const previousRef = useRef<readonly HomeGridTile[]>([]);
  const stateRef = useRef<Record<string, string>>({});

  // A TILE THE OPERATOR IS READING IS NOT REMOVED BY A POLL (§rule 8). Its tuple left the index —
  // its node went stale, or the session ended — but the socket is per-tuple and nobody closed it,
  // so the pane keeps its transport word and gains an annotation naming the ROSTER. The row is the
  // one the previous poll carried, because a previous poll is not a SOURCE of panes: it can only
  // keep alive one that is already on screen.
  //
  // AND RETENTION ENDS WHEN THE PANE'S SOCKET DOES (F2, measured: a tile ten polls past its row's
  // departure with its socket still open). `painted` only ever grew and `retained` re-derived from
  // the previous tiles — which already contained the retained tile — so it was a FIXED POINT: a
  // pane that outlived its row forever. That is ADR-009's load-bearing negative ("a stored tuple
  // not in the current `sessions[]` is DROPPED; never a ghost pane") defeated by a mechanism that
  // is not `localStorage` but tells the same lie. The pane's own report is the expiry: when the
  // stream it was holding ENDS, the courtesy is over, and it is spent on the NEXT poll so the tile
  // still ends IN PLACE (§rule 8's own words) rather than vanishing mid-sentence.
  const finishedRef = useRef<Set<string>>(new Set());
  const retained = useMemo<readonly HomeSessionRow[]>(
    () => previousRef.current.filter((tile) => painted.includes(tile.key)).map((tile) => tile.row),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, painted],
  );
  const tiles = useMemo(() => homeGridRows(status, { retained }), [status, retained]);

  // THE ARBITER — four arguments, and the fourth is the answer it gave last time. A `no-producer`
  // row is not handed to it at all: it opens no socket, so it must not spend one of the cap's
  // scarce slots either (DG-49-2's own argument for refusing the socket).
  const arbitration = useMemo(
    () => subscribedPaneSet(dialableTiles(tiles), MAX_LIVE_PANES, intents, subscribed),
    [tiles, intents, subscribed],
  );
  // The arbiter answers per TUPLE (its own key), and a tile is keyed by the CONTROL's pane key —
  // two spellings of one identity, joined here once rather than at sixteen render sites.
  const decisions = useMemo(
    () => new Map(arbitration.decisions.map((decision) => [paneKeyOf({ nodeId: decision.nodeId ?? "", sessionId: decision.sessionId ?? "" }), decision])),
    [arbitration],
  );
  const decisionFor = useCallback(
    (tile: HomeGridTile) => decisions.get(paneKeyOf({ nodeId: tile.nodeId, sessionId: tile.sessionId })) ?? null,
    [decisions],
  );

  // The caller holds the previous answer and passes it back in (ADR-006's consequence). It
  // converges in one pass: with the answer as the incumbent set, retention returns the same set.
  useEffect(() => {
    const next = arbitration.subscribed;
    setSubscribed((current) =>
      current.length === next.length && current.every((entry, index) => paneKeyOf(entry) === paneKeyOf(next[index]))
        ? current
        : next,
    );
  }, [arbitration]);

  const keys = useMemo(() => tiles.map((tile) => tile.key), [tiles]);

  // FOCUS SURVIVES THE POLL because it is a KEY, and it moves to the nearest surviving tile only
  // when the session it named is genuinely gone. The announcement is composed in the SAME effect
  // from the same two row sets, so the sentence and the stop can never describe different polls.
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = tiles;
    setFocusedKey((current) => homeGridFocusAfterPoll(keys, current, previous.map((tile) => tile.key)));
    const sentence = homeGridAnnouncement(previous, tiles, { focusedKey });
    if (sentence != null) setAnnouncement(sentence);
    // …and the retention a FINISHED stream no longer earns is spent here, one poll after the pane
    // said so, which is what keeps "it ends in place" and "never a ghost pane" both true.
    const spent = [...finishedRef.current].filter((key) => painted.includes(key));
    if (spent.length === 0) return;
    for (const key of spent) finishedRef.current.delete(key);
    setPainted((current) => current.filter((key) => !spent.includes(key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles]);

  useEffect(() => {
    onSummary?.({
      sessions: tiles.length,
      live: arbitration.subscribed.length,
      needInput: tiles.filter((tile) => tile.mark != null).length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, arbitration]);

  // A PANE REPORTS TWO THINGS UP, and neither is a decision: that a byte landed (so the tile
  // survives a poll that drops it), and its transport word (so the ONE region can announce the
  // FOCUSED tile's own change and nothing else).
  const report = useCallback(
    (key: string, event: { painted?: boolean; state?: string | null; focused?: boolean }) => {
      if (event?.painted === true) setPainted((current) => (current.includes(key) ? current : [...current, key]));
      // A MOUSE CLICK MOVES THE ROVING STOP TOO. Measured on the deployed build: a clicked tile
      // held focus while carrying `tabindex="-1"`, so the next arrow key moved from a tile the
      // operator was not looking at. Focus and the stop are ONE fact, and the tile is what knows
      // it took focus — the grid cannot see a DOM event on an element it does not own.
      if (event?.focused === true) setFocusedKey((current) => (current === key ? current : key));
      if (typeof event?.state !== "string") return;
      const previous = stateRef.current[key] ?? null;
      stateRef.current[key] = event.state;
      // A stream that has ENDED or FAILED is a stream that is over: the tile has nothing left to
      // hold, so its retention is marked spent (F2). It is redeemed on the next poll, never in
      // this render — the pane must read `stream ended` in place first.
      if (event.state === TERMINAL_STATES.ENDED || event.state === TERMINAL_STATES.ERROR) finishedRef.current.add(key);
      if (previous == null || previous === event.state || key !== focusedKey) return;
      const sentence = homeGridAnnouncement(previousRef.current, previousRef.current, {
        focusedKey: key,
        previousState: previous,
        state: event.state,
      });
      if (sentence != null) setAnnouncement(sentence);
    },
    [focusedKey],
  );

  // THE OPERATOR'S OWN SPEND. Hiding frees a slot and the next arbitration fills it by priority;
  // watching is an intent the cap may or may not be able to honour — never a socket taken from a
  // pane they did not touch (ADR-006 amendment (2): priority allocates, it never evicts).
  const watch = useCallback((tile: HomeGridTile, next: boolean) => {
    const tuple = { nodeId: tile.nodeId, sessionId: tile.sessionId };
    const key = paneKeyOf(tuple);
    const without = (list: readonly Tuple[]) => list.filter((entry) => paneKeyOf(entry) !== key);
    setIntents((current) => ({
      watched: next ? [...without(current.watched), tuple] : without(current.watched),
      hidden: next ? without(current.hidden) : [...without(current.hidden), tuple],
    }));
  }, []);

  return (
    <div
      ref={gridRef}
      data-home-state="populated"
      className={HOME_GRID_CLASS}
      // ARROWS MOVE THE STOP, and they are handled HERE rather than on each tile because the
      // answer is a property of the SET: the ordered keys, the focused one and the rendered column
      // count. `Enter`, `Space` and `Escape` are deliberately absent — the first two are the tile's
      // own door into fullscreen (the CONTROL owns them, because only it holds the live node the
      // shell adopts), and `Escape` on the grid does NOTHING (§rule 9).
      onKeyDown={(event) => {
        if (!FOCUS_KEYS.includes(event.key)) return;
        const next = homeGridFocus(keys, focusedKey, renderedColumns(gridRef.current), event.key);
        if (next == null) return;
        event.preventDefault();
        setFocusedKey(next);
      }}
    >
      {/* THE ONE POLITE REGION (DG-49-7). One node for a dozen panes, naming the session it is
          talking about — never `assertive`, because nothing on this page is an emergency and
          interrupting a screen-reader user mid-sentence for a tile they are not reading is worse
          than late news. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {tiles.map((tile, index) => {
        const decision = decisionFor(tile);
        // ONE AUTHORITY PER POPULATION, EACH KEYED ON A STATED INPUT (F4). This was
        // `decision == null ? true : …` — a FALL-THROUGH absorbing two populations with opposite
        // needs, which is ADR-006 AMENDMENT (5d)'s rule ("a cause is stated only where its input
        // can be named") broken one layer up: a `no-producer` tile was hard-coded subscribed, so
        // pressing `Hide terminal` on it changed nothing at all — the control wrote its own state,
        // the standing overrode it, and the operator's spend vanished. A tile the arbiter answers
        // about takes THAT answer; a tile it is never asked about (no socket to allocate) takes
        // the operator's own hidden set, which is the only input that speaks for it.
        const hidden = intents.hidden.some((entry) => paneKeyOf(entry) === paneKeyOf({ nodeId: tile.nodeId, sessionId: tile.sessionId }));
        const isSubscribed = decision != null ? decision.subscribed : !hidden;
        return (
          <SessionPane
            key={tile.key}
            row={tile.row}
            axis={tile.retained ? undefined : tile.axis}
            origins={origins}
            hold={
              decision != null
                ? { subscribed: decision.subscribed, cause: decision.cause, cap: decision.cap }
                : // The tile the arbiter never sees still needs its held LINE when the operator
                  // hides it — from the same author, keyed on the same stated input.
                  { subscribed: isSubscribed, cause: hidden ? HELD_HIDDEN : null, cap: MAX_LIVE_PANES }
            }
            standing={{
              subscribed: isSubscribed,
              // A RETAINED TILE DOES NOT PRESENT (F3). Its posture is the one it was BOUND at, and
              // it must stay that way — posture is part of the session's identity, so flipping it
              // would re-key the session and close the socket the retention exists to protect. But
              // the fullscreen door is this surface's only typing path (DG-49-5: taking the
              // keyboard IS the expand), so withholding the DOOR withholds the keyboard — at zero
              // identity cost — from a session the mesh no longer lists and whose keystrokes would
              // be swallowed at one of ADR-007's two silent hops.
              presents: !tile.retained,
              // AT THE CAP THE TOGGLE IS ABSENT, not disabled: there is no slot to promote into,
              // and the line above it names the exact recovery (DG-49-4). A tile the arbiter is
              // never asked about spends no slot, so no cap can withhold its way back.
              watchOffered: decision == null || isSubscribed || decision.slotFree === true,
              tabStop: focusedKey == null ? index === 0 : tile.key === focusedKey,
              mark: tile.mark,
              // The repo, and only where it is not already the owner — a free session's owner IS
              // its repo, and printing it twice says one fact in two places.
              field: tile.row?.workItem?.ref == null ? null : tile.repo,
              // The annotation a RETAINED tile carries. It names the ROSTER and never an origin, a
              // board or a workspace, and it rides the STANDING rather than the mount: posture is
              // part of the session's identity, so annotating through the mount would rebuild the
              // xterm and close the very socket the annotation is about.
              note: tile.retained ? ROSTER_GONE_REASON : null,
              onWatch: (next: boolean) => watch(tile, next),
              onReport: (event: { painted?: boolean; state?: string | null }) => report(tile.key, event),
            }}
          />
        );
      })}
    </div>
  );
}
