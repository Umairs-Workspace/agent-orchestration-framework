// Type declarations for scope.mjs (the pure fleet scope/region/state helpers).
import type { FleetNode, FleetStatus, GlobalNode, GlobalWorkItem } from "./api";
import type { CurrentWorkLines } from "./runs.d.mts";

export type Scope = "global" | "local";
export type PageState = "loading" | "error" | "empty" | "populated";

export declare const VALID_SCOPES: Scope[];

export declare function scopeLabel(scope: string | null | undefined): "Global" | "Local";
export declare function isValidScope(scope: unknown): scope is Scope;
export declare function withScopeParam(search: string | null | undefined, scope: Scope): string;
export declare function scopeFromSearch(search: string | null | undefined): Scope;

// milestone 47 / story 02 (ADR-001 + ADR-003) — the `?repo=<workspaceId>` URL contract's
// read and write, in the ONE home beside the scope pair. `repoFromSearch` answers `null`
// for NO FILTER (absent, blank, whitespace-only) and NEVER `""`; a repeated key takes the
// first. `withRepoParam` is copy-and-set — it writes only its own key onto a copy of the
// incoming search — and a BLANK `repo` is the CLEAR form (there is no third export). An
// emptied query is the empty string, never a bare "?".
export declare function repoFromSearch(search: string | null | undefined): string | null;
export declare function withRepoParam(search: string | null | undefined, repo: string | null | undefined): string;

export declare function errorPathFor(
  error: (Error & { path?: string | null }) | null | undefined,
  status: (FleetStatus & { path?: string | null }) | null | undefined
): string | null;

// milestone 47 / story 02 (ADR-009) — `repo` is the ACTIVE NARROWING, and `status` is the
// ALREADY-NARROWED payload (ADR-004's seam runs before this). Optional: an unfiltered
// caller asks exactly the question it asked before.
export declare function pageState(ctx: {
  loading: boolean;
  error: string | null | undefined;
  status: FleetStatus | null | undefined;
  repo?: string | null;
}): PageState;

// *Has the mesh published anything?* — a question about the SOURCE of data. UNCHANGED by
// m47 (ADR-009): filter-agnostic by design, and it stays so.
export declare function isEmptyStatus(status: FleetStatus | null | undefined): boolean;

// *Is there anything for the operator to look at in THIS VIEW?* — a question about the
// VIEW, and the second half of ADR-009's split. Unfiltered it IS `isEmptyStatus`; under a
// filter the surviving `workspaces` row is the filter's own subject rather than content,
// so emptiness is decided on `items` and `nodes` alone.
export declare function isEmptyView(status: FleetStatus | null | undefined, repo: string | null | undefined): boolean;

// The three-valued resolution of the filter against the NARROWED payload (ADR-009):
// `undefined` = not yet known (no payload has landed — UNRESOLVED, never unknown),
// `null` = known not to be there, a string = the workspace's display name.
export declare function resolvedRepoName(
  status: FleetStatus | null | undefined,
  repo: string | null | undefined
): string | null | undefined;

// milestone 47 / story 02 (ADR-007) — the empty state names EVERY narrowing that produced
// it, so the copy is a pure function of the narrowings in force. `resolved` is
// `resolvedRepoName`'s three-valued answer; ABSENT means "not yet known" and must NOT be
// collapsed into `null` ("a loading state that accuses a valid filter of being unknown is
// a defect" — DESIGN, DG-47-3).
// `workspaceId` is the SERVED narrowing (ADR-010 clause 5) — the workspace the SERVER
// narrowed to, `null`/absent when it did not. It is what keeps a scope-narrowed view from
// accusing a repo of being unknown to a mesh it was never served: `resolved: null` means
// UNKNOWN only when `workspaceId` is null, and OUT-OF-SCOPE otherwise. A scalar may be an
// input to the COPY without becoming an input to the NARROWING (ADR-004 clause 4 stands).
export type EmptyStateNarrowings = {
  scope: Scope;
  workspaceId?: string | null;
  repo?: string | null;
  resolved?: string | null;
};

// One shape for all four cases. m47 grew this from a bare body: the heading was inline JSX
// in Fleet.tsx and DESIGN pins a heading AND a body per filtered state. A polymorphic
// return is foreclosed — it would leave the heading inline for the unfiltered cases and
// re-homed for the filtered ones, i.e. two homes for one fact (ADR-007).
export type EmptyStateCopy = {
  heading: string;
  body: string;
  /**
   * The operator's RAW filter value where the body contains it (E3/E4/E5), else null.
   * A pointer INTO `body`, never a second copy of it — the surface renders this substring in
   * `mono` so the operator can tell their own input from the product's prose (F-47-V-5).
   * Null for E1/E2 (no filter) and for E6/E7, whose body carries a resolved NAME.
   */
  value: string | null;
};

export declare function emptyStateCopy(narrowings: EmptyStateNarrowings): EmptyStateCopy;

export declare function milestoneListItems(items: GlobalWorkItem[] | null | undefined): GlobalWorkItem[];

export type FleetMilestoneCard = {
  item: GlobalWorkItem;
  num: string;
  stories: GlobalWorkItem[];
  total: number;
  done: number;
  inReview: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
};

export declare function milestoneCardModels(items: GlobalWorkItem[] | null | undefined): FleetMilestoneCard[];

export declare function filterToWorkspace(
  status: FleetStatus | null | undefined,
  workspaceId: string | null | undefined
): FleetStatus | null | undefined;

// The THIRD narrowing (2026-09-11) — milestone rows by work status, defaulting to open work.
export type WorkStatusFilter = "open" | "all" | "not-started" | "in-progress" | "in-review" | "blocked" | "done";
export declare const DEFAULT_WORK_STATUS_FILTER: WorkStatusFilter;
export declare const WORK_STATUS_FILTERS: readonly WorkStatusFilter[];
export declare function isValidWorkStatusFilter(filter: unknown): filter is WorkStatusFilter;
export declare function workStatusFilterLabel(filter: string | null | undefined): string;
export declare function workStatusFromSearch(search: string | null | undefined): WorkStatusFilter;
export declare function withWorkStatusParam(search: string | null | undefined, filter: string | null | undefined): string;
export declare function workStatusAdmits(filter: string | null | undefined, status: string | null | undefined): boolean;
export declare function filterToWorkStatus(
  status: FleetStatus | null | undefined,
  filter: string | null | undefined
): FleetStatus | null | undefined;
export declare function hiddenMilestoneCount(before: FleetStatus | null | undefined, after: FleetStatus | null | undefined): number;
export declare function workStatusSummaryTail(filter: string | null | undefined, hidden: number): string;

export declare function withoutCredentialFields<T extends Record<string, unknown>>(record: T | null | undefined): Partial<T>;
export declare function isCredentialField(key: unknown): boolean;

export type NodePanelFacts = {
  nodeId: string | null;
  role: string | null;
  host: string | null;
  lastSeenAt: string | null;
  capabilities: string[];
  fabricAddress: string | null;
  freshness: "live" | "stale" | "unknown" | string;
};

export declare function nodePanelFacts(node: Partial<FleetNode> & Record<string, unknown>): NodePanelFacts;

// finding F9 (aof:verify 38) — the row-3 current-work-line derivation both the
// global node panel (the card production actually renders) and the pre-38
// local NodeCard project from `node.presence`.
export declare function nodeCurrentWork(node: Partial<FleetNode> & Record<string, unknown>): CurrentWorkLines;

export type DiagnosticsSummary = {
  projectedAt: string | null;
  skippedWorkspaceCount: number;
  descriptorErrorCount: number;
  projectionErrorCount: number;
};

export declare function diagnosticsSummary(status: FleetStatus | null | undefined): DiagnosticsSummary;

// milestone 38 / story 04 (ADR-012) — the "assign to node" picker's options,
// derived from the REAL GET /api/mesh/status roster (producer-fed, ADR-008).
export declare function assignableNodeOptions(
  nodes: (Partial<GlobalNode> & Record<string, unknown>)[] | null | undefined
): string[];
