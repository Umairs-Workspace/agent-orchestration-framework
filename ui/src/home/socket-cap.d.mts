// Type declarations for the terminals home's socket-cap arbiter (milestone 49 / story 02 /
// task 01 — ADR-006 and its 2026-08-13 amendments). Framework-free by contract: the cap and
// the currently-subscribed set are ARGUMENTS and nothing is read from module scope, which is
// what keeps the whole decision drivable by `node:test` at every cap value including 0 and 1.

export declare const MAX_LIVE_PANES: 16;

export declare const HELD_AT_CAP: "at-cap";
export declare const HELD_HIDDEN: "hidden";
export declare const RECOVERY_HIDE_ONE: "hide-one-to-watch";
export declare const RELEASED_LEFT_INDEX: "left-the-index";
export declare const RELEASED_CAP_LOWERED: "cap-lowered";

export type PaneTuple = { readonly nodeId: string; readonly sessionId: string };

/** The two ways a listed pane is not watching — DIFFERENT frames on screen (DG-49-4). */
export type HoldCause = "at-cap" | "hidden";

export declare function paneTuple(value: unknown): PaneTuple | null;
export declare function paneKeyOf(tuple: PaneTuple | null | undefined): string | null;

/**
 * The cap, normalised. A malformed ceiling fails CLOSED to zero — an unreadable ceiling is
 * not an absent one, and a silent fallback to `MAX_LIVE_PANES` would make "the cap is an
 * argument" unprovable. A fractional cap TRUNCATES: half a socket is not one.
 */
export declare function effectiveCap(cap: unknown): number;

export type PaneIntents = {
  /** The focused pane, as a TUPLE — never an index or a position (DESIGN §The focus model rule 6). */
  readonly focused?: PaneTuple | null;
  readonly watched?: readonly PaneTuple[] | null;
  readonly hidden?: readonly PaneTuple[] | null;
};

export type PaneDecision<Row = unknown> = {
  readonly nodeId: string | null;
  readonly sessionId: string | null;
  /** The row this decision belongs to, by IDENTITY — the arbiter never invents a pane. */
  readonly row: Row;
  readonly subscribed: boolean;
  /**
   * Why it is not watching, and it is a STATED fact or nothing at all. `null` in exactly two
   * cases: the pane IS watching, and the row carries no readable tuple — an unaddressable row
   * is not a pane (ADR-002), so neither the cap nor the operator held it, and naming a cause
   * there would be an invention DG-49-4 renders as `hide one to watch this`. Never an error,
   * never an `unavailable` cause.
   */
  readonly cause: HoldCause | null;
  /** Whether a live slot is free — what tells DG-49-4's two held frames apart. */
  readonly slotFree: boolean;
  /** The configured cap as a VALUE, so no render site types the number into its copy. */
  readonly cap: number;
};

/**
 * WHY A PANE STOPPED WATCHING — a claim about an ACTOR, so each value has a biconditional
 * precondition and none of them is a fall-through (ADR-006 amendment (5b)/(5d)). Writing
 * `retainable = (incumbents ∩ live) \ hidden`:
 *
 *   ·  `left-the-index` ⟺ the tuple is not in the handed rows — not a demotion, there is no
 *      session left to demote.
 *   ·  `hidden`         ⟺ it is live AND the operator hid it — their own spend.
 *   ·  `cap-lowered`    ⟺ it is retainable — the ceiling the CALLER handed in is below the
 *      retained count. The cap is the only thing that can cost an incumbent its socket.
 *
 * Deliberately NOT the same string as the `at-cap` HOLD cause: a release cause says what
 * CHANGED, a hold cause says what IS, and one pane may carry both in one answer.
 */
export type ReleaseCause = "hidden" | "left-the-index" | "cap-lowered";

export type ReleasedPane = {
  readonly nodeId: string;
  readonly sessionId: string;
  readonly cause: ReleaseCause;
  /** NOTE: no `cap`. The arbitration already returns the cap at top level — one derivation, N readers. */
};

export type DeclinedWatch = {
  readonly nodeId: string;
  readonly sessionId: string;
  readonly cause: "at-cap";
  /** The recovery as a CODE; DESIGN owns the sentence and the number is rendered, never typed. */
  readonly recovery: "hide-one-to-watch";
  readonly cap: number;
};

export type PaneArbitration<Row = unknown> = {
  readonly cap: number;
  /** One decision per handed row, in the handed order — nothing dropped, filtered or hidden. */
  readonly decisions: readonly PaneDecision<Row>[];
  /** One entry per PANE, never per row: it counts SOCKETS, which is the quantity the cap bounds. */
  readonly subscribed: readonly PaneTuple[];
  readonly slotFree: boolean;
  /** Exactly `incumbents \ subscribed` — no more, no fewer. Nothing loses a socket silently. */
  readonly released: readonly ReleasedPane[];
  readonly declined: readonly DeclinedWatch[];
  // THERE IS NO `demoted` FIELD (ADR-006 amendment (5c)). It returned a frozen literal while a
  // shrunk cap released twelve live panes, and a field whose value is a literal can never be
  // wrong, so it can never be right. The population is `released` filtered on `cap-lowered`, and
  // the no-auto-demote rule is read as I2′ over the same inputs as the answer it describes.
};

/**
 * ONE pure, set-valued arbiter over the WHOLE row set. FOUR arguments — the fourth is the
 * currently-subscribed set, without which "do not demote" cannot even be stated.
 *
 * Guarantees for EVERY input, writing `limit = effectiveCap(cap)` and
 * `retainable = (currentlySubscribed ∩ liveRows) \ hidden` (ADR-006 amendment (5a)):
 *
 *   I1  `|subscribed| <= limit` — and it wins every collision.
 *   I2  `|subscribed ∩ retainable| = min(|retainable|, limit)` — the cap is the ONLY thing that
 *       can cost an incumbent its socket, and then only down to the cap.
 *   I2′ `subscribed \ retainable ≠ ∅ ⟹ retainable ⊆ subscribed` — no non-incumbent holds a
 *       socket while a retainable incumbent does not.
 *   I3  `limit >= 1 ∧ focused ∈ retainable ⟹ focused ∈ subscribed`.
 */
export declare function subscribedPaneSet<Row>(
  rows: readonly Row[] | null | undefined,
  cap: unknown,
  intents?: PaneIntents | null,
  currentlySubscribed?: readonly PaneTuple[] | null,
): PaneArbitration<Row>;
