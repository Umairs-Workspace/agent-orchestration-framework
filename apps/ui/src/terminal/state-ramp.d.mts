// Type declarations for the ONE terminal control's connection-state ramp (milestone 46 /
// story 03 / task 01 — DESIGN §THE ONE STATE VOCABULARY, ADR-005). `state-ramp.mjs` is
// framework-free so `node:test` drives it headlessly; the `.tsx` gets its types from here.

export type TerminalState =
  | "idle"
  | "connecting"
  | "waiting"
  | "streaming"
  | "ended"
  | "error"
  | "unavailable";

export declare const TERMINAL_STATES: {
  readonly IDLE: "idle";
  readonly CONNECTING: "connecting";
  readonly WAITING: "waiting";
  readonly STREAMING: "streaming";
  readonly ENDED: "ended";
  readonly ERROR: "error";
  readonly UNAVAILABLE: "unavailable";
};
export declare const TERMINAL_STATE_LIST: readonly TerminalState[];
export declare const UNKNOWN_STATE: "unknown";
export declare const SOCKET_BEARING_STATES: readonly TerminalState[];

export declare const DOT_FILLED: "filled";
export declare const DOT_DASHED_HOLLOW: "dashed-hollow";
export declare const MOTION_NONE: "none";
export declare const MOTION_PULSE: "pulse";
export declare const READS_NORMAL: "normal";
export declare const READS_CLEAN: "clean";
export declare const READS_FAILURE: "failure";
export declare const READS_BLOCKED: "blocked";

export declare const FAILURE_CAUSES: {
  readonly TRANSPORT: "transport";
  readonly SERVER_ERROR: "server-error";
};
export declare const UNAVAILABLE_CAUSES: {
  readonly WORKSPACE_NOT_LOCAL: "workspace-not-local";
  readonly ORIGIN_UNREACHABLE: "origin-unreachable";
  // The third cause this milestone's own origin seam created (designer, 2026-08-08). Three is
  // the total set for m46, and a cause outside the three may never borrow one of their pairs.
  readonly NO_FLEET_ORIGIN: "no-fleet-origin";
};
export declare const TRANSPORT_CAUSE_LINE: string;
export declare const UNNAMED_CAUSE_LINE: string;
// The `waiting` PANE line — deliberately a different string from the chip word, and deliberately
// NOT routed through `reason` (which also rewrites the chip to the V10 copy).
export declare const WAITING_PANE_LINE: string;
// The EMPTY-HOST line: nothing is bound. Not an error, not a loading state.
export declare const IDLE_PANE_LINE: string;

// DESIGN §C3's table, as values — so the hardest-won rule in the milestone is not three booleans
// re-derived from state words at a render site.
export type PaneTreatment = "empty-host" | "bytes" | "unavailable-block";
export declare const PANE_LINE_TOP_LEFT: "top-left";
export declare const PANE_LINE_CENTRED: "centred";
export declare const PANE_EMPTY_HOST: "empty-host";
export declare const PANE_BYTES: "bytes";
export declare const PANE_UNAVAILABLE_BLOCK: "unavailable-block";

export declare const TERMINAL_EVENTS: {
  readonly SOCKET_OPEN: "socket-open";
  readonly BYTES: "bytes";
  readonly CLOSE: "close";
  readonly TRANSPORT_FAILURE: "transport-failure";
  readonly EXIT_FRAME: "exit-frame";
  readonly ERROR_FRAME: "error-frame";
};

export interface TerminalStateValue {
  readonly state: string;
  readonly exitCode: number | null;
  readonly cause: string | null;
  readonly message: string | null;
  readonly workspacePath: string | null;
}

export declare function initialTerminalState(): TerminalStateValue;
// `idle` is left by BINDING, and binding is unconditional: the answer does not depend on what
// the pane was, so this takes no argument. (It read `current?` while the implementation ignored
// everything — a declaration promising an influence the code does not have.)
export declare function bindSource(): TerminalStateValue;
// The ENTRY state, derived from bindability rather than assumed to be `idle` — the fix for the
// 2026-08-09 blocker in which a bound-but-not-yet-connected pane rendered `idle`'s empty-host
// line, which withheld the very host element the session effect needs to open its socket.
// One-way and only ever for `idle`: every other word is an observed fact and outranks it.
export declare function terminalEntryState(
  current: TerminalStateValue | string | null | undefined,
  options?: { bindable?: boolean },
): TerminalStateValue;
export declare function terminalStateUnavailable(input?: {
  cause?: string;
  workspacePath?: string | null;
}): TerminalStateValue;
export declare function holdsSocket(current: TerminalStateValue | string | null | undefined): boolean;

export type TerminalEvent =
  | string
  | { readonly kind: string; readonly exitCode?: unknown; readonly message?: unknown };

export declare function applyTerminalEvent(
  current: TerminalStateValue | string | null | undefined,
  event: TerminalEvent,
): TerminalStateValue;

// The frozen envelope's READER: a JSON OBJECT is a control message, everything else (including
// a JSON array) is terminal bytes. WHOSE lane may be read this way is the source's business —
// `sourceCarriesControlFrames` (source-table.mjs) answers that first.
export declare function parseControlFrame(text: unknown): { type?: unknown; [key: string]: unknown } | null;

export declare function applyControlFrame(
  current: TerminalStateValue | string | null | undefined,
  frame: unknown,
): TerminalStateValue;

export interface TerminalStateDescriptor {
  readonly state: TerminalState | "unknown";
  readonly text: string;
  readonly dot: "filled" | "dashed-hollow";
  readonly dotClass: string;
  readonly labelClass: string;
  readonly motion: "none" | "pulse";
  readonly motionClass: string;
  readonly reads: "normal" | "clean" | "failure" | "blocked";
  readonly live: boolean;
  readonly exitCode: number | null;
  readonly cause: string | null;
  readonly reason: string | null;
  // What the BYTE AREA reads, as distinct from what the CHIP reads. One field, so no render site
  // re-derives the precedence and gets it subtly different on one of three surfaces.
  readonly paneLine: string | null;
  readonly recovery: string | null;
  readonly owner: string | null;
  readonly rendersPane: boolean;
  readonly rendersHeader: boolean;
  // DESIGN §C3, as values rather than as booleans re-derived at a render site.
  readonly pane: PaneTreatment;
  readonly showsTopLeftLine: boolean;
  readonly showsBar: boolean;
  readonly dims: boolean;
  // The STATE half of two chrome rules; whether the HOST offers them is the call site's.
  readonly restartable: boolean;
  readonly locksProviderPicker: boolean;
  readonly failureCause?: string | null;
  readonly unavailableCause?: string | null;
  readonly opensSocket?: boolean;
  // WHERE the pane's one line sits — `top-left` for a terminal that is empty, `centred` for a host
  // with nothing in it, `null` when there is no line (m49/05 F5; DG-49-2 vs DG-49-4).
  readonly paneLinePlacement?: "top-left" | "centred" | null;
}

export declare function describeTerminalState(
  current: TerminalStateValue | string | null | undefined,
  options?: {
    exitCode?: unknown;
    cause?: string | null;
    message?: string | null;
    workspacePath?: string | null;
    reason?: string | null;
    owner?: string | null;
    // The CALL SITE states that this pane addresses a session nothing will relay — a terminal that
    // is EMPTY rather than a host with nothing in it. It moves the line's PLACEMENT and nothing
    // else (m49/ADR-003's amendment ruled the STATE; DESIGN DG-49-2 rules the treatment).
    emptyTerminal?: boolean;
  },
): TerminalStateDescriptor;
