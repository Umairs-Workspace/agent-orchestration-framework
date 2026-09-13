// Type declarations for the terminals home's session launcher (milestone 50 / story 04, lane C
// — ADR-008 decision 10; DESIGN §The picker's shape / §The state machine / §The failure map).
//
// NOTE WHAT IS ABSENT FROM EVERY SIGNATURE BELOW: no fetch, no clock, no timer, no storage and
// no browser global. Time arrives as `now`; the route's answers arrive as data. That is what
// makes the whole affordance — eight states, two deadlines and fourteen coded rows — drivable
// under plain `node:test` in a repo with no React harness.
//
// AND NOTHING HERE NAMES AN ASSISTANT. There is no way for a caller to put `assistant` on the
// request body: the route keeps its optional field and its own default, and the UI does not
// offer one (DG-50-4, PO-ruled 2026-08-14).
//
// THE PAYLOAD IS TYPED STRUCTURALLY AND NOT IMPORTED — `ui/src/home/` imports nothing from
// `ui/src/fleet/` (49/ADR-001, gated), and a type-only import is still an edge.

export type LauncherStatusNode = {
  readonly nodeId?: unknown;
  readonly freshness?: unknown;
  readonly workspaceIds?: unknown;
};

export type LauncherStatusWorkspace = {
  readonly workspaceId?: unknown;
  readonly name?: unknown;
};

export type LauncherStatusItem = {
  readonly workspaceId?: unknown;
  readonly ref?: unknown;
  readonly title?: unknown;
};

export type LauncherStatusPayload = {
  readonly nodes?: unknown;
  readonly workspaces?: unknown;
  readonly items?: unknown;
  readonly sessions?: unknown;
};

export declare const HOME_SESSION_PATH: "/api/mesh/session";
export declare const HOME_SESSION_OUTCOME_PATH: "/api/mesh/session-outcome";

/** Two deadlines, two facts, two numbers — both derived from `HOME_POLL_MS` (ADR-008 dec 7). */
export declare const LAUNCHER_POST_DEADLINE_MS: number;
export declare const LAUNCHER_OUTCOME_WINDOW_MS: number;
export declare const LAUNCHER_OUTCOME_POLL_MS: number;
export declare const LAUNCHER_STARTED_HOLD_MS: number;

export declare const LAUNCHER_REST: "rest";
export declare const LAUNCHER_OPEN: "open";
export declare const LAUNCHER_DISPATCHING: "dispatching";
export declare const LAUNCHER_DISPATCHED: "dispatched";
export declare const LAUNCHER_STARTED: "started";
export declare const LAUNCHER_REFUSED: "refused";
export declare const LAUNCHER_FAILED: "failed";
export declare const LAUNCHER_NO_ANSWER: "no answer";

export type LauncherState = "rest" | "open" | "dispatching" | "dispatched" | "started" | "refused" | "failed" | "no answer";

/** The CLOSED set, as a value, so a consumer can prove it is closed. */
export declare const LAUNCHER_STATE_LIST: readonly LauncherState[];

export declare const LAUNCHER_TRIGGER_WORDS: "New session";
export declare const LAUNCHER_TRIGGER_CARET: "▾";
export declare const LAUNCHER_TRIGGER_LABEL: string;
export declare const LAUNCHER_TRIGGER_LABELS: readonly string[];
export declare const LAUNCHER_TRIGGER_WIDTH_CH: number;
export declare const LAUNCHER_NO_PAYLOAD_REASON: string;
export declare const LAUNCHER_NO_NODES_REASON: string;
export declare const LAUNCHER_NO_ITEMS_REASON: string;
export declare const LAUNCHER_NO_REPOS_REASON: string;
export declare const LAUNCHER_ITEM_NEEDS_REPO_REASON: string;
export declare const LAUNCHER_DEPARTED_NOTE: string;
/** F3's own departed note — K50-9 would claim a fact a repo-scoped list cannot know. */
export declare const LAUNCHER_ITEM_DEPARTED_NOTE: string;
export declare const LAUNCHER_CAPTION: string;
export declare const LAUNCHER_PANEL_TITLE: "Start a session";
export declare const LAUNCHER_ITEM_ROOT_LABEL: "none — open the repo root";
export declare const LAUNCHER_ACTION_REST: "Start session →";
export declare const LAUNCHER_ACTION_BUSY: "Starting…";
export declare const LAUNCHER_COMPACT_STARTING: "starting…";
export declare const LAUNCHER_COMPACT_FAILED: "failed";
export declare const LAUNCHER_COMPACT_REFUSED: "refused";
export declare const LAUNCHER_COMPACT_NO_ANSWER: "no answer";
export declare const LAUNCHER_NO_ANSWER_LINE: string;
export declare const LAUNCHER_NO_ANSWER_DETAIL: string;
export declare const LAUNCHER_NO_ANSWER_DETAIL_ACKED: string;
export declare const LAUNCHER_NO_ANSWER_DETAIL_LANE: string;
export declare const LAUNCHER_NO_ANSWER_DETAIL_NO_ID: string;
export declare const LAUNCHER_NO_ANSWER_DETAIL_REJECTED: string;
export declare const LAUNCHER_REPO_GROUP_ON: "on this node";
export declare const LAUNCHER_LANE_UNAVAILABLE_CODE: "spawn-outcome-lane-unavailable";
export declare const LAUNCHER_LANE_UNAVAILABLE_LINE: string;
export declare const LAUNCHER_REFUSAL_FALLBACK: string;
export declare const LAUNCHER_CONTROL_MACHINE: "this machine";
export declare const LAUNCHER_PHASE_POST: "post";
export declare const LAUNCHER_PHASE_LANE: "lane";
export declare const LAUNCHER_LIVENESS_WORDS: readonly ["live", "stale", "unknown"];

export declare const LAUNCHER_FIELD_NODE: "node";
export declare const LAUNCHER_FIELD_REPO: "repo";
export declare const LAUNCHER_FIELD_ITEM: "item";
export declare const LAUNCHER_FIELD_LIST: readonly ["node", "repo", "item"];
export declare const LAUNCHER_FIELD_LABELS: { readonly node: string; readonly repo: string; readonly item: string };

export declare function launcherDispatchedLine(nodeId: string): string;
export declare function launcherStartedLine(nodeId: string): string;
export declare function launcherRepoGroupOff(nodeId: string): string;
export declare function launcherFreshnessAnnotation(freshness: unknown): "stale" | "unknown" | null;

export type LauncherNodeOption = {
  readonly value: string;
  readonly label: string;
  /** Verbatim from the payload. The rendered vocabulary is `annotation`'s, and it is closed. */
  readonly freshness: string | null;
  readonly annotation: "stale" | "unknown" | null;
};

export type LauncherRepoOption = {
  readonly value: string;
  readonly label: string;
  readonly name: string | null;
  /** `null` when no node is chosen — there is no membership fact to state. */
  readonly onNode: boolean | null;
  readonly group: string | null;
};

export type LauncherItemOption = {
  /** `null` on the repo-root row, which is always first and always present. */
  readonly value: string | null;
  readonly label: string;
  readonly ref: string | null;
  readonly title: string | null;
  readonly root: boolean;
};

export type LauncherSelection = {
  readonly nodeId?: string | null;
  readonly workspaceId?: string | null;
  readonly itemRef?: string | null;
};

/** EVERY node/workspace/item the payload carries — annotated, grouped, never filtered. */
export declare function launcherNodeOptions(status?: LauncherStatusPayload | null): readonly LauncherNodeOption[];
export declare function launcherRepoOptions(status?: LauncherStatusPayload | null, selection?: LauncherSelection | null): readonly LauncherRepoOption[];
export declare function launcherItemOptions(status?: LauncherStatusPayload | null, selection?: LauncherSelection | null): readonly LauncherItemOption[];

export type LauncherResolvedValue = { readonly value: string | null; readonly departed: boolean };

export type LauncherResolvedSelection = {
  readonly node: LauncherResolvedValue;
  readonly workspace: LauncherResolvedValue;
  readonly item: LauncherResolvedValue;
  readonly nodes: readonly LauncherNodeOption[];
  readonly repos: readonly LauncherRepoOption[];
  readonly items: readonly LauncherItemOption[];
};

export declare function launcherResolveSelection(status?: LauncherStatusPayload | null, selection?: LauncherSelection | null): LauncherResolvedSelection;

/** The wire body — `{ nodeId, workspaceId }` plus an optional `itemRef`, and NO `assistant`. */
export type LauncherRequestBody = {
  readonly nodeId: string;
  readonly workspaceId: string;
  readonly itemRef?: string;
};

export declare function launcherRequestBody(status?: LauncherStatusPayload | null, selection?: LauncherSelection | null): LauncherRequestBody | null;
export declare function launcherOpenDefaults(status?: LauncherStatusPayload | null): { readonly nodeId: string | null };

export type LauncherAttempt = {
  readonly at: number;
  readonly request: LauncherRequestBody;
  readonly answer: unknown;
  readonly outcome: unknown;
  readonly seenAt: number | null;
};

export type LauncherMachine = {
  readonly open: boolean;
  readonly selection: { readonly nodeId: string | null; readonly workspaceId: string | null; readonly itemRef: string | null };
  readonly attempt: LauncherAttempt | null;
};

export declare function launcherRest(): LauncherMachine;

/** The route's answer, as data: an HTTP answer, or a transport rejection. */
export type LauncherAnswerInput =
  | { readonly ok: boolean; readonly status?: number; readonly body?: unknown }
  | { readonly error: unknown };

export type LauncherOutcomeInput = {
  readonly nodeId?: unknown;
  readonly sessionId?: unknown;
  readonly state?: unknown;
  readonly code?: unknown;
  readonly at?: unknown;
};

export type LauncherEvent =
  | { readonly type: "open"; readonly defaults?: LauncherSelection | null }
  | { readonly type: "close" }
  | { readonly type: "choose"; readonly field: "node" | "repo" | "item"; readonly value: string | null }
  | { readonly type: "submit"; readonly at: number; readonly request: LauncherRequestBody | null }
  | { readonly type: "answer"; readonly at: number; readonly response: LauncherAnswerInput }
  | { readonly type: "outcome"; readonly at: number; readonly outcome: LauncherOutcomeInput | null }
  | { readonly type: "observe"; readonly at: number; readonly sessions: unknown }
  | { readonly type: "settle" };

/** TOTAL: an unknown event, or one that cannot apply, returns the machine unchanged. */
export declare function launcherReduce(machine: LauncherMachine | null | undefined, event: LauncherEvent | null | undefined): LauncherMachine;

export type LauncherOutcomeView = {
  readonly state: LauncherState;
  readonly line: string | null;
  readonly title: string | null;
  readonly tone: "muted" | "destructive" | null;
  readonly code: string | null;
  /** `this machine` or the `<nodeId>` — every message names the machine the fact is about. */
  readonly machine: string | null;
  /**
   * How a `no answer` was reached, kept distinguishable so the designer can render the
   * distinction without a wire change (ADR-008 decision 7's surfaced consequence).
   */
  readonly cause: "post-deadline" | "post-rejected" | "outcome-expiry" | "outcome-expiry-acked" | "lane-unavailable" | "no-session-id" | null;
  readonly settled?: boolean;
};

export declare function launcherRefusal(input?: {
  readonly phase?: "post" | "lane";
  readonly code?: unknown;
  readonly sentence?: unknown;
  readonly node?: unknown;
  readonly repo?: unknown;
  readonly item?: unknown;
  readonly sessionId?: unknown;
}): LauncherOutcomeView;

export type LauncherField = {
  readonly id: "node" | "repo" | "item";
  readonly label: string;
  readonly required: boolean;
  readonly options: readonly (LauncherNodeOption | LauncherRepoOption | LauncherItemOption)[];
  readonly value: string | null;
  readonly departed: boolean;
  readonly note: string | null;
  readonly disabled: boolean;
  readonly frozen: boolean;
  readonly reason: string | null;
};

export type LauncherTrigger = {
  readonly label: string;
  readonly words: string;
  readonly caret: string;
  readonly disabled: boolean;
  /** A disabled trigger STAYS focusable: its `title` is the only explanation it has. */
  readonly focusable: true;
  readonly reason: string | null;
  readonly expanded: boolean;
  readonly compact: string | null;
  readonly widthCh: number;
};

export type LauncherPanel = {
  readonly title: string;
  readonly caption: string;
  readonly fields: readonly LauncherField[];
  readonly request: LauncherRequestBody | null;
  readonly actionLabel: string;
  readonly actionDisabled: boolean;
  readonly frozen: boolean;
};

export type LauncherOutcomePoll = {
  readonly path: string;
  readonly nodeId: string;
  readonly sessionId: string;
  readonly everyMs: number;
};

export type SessionLauncherView = {
  readonly state: LauncherState;
  readonly trigger: LauncherTrigger;
  /** `null` when the panel is closed — and it cannot open at all without a payload. */
  readonly panel: LauncherPanel | null;
  readonly outcome: LauncherOutcomeView;
  /** Non-null ONLY while `dispatched` holds, and always on the CURRENT session id. */
  readonly outcomePoll: LauncherOutcomePoll | null;
  readonly settled: boolean;
};

export declare function sessionLauncherView(context?: {
  readonly status?: LauncherStatusPayload | null;
  readonly machine?: LauncherMachine | null;
  readonly now?: number;
} | null): SessionLauncherView;
