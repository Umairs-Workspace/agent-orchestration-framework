// Type declarations for the terminals home's page states (milestone 49 / story 04 / task 01 —
// DESIGN §S1, DG-49-1).
//
// NOTE WHAT IS ABSENT FROM EVERY SIGNATURE BELOW: no storage, no fetch, no clock and no browser
// global. The selector is a pure function of a payload the caller already holds — which is what
// makes all five page states drivable under plain `node:test` in a repo with no React harness.
//
// THE PAYLOAD IS TYPED STRUCTURALLY AND NOT IMPORTED. `GlobalMeshStatus`/`MeshSession` live in
// ui/src/fleet/api.ts, and ADR-001 rules that `ui/src/home/` imports nothing from
// `ui/src/fleet/` — a type-only import is still an edge, and `acd-terminal-control-boundary`'s
// `home →` baseline is EMPTY. So the two fields this module actually reads are declared here as
// the minimum shape it needs, which is also an honest statement of its dependency surface.

/** The one routing tuple a row must carry to be a pane at all (ADR-002). */
export type HomeSessionRow = {
  readonly nodeId?: unknown;
  readonly sessionId?: unknown;
  readonly workItem?: unknown;
};

/** A node, seen only through the two fields the E1/E2 discriminator reads. */
export type HomeNodeRow = {
  readonly freshness?: unknown;
  readonly presence?: { readonly activeRuns?: unknown } | null;
};

/** The status payload, seen only through the two arrays this module reads. */
export type HomeStatusPayload = {
  readonly sessions?: unknown;
  readonly nodes?: unknown;
};

export declare const HOME_PAGE_STATE_LOADING: "loading";
export declare const HOME_PAGE_STATE_ERROR: "error";
export declare const HOME_PAGE_STATE_E1: "E1";
export declare const HOME_PAGE_STATE_E2: "E2";
export declare const HOME_PAGE_STATE_POPULATED: "populated";

export type HomePageState = "loading" | "error" | "E1" | "E2" | "populated";

/** The CLOSED set, as a value, so a consumer can prove it is closed. */
export declare const HOME_PAGE_STATE_LIST: readonly ["loading", "error", "E1", "E2", "populated"];

export type HomePageStateContext = {
  readonly loading?: unknown;
  readonly error?: unknown;
  readonly status?: HomeStatusPayload | null;
};

/** TOTAL over every payload the face can serve, and it never throws. */
export declare function homePageState(context?: HomePageStateContext | null): HomePageState;

/** Runs in flight, counted over LIVE nodes only — a stale node's frozen runs are not in flight. */
export declare function activeRunCount(status?: HomeStatusPayload | null): number;

/**
 * The addressable rows the index carries — the same population the summary counts. A row needs
 * BOTH halves of the routing tuple, non-empty: a row that cannot be addressed is not a pane.
 */
export declare function addressableSessionCount(status?: HomeStatusPayload | null): number;

/**
 * THE SURFACE'S ONE COUNT RULE (designer's GAP-6): the count, a space, and the form that AGREES
 * with it. It takes the whole agreeing phrase rather than a stem, because two of this surface's
 * four interpolations agree a VERB (`1 needs input` / `4 need input`). Zero takes the plural.
 */
export declare function countedPhrase(count: number | null | undefined, singular: string, plural: string): string;

export declare const HOME_EXIT_HREF: string | null;
export declare const HOME_EXIT_LABEL: "Open the fleet →";

export declare const HOME_E1_LINES: readonly ["Nothing is running.", "Assign work from the fleet."];
export declare const HOME_E2_WHY: string;

export type HomeEmptyCopy = {
  readonly state: "E1" | "E2";
  readonly lines: readonly [string, string];
  /** The count the copy NAMES — null in E1, which makes no count claim. */
  readonly runCount: number | null;
  readonly link: { readonly label: string; readonly href: string | null };
};

export declare function homeEmptyCopy(state: HomePageState, runCount?: number): HomeEmptyCopy;

/**
 * The server's own coded sentence when it sent one, else the status, else the last-resort
 * wording — which is spelled in the implementation and NOWHERE else. Never "something went
 * wrong". Total: it runs inside the catch of this surface's only fetch.
 */
export declare function homeFaultMessage(body: unknown, httpStatus?: number): string;

export declare const HOME_LOADING_LINE: "Loading sessions…";
export declare const HOME_EMPTY_CARD_CLASS: string;
export declare const HOME_HEADING: "Live terminals";

export type HomeSlotCounts = {
  readonly sessions?: number;
  readonly live?: number;
  /** `· <K> need input` renders ONLY when K > 0. */
  readonly needInput?: number;
};

/** The three states that HOLD a payload — the only ones in which G0 may assert a count (R-3). */
export declare const HOME_PAGE_STATES_WITH_PAYLOAD: readonly HomePageState[];

/**
 * G0's line, or `null` — rule R-3 (designer's GAP-7): the summary renders counts ONLY when the
 * page holds a payload. Before the first fetch and while the last fetch failed it renders NOTHING
 * AT ALL — not `0`, not `—`, not a skeleton — because on this surface "0 sessions" is E1's whole
 * message, and asserting it from an absence of data is the lie DG-49-1 refuses one region up.
 * A SILENT re-poll failure is NOT that case (F-49-04-b): the page state is unchanged, the payload
 * is still held, and the last-known counts keep rendering.
 */
export declare function homeSlotSummary(state: HomePageState | null | undefined, counts?: HomeSlotCounts | null): string | null;

export declare const HOME_POLL_MS: 5000;
export declare const HOME_STATUS_PATH: "/api/mesh/status";
