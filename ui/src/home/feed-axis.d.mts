// Type declarations for the terminals home's feed axis (milestone 49 / story 02 / task 00 —
// ADR-003, DG-49-2; AMENDED by milestone 50 / story 04 — ADR-008 decision 8). Framework-free
// by contract, and NOTE WHAT IS ABSENT FROM EVERY SIGNATURE BELOW: there is no byte parameter,
// optional or otherwise. The axis is derived from wire fields the fleet already polls and from
// roster membership, never from terminal output.
//
// m50: the derivation became a DISJUNCTION of two positive statements —
// `establishedProducer(workItem) OR relaying === true` — because a launched session is
// genuinely bridged while carrying no assignment. `relaying` is a BOOLEAN on the session row
// (`FeedAxisRow` below), stated by the worker that owns the bridge and read with a strict
// `=== true`. It is deliberately not a named producer: the payload must not be able to
// distinguish the two populations, or a build could mark one of them.

import type { PaneTuple } from "./socket-cap.mjs";

export declare const FEED_PRODUCER_KNOWN: "producer-known";
export declare const FEED_NO_PRODUCER: "no-producer";
export declare const FEED_ROSTER_GONE: "roster-gone";

/** The CLOSED set, exposed as a value so a consumer can prove it is closed. */
export declare const FEED_AXIS_VALUES: readonly ["producer-known", "no-producer", "roster-gone"];

export type FeedAxis = "producer-known" | "no-producer" | "roster-gone";

/** DG-49-2's sentence, with exactly ONE author. Injected through m46's existing `reason` seam. */
export declare const NO_LIVE_OUTPUT_REASON: "no live output — no assignment is relaying this session";

/**
 * Both polls. `previous` absent or unreadable means nothing can be `roster-gone` — the
 * cold-start rule.
 */
export type FeedAxisContext<Row = unknown> = {
  readonly latest?: readonly Row[] | null;
  readonly previous?: readonly Row[] | null;
};

/**
 * The two fields the derivation actually reads off a session-index row (m50/ADR-008 decision 8).
 * Declared as DOCUMENTATION rather than as a constraint — `feedAxisFor` stays generic over the
 * row so a caller may hand it the whole `MeshSession` it already polls — but this is what the
 * disjunction is stated over, and there is nothing else in it.
 */
export type FeedAxisRow = {
  /** `{ ref, assignmentId }` when an assignment owns this tuple; `null` for a free session. */
  readonly workItem?: { readonly ref?: string | null; readonly assignmentId?: string | null } | null;
  /**
   * The WORKER's own stated transport fact: something is bridging this session's PTY output up
   * its stream. Read with a strict `=== true`, so a node that states nothing reads `false`.
   */
  readonly relaying?: boolean;
};

export declare function feedAxisFor<Row>(row: Row, context?: FeedAxisContext<Row> | null): FeedAxis;

export type FeedAxisEntry<Row = unknown> = {
  readonly nodeId: string;
  readonly sessionId: string;
  readonly axis: FeedAxis;
  readonly row: Row;
};

/** A departed TUPLE carries no row: a previous poll is never a source of panes. */
export type DepartedTuple = PaneTuple & { readonly axis: "roster-gone" };

export type FeedAxisPoll<Row = unknown> = {
  readonly entries: readonly FeedAxisEntry<Row>[];
  readonly departed: readonly DepartedTuple[];
};

export declare function feedAxisForPoll<Row>(context?: FeedAxisContext<Row> | null): FeedAxisPoll<Row>;

export type ComposeHomePaneInput = {
  readonly subscribed?: boolean;
  /** The ramp's own word for this pane. Anything unrecognised composes as `unknown`. */
  readonly state?: string | null;
  readonly axis?: FeedAxis | null;
  /** From the arbiter's decision — why this pane is not watching, and whether a slot is free. */
  readonly cause?: "at-cap" | "hidden" | null;
  readonly slotFree?: boolean;
  readonly cap?: number | null;
};

export type ComposedHomePane = {
  readonly subscribed: boolean;
  /** A member of `TERMINAL_STATE_LIST` or exactly `unknown` — or `null` when nothing is watched. */
  readonly word: string | null;
  /** The injected reason, on `waiting` + `no-producer` alone. At most one, one author. */
  readonly reason: string | null;
  /** `roster-gone` ANNOTATES; it never replaces the word. Travels on the same composition. */
  readonly annotation: "roster-gone" | null;
  readonly axis: FeedAxis;
  readonly notWatching: {
    /**
     * The arbiter's own stated cause, ACCEPTED and never coerced: `at-cap`, `hidden`, or `null`
     * when nothing recognisable was stated (including the arbiter's own answer for a row that
     * carries no readable tuple, which is not a pane at all — ADR-002).
     */
    readonly cause: "at-cap" | "hidden" | null;
    /** The subscription toggle's own declared cost — never a connection word. */
    readonly cost: "subscription";
    readonly slotFree: boolean;
    readonly cap: number | null;
  } | null;
};

export declare function composeHomePane(input?: ComposeHomePaneInput | null): ComposedHomePane;
