import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fleetApi } from "./api";
import type { GlobalMeshStatus, GlobalWorkspace, GlobalWorkItem, GlobalNode, GlobalDiagnostics, MeshSession, FleetStatus, WorkAssignment } from "./api";
import { relativeTime, refreshedLabel } from "../board/runs.mjs";
import { assignmentChip, assignmentSummary } from "./assignments.mjs";
// m46/04 — THE ONE TERMINAL CONTROL, mounted READ-ONLY. The fleet owns no terminal component
// now: it declares a SOURCE and a POSTURE, and ./terminal-mount.mjs has no path to `interactive`.
import { TerminalControl } from "../terminal/TerminalControl";
import { HOST_FLEET_CARD } from "../terminal/host-model.mjs";
import { fleetPageOrigins, fleetTerminalMount } from "./terminal-mount.mjs";
// milestone 45 / story 03 — the shell's named surface slot. The fleet contributes its own
// controls (scope, legend, refresh) into the shell's bar instead of painting a second one;
// with no shell present (the headless harness) the contribution renders in place.
import { SurfaceSlot } from "../app/SurfaceSlot";
import { StatusRing, StatusChip, StatusDot } from "../board/status";
import type { WorkStatus } from "../board/api";
// milestone 43 / story 04 — the FIFTH read-only ramp, imported from the ONE
// headless module the board also imports (never a fleet copy), so the two
// surfaces cannot disagree about whether a row is stale or about how the badge
// is painted. The fleet's own delta is deliberately small: a badge in the
// milestone card's row-1 cluster with the full sentence in its `title`, and the
// legend's fourth block. There is NO Resync here — one door per item, on the
// surface that also shows WHAT is stale (DESIGN §Surface 2).
import { freshness, isCachePublished, readStalenessWindow } from "../board/freshness.mjs";
import type { Freshness } from "../board/freshness.mjs";
import { StaleBadge, FreshnessLegend } from "../board/StaleBadge";
import {
  scopeLabel,
  scopeFromSearch,
  withScopeParam,
  pageState,
  emptyStateCopy,
  nodePanelFacts,
  nodeWorkRegion,
  diagnosticsSummary,
  errorPathFor,
  milestoneCardModels,
  milestoneListItems,
  assignableNodeOptions,
  // milestone 47 / story 03 (ADR-001/002/003/004/009/010) — the repo filter's whole decision
  // surface, imported from the ONE home. This file gains WIRING, not logic: two URL reads, one
  // URL write, one narrowing call and one resolution. Nothing below re-derives any of them.
  repoFromSearch,
  withRepoParam,
  filterToWorkspace,
  resolvedRepoName,
  // The THIRD narrowing (2026-09-11) — milestone rows by work status, open by default.
  workStatusFromSearch,
  withWorkStatusParam,
  filterToWorkStatus,
  hiddenMilestoneCount,
  workStatusSummaryTail,
  workStatusFilterLabel,
  WORK_STATUS_FILTERS,
  DEFAULT_WORK_STATUS_FILTER,
} from "./scope.mjs";
import type { FleetMilestoneCard, Scope, WorkStatusFilter } from "./scope.d.mts";
import { loopStopAffordance, rememberStopRung } from "./runs.mjs"; // 130/03 — the loop line's button + rung memory, pure
import type { FleetLoopLine, RememberedStopRung, StopRungMemory } from "./runs.d.mts";
// milestone 47 / story 03 (ADR-001 [Feasibility-2]; ADR-007; DESIGN §Surface 1 / §Surface 2 R0)
// — the filter's two PRESENTATIONAL children. They export components and no narrowing
// vocabulary, take their facts as props and import nothing from the one home, which is what
// makes them children rather than a second home. They are separate files because this one is
// 1,390 lines against a 1,560 ratchet and `acd-ui-surface-file-budget`'s own remedy is exactly
// this move ("extract the next region into a sibling component with a prop boundary").
import { RepoPicker, ALL_REPOS, ScopeControl, WorkStatusPicker, WorkspacesSummary } from "./RepoPicker";
import type { RepoFilterForm } from "./RepoPicker";
import { FilterBanner } from "./FilterBanner";
import { Legend, RefreshControl, useViewportWidth, slotAidForm } from "./SlotAids";
// …and the two SIBLING COMPONENTS this story extracted to pay for the above under the 1,560
// ratchet, rather than raising a number (which needs an ADR, not a diff) or trimming rationale
// to fit (ADR-014/E3 forbids it by name). Each file's own header states what moved and why, and
// which components could NOT move because a committed gate slices them out of THIS file.
import { AssignmentChip, AssignmentSummaryLine } from "./AssignmentChip";
import { LoadingState, ErrorState, EmptyFleet } from "./PageStates";
// …and region 5's drill-in, extracted by m47/04 for the same reason and under the same
// rule: DG-47-5 gives one element three treatments, a rule beneath it and an accessible
// name, and the ratchet's own remedy is a sibling with a prop boundary rather than an ADR
// to raise a number. The abbreviation decision stays HERE (it reads the chip's target).
import { BoardDrillIn, boardControlName } from "./BoardDrillIn";
// milestone 38 / story 04 / task 06 (DESIGN §Surface 2 Amendment 2026-07-24, F22)
// — the assign affordance's own state machine, in the house pure-helper pattern
// (there is no React test harness in this repo): AssignAffordance below holds NO
// transition logic of its own, it renders exactly what `assignAffordanceView`
// returns and delegates the whole click to `runAssign`.
import {
  POLL_MS,
  region5NameDropped,
  region5RowLadder,
  assignAtRest,
  assignAckExpired,
  assignAffordanceView,
  runAssign,
  LOOP_STOP_REFUSAL_COPY, LOOP_STOP_TIMED_OUT,
} from "./assign-affordance.mjs";
import type { AssignAffordanceState } from "./assign-affordance.d.mts";

// The read-only "fleet mission-control" web surface (milestone 25 / story 02;
// DESIGN surface 1 → the committed mock `mocks/Mesh.dc.html`). A slim top bar over
// two stacked regions — NODES (the fleet's machines + their live presence) and
// BOARDS (every board being worked on across the group). It renders the ONE
// /api/mesh/status aggregate (ADR-002/ADR-003) and writes nothing: the only
// interactions are the drill-in + the ⟳ refresh. Three read-only ramps, three
// primitives, never merged:
//   - node-presence (a presence dot + relative-age label) — NEW to the fleet;
//   - run-state (the m21 dot+label chip, ui/src/board/runs.mjs) — REUSED verbatim;
//   - item-status (the m03 glyph-ring) — NOT on this surface (one level down).
//
// milestone 34 / story 03 (ADR-006; DESIGN.md) — the page now ALSO renders the
// GLOBAL scope: a scope control (Global/Local, always visible in the top bar), a
// workspaces summary, milestone cards with workspace identity, a node panel
// (roles/capabilities/fabric addresses), and a health/diagnostics region. The
// scope lives in the URL (`?scope=<global|local>`) so a refresh/poll/bookmark
// keeps the selected scope, and switching scope re-queries WITHOUT a full page
// remount (task 02 scenario 3) — the SAME <Fleet> instance just re-fetches under
// the new scope. Render-logic that must be node:test-exercisable (scope-active
// derivation, state selection, filtering, the credential guard) lives in the pure
// ./scope.mjs helper this component imports (the house pattern — see
// ui/src/board/runs.mjs) since there is no React test harness in this repo.
//
// milestone 47 / story 01 (ADR-006(b); m45 QA F-45-04-QA-3) — THE PARAGRAPH ABOVE IS
// NOW THE WHOLE SURFACE. The m25 local-shape body it superseded — `NodesRegion`,
// `NodeCard`, `PresenceDot`, `PresenceLabel`, `livenessOf`, `BoardsRegion`,
// `BoardTile`, `boardRunState`, `RunStateChip`, `BoardDrillIn`, ~250 lines — is
// DELETED, because it had not rendered since m34 and could not: the fleet face
// answers `queryGlobalMeshStatus` for BOTH scopes and `shapeGlobalStatus` always
// emits `workspaces`, so the branch that chose the local body was never taken.
// `boards` in particular never made the m25/ADR-002 → m34/ADR-006 producer
// migration — the CLI face still consumes `mesh:status`'s registry-fed aggregate
// (and still renders it), while this face consumes the global SQLite projection and
// is STRUCTURALLY BARRED from the other by `acd-mesh-ui-no-core-import`. So the
// "BOARDS" region above rendered its dashed "No boards registered in the group yet"
// placeholder in production for two milestones. ADR-006's ruling is ONE PRODUCER OR
// NO REGION, and in this milestone: no region. The terms for restoring one are
// written into that ADR — the row must carry `workspaceId`, published into the
// GLOBAL projection, never a second read path in this face — so the next author
// meets a decision rather than an empty region.

// The client poll cadence (DESIGN default / PRD §7.3): visibility is poll /
// relay-presence, NEVER a push event stream — the client opens no WebSocket / SSE.
// It is imported from ./assign-affordance.mjs (which owns it beside
// ASSIGN_SENT_HOLD_MS) because the poll interval and the F22 `Sent` hold are ONE
// number by design — a hold of exactly one poll interval is what guarantees there
// is never a moment between the click and a confirmation in which the surface
// says nothing. Two copies of that number could drift; one cannot.
// The freshness-label tick — advances the "refreshed Ns ago" age without a re-poll.
const CLOCK_MS = 1000;

// milestone 47 / story 01 (ADR-006(b)) — THERE IS ONE SHAPE NOW, so there is one
// body and no narrowing. The LOCAL-shape branch this file used to carry (its own
// `NodesRegion`/`BoardsRegion` grids) had not rendered since m34: the fleet face
// answers `queryGlobalMeshStatus` for BOTH scopes, and `shapeGlobalStatus` ALWAYS
// emits `workspaces`, so the guard that chose between them was always true. It is
// deleted along with everything only it reached.
//
// What survives is this normalisation, and it is NOT that branch wearing a
// function's clothes — it answers a different question, the one ADR-006 left open:
// what does the surface do when it is handed a payload it did not ask for (a stale
// wire, a hand-built fixture, another producer's aggregate served verbatim)? Two
// answers were open and the contract pins only that the operator is never shown a
// crash. This takes the DEGRADED POPULATED view rather than an empty state, for one
// reason: `isEmptyStatus` reads `boards` too, so such a payload is "populated" by
// the page's own selector, and telling an operator "nothing has published yet" over
// a payload that plainly carries something would be the idle-fleet lie one milestone
// early. Every region below is a pure function of the array it is handed, and
// `nodePanelFacts` already spans both node shapes by design — so a foreign payload
// degrades to "here is what I can read of you" instead of throwing on
// `status.workspaces.map` with no error boundary above it (m45/F-45-M-1 put one at
// the SHELL boundary only, and the headless mount has no shell).
//
// It is ONE seam, ABOVE the region fan-out.
//
// [F-47-01-ARCH-F1, corrected 2026-08-11 by 47/03, which is the story the claim was
// about.] THIS COMMENT USED TO SAY that the position above "is also the shape 47/03's
// repo filter has to take (ADR-004) — so the position is not re-decided then, and the
// filter arrives at a payload whose collections are already known to be arrays." Both
// halves were false, and a later author would have read them as settled and found a red
// gate. Measured: this normaliser's ONE call site is the populated arm of the state
// ternary, while `pageState` runs sixty lines EARLIER — and ADR-004 requires the
// narrowing BEFORE `pageState`, so that `isEmptyView` judges the FILTERED payload
// (without that ordering ADR-009's honest empty state is not merely hard, it is
// unreachable). `acd-fleet-filter-every-region` asserts exactly that ordering.
//
// So the two seams do NOT coincide, and 47/03 chose to keep them apart rather than move
// this one: the narrowing runs at the top of `Fleet()`, this normaliser stays where it
// is, and it is handed the NARROWED payload. They answer different questions — shape
// versus rows — and the split is what keeps either legible. It costs nothing, because
// every consumer BETWEEN the two (the narrowing itself, `pageState`/`isEmptyView`,
// `resolvedRepoName`, and the seam's own un-narrowed totals) is already `?? []`-total
// over a raw payload; the non-total consumers are the REGIONS, which begin here.
//
// WHAT IT GUARANTEES, EXACTLY — stated as a closed list rather than as "no region ever
// receives a missing collection", which is the shape of over-claim this milestone keeps
// catching (F-47-01-QA-10: the first draft of this comment promised the general rule
// while the code covered three of five collections, and the surface survived only
// because `diagnosticsSummary` happens to be defensive — a property of that helper, not
// of this seam). It normalises the collections THIS SURFACE'S REGIONS READ:
// `workspaces`, `items`, `nodes`, and `diagnostics`' own three arrays, which are one
// level down and are exactly the rows ADR-004 rules on (`skippedWorkspaces` and
// `projectionErrors` carry a `workspaceId` and are case-1; `descriptorErrors` carries a
// descriptor path and is the declared machine-wide exemption). It normalises NOTHING
// ELSE, and it does not narrow: shape is this seam's promise, narrowing is 47/02's
// function applied here by 47/03.
//
// A collection some other milestone adds to the wire is therefore NOT covered until a
// region here reads it, and the day a region reads it is the day it must be added here —
// which the headless mount enforces loudly, since it has no error boundary above it.
// The ONE empty collection this file hands out for a payload that carries none. It is a
// module-level constant rather than a fresh `[]` because the picker's options ride in the
// surface slot's `deps`, and a new array identity every render would re-publish the
// contribution on every render — the one failure mode that mechanism has.
const NO_ROWS: never[] = [];
// The status control's options — a MODULE constant: it rides in the slot's `deps`, where a fresh array re-publishes the bar.
const WORK_STATUS_OPTIONS = WORK_STATUS_FILTERS.map((value) => ({ value, label: workStatusFilterLabel(value) }));

// The array-safe READ of a collection off a payload that has not been through the normaliser
// below. It is NOT a second normaliser — it rewrites nothing and returns the payload's own
// array when there is one — it is the same `?? []` totality every other pre-fan-out consumer
// of the raw payload already applies (`isEmptyStatus`, `resolvedRepoName`, `filterToWorkspace`).
// It exists because 47/03's seam reads three UN-narrowed collections above the fan-out, and
// because a fresh `[]` for an absent one would break the surface slot's `deps` stability.
function rowsOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : NO_ROWS;
}

// The `<N>` half of every `<n> of <N>` — SCALARS computed at the seam (ADR-004 rule 4:
// "scalars are not collections … they describe the response, not its rows"). ADR-004 hands
// every region an ALREADY-NARROWED status, so a region knows `n` and CANNOT know `N`; the total
// must therefore arrive as a number. Never the raw payload passed alongside the narrowed one,
// and never a second narrowing call to recover it.
//
// It answers `null` — the whole record, never a field of it — when no narrowing is in force,
// and that is the ONE thing that tells a region to render the bare `<N> <noun>` head it has
// always rendered. It is deliberately NOT the `filtered` boolean ADR-004 rejects by name: four
// regions handed a boolean would each decide what "filtered" means for their rows, while a
// region handed a total decides nothing at all.
function narrowingTotals(status: FleetStatus | null, repo: string | null): NarrowingTotals {
  if (repo == null) return null;
  return {
    workspaces: rowsOf(status?.workspaces).length,
    // The same projection the region itself counts — `milestoneCardModels` maps over
    // `milestoneListItems`, so the two lengths are one number and cannot drift.
    milestones: milestoneListItems(rowsOf<GlobalWorkItem>(status?.items)).length,
    nodes: rowsOf(status?.nodes).length,
    skippedWorkspaces: rowsOf(status?.diagnostics?.skippedWorkspaces).length,
  };
}

// The filter's RENDERED FORM, its label and its `title`, derived ONCE from the facts the one
// home answers and handed to BOTH the bar's trigger and the page's chip — so the bar and the
// page can never disagree about whether a value is absent, out of scope, or simply not yet
// known. Two consumers, one derivation.
//
// `resolvedRepoName` is THREE-VALUED on purpose (ADR-009): `undefined` is NOT YET KNOWN, not
// "unknown". A boolean here would collapse the two for as long as the first fetch takes, and a
// page that accuses a valid filter of being unknown while its payload is still in flight is
// DG-47-3's named defect — the natural shape of a naive build, because "the payload does not
// carry this id" is trivially true of a payload that has not arrived.
//
// `null` then means UNKNOWN only when the payload carries NO server narrowing (ADR-010 clause
// 5). "Nothing on this mesh publishes as X" is a claim about the MESH, and a client served one
// workspace was not served the mesh; under a scope-narrowed payload the honest answer is
// OUT-OF-SCOPE. That is why the served `workspaceId` is an input here — a scalar may be an
// input to what the page SAYS without becoming an input to what it NARROWS.
function repoNarrowingView(
  repo: string | null,
  resolved: string | null | undefined,
  served: string | null,
): { form: RepoFilterForm; label: string; title: string } {
  if (repo == null) return { form: "none", label: ALL_REPOS, title: ALL_REPOS };
  // The screen carries the NAME and the address carries the id, deliberately (ADR-003's trade:
  // the URL was made opaque so it survives a rename, and the legibility that costs is repaid
  // here). An id that resolved to a repo the operator did not mean shows them a NAME they did
  // not expect, which is a check a human can actually perform.
  if (typeof resolved === "string") return { form: "resolved", label: resolved, title: repo };
  if (resolved === undefined) {
    return {
      form: "unresolved",
      label: repo,
      title: "The mesh has not answered yet, so whether it carries this workspace is not yet known",
    };
  }
  if (served == null) {
    return { form: "unknown", label: repo, title: "No workspace with this id has published to the mesh" };
  }
  // A statement about the PAYLOAD, never about the mesh.
  return { form: "out-of-scope", label: repo, title: "This scope's payload does not carry this workspace" };
}

// EVERYTHING R0 AND R0-N STATE, derived in one place (DESIGN §Surface 2's R0/R0-N entries).
// The banner is presentational and takes what it renders; which narrowings are in force, and
// whether their COMPOSITION owes an explanation, is a page-level question and is answered here.
function filterBannerView({
  state,
  scope,
  narrowed,
  repo,
  view,
  workStatus,
}: {
  state: string;
  scope: Scope;
  narrowed: GlobalMeshStatus | null;
  repo: string | null;
  view: { form: RepoFilterForm; label: string; title: string };
  workStatus: WorkStatusFilter;
}): { scope: Scope; scopeLabel: string | null; repo: string | null; repoLabel: string; repoForm: RepoFilterForm; repoTitle: string; workStatus: string | null; workStatusLabel: string; notice: string | null } {
  // The scope is read off the PAYLOAD's own scalar and never re-derived from the URL: a
  // `--local`-started server narrows with no `?scope=` in the URL at all, so the two can differ
  // and only one of them is a fact. `global` is the DEFAULT and therefore not a narrowing — a
  // banner announcing it would be announcing the absence of one.
  const payloadScope: Scope = (narrowed?.scope ?? scope) === "local" ? "local" : "global";

  // R0-N — THE PARTIAL-INTERSECTION NOTICE (ADR-010 clause 4).
  //
  // The server NEVER narrows the node roster, so `?scope=local&repo=<another repo>` can leave
  // that repo's MEMBER MACHINES standing with zero work above them. That is a `populated` page
  // and not an empty one — forcing it empty would hide the very rows that answer the filter —
  // and what it owes the operator instead is a visible line saying which narrowing removed the
  // rest. Its four conditions, exactly as DESIGN pins them: a repo filter is in force, the
  // payload carries a SERVER narrowing, the page is POPULATED, and the work collections came
  // back empty while the roster did not. The first two are what `out-of-scope` means; the last
  // is the `items` check, since `populated` here can only mean surviving node rows.
  //
  // EXACTLY ONE OF R0-N AND THE E5 CARD EVER SPEAKS — same composition, different roster.
  const partial =
    state === "populated" && view.form === "out-of-scope" && narrowed != null && rowsOf(narrowed.items).length === 0;

  return {
    // THE FACT, carried beside the COPY (F-47-03-ARCH-2, must-fix, closed here). The empty card
    // needs the scope that produced the payload, and it used to recover it from `scopeLabel`'s
    // NULLNESS at the call site — `banner.scopeLabel == null ? "global" : "local"`. That reads a
    // PRESENTATIONAL string as a boolean about the world: `scopeLabel` is null because `global`
    // is the default and a banner announcing it would announce the absence of a narrowing, which
    // is a DESIGN decision. Re-word or re-home that copy and the empty state would silently
    // select E2 (`No nodes in the group yet`) over E1, with no gate anywhere to notice — the
    // page would state the wrong fact about which narrowing produced its nothing. One
    // derivation, two consumers: the fact travels, and the label stays a label.
    scope: payloadScope,
    scopeLabel: payloadScope === "local" ? scopeLabel(payloadScope) : null,
    repo,
    repoLabel: view.label,
    repoForm: view.form,
    repoTitle: view.title,
    // A status chip only for a SINGLE named status: `open` is the default view and `all` the absence of a
    // narrowing; the default view's hiding is stated where it acts — the milestone header's tail.
    workStatus: workStatus === DEFAULT_WORK_STATUS_FILTER || workStatus === "all" ? null : workStatus,
    workStatusLabel: workStatusFilterLabel(workStatus),
    // Pinned VERBATIM by DESIGN §Surface 2 R0-N. It names BOTH narrowings, says which one
    // emptied what (the scope took the work), and says what survived and why it is still
    // relevant — and it makes no claim the client cannot support: it does NOT say the repo has
    // no work, only that THIS SCOPE'S PAYLOAD carries none of it. It names no value, no region
    // and no control: the chip beside it already carries the name, and a data-derived value can
    // be arbitrarily long (Documented default 8, the `⟳ Retry <Scope>` reasoning).
    notice: partial
      ? `${scopeLabel(payloadScope)} scope carries none of this repo's work — only the machines carrying it.`
      : null,
  };
}

function asGlobalStatus(status: FleetStatus | null): GlobalMeshStatus {
  const wire = (status ?? {}) as Partial<GlobalMeshStatus>;
  const diagnostics = (wire.diagnostics ?? {}) as Partial<GlobalDiagnostics>;
  const rows = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    ...wire,
    scope: wire.scope ?? "global",
    workspaces: rows<GlobalWorkspace>(wire.workspaces),
    items: rows<GlobalWorkItem>(wire.items),
    nodes: rows<GlobalNode>(wire.nodes),
    // F-47-01-ARCH-F2, closed here: this coercion list is HAND-MAINTAINED with no ratchet, and
    // the N+1th case was already in the tree — m48 put `sessions` on `GlobalMeshStatus` and the
    // `as GlobalMeshStatus` cast at the bottom of this function is what hid it from `tsc`. It is
    // coerced for the same reason the three above are: the seam receives an ARRAY rather than
    // whatever the wire held. (Its NARROWING is the one home's, `scope.mjs`'s rule 1 — this is
    // shape, not rows.)
    sessions: rows<MeshSession>(wire.sessions),
    diagnostics: {
      ...diagnostics,
      skippedWorkspaces: rows<GlobalDiagnostics["skippedWorkspaces"][number]>(diagnostics.skippedWorkspaces),
      descriptorErrors: rows<GlobalDiagnostics["descriptorErrors"][number]>(diagnostics.descriptorErrors),
      projectionErrors: rows<GlobalDiagnostics["projectionErrors"][number]>(diagnostics.projectionErrors),
    } as GlobalDiagnostics,
  } as GlobalMeshStatus;
}

export function Fleet() {
  const [status, setStatus] = useState<FleetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // review fix P0.5: the FAILED response's `path` (a global-store-unavailable 503
  // carries the global mesh database path) — captured separately from `status`
  // because a first-load failure leaves `status` null (there is no prior payload to
  // attach it to). errorPathFor (./scope.mjs) prefers this over any path a stale
  // `status` might already carry, so a first-load 503 still names the path.
  const [errorPath, setErrorPath] = useState<string | null>(null);
  // The active scope — sourced from the URL so a refresh/poll/bookmark keeps the
  // selected scope (task 02 scenario 2's "the refresh control keeps the local
  // scope on the next poll"; DESIGN "must make scope obvious enough…").
  const [scope, setScope] = useState<Scope>(() => scopeFromSearch(safeSearch()));
  // milestone 47 / story 03 (ADR-003) — the active REPO narrowing, sourced from the URL by
  // exactly the shape the scope above uses, so a refresh, a poll, a bookmark and a pasted link
  // all reproduce it. `repoFromSearch` answers `null` for NO FILTER and never `""`, so a
  // `?repo=` an operator's cleared control left behind is no filter rather than a filter that
  // matches nothing. The value is the STABLE OPAQUE `workspaceId`: the URL is what survives a
  // rename, and the legibility that costs is repaid on screen by the chip below.
  const [repo, setRepo] = useState<string | null>(() => repoFromSearch(safeSearch()));
  // The status narrowing, seeded from the URL by the identical shape; an absent key IS the default.
  const [workStatus, setWorkStatus] = useState<WorkStatusFilter>(() => workStatusFromSearch(safeSearch()));
  // THE ADDRESS IS READ BACK, NOT ONLY WRITTEN (F-47-V-1). Both narrowings above seed themselves
  // from the URL once, at mount, and both are PUSHED as history entries when they change — so
  // without this listener the browser's Back button walked the address while the page stayed put,
  // leaving the URL naming one repo and the view rendering another. Measured on the shipped
  // build: `popstate` fired, the address changed, and nothing re-narrowed.
  //
  // It is worth recording WHERE that defect lived, because it was not in the code — it was in the
  // gap between the code and its own comment. `pushAddress` says, in terms, "the entry is PUSHED
  // (a narrowing change is a navigation the operator performed, AND BACK SHOULD UNDO IT)". The
  // push was implemented; the undo was described. Nothing executed the sentence.
  //
  // ONE LISTENER FOR BOTH NARROWINGS, and that is the point rather than a saving: `?scope=` had
  // the identical defect since m45, so a fix that served only `?repo=` would have left the same
  // bug in the control immediately to its left. Re-deriving both from the address is also what
  // keeps this honest under composition — a `popstate` may change either, or both, and the two
  // are one address.
  //
  // Guarded for a host with no `window` (the headless harness mounts this tree with a stub), and
  // it re-derives through the SAME two pure readers the initial state uses, so there is exactly
  // one definition of "what does this address mean" and no second parser to drift.
  useEffect(() => {
    const view = typeof window === "undefined" ? undefined : window;
    if (!view?.addEventListener) return undefined;
    const onPopState = () => {
      const search = safeSearch();
      setScope(scopeFromSearch(search));
      setRepo(repoFromSearch(search));
      setWorkStatus(workStatusFromSearch(search));
    };
    view.addEventListener("popstate", onPopState);
    return () => view.removeEventListener("popstate", onPopState);
  }, []);
  // The last SUCCESSFUL poll instant — drives the "refreshed Ns ago" freshness
  // label. A failed silent re-poll does NOT advance it (keep-last-good).
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  // A live clock so the freshness label ages between polls.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // The m03 load({silent}) idiom (KEEP-LAST-GOOD): a SILENT refresh updates in
  // place — it never flips to the full-screen loading/error branch (that would
  // unmount the populated subtree and tear the view). Only the first load + an
  // explicit Retry show loading/error; a mid-session poll miss is surfaced QUIETLY
  // (the freshness label stops advancing), never the page-error. The active
  // `scope` always rides along on the request (task 01's `?scope=` deep-link) —
  // a scope switch re-queries under the NEW scope without remounting the page.
  const load = useCallback(async (targetScope: Scope, { silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
      setErrorPath(null);
    }
    try {
      const next = await fleetApi.status(targetScope);
      setStatus(next);
      setFetchedAt(Date.now());
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setErrorPath(errorPathFor(e as Error & { path?: string | null }, null));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // Poll-only freshness (NO WebSocket, NO SSE): a silent re-poll on the cadence
  // keeps the view current within the m23 presence bound + one poll. The poll
  // re-reads under the CURRENT scope (task 02 scenario 2 — the refresh/poll keeps
  // the selected scope, never silently reverting to the default).
  useEffect(() => {
    const poll = setInterval(() => void load(scope, { silent: true }), POLL_MS);
    return () => clearInterval(poll);
  }, [load, scope]);

  useEffect(() => {
    const clock = setInterval(() => setNowMs(Date.now()), CLOCK_MS);
    return () => clearInterval(clock);
  }, []);

  // Switching scope (task 02 scenario 3): update the URL's `?scope=` (pushState —
  // no navigation, no remount) and let the effect above re-query under the new
  // scope. The <Fleet> instance itself never unmounts.
  const onScopeChange = useCallback((next: Scope) => {
    setScope(next);
    pushAddress(withScopeParam(safeSearch(), next));
  }, []);

  // Switching the repo filter (ADR-003), and the SAME shape as the scope switch beside it —
  // deliberately, because "each control writes only its own key onto a copy of the incoming
  // search" is what makes ADR-005's composition work without either control knowing the other
  // exists. `withRepoParam(search, null)` is the CLEAR form and DELETES the key, so the address
  // bar never carries a naked `?repo=`. `pushState`, not `replaceState`: a filter change is a
  // NAVIGATION the operator performed, and Back should undo it.
  //
  // IDEMPOTENCE IS DECIDED AGAINST THE ADDRESS, not against React state, and that is the whole
  // reason this reads `location.search` at click time rather than closing over `repo`. Two
  // things fall out: setting the filter to the value it already carries writes NOTHING (a
  // history entry per redundant click makes Back a stutter the operator has to press through),
  // and the callback is referentially STABLE across renders — which it must be, because it
  // rides in the surface slot's `deps` and an unstable value there re-publishes the
  // contribution on every render.
  const onRepoChange = useCallback((next: string | null) => {
    const search = safeSearch();
    if (repoFromSearch(search) === next) return;
    setRepo(next);
    pushAddress(withRepoParam(search, next));
  }, []);
  // The status control writes only ITS key, idempotent against the address, exactly as above.
  const onWorkStatusChange = useCallback((next: string) => {
    const search = safeSearch();
    if (workStatusFromSearch(search) === next) return;
    setWorkStatus(workStatusFromSearch(withWorkStatusParam("", next)));
    pushAddress(withWorkStatusParam(search, next));
  }, []);

  const nowIso = useMemo(() => new Date(nowMs).toISOString(), [nowMs]);

  // ── THE ONE NARROWING SEAM (ADR-004: EVERY REGION, OR NONE) ──────────────────────────────
  //
  // The payload is narrowed ONCE, HERE, before the page decides what state it is in and before
  // any region receives it. No region receives the raw payload, no region applies a filter of
  // its own, and the narrowing is not threaded down as a predicate for each region to remember
  // to apply — so a region added by milestone 49 or 50 is narrowed on the day it is added,
  // without its author knowing this rule exists. That last property is the whole point: SPEC's
  // "a filter that narrows one region and not another is worse than none" left as a per-region
  // habit fails not in this milestone, where someone is thinking about it, but in the next one.
  //
  // IT RUNS BEFORE `pageState`, and that ordering is load-bearing rather than tidy: `isEmptyView`
  // must judge the FILTERED payload, or a filtered-to-zero view renders the populated body with
  // every region empty and no explanation — SPEC's forbidden outcome, exactly. ADR-004 and
  // ADR-009 are load-bearing for each other here; without this ordering that predicate would
  // judge the wrong payload, and without it the ordering would have nothing to protect.
  //
  // IT RUNS ON EVERY RENDER, over whatever payload is current, so a re-poll cannot leak an
  // unfiltered frame — the leak would last exactly one poll interval and then heal, which is
  // the kind of defect only a lane watching the totals move can see.
  //
  // Both `filterToWorkspace` and every consumer between here and the region fan-out are
  // `?? []`-total over a raw payload, so shape-normalisation is NOT hoisted to meet this seam;
  // it stays at the fan-out, where the non-total consumers begin (see `asGlobalStatus` above,
  // and F-47-01-ARCH-F1 in its header).
  // The status narrowing is the SECOND step of the same seam; `hiddenMilestones` is what it removed from what the repo left.
  const repoNarrowed = (filterToWorkspace(status, repo) ?? null) as GlobalMeshStatus | null;
  const narrowed = (filterToWorkStatus(repoNarrowed, workStatus) ?? null) as GlobalMeshStatus | null;
  const hiddenMilestones = hiddenMilestoneCount(repoNarrowed, narrowed);
  const state = pageState({ loading, error, status: narrowed, repo });

  // …and the pure projections the seam feeds, each derived ONCE from it and handed down. Their
  // bodies are module-level functions below rather than expressions in this component, which is
  // this repo's own rule ("render-logic belongs in a plain helper the .tsx wires up") and what
  // keeps `Fleet()` reading as wiring rather than as logic.
  //
  // `resolved` and `served` are read ONCE and shared by the two views: they are the same two
  // facts, and deriving them twice is how a bar and a page start disagreeing.
  const resolved = resolvedRepoName(narrowed, repo);
  const served = narrowed?.workspaceId ?? null;
  const totals = narrowingTotals(status, repo);
  // MEMOISED ON THE THREE PRIMITIVES IT IS BUILT FROM, and that is not an optimisation: this
  // object rides in the surface slot's `deps`, so a fresh identity every render would
  // re-publish the contribution every render (FEASIBILITY 6's live hazard, which this
  // milestone's fourth contribution enlarges).
  const repoView = useMemo(() => repoNarrowingView(repo, resolved, served), [repo, resolved, served]);
  // The picker's options are the payload's OWN workspaces, UN-narrowed — a picker fed the
  // narrowed payload would offer exactly the repo already in force and could never be used to
  // leave it. ADR-004's rule is about the REGIONS, which render facts; this is the control that
  // chooses which facts, and it must see what it was served.
  const repoOptions = rowsOf<GlobalWorkspace>(status?.workspaces);
  // Everything R0 and R0-N state, in one place (DESIGN §Surface 2).
  const banner = filterBannerView({ state, scope, narrowed, repo, view: repoView, workStatus });

  // milestone 43 / story 04 — the fleet's own reading of the SAME ramp, off the
  // SAME 1s clock the freshness label already rides. The window is read through
  // the ONE reader in `freshness.mjs`; when this payload does not carry it, the
  // ramp withholds every verdict (no badge is asserted on a window nobody
  // stated) and the legend degrades to words. Null for a row the cache does not
  // publish, which is what keeps a non-mesh fleet free of the vocabulary.
  const stalenessWindow = readStalenessWindow(status);
  const freshnessOf = useCallback(
    (item: GlobalWorkItem | null | undefined): Freshness | null =>
      item && isCachePublished(item) ? freshness(item, { now: nowMs, windowSeconds: stalenessWindow }) : null,
    [nowMs, stalenessWindow]
  );

  // milestone 38 / story 04 / task 06 (DESIGN §Surface 2 A8, F22) — on a
  // successful assign the surface fires EXACTLY ONE additional re-load, so
  // region 5's m35 `assigned` chip lands within a round trip of the 2xx instead
  // of up to one poll interval later. It is the SAME `load(scope, { silent:true })`
  // the ⟳ control fires, handed DOWN to the affordance as `onAssigned`.
  //
  // It MUST be the SILENT load: a non-silent one flips the page into its
  // loading state and UNMOUNTS the populated board, which is a far worse answer
  // than saying nothing. And it is ONE load — no new cadence, no retry ladder;
  // the existing POLL_MS poll remains the steady state, and the `Sent` hold is
  // sized to cover exactly that window if the record is not yet visible.
  const onAssigned = useCallback(() => void load(scope, { silent: true }), [load, scope]);

  return (
    // DESIGN GAP D1 (HIGH, review fix) — `overflow-x-hidden` here is the page-level
    // backstop: milestone cards and long workspace labels should shrink inside the
    // content rail, while this belt-and-braces
    // guard ensures the PAGE body/root itself never grows a horizontal scrollbar
    // at a 360–414px viewport, matching task-02's "no text overlaps at 360px" for
    // the now-populated global state too.
    // milestone 45 / story 03 — `min-h-screen` was 100vh, which under the shell is taller than
    // the content box by exactly the chrome height (the page would scroll with nothing in it).
    // The published primitive (ADR-005 contract point 7) is the honest replacement, and its
    // `0px` fallback keeps this identical when the surface is mounted with no shell.
    <div className="flex min-h-[calc(100dvh_-_var(--aof-shell-chrome-height,0px))] flex-col overflow-x-hidden bg-background text-foreground">
      <TopBar
        scope={scope}
        onScopeChange={onScopeChange}
        repo={repo}
        repoView={repoView}
        repoOptions={repoOptions}
        onRepoChange={onRepoChange}
        workStatus={workStatus}
        onWorkStatusChange={onWorkStatusChange}
        fetchedAt={fetchedAt}
        nowIso={nowIso}
        stalenessWindow={stalenessWindow}
        onRefresh={() => void load(scope, { silent: true })}
      />
      {/* R0 — the ONE statement of every narrowing in force (ADR-007; DG-47-1), ABOVE the state
          ternary. That position IS the fix: the line it replaces lived inside the populated
          branch, so it vanished in the three states where the operator most needs it. Absent
          and zero-height when nothing is narrowed. */}
      <FilterBanner {...banner} onClearRepo={() => onRepoChange(null)} onClearWorkStatus={() => onWorkStatusChange(DEFAULT_WORK_STATUS_FILTER)} />

      {state === "loading" ? (
        <LoadingState />
      ) : state === "error" ? (
        <ErrorState message={error ?? "Failed to load"} path={errorPath} scope={scope} onRetry={() => void load(scope)} />
      ) : state === "empty" ? (
        // empty fleet — a centered dashed placeholder, NOT an error (task 03
        // scenario 1: "does not call the mesh broken or failed").
        //
        // m47/03 — the copy is now a pure function of the NARROWINGS IN FORCE, and every input
        // is read off the payload rather than guessed from the URL. Five distinguishable
        // conditions, five true sentences (DESIGN §Surface 2's E1–E7), and the recovery control
        // is promoted only where the filter is actually part of the cause.
        // Both scopes read the FACT `filterBannerView` derived (`banner.scope`), never the
        // nullness of the banner's own copy — see that function's own note (F-47-03-ARCH-2).
        <EmptyFleet
          scope={banner.scope}
          narrowings={{ scope: banner.scope, workspaceId: served, repo, resolved }}
          onClearRepo={() => onRepoChange(null)}
        />
      ) : (
        // populated — the ONE body (m47/ADR-006(b)). Every region is fed from the NARROWED
        // payload, normalised at this one point, so no region can be handed a missing
        // collection and none can be handed a foreign row.
        <GlobalScopeView
          status={asGlobalStatus(narrowed)}
          totals={totals}
          repo={repo}
          onRepoChange={onRepoChange}
          hiddenMilestones={hiddenMilestones}
          workStatus={workStatus}
          onShowAllWork={() => onWorkStatusChange("all")}
          freshnessOf={freshnessOf}
          onAssigned={onAssigned}
        />
      )}
    </div>
  );
}

// The ONE address write this surface makes, shared by its two narrowing controls (m47/03).
// Each of them composes only its OWN key, on a copy of the incoming search (ADR-003's
// copy-and-set, which is what lets the two compose without either knowing the other exists);
// what they share is the WRITE, and sharing it is what stops the two drifting apart on the
// three facts that are one decision — the path is preserved, the entry is PUSHED (a narrowing
// change is a navigation the operator performed, and Back should undo it), and a host with no
// `history` degrades to a state change rather than a thrown render.
function pushAddress(nextSearch: string): void {
  try {
    history.pushState(null, "", `${location.pathname}${nextSearch}`);
  } catch {
    /* history may be unavailable in a non-browser test host — the state still updates */
  }
}

// The location.search read, guarded for a non-browser test host (scope.mjs's
// scopeFromSearch is itself pure/headless; this wrapper is the ONLY DOM touch).
function safeSearch(): string {
  try {
    return location.search;
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────── top bar ──────────

// milestone 45 / story 03 — THE BAR IS ABSORBED INTO THE SHELL. What used to be this
// surface's own `<header>` (the mark, `aof`, `Mesh`, the group chip, a divider, then the
// controls) is now the SHELL's top bar: DESIGN §Accessibility 6 allows exactly one `banner`
// and one `<main>` in the document, and DG-45-1 allows exactly one brand mark. What survives
// here is what is FLEET's — the scope control, the freshness legend and the ⟳ refresh — and it
// is CONTRIBUTED to the shell's right-anchored surface slot rather than authored by the shell
// (DESIGN §The scope-control ruling: the shell owns the bar, never scope semantics; `?scope=`
// is a fleet contract end to end and would be inert on three of four routes).
//
// The function keeps its name, and `<TopBar>` keeps its unconditional position above the
// loading/error/empty/populated ternary, because that is what makes the scope control present
// in EVERY page state — the invariant `acd-mesh-ui-scope-visible` has pinned since m34/ADR-006.
// It is no longer a `<header>`; it is a contribution, and when no shell is present (the
// headless harness mounts <Fleet/> directly) it renders exactly where it always did.
function TopBar({
  scope,
  onScopeChange,
  repo,
  repoView,
  repoOptions,
  onRepoChange,
  workStatus,
  onWorkStatusChange,
  fetchedAt,
  nowIso,
  stalenessWindow,
  onRefresh,
  viewportWidth,
}: {
  scope: Scope;
  onScopeChange: (next: Scope) => void;
  // milestone 47 / story 03 (ADR-007) — the SECOND narrowing's control, contributed into the
  // SAME slot beside the first. One slot, two narrowings, one row, which is also what makes
  // ADR-005's composed state readable at a glance. Every one of these five values is
  // referentially STABLE across renders (`repo`/`repoLabel`/`repoForm` are primitives, the
  // options are the payload's own array or the module's one empty constant, and the handler is
  // a `[]`-dep `useCallback`) — the slot re-publishes when its `deps` differ, and an options
  // array rebuilt inline every render would re-publish on every render.
  repo: string | null;
  repoView: { form: RepoFilterForm; label: string; title: string };
  repoOptions: GlobalWorkspace[];
  onRepoChange: (next: string | null) => void;
  // The third narrowing's control — a primitive and a `[]`-dep callback, stable like the rest.
  workStatus: WorkStatusFilter;
  onWorkStatusChange: (next: string) => void;
  fetchedAt: number | null;
  nowIso: string;
  // The configured cache-staleness window off the status payload, for the
  // legend's Freshness block. Null when the wire does not carry it, in which
  // case the block states the window in words rather than guessing a number.
  stalenessWindow: number | null;
  onRefresh: () => void;
  // The DG-47-4 override — a number skips the resize listener entirely, which is how a headless
  // lane drives the drop without a layout engine (the shell's own `viewportWidth` shape).
  viewportWidth?: number;
}) {
  const freshness =
    fetchedAt === null
      ? "⟳ refreshed just now"
      : refreshedLabel(new Date(fetchedAt).toISOString(), nowIso);
  // DG-47-4's two drops, decided ONCE from the viewport and handed to both aids, so the pair can
  // never key to two different widths. `slotAidForm` reads an unmeasured host as the wide form.
  const aidForm = slotAidForm(useViewportWidth(viewportWidth));
  return (
    // The fleet's contribution to the shell's surface slot, in the fleet's own order. `deps`
    // are every value these nodes CAPTURE: omit one and the bar goes stale while the body
    // updates — the one failure mode this mechanism has.
    <SurfaceSlot
      deps={[scope, onScopeChange, repo, repoView, repoOptions, onRepoChange, workStatus, onWorkStatusChange, stalenessWindow, freshness, onRefresh, aidForm]}
      className="flex items-center gap-3 text-xs text-muted-foreground"
    >
      {/* milestone 34 / story 03 (ADR-006; DESIGN "scope control") — the ALWAYS
          visible Global/Local switch. Present in every page state (loading/error/
          empty/populated — task 02 scenario 4's "the scope control region is
          visible" even while pending) since it lives in the top-level shell, not
          the body region that swaps under it. */}
      <ScopeControl scope={scope} onScopeChange={onScopeChange} />
      {/* milestone 47 / story 03 (ADR-007) — the repo filter, IMMEDIATELY right of the scope
          control: the slot reads left to right as the two NARROWINGS first, as one group, then
          the two reader's aids. It inherits the scope control's standing invariant by the
          identical mechanism — `TopBar` renders unconditionally, above the state ternary — so
          it is mounted in loading, error, empty and populated alike. That matters most in the
          state where it would be easiest to omit: its value is known FROM THE URL before any
          data is, so it renders in full on the first paint and never as a pulse block, and a
          failed load never traps the operator inside the narrowing that may have caused it. */}
      <RepoPicker value={repo} label={repoView.label} form={repoView.form} options={repoOptions} onPick={onRepoChange} />
      {/* The THIRD narrowing's control — the three read as one group, in the order the seam applies them. */}
      <WorkStatusPicker value={workStatus} options={WORK_STATUS_OPTIONS} onPick={onWorkStatusChange} />
      {/* THE TWO AIDS, and the ONE decision that drops them (DG-47-4; F-47-V-2). Both give up
          their words at <= 390 so the slot's five controls fit the 40px band in ONE row —
          measured before the fix, they did not: the slot wrapped to two rows inside a
          fixed-height bar and overprinted the identity chip above it and the content below.
          The two NARROWINGS to the left never drop, at any width. */}
      {/* `shrink-0` (F-47-V-18): under `flex-nowrap` the row's shortfall is taken from whichever
          children CAN shrink, and the yield order is a design decision, not the browser's. The
          two aids have already given up their words by this width; the trigger's label is the one
          element with a truncating form left, so it is the sole yielder and these are pinned. */}
      <span className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
        <Legend windowSeconds={stalenessWindow} form={aidForm} />
        <RefreshControl freshness={freshness} form={aidForm} onRefresh={onRefresh} />
      </span>
    </SurfaceSlot>
  );
}

// The small uppercase region header — `NODES  <summary>` / `BOARDS  <summary>`.
function RegionHeader({ label, summary }: { label: string; summary: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">{label}</h2>
      <span className="text-xs text-muted-foreground">{summary}</span>
    </div>
  );
}

// ═══════════════════════════════════════ GLOBAL scope body (milestone 34 / 03) ═

// The GLOBAL scope's populated body (DESIGN.md's four global regions, in order):
// workspaces summary, milestone list (with workspace identity), node panel
// (control/worker, roles, last seen, capabilities, fabric addresses), and the
// health/diagnostics region. Renders EITHER the full machine-wide view (scope:
// "global") or the SAME regions narrowed to one workspace when the operator
// deep-linked `?scope=local` on a globally-started server (scope:"local" but
// still the global-shaped payload — task 01 scenario 3); the CURRENT workspace
// path is surfaced when the narrowing is active (DESIGN "--local … current
// workspace path/name is visible").
// milestone 47 / story 03 (ADR-004 rule 4; FEASIBILITY 3) — the `<N>` half of every region's
// `<n> of <N>`, computed at the seam and handed down as SCALARS. A region receives an
// already-narrowed status, so it knows `n` and cannot know `N`. `null` (the whole record, never
// a field of it) means NO NARROWING IS IN FORCE and the region renders the bare `<N> <noun>`
// head it has always rendered.
export type NarrowingTotals = {
  workspaces: number;
  milestones: number;
  nodes: number;
  skippedWorkspaces: number;
} | null;

function GlobalScopeView({
  status,
  totals,
  repo,
  onRepoChange,
  hiddenMilestones,
  workStatus,
  onShowAllWork,
  freshnessOf,
  onAssigned,
}: {
  status: GlobalMeshStatus;
  totals: NarrowingTotals;
  // The repo narrowing's value and its one writer — the workspace cards are a second door into it.
  repo: string | null;
  onRepoChange: (next: string | null) => void;
  // What the status view removed, and the one action that shows it — read at the seam, never re-derived.
  hiddenMilestones: number;
  workStatus: WorkStatusFilter;
  onShowAllWork: () => void;
  // m47/04 (ADR-008; DG-47-2) — a PRESENTATION fact, and deliberately not the
  // `filtered` boolean ADR-004 rejects. That rejection is about NARROWING: four
  // regions each deciding what "filtered" means for their rows. Nothing below
  // narrows anything with this — the payload arrived already narrowed at the one
  // seam — it answers the one card-content question DG-47-2 sanctions: whether
  // region 5's workspace-name column is repeating a string the page already states.
  // Derived below from `repo` now that the value itself is handed in — one fact, not two.
  // The fleet's ONE freshness reading for an item row — computed once at the
  // page root off its own 1s clock and the payload's window, then handed down.
  freshnessOf: (item: GlobalWorkItem | null | undefined) => Freshness | null;
  onAssigned: () => void;
}) {
  const repoFiltered = repo != null;
  return (
    <div className="min-w-0 flex-1 px-4 py-7 sm:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[1240px] flex-col gap-8">
        {/* m47/03 (ADR-007; DG-47-1) — the in-body `Filtered to workspace <id>` line that used
            to open this region is GONE. It is RE-HOMED to the banner above the state ternary,
            not duplicated: two places rendering "what am I filtered to" are two places that can
            disagree, and one of them was invisible in three of the four page states. The raw
            `<workspaceId>` it printed is deliberately not carried across — the banner says
            `scope · Local`, which says what the narrowing IS without naming the daemon's own
            id, and R0's component list is closed. */}
        <WorkspacesSummary workspaces={status.workspaces} header={<RegionHeader label="Workspaces" summary={countPhrase(status.workspaces.length, totals?.workspaces ?? null, "workspace")} />} repo={repo} onPick={onRepoChange} />
        <MilestonesList items={status.items} workspaces={status.workspaces} nodes={status.nodes} total={totals?.milestones ?? null} repoFiltered={repoFiltered} hidden={hiddenMilestones} workStatus={workStatus} onShowAllWork={onShowAllWork} freshnessOf={freshnessOf} onAssigned={onAssigned} />
        <GlobalNodePanel nodes={status.nodes} total={totals?.nodes ?? null} localNodeId={status.localNodeId ?? null} />
        <DiagnosticsRegion status={status} skippedTotal={totals?.skippedWorkspaces ?? null} />
      </div>
    </div>
  );
}

// The milestone list. The global projection still carries stories/tasks for API
// consumers and local filtering, but this overview intentionally stays at the
// milestone level and reuses the work-board card language: status ring/chip,
// progress track, and child story dots derived from the same flat item stream.
function MilestonesList({ items, workspaces, nodes, total, repoFiltered, hidden, workStatus, onShowAllWork, freshnessOf, onAssigned }: { items: GlobalWorkItem[]; workspaces: GlobalWorkspace[]; nodes: GlobalNode[]; total: number | null; repoFiltered: boolean; hidden: number; workStatus: WorkStatusFilter; onShowAllWork: () => void; freshnessOf: (item: GlobalWorkItem | null | undefined) => Freshness | null; onAssigned: () => void }) {
  const milestones = milestoneCardModels(items);
  const workspaceFor = (workspaceId: string) => workspaces.find((w) => w.workspaceId === workspaceId) ?? null;
  // The head is the accepted `<n> [of <N>] milestones` form, byte-identical while the status
  // view hides nothing; the tail is the ONE statement of what it hid, and appears only then.
  const summary = countPhrase(milestones.length, total, "milestone") + workStatusSummaryTail(workStatus, hidden);
  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <RegionHeader label="Milestones" summary={summary} />
      {/* m47/03 (DESIGN §Surface 2's emptied-region rule; F-47-03-QA-10) — AN EMPTIED REGION
          KEEPS ITS HEADER AND READS `0 of <N>`, AND DRAWS NO PER-REGION EMPTY CARD. Under a
          narrowing the header IS the statement: it says which narrowing emptied this region and
          out of how much, and a second card underneath saying "nothing here" would state the
          same fact in a second place while explaining less. R0-N explains the composition once,
          at the top, and one fact has one home.
          Unfiltered, the shipped placeholder stays exactly as it always was: there is no
          narrowing to name, so there is no `0 of <N>` doing the explaining. */}
      {milestones.length === 0 && hidden > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
          <span>{`Nothing ${workStatus === DEFAULT_WORK_STATUS_FILTER ? "open" : workStatusFilterLabel(workStatus).toLowerCase()} — ${hidden} ${plural(hidden, "milestone")} hidden by status.`}</span>
          <button type="button" onClick={onShowAllWork} className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-card">Show all</button>
        </div>
      ) : milestones.length === 0 && total == null ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
          No milestones published yet.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {milestones.map((milestone) => (
            <GlobalMilestoneCard
              key={`${milestone.item.workspaceId}:${milestone.item.ref}`}
              milestone={milestone}
              workspace={workspaceFor(milestone.item.workspaceId)}
              nodes={nodes}
              repoFiltered={repoFiltered}
              freshness={freshnessOf(milestone.item)}
              onAssigned={onAssigned}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GlobalMilestoneCard({ milestone, workspace, nodes, repoFiltered, freshness, onAssigned }: { milestone: FleetMilestoneCard; workspace: GlobalWorkspace | null; nodes: GlobalNode[]; repoFiltered: boolean; freshness: Freshness | null; onAssigned: () => void }) {
  const m = milestone;
  const isDone = m.item.status === "done";
  const progressLabel = m.total === 0 ? "not started" : "stories done";
  const title = m.item.title ?? m.item.slug ?? m.item.ref;
  const workspaceName = workspace?.name ?? workspace?.workspaceId ?? m.item.workspaceId;
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  // milestone 47 / story 01 (ADR-006(a)) — THE ONE RESOLVER, and it is a CONTROL
  // rather than an anchor for a product reason, not a stylistic one: resolving a
  // board LAUNCHES one. `boardUrlForWorkspace` starts a real per-workspace server
  // on first ask and memoises it, so an `href` — which a browser advertises on
  // hover, in the status bar and to "copy link address" — could not be resolved
  // lazily even in principle. The address does not exist until the operator asks
  // for it. The trade is real and worth naming: the destination is not previewable,
  // and in exchange it is correct on every machine and for every workspace.
  //
  // `setOpening(false)` is in a FINALLY, including the success path. `location
  // .assign` does not unload the document synchronously — and a navigation can be
  // refused, cancelled or blocked outright — so returning to the resting label is
  // what stops a card being left reading "Opening board..." with nothing coming.
  const onOpen = useCallback(async () => {
    setOpening(true);
    setOpenError(false);
    try {
      const url = await fleetApi.boardUrl(m.item.workspaceId, m.item.ref);
      window.location.assign(url);
    } catch {
      setOpenError(true);
    } finally {
      setOpening(false);
    }
  }, [m.item.workspaceId, m.item.ref]);

  // DG-19: `·` is a PLACEHOLDER — it stands in for an absent token so the row
  // is not empty. Once the chip occupies the cluster the row is not empty, and
  // §2a's own rule already says the chip REPLACES the placeholder. The build
  // rendered both, leaving a lone `·` floating between the chip and the drill-in
  // and spending width the yield order then had to claw back.
  const secondaryIsPlaceholder = !(m.inReview > 0) && !isDone;

  // milestone 35 / story 03 (DESIGN §2a) — the assignment chip is the PRIMARY
  // attention-row occupant, sitting BEFORE the in-review/accepted token when
  // both apply (assignment first — it is the more actionable state) and
  // replacing the muted `·` placeholder when the item carries one. It never
  // displaces the right-aligned "Open board →" drill-in.
  const assignment = m.item.assignment;
  // m47/04 (ADR-014, BLOCKER F-47-04-QA-8) — REGION 5'S WHOLE LADDER, TAKEN ONCE.
  // A local `abbreviateDrillIn` stood here and a local `slotFits` in
  // ./AssignmentChip: two independent booleans, each seeing one element of a
  // cluster that has THREE whenever a chip and a secondary token share the row,
  // and so incapable of expressing one ladder (rung 2's outcome sets rung 4's
  // budget). `Open board` rendered 0.34px of the 65.06 it needs at every measured
  // width. The derivation lives beside the budgets it reads and arrives whole.
  const row = region5RowLadder({ assignment, secondary: !secondaryIsPlaceholder });
  // …and its last rung, RENDERED here: the secondary token gives up its words,
  // keeping its glyph and its COUNT, with the words in a `title` it carries in
  // that form ALONE (a tooltip repeating a readable label is DG-47-5's own named
  // defect). `shrink-0 whitespace-pre` is part of the rung rather than a tidy-up:
  // carrying neither, this token WRAPPED — h=32 against 14.66–22 for every
  // sibling — making region 5 a 45px two-line row at every width, which is the
  // one dimension A10 forbids an element to absorb a squeeze in.
  const secondaryMark = m.inReview > 0 ? `◔ ${m.inReview}` : "✓";
  const secondaryWords = `${secondaryMark} ${m.inReview > 0 ? "in review" : "accepted"}`;
  const secondaryAttention = secondaryIsPlaceholder ? (
    <span className="shrink-0 whitespace-pre text-muted-foreground">·</span>
  ) : (
    <span
      className={`shrink-0 whitespace-pre ${m.inReview > 0 ? "text-accent" : "text-primary"}`}
      title={row.secondaryAbbreviated ? secondaryWords : undefined}
    >
      {row.secondaryAbbreviated ? secondaryMark : secondaryWords}
    </span>
  );
  // DG-20's fit gate + DG-22's alignment consequence, decided once so the two
  // cannot disagree: when the name goes, the cluster becomes the row's leading
  // group and must be left-aligned, with only the drill-in pushed right.
  //
  // m47/04 (ADR-008; DG-47-2) — rung 0 of the same ladder, and the reason a
  // repo-filtered view drops the column UNCONDITIONALLY is stated where the
  // predicate is. Still ONE boolean feeding both the render and the alignment.
  const nameDropped = region5NameDropped({ assignment, workspaceName, repoFiltered });
  const attention = assignment ? (
    <>
      <AssignmentChip assignment={assignment} row={row} />
      {secondaryIsPlaceholder ? null : secondaryAttention}
    </>
  ) : (
    secondaryAttention
  );

  return (
    // milestone 38 / story 04 (ADR-012) — a plain <div>, not a <button>: the
    // "assign to node" affordance below is its own interactive control, and an
    // HTML <button> may never nest another interactive element. The "Open
    // board" drill-in moves to an inner button covering the SAME clickable
    // region as before; the assign row sits BELOW it as a sibling, so neither
    // control's click bubbles into the other.
    <div className="group flex min-w-0 flex-col rounded-[10px] border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        // DG-47-5 clause 5 — ONE accessible name, on the element an operator
        // activates, in two channels that cannot drift. See ./BoardDrillIn.
        title={boardControlName(workspaceName, openError)}
        aria-label={boardControlName(workspaceName, openError)}
        className="flex min-w-0 flex-col text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <StatusRing status={asWorkStatus(m.item.status)} size={18} />
          <span className="mono shrink-0 text-sm text-muted-foreground">{m.item.ref}</span>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">milestone</span>
          {/* milestone 43 / story 04 (DESIGN §Surface 2) — row 1's `ml-auto
              shrink-0` span becomes a CLUSTER of `badge + chip`, so the status
              chip keeps its exact right-edge anchor and nothing moves when a card
              crosses the threshold. Attribution here is ON DEMAND (the badge's
              `title`) rather than a new line: region 5's geometry is
              fitness-locked, the workspace strip above already carries workspace
              identity in full, and the node panel already answers "is that machine
              alive". There is NO Resync on this surface — one door per item, on
              the board, which is also the surface that shows WHAT is stale. The
              badge is a non-interactive <span>, so the drill-in <button> it sits
              inside stays a single focus stop (m38/ADR-012).

              THE FORM IS `short` AT EVERY WIDTH, pinned from the render (DESIGN
              §"The form is chosen by the SURFACE, not by the viewport",
              2026-08-03). This card's width is viewport-INVARIANT by
              construction: the grid above is `repeat(auto-fill, minmax(320px,
              1fr))`, so a wider viewport buys COLUMNS rather than width and the
              card sits in a ~300–370px band at every breakpoint — narrower at
              2560 than at 1280. A viewport-keyed ladder would therefore paint the
              WIDEST form in the NARROWER card, which reads as a bug. */}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <StaleBadge freshness={freshness} form="short" />
            <StatusChip status={asWorkStatus(m.item.status)} />
          </span>
        </div>

        <h3 className="mt-2 truncate text-[16px] font-bold leading-snug" title={title}>{title}</h3>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span>
            <span className="mono">
              {m.done} / {m.total}
            </span>
          </div>
          <MilestoneProgressTrack milestone={m} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {m.stories.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <>
              {m.stories.map((story) => (
                <StatusDot key={`${story.workspaceId}:${story.ref}`} status={asWorkStatus(story.status)} size={8} title={`${story.ref} · ${story.status ?? "unknown"}`} />
              ))}
              <span className="ml-1 text-[11px] text-muted-foreground">
                {m.stories.length} stor{m.stories.length === 1 ? "y" : "ies"}
              </span>
            </>
          )}
        </div>

        {/* Region 5 — the footer / attention cluster. DG-13 clause 5 (DESIGN
            §Surface 2 Amendment 2026-07-24 (b); DG-11 re-scoped here) pins the
            WIDTH PRIORITY: chip label + `→ <target>` in FULL > `Open board →` >
            the workspace name. The judged render truncated the target in EVERY
            frame that had one (`→ umamis-m…`, `→ aaa-firs…`) — "a target that
            cannot be read is a chip that has not spoken" — because the name held
            a content-sized basis and the cluster absorbed the shrink instead.
            The name took a ZERO basis (`flex-1`) so it would be fed only what is
            LEFT — but `flex-1` + `truncate` does not DROP, it STUBS, and the
            re-render caught it rendering `l…` / `le…` / `let…` for
            `lark-guard-portal` in every chip-bearing frame (DG-16, which also
            falsified DG-11's "does not reproduce" note). Meanwhile the cluster's
            own `shrink-0` children overflowed their `min-w-0` wrapper and PAINTED
            OVER `Open board →` (DG-15) — a priority list built as a PAINT order
            where the rule demands a YIELD order.

            The row is now an explicit yield order, and DG-13 clause 5 gains its
            SIXTH clause: NO TWO ELEMENTS IN REGION 5 MAY OCCUPY THE SAME PIXELS.
            A lower-priority element gives up space; it never stays put and gets
            overprinted.

            THE ORDER ITSELF — its rungs (name · [the chip's tail, RETIRED from the
            row by DG-47-7] · the drill-in's words · the secondary's words · the
            target, LAST) and the measured arithmetic each is derived from — lives
            where the DECISION does, `./assign-affordance.mjs`'s ladder, and
            is deliberately NOT restated here: a second copy of a ladder is exactly
            what let this row ship two booleans that disagreed with each other. What
            stays below is what is true of THIS FILE'S MARKUP — why each element
            carries the classes it does, and DG-22's alignment consequence.

              Each step is a DISCRETE budgeted drop, never a shrink factor — the
              1000:1-ratio measurement that settled that is in the ladder's home,
              beside the rung it settled. The shrink factors below remain
              underneath as a BACKSTOP; they are no longer the rule.

              DG-22: and the leading group stays LEFT. When the name is dropped
              the row's free space would otherwise sit in front of the chip under
              `justify-end`, so the footer's leading edge — the column the eye
              scans for "what state is this card in" — drifted card to card for a
              reason the reader cannot see. Only the drill-in is right-aligned. */}
        <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          {/* The gate is FIT, not chip-presence (DG-20) — why, in full, is beside
              the predicate in `./assign-affordance.mjs`. A name that still fits
              beside the chip keeps rendering (`aof` does); one that cannot is
              dropped WHOLE, with its separator — never stubbed to `l…`.

              It is `shrink-0`, NOT `flex-1`: `flex-1` carries `flex-grow:1`, so
              a KEPT name expanded into the row's free space and squeezed the
              cluster until the chip's target truncated — the name outranking the
              target, which is c5 backwards. It no longer needs to grow or shrink,
              because the fit budget above already guarantees it is short. */}
          {nameDropped ? null : (
            <span className="mono shrink-0 text-muted-foreground" title={workspaceName}>{workspaceName}</span>
          )}
          <span className={`flex min-w-0 flex-1 items-center gap-3 ${nameDropped ? "justify-between" : "justify-end"}`}>
            {attention}
            {/* Rung 2 of the ladder, and DG-47-5's whole subject — the element's
                explicit arrow-sized floor, its pinned `→`, and the three
                treatments its three states take. It moved to ./BoardDrillIn with
                its own rationale intact (m47/04); the DECISION comes from the one
                home above, so it is taken once and never re-derived per state. */}
            <BoardDrillIn opening={opening} openError={openError} abbreviated={!row.drillInWords} />
          </span>
        </div>
      </button>

      {/* milestone 38 / story 04 — ADR-012 AMENDMENT (BLOCKER F21): the
          affordance is handed the ITEM's OWN workspaceId, the SAME value the
          drill-in button above already passes to fleetApi.boardUrl. This face is
          GLOBAL — every card on it may belong to a different workspace — so an
          assign that did not carry it resolved the ref against the DAEMON's own
          workspace and, on a ref collision, dispatched a completely different
          milestone off a `200 ok`. */}
      <AssignAffordance ref={m.item.ref} workspaceId={m.item.workspaceId} nodes={nodes} onAssigned={onAssigned} />

      {/* The READ-ONLY terminal for THIS card's assignment (m38/06/04, BLOCKER F-38.06c; m46/04).
          A SIBLING of the drill-in button, never nested inside it — a terminal is interactive
          chrome and an HTML <button> may not contain another interactive element. The mount
          renders NOTHING when the assignment carries no resolvable (nodeId, sessionId) tuple
          (ADR-014 invariant 4), and both origin keys come from ./terminal-mount.mjs. */}
      {assignment ? (
        <TerminalControl
          host={HOST_FLEET_CARD}
          mount={fleetTerminalMount(assignment, { itemRef: m.item.ref })}
          origins={fleetPageOrigins(typeof window === "undefined" ? null : window.location)}
        />
      ) : null}
    </div>
  );
}

// The "assign to node" affordance (milestone 38 / story 04; ARCHITECTURE
// ADR-012 + its 2026-07-24 AMENDMENT; DESIGN §Surface 2 A1–A11) — a worker-node
// picker, PRODUCER-FED from the SAME real roster the node panel renders
// (`assignableNodeOptions`, ./scope.mjs), and the "Assign" action, which POSTs
// the ONE fleet-face mutation route (`fleetApi.assign`). Empty roster ⇒ the
// picker is disabled (there is nothing to assign to yet) — never an invented
// placeholder target. A gate refusal (unknown/ineligible node, already-active
// item, …) surfaces as an inline `destructive` error, coded by the verb
// (ADR-012 inv.3) — this affordance re-implements no arbitration of its own.
//
// F21 (BLOCKER, live soak 2026-07-24): the POST carries the ITEM's OWN
// `workspaceId` — this face is GLOBAL, so without it the route resolved every
// ref against the daemon's own workspace and mis-dispatched.
//
// F22 (live soak 2026-07-24; DESIGN §Surface 2 Amendment): a `200 ok` used to
// produce NO transition, NO indicator and NO chip — the operator only knew it
// had worked by reading the raw API response. Both halves of the designer's
// answer are built here, and BOTH live in ./assign-affordance.mjs so they are
// exercisable without a React harness:
//   (a) on success the surface fires EXACTLY ONE additional SILENT re-load
//       (`onAssigned`, wired in <Fleet> to `load(scope, { silent:true })`), so
//       region 5's m35 `assigned` chip lands within a round trip;
//   (b) the SAME button reads `Sent` — `muted`, disabled, the `primary` tint
//       DROPPED, the picker frozen on the chosen node — held for exactly one
//       poll interval, then decaying to the terminal resting state with nothing
//       left over. It reports the CALL; region 5 reports the ASSIGNMENT.
// This component holds NO transition logic of its own: every rendered fact
// comes from `assignAffordanceView` and the click is `runAssign`.
function AssignAffordance({ ref, workspaceId, nodes, onAssigned }: { ref: string; workspaceId: string; nodes: GlobalNode[]; onAssigned: () => void }) {
  const options = assignableNodeOptions(nodes);
  const [selected, setSelected] = useState(options[0] ?? "");
  const [ack, setAck] = useState<AssignAffordanceState>(assignAtRest);
  // VERIFICATION (UI phase selection, 2026-07-25) — the lifecycle command the worker
  // runs (refine → continue → verify), a NET-NEW control that lives OUTSIDE the assign
  // row's fitness-locked `picker · action · message` geometry (DG-13): the node picker's
  // parent row must stay exactly `select · button`, so the phase select is its own row
  // above the divider. Defaults to `refine` (the pre-existing dispatch default), so an
  // operator who ignores it gets byte-identical behaviour; `continue`/`verify` are the
  // opt-in phases for an already-refined item.
  const [lifecyclePhase, setLifecyclePhase] = useState<"refine" | "continue" | "verify">("refine");
  // REVIEW FIX QA-a (2026-07-24) — F21's defect class, relocated to the NODE
  // axis: the row must never NAME one target and POST another. This face is a
  // long-lived monitor that re-polls every POLL_MS, so the roster under the
  // picker CHANGES while the row is mounted (a node's registry descriptor stops
  // resolving and `queryGlobalRegistry` drops it from the roster, while
  // `assignWork`'s node-known gate reads `global_nodes` DIRECTLY — so a node can
  // leave the picker and stay assign-eligible). Remembered state alone went
  // stale: the <select>'s DOM value coerces to the first surviving option while
  // React state kept the departed id, so the operator read one name and the POST
  // carried another — and `Sent` then sat beside the WRONG name.
  //
  // So the target is DERIVED, not remembered: `selected` is the operator's
  // preference and `target` is the only value this component renders OR sends.
  // One value cannot disagree with itself.
  const target = options.includes(selected) ? selected : (options[0] ?? "");
  const view = assignAffordanceView({ phase: ack.phase, error: ack.error, detail: ack.detail, hasOptions: options.length > 0, selected: target });

  // A7 — the acknowledgment is held for `view.holdMs` (exactly one poll
  // interval) and then DECAYS to rest: picker enabled, the same node still
  // selected, `Assign →` back in its `primary` tint, message slot empty.
  // Nothing persists. A view with `holdMs === null` schedules nothing, which is
  // what makes "no hold on a refusal" structural rather than remembered.
  const holdMs = view.holdMs;
  useEffect(() => {
    if (holdMs == null) return;
    const timer = setTimeout(() => setAck(assignAckExpired), holdMs);
    return () => clearTimeout(timer);
  }, [holdMs, ack.phase]);

  const onAssign = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!target) return;
      await runAssign(
        // REVIEW FIX F-F — bound to its own object rather than handed over
        // unbound: `fleetApi.assign` is safe standalone today only because its
        // body happens to touch no `this`, which is a property of the current
        // implementation, not of the seam.
        { assign: fleetApi.assign.bind(fleetApi), onAssigned, onState: setAck },
        // QA-a — the SAME derived value the row renders. The name the operator
        // reads and the id the route receives are one datum. `phase` is the
        // operator-chosen lifecycle command (VERIFICATION 2026-07-25).
        { ref, nodeId: target, workspaceId, phase: lifecyclePhase }
      );
    },
    [ref, workspaceId, target, onAssigned, lifecyclePhase]
  );

  return (
    <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
      {/* VERIFICATION (UI phase selection, 2026-07-25) — the "what to run" control,
          its OWN row ABOVE the assign divider so the fitness-locked assign row below
          stays exactly `select · button (· message)` (DG-13; the geometry test asserts
          rowChildTypes). Its aria-label deliberately does NOT start with "Assign " so
          the fleet harness never mistakes it for a node picker. Disabled while a
          dispatch is in flight, mirroring the node picker. */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Run</span>
        <select
          aria-label={`Lifecycle phase to run on ${ref}`}
          value={lifecyclePhase}
          disabled={view.pickerDisabled}
          onChange={(event) => setLifecyclePhase(event.target.value as "refine" | "continue" | "verify")}
          className="mono rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-50"
        >
          <option value="refine">Refine — break down / author contracts</option>
          <option value="continue">Continue — build tasks to green + review</option>
          <option value="verify">Verify — checks + accept</option>
        </select>
      </div>
      {/* The assign row — GEOMETRY-LOCKED (DG-13). Its class list and its exact
          `select · button (· message)` membership are asserted by
          test/fleet-assign-row-geometry.test.mjs; do not add elements here. */}
      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border pt-3 text-xs">
      {/* DG-13 clause 2 (DESIGN §Surface 2 Amendment 2026-07-24 (b)) — the
          picker has a FLOOR and never yields to the message. The real-assign
          render caught `min-w-0` letting it collapse to a BARE CHEVRON (~26px,
          down from ~284px) in the refused frame, so the operator could not see
          which node was selected at the exact moment they had to re-aim. The
          floor is the helper's (≥14ch of the node id PLUS the select's own
          chrome) and is phase-independent: no state can shrink it. */}
      <select
        aria-label={`Assign ${ref} to a worker node`}
        value={target}
        disabled={view.pickerDisabled}
        onChange={(event) => setSelected(event.target.value)}
        style={{ minWidth: view.pickerMinWidth }}
        className="mono flex-1 truncate rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-50"
      >
        {view.pickerPlaceholder ? (
          <option value="">{view.pickerPlaceholder}</option>
        ) : (
          options.map((nodeId) => (
            <option key={nodeId} value={nodeId}>
              {nodeId}
            </option>
          ))
        )}
      </select>
      {/* A9/A10 — the `muted` acknowledgment DROPS the low-emphasis `primary`
          tint rather than adding anything to it (the quietest state the row ever
          renders): same box, same padding, same type, same height — only the
          label and the tint change. No mark, no glyph, no toast, no motion.

          DG-13 clause 1 — and the same WIDTH. The render caught the action
          narrowing 67px -> 44px on the `Sent` label swap, with the picker
          absorbing the difference, so the row reflowed on every state change.
          The inner span reserves the helper's constant width (sized to the
          longest label the action ever reads, `Assigning…`) in EVERY state
          including disabled, so a label swap can no longer move anything. It is
          a sizing shell, not a second element in the row: the row's children
          are still picker · action · message. */}
      <button
        type="button"
        disabled={view.actionDisabled}
        onClick={onAssign}
        className={
          view.actionTone === "muted"
            ? "shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition disabled:cursor-not-allowed"
            : "shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <span className="block whitespace-nowrap text-center" style={{ width: view.actionWidth }}>{view.actionLabel}</span>
      </button>
      {/* DG-13 clause 3 — the message slot is the element that YIELDS: it takes
          what is left, truncates, and carries the full server text in its native
          `title` (the idiom DG-10 already uses for the session id). What it
          RENDERS is the shaped, outcome-first copy (clause 4) — `already
          assigned → <holder>`, not the sentence that spends its width on the ref
          region 1 already shows. */}
      {view.message ? <span className="mono min-w-0 shrink truncate text-[10.5px] text-destructive" title={view.messageTitle ?? view.message}>{view.message}</span> : null}
      </div>
    </div>
  );
}
function MilestoneProgressTrack({ milestone }: { milestone: FleetMilestoneCard }) {
  const m = milestone;
  if (m.total === 0) {
    return <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted" />;
  }
  const donePct = (m.done / m.total) * 100;
  const remainderPct = 100 - donePct;
  const active = m.item.status === "in-progress" || m.inProgress + m.inReview + m.blocked > 0;
  return (
    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {donePct > 0 ? (
        <div className="h-full" style={{ width: `${donePct}%`, background: "var(--color-primary)" }} />
      ) : null}
      {remainderPct > 0 && active ? (
        <div className="aof-pending h-full" style={{ width: `${remainderPct}%` }} />
      ) : null}
    </div>
  );
}

function asWorkStatus(status: string | null | undefined): WorkStatus | null {
  return status as WorkStatus | null;
}
// The global node panel (DESIGN "shows control and worker nodes, last seen,
// roles/capabilities, and fabric address when known"). Uses nodePanelFacts
// (./scope.mjs) so the SAME projection + credential guard the fitness unit tests
// governs the rendered fields — no descriptor field is printed raw.
function GlobalNodePanel({ nodes, total, localNodeId }: { nodes: GlobalNode[]; total: number | null; localNodeId: string | null }) {
  const [stops, setStops] = useState<StopRungMemory>(() => new Map()); // 130/03 — the rung memory, per drive
  // `carrying this repo` IS LOAD-BEARING COPY, not decoration (DESIGN §Surface 2): membership
  // is a DIFFERENT relation from ownership — ADR-004 rule 2 keeps a node iff it is a member of
  // the filtered repo — and a node count that simply shrank would read as machines having gone
  // away. This region also carries no liveness tail; that belonged to the local-shape panel
  // ADR-006 deleted.
  const summary = `${countPhrase(nodes.length, total, "node")}${total == null ? "" : " carrying this repo"}`;
  return (
    <section className="flex flex-col gap-3.5">
      <RegionHeader label="Nodes" summary={summary} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
        {nodes.map((node) => {
          const facts = nodePanelFacts(node);
          // finding F9 (aof:verify 38) — THIS is the card production renders (both scopes come from
          // queryGlobalMeshStatus; the local-shape NodeCard never mounted, m47/ADR-006(b) deleted it). F6 put
          // `presence` on the wire; nodeWorkRegion (./scope.mjs) is the pinned fleetCurrentWorkLines projection
          // composed with the loop lines (130/ADR-005 §5), so node:test drives the EXACT function rendered.
          const currentWork = nodeWorkRegion(node, localNodeId, stops);
          return (
            <div key={facts.nodeId ?? node.nodeId} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${facts.freshness === "live" ? "bg-primary" : "border border-muted-foreground/50"}`} aria-hidden="true" />
                <span className="mono truncate text-[13px] font-bold text-foreground" title={facts.nodeId ?? undefined}>{facts.name}</span>
                {facts.role ? (
                  <span className="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {facts.role}
                  </span>
                ) : null}
              </div>
              <span className="mono truncate text-[11px] text-muted-foreground">{facts.name !== facts.nodeId ? `${facts.nodeId} · ${facts.host ?? "—"}` : (facts.host ?? "—")}</span>
              <span className="text-[11px] text-muted-foreground">
                {facts.lastSeenAt ? `last seen ${relativeTime(facts.lastSeenAt)}` : "never seen"}
              </span>
              {/* row 3 — the current-work region (DESIGN §Surface 1: plain text lines in the text-[13px] slot,
                  no new chip/dot/badge; idle=muted, working=primary — resolved upstream, never re-derived here),
                  between presence-age and the footer. R-2 (m49/05): the WHOLE value travels in `title` — the tail
                  truncates first, and a truncated `×N` re-creates the under-count milestone 48 removed. 130/ADR-005
                  §5: the loop lines follow, one flex-row <p> per live loop by scope, ONE Stop on this node's card. */}
              {currentWork.lines.map((line, index) => <p key={`${facts.nodeId ?? node.nodeId}-current-work-${index}`} className={`text-[13px] ${currentWork.token === "primary" ? "font-semibold text-primary" : "text-muted-foreground"}`} title={line}>{line}</p>)}
              {currentWork.loops.map((loop) => <LoopStopRow key={loop.key} loop={loop} node={node} localNodeId={localNodeId} remembered={stops.get(loop.loopRunId)} onRung={(rung) => setStops((memory) => rememberStopRung(memory, loop.loopRunId, rung, loop.runId))} />)}
              <AssignmentSummaryLine assignments={node.assignments} />
              {/* DESIGN GAP D2 (review fix) — the fabric-address row is now ALWAYS
                  rendered, even when unknown: an absent address used to omit this
                  row entirely, so "no address known" read identically to "this
                  slot doesn't exist," making "unknown" indistinguishable from
                  "dropped." Degrading to an explicit "unknown" keeps the affordance
                  present and legible either way. */}
              <span className="mono truncate text-[10.5px] text-muted-foreground">
                fabric addr: {facts.fabricAddress ?? "unknown"}
              </span>
              <span className="mono truncate border-t border-border pt-2 text-[10.5px] text-muted-foreground">
                {facts.capabilities.length ? facts.capabilities.join(", ") : "no capabilities"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// milestone 130 / story 03 (ADR-005 §5; DESIGN §Surface 1) — one loop line: the text span (whole value in `title`),
// ONE button on this node's card only (`Stop` muted → `Stop now` destructive → absent; the rung is
// `loopStopAffordance`'s, the in-flight / post-2xx hold and the refusal slot the assign affordance's own machine —
// `runAssign` over `fleetApi.loopStop` with the loop's words) and the message span. A 2xx climbs the panel's rung
// memory to the word the verb answered; the wire catches the line up on its own poll.
function LoopStopRow({ loop, node, localNodeId, remembered, onRung }: { loop: FleetLoopLine; node: GlobalNode; localNodeId: string | null; remembered?: RememberedStopRung; onRung: (rung: number) => void }) {
  const [ack, setAck] = useState<AssignAffordanceState>(assignAtRest);
  const { button } = loopStopAffordance({ loop, node, localNodeId, remembered });
  const view = assignAffordanceView({ phase: ack.phase, error: ack.error, detail: ack.detail, hasOptions: true, selected: loop.loopRunId });
  useEffect(() => { if (view.holdMs == null) return; const timer = setTimeout(() => setAck(assignAckExpired), view.holdMs); return () => clearTimeout(timer); }, [view.holdMs, ack.phase]);
  const onStop = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await runAssign({ assign: () => fleetApi.loopStop(loop.scope, loop.workspaceId ?? ""), onState: setAck, refusalCopy: LOOP_STOP_REFUSAL_COPY, timedOut: LOOP_STOP_TIMED_OUT }, {});
    if (result.ok) onRung(result.record.request === "cancel" ? 3 : 2);
  }, [loop.scope, loop.workspaceId, onRung]);
  return (
    <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
      <span className="min-w-0 truncate" title={loop.title}>{loop.line}</span>
      {button ? <button type="button" disabled={view.actionDisabled} aria-busy={ack.phase === "sending" ? "true" : undefined} aria-label={button.title} title={button.title} onClick={onStop} className={button.tone === "muted" ? "shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50" : "shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive transition disabled:cursor-not-allowed disabled:opacity-50"}>{button.label}</button> : null}
      {button && view.message ? <span className="mono min-w-0 shrink truncate text-[10.5px] text-destructive" title={view.messageTitle ?? view.message}>{view.message}</span> : null}
    </p>
  );
}

// The health/diagnostics region (DESIGN "shows projection freshness, disabled/
// non-propagating workspaces, and store errors"; task 03 scenario 4 — never hides
// healthy workspaces/nodes, just adds a summary alongside them).
// milestone 47 / story 03 (ADR-004's Diagnostics ruling; DESIGN §Surface 2's R4 table, amended
// to agree) — THE ONE COMPOUND REGION, and the ONE PARTIAL exemption on the page.
//
// It is a compound, not a whole-region exemption, and the difference is the whole point: its
// rows that carry a `workspaceId` (`skippedWorkspaces`, and `projectionErrors` beside it) are
// case-1 collections and NARROW; `projectedAt` and `descriptorErrors` — whose rows carry a
// descriptor PATH, not a workspace — are case 3(a), machine-wide and DECLARED. Both directions
// are failures: a skipped-workspace count that ignored the filter would be a number about repos
// the operator is not looking at, and narrowing the projection's own health would hide the
// cause of the operator's OWN stale data (a projection error in another workspace is still why
// your data is stale). "An exemption stated more broadly than it is true is that same defect
// wearing a label."
function DiagnosticsRegion({ status, skippedTotal }: { status: GlobalMeshStatus; skippedTotal: number | null }) {
  const summary = diagnosticsSummary(status);
  return (
    <section className="flex flex-col gap-2">
      {/* The region STATES which half of itself is which — one sentence of copy, and the
          difference between a number an operator can act on and one they will misread. It says
          it only under a filter, because with nothing narrowed there is nothing to declare. */}
      <RegionHeader label="Diagnostics" summary={skippedTotal == null ? "" : "projection health is mesh-wide · skipped workspaces narrowed"} />
      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 text-[11.5px] text-muted-foreground">
        <span>
          Projection: {summary.projectedAt ? `updated ${relativeTime(summary.projectedAt)}` : "no snapshot yet"}
        </span>
        <span aria-hidden="true">·</span>
        {/* case 1 — the rows carry a workspaceId, so the count takes the house `<n> of <N>`. */}
        <span>{countPhrase(summary.skippedWorkspaceCount, skippedTotal, "workspace", "disabled/skipped ")}</span>
        <span aria-hidden="true">·</span>
        {/* case 3(a) — machine-wide, and it stays the bare count under a filter. The `null`
            total is not an omission: it is this region declaring, in the one place the number
            is rendered, that the filter did not touch it. */}
        <span>{countPhrase(summary.descriptorErrorCount, null, "error", "descriptor ")}</span>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────── helpers ─────────

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

// `plural()` spells the plural for any count that is not 1. `PLURAL` is that request made
// legible at the one call site that always wants it, so the `-s` rule keeps exactly one home
// rather than being re-spelled beside a template literal.
const PLURAL = 2;

// milestone 47 / story 03 (DESIGN §Surface 2) — EVERY NARROWED REGION REPORTS WHAT IT DID, in
// one form: `<n> of <N> <noun>` REPLACES the bare `<N> <noun>` head and leaves each summary's
// own tail untouched. `total === null` means no narrowing is in force and the head is byte-
// identical to what it has always been — which is what makes this one helper safe to use for
// the region that is DECLARED machine-wide (Diagnostics' descriptor errors) as well as for the
// four that narrow.
//
// THE NOUN IS ALWAYS PLURAL IN THE NARROWED FORM, and that is DESIGN's own pinning rather than
// a slip: it writes `0 of 1 workspaces` for an emptied region and `1 of 1 nodes carrying this
// repo` for a roster of one. The phrase is about a SET, so neither `n` nor `N` governs the
// spelling — and the singular/plural rule the page already applies to the bare head is
// therefore not broken by the new form, it simply does not reach inside it.
function countPhrase(shown: number, total: number | null, noun: string, qualifier = ""): string {
  const head = total == null ? `${shown}` : `${shown} of ${total}`;
  return `${head} ${qualifier}${plural(total == null ? shown : PLURAL, noun)}`;
}

