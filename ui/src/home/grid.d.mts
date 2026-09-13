// Type declarations for the terminals home's GRID decisions (milestone 49 / story 05). The runtime
// module is framework-free; these types are erased (ADR-001's split).

import type { FeedAxis } from "./feed-axis.mjs";
import type { HomeSessionRow } from "./session-mount.mjs";

export declare const NEEDS_INPUT_CODE: "needs-input";
export declare const MARK_NEEDS_INPUT: "needs input";
export declare const FEED_PRODUCER_KNOWN: "producer-known";
export declare const FEED_NO_PRODUCER: "no-producer";
export declare const FEED_ROSTER_GONE: "roster-gone";
export declare const ANNOUNCE_NOTHING: null;
export declare const FOCUS_KEYS: readonly string[];

// ONE TILE. `key` is the CONTROL's own pane key (`terminalPaneKey`), which is also the tile's
// render key and the focus model's stop — one identity, three readers.
export interface HomeGridTile {
  readonly key: string;
  readonly nodeId: string;
  readonly sessionId: string;
  /** As STATED on the row, or null. Never a fabricated "". */
  readonly repo: string | null;
  readonly row: HomeSessionRow;
  readonly axis: FeedAxis;
  /** The agent-state mark's WORD, keyed on the exact code, or null. Absence asserts nothing. */
  readonly mark: string | null;
  /** A tuple that LEFT the index while its pane still held bytes. */
  readonly retained: boolean;
}

export declare function homeGridRows(
  status: unknown,
  options?: { retained?: readonly HomeSessionRow[] | null } | null,
): readonly HomeGridTile[];

export declare function dialableTiles(tiles: readonly HomeGridTile[] | null | undefined): readonly HomeGridTile[];

export declare function homeGridFocus(
  keys: readonly string[] | null | undefined,
  focused: string | null | undefined,
  columns: number | null | undefined,
  key: string | null | undefined,
): string | null;

export declare function homeGridFocusAfterPoll(
  keys: readonly string[] | null | undefined,
  focused: string | null | undefined,
  previousKeys?: readonly string[] | null,
): string | null;

export declare function homeGridAnnouncement(
  previous: readonly HomeGridTile[] | null | undefined,
  next: readonly HomeGridTile[] | null | undefined,
  context?: { focusedKey?: string | null; state?: string | null; previousState?: string | null } | null,
): string | null;
