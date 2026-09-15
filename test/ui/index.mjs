// THE UI SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { boardApiTests } from "./board-api.test.mjs";
import { boardServeTests } from "./board-serve.test.mjs";
import { boardActionTests } from "./board-action.test.mjs";
// milestone 25 / story 00 — the `aof work board` → `aof work ui` serve-verb rename
// (task 00: the verb surface; task 01: the board serves the frozen /api/work envelope
// unchanged under the renamed verb). ADR-001.
import { workUiVerbRenameTests } from "./work-ui-verb-rename.test.mjs";
import { workUiBoardServesUnchangedTests } from "./work-ui-board-serves-unchanged.test.mjs";
// milestone 46 / story 02 (ADR-004) — the origin seam, SERVER half: the board is handed
// the fleet's origin down the launch seam the fleet already owns (task 00), and a
// standalone board resolves its own default in the command layer (task 01).
//
// The arch gate carries ADR-004's cycle prohibition, which the ADR states in terms and
// NOTHING caught — plus the guard that prohibition turned out to need. The command layer
// is allowed to know both faces, which puts `commands/work-ui.mjs` on a real import ring
// (`mesh-ui-serve → board-serve → setup-ui → board-ui → command-core → work-ui →
// mesh-ui-serve`). A ring is legal; DEREFERENCING ACROSS IT AT MODULE SCOPE is not, and
// it fails only for whoever ENTERS at `mesh-ui-serve.mjs` — every assembled suite enters
// through `cli.mjs`, whose load order evaluates the constant first, so the whole runner
// stayed green over a server module that could not be imported on its own. The gate
// therefore imports each ring member in a FRESH PROCESS: an in-process import would be
// answered from a module cache another suite already warmed, and that warming IS the
// masking. Registration alone would not have caught this one.
import { boardFleetOriginSeamTests } from "./board-fleet-origin-seam.test.mjs";
import { workUiFleetOriginStandaloneTests } from "./work-ui-fleet-origin-standalone.test.mjs";
// ── milestone 46 / story 05 (ADR-009; DG-46-1) — THE DOCK'S HOME IN THE SHELL.
// The dock stops being an in-flow child of the board's column and becomes an occupant of the
// SHELL's `overlay` region, contributed through a THIRD slot on the bus m45 already shipped.
// Three task features, three traceability modules:
//   00_the-dock-is-contributed-to-the-overlay-region — the CHANNEL: one bus, three slots, the
//     region each slot names, the one-per-slot cap and its stale release, the degraded in-place
//     render (which is what keeps `test/support/board-app-harness.mjs` unedited), the rung taken
//     from the closed ladder BY NAME, and the collision Shell.tsx warned about in advance — the
//     dock and the fullscreen occupant sharing one region without fighting over it.
//   01_the-dock-inset-is-published-and-the-content-box-honours-it — DG-46-1's arithmetic: a
//     SECOND published name of the same species as `--aof-shell-chrome-height`, MEASURED (a
//     collapsed dock still paints its header, so zero is reserved for a dock that is ABSENT), and
//     the drag clamp moved off `window.innerHeight / 2` and onto the shell's own content box —
//     wrong by 44px at the operator's most common window, every pixel of it dock drawn over the
//     board's footer.
//   02_fullscreen-adopts-the-live-node — the `@executable` half only: what the control ASKS the
//     shell for (`claimsEscape` IS `inputEnabled`, never one flag) and what the post-transition
//     tick asks of each SOURCE. The four `@manual` scenarios — one xterm, one socket, one
//     scrollback across both transitions — need a real browser over a real PTY and are recorded
//     at `aof:verify`; a green stand-in here would prove the fake, not the shell.
// (03_an-open-dock-covers-nothing is `@uat` — a person's render verdict — and deliberately has
// no module here.)
import { shellDockRegionTests } from "./shell-dock-region.test.mjs";
import { shellDockInsetAndClampTests } from "./shell-dock-inset-and-clamp.test.mjs";
import { boardFaceContractTests } from "./board-face-contract.test.mjs";
// milestone 21 — board-run-observability. story 00 (run-observability): the
// additive /api/work/run-status read route (the server-side @executable scenarios)
// + the PURE run-observability helpers (relative-time formatter, current-run
// selection, the run-state chip ramp) shared headlessly. story 01
// (rerun-affordance): the pure rerun verb-resolution + the in-flight disabled
// predicate. The read-path fitness functions are EXTENSIONS of existing m08/m15
// guards (acd-work-command-route-coverage drops run-status from BOARD_DEFERRED;
// acd-board-write-isolation extended to the run/rerun surface) — already wired
// above; milestone 21 adds NO new arch-test file (21/ADR-003).
import { boardRunStatusRouteTests } from "./board-run-status-route.test.mjs";
// schema v5 (TECH_DEBT item 6 — finish the board bridge): the board's drill-downs
// (work:doc / work:run-status) fall back to the worker-streamed projection content
// (doc bodies + run records) when the local checkout cannot answer — closing the
// "board lists seven streamed stories, then dead-ends every click" gap.
import { boardWorkerContentTests } from "./board-worker-content.test.mjs";
import { boardRunsPureTests } from "./board-runs-pure.test.mjs";
import { fleetScopeTests } from "./fleet-scope.test.mjs";
import { renderPlanTests } from "./render-plan.test.mjs";
import { setupUiTests } from "./setup-ui.test.mjs";
// milestone 38 / story 06 / task 04 — BLOCKER F-38.06c (raised at aof:verify 38): the
// transport was reachable but had NO CONSUMER SURFACE. The ADR-013 `session_id` join
// key reached nowhere a browser could read it — a THREE-LINK break: the control side
// read only `runId` off the worker's assignment-status frame and `global_assignments`
// had no session_id column (PERSIST); `projectAssignment` carried eight keys, none of
// them the session id (SURFACE); and `terminal-view` matched 0 files under `ui/`
// (RENDER). This module is the traceability wiring for the close: the REAL frame
// handler over a REAL store (incl. the in-place, idempotent PRAGMA-checked column
// migration), the REAL /api/mesh/status shaping, and the framework-free
// ui/src/fleet/terminal-view/*.mjs helpers FleetTerminalView.tsx itself imports —
// stream resolution (ADR-014 inv.4) + the honest waiting/streaming/ended/disconnected
// ramp (DESIGN §Surface 3 V7/V9) — plus a multiplex lane over the REAL serveMeshUi
// /ws/terminal-view route. acd-fleet-terminal-mirror-read-only gains the BROWSER half
// of its read-only invariant (V2/V5/V6, whole-fleet-surface + presence pins).
import { fleetTerminalViewSurfaceTests } from "./fleet-terminal-view-surface.test.mjs";
// milestone 38 / story 06 / task 04 — the PRODUCER-FED half (QA, 2026-07-23; findings
// F-38.06d + F-38.06e). The module above proves each LINK against a payload the TEST
// chooses; this one drives the REAL createMeshWorkerExecutionHandler / REAL frame
// builder / REAL applyStreamFrame / REAL /api/mesh/status / REAL resolver over the
// house leaf doubles only, and asks the question at the moment that matters — WHILE
// the run is live. F-38.06d (the join key arrived only at a terminal state) is closed
// by the ADR-013 invariant-7 mid-run `running` frame (mesh-worker-execution.mjs).
// F-38.06e (nothing ever tells an open terminal-view its session ENDED — the ramp has
// no end-of-stream producer) is a SEPARATE finding, owned elsewhere: its lane is
// EXPECTED RED until that producer lands, and is deliberately not weakened here.
import { fleetTerminalViewProducerFedTests } from "./fleet-terminal-view-producer-fed.test.mjs";
import { boardMeshExecutionTests } from "./board-mesh-execution.test.mjs";
import { fleetAssignAffordanceTests } from "./fleet-assign-affordance.test.mjs";
import { fleetAssignAcknowledgmentTests } from "./fleet-assign-acknowledgment.test.mjs";
// milestone 38 / story 04 — task 07 (DG-13 / F-38.04g, from the REAL-assign
// render of 2026-07-24): the assign row's BINDING GEOMETRY — a fixed action
// width, a picker floor that never collapses to a bare chevron, the message slot
// as the element that yields (with the full server sentence in its `title`),
// copy ranked outcome > holder > all else, and region 5's chip naming its target
// in FULL. A separate file from task 06 because it is not the affordance's state
// axis: it binds every state at once and reaches into region 5's footer.
import { fleetAssignRowGeometryTests } from "./fleet-assign-row-geometry.test.mjs";
import { fleetAssignmentChipTests } from "./fleet-assignment-chip.test.mjs";
import { catalogTests } from "./catalog.test.mjs";
// ── milestone 47 / story 01 — THE BOARD DRILL-IN THAT OPENS A BOARD (ADR-006), and the
// unreachable branch it was hiding behind. Two @executable task features, each with its own
// suite, and they LOCK EACH OTHER: (a)'s door must demonstrably work before (b) removes the
// other one, and (b) re-checks it in the same run (m45/STATE's sequencing rule, made
// structural).
//   00_board-link-resolved — the RUNTIME half of ADR-006(a), which the arch gate above
//     cannot see: an address composed at click time leaves no literal in source, so nothing
//     static can tell whether the request carried the RIGHT workspace id or whether the
//     operator landed somewhere that works. The REAL <Fleet/> over the REAL two-workspace
//     face (F21's own collision — two workspaces, one ref "18"): nothing resolves until the
//     click, the click asks for the CARD's workspace and ref, the app's ONE navigation lands
//     on an origin that answers `/api/work/list` with 200 where the fleet origin answers a
//     coded 404, the in-flight state is the clicked card's alone, and every refusal leaves
//     the operator on the fleet with a stated reason and a recoverable retry.
//   01_unreachable-boards-branch-deleted — ADR-006(b): the local-shape branch that has not
//     rendered since m34 is gone and the surface still stands for every payload it can be
//     handed; no anchor it renders names a board in ANY state; the boards PRODUCER and the
//     CLI face are untouched (the deletion is of a dead UI branch, not of a feature); every
//     region the real face can reach renders exactly as before; and `npm --prefix ui run
//     build` typechecks, which is where a wire type deleted while a reader survives fails
//     loudly and by name.
import { fleetBoardDrillInTests } from "./fleet-board-drill-in.test.mjs";
import { fleetBoardsBranchDeletedTests } from "./fleet-boards-branch-deleted.test.mjs";
// ── milestone 47 / story 03 — THE FILTERED FLEET (ADR-003/004/007/009/010; DESIGN §Surface 1
// and §Surface 2). The milestone's widest story, and the four @executable task features it is
// made of, every one of them driven through the headless mount harness against the REAL
// `serveMeshUi` face over a REAL global projection:
//   00_one-narrowing-seam — ADR-004's EVERY REGION, OR NONE, asserted as a SWEEP over the whole
//     rendered document rather than region by region, so a region a later milestone adds is
//     inside the sentence on the day it is added; each narrowed region's `<n> of <N>` header;
//     the ONE compound region's fact-by-fact partial exemption; the empty-state precedence that
//     proves the seam runs before `pageState`; and the re-poll that cannot leak an unfiltered
//     frame.
//   01_filter-control-and-chip — the picker in the shell's surface slot in EVERY page state,
//     its producer-fed option set, the narrowing that costs no round trip, the banner above the
//     state swap, and the filter's two clear doors.
//   02_honest-empty-states — five distinguishable ways of arriving at nothing, five true
//     sentences, none of them dressed as a failure, each one click from the whole fleet; plus
//     ADR-010's PARTIAL intersection, which is a populated page with a notice rather than an
//     empty card.
//   03_deep-link-and-survival — the filter as a shareable ADDRESS: in force on first paint,
//     unchanged by a refresh/poll/retry, carried by the fleet's own nav item and by nothing
//     else, composed with `?scope=` by intersection, and written exactly once per change the
//     operator actually made.
import { fleetNarrowingSeamTests } from "./fleet-narrowing-seam.test.mjs";
import { fleetFilterControlTests } from "./fleet-filter-control.test.mjs";
import { fleetEmptyStatesTests } from "./fleet-empty-states.test.mjs";
import { fleetFilterAddressTests } from "./fleet-filter-address.test.mjs";
import { fleetSlotAndPickerTests } from "./fleet-slot-and-picker.test.mjs";
//   …and the four @executable task features, driven against those same shipped modules and
//   shipped detectors — never against a re-implemented copy (m46's mutation review found a plant
//   fed to a local copy of `affordanceFormViolations`, so the shipped detector was never once
//   driven to a violation).
import { homeFeedAxisTests } from "./home-feed-axis.test.mjs";
import { homeSocketCapArbiterTests } from "./home-socket-cap-arbiter.test.mjs";
import { homeLayoutFilterTests } from "./home-layout-filter.test.mjs";
import { uiDirectoryBudgetTests } from "./ui-directory-budget.test.mjs";
// ── milestone 49 / story 04 — `/` BECOMES THE TERMINALS HOME (ADR-001; DESIGN §S1, DG-49-1).
// FOUR EDITS IN ONE DIFF, and the whole risk is that they land separately: `main.tsx`'s `SURFACES`
// gains `landing`, `entry.mjs`'s `SHELL_RENDERED_ROUTES` shrinks to `["not-found"]`, `Shell.tsx`'s
// inline landing branch goes, and `ui/src/app/Landing.tsx` is DELETED rather than parked beside a
// real home. The route TABLE is untouched — the `landing` id survives verbatim, exactly as m45
// promised — and what changed is WHO renders it: `/` is now hosted inside `SurfaceBoundary`'s
// crash containment, because a static card was safe outside the net and a surface that fetches,
// polls and (from story 05) holds sockets is not (F-45-M-1's exact shape).
//   THE HALF-LANDED STATE IS WHY TASK 00's SECOND SCENARIO IS A TRUTH TABLE: with `landing` in
//   BOTH lists, `surfaceMountFor` answers "there is nothing to mount and nothing is wrong" —
//   three booleans byte-identical to today's, no red, no console line, no address-bar evidence,
//   and the operator gets a placeholder while a real home sits mounted by nobody.
import { terminalsHomeRouteTests } from "./terminals-home-route.test.mjs";
//   …and task 01, the page's own states: ONE total selector over every payload the face can
//   serve, TWO empty states (E2 is the one the live fleet is measurably in — every node reports
//   an empty index while two report runs, because the bundle wires session hooks for Codex only),
//   a loading state that is a LINE and not a shimmer (story 06's finding is why), a failed state
//   that names the fault, and no command anywhere: which command wires Claude's hooks is a
//   producer-side decision the architect still owns, and the house's own `EmptyFleet` prints three
//   different ones in exactly this slot.
import { terminalsHomePageStatesTests } from "./terminals-home-page-states.test.mjs";
//   task 01 — the home's mount declaration: the SAME thirteen-key shape the fleet's producer
//   returns, `interactive` as ONE literal at ONE call site (the word m46 left, changed here and
//   nowhere else), NARROWED by the feed axis to a LABELLED read-only whenever a keystroke would
//   not arrive — which is what makes SPEC's read-only fallback reachable rather than decorative,
//   because research measured a keystroke into a free session swallowed at one of two hops.
import { homeSessionMountTests } from "./home-session-mount.test.mjs";
// ── milestone 49 / story 05 — THE GRID OF LIVE PANES, the milestone's heart and the whole arc's.
// Mounted through story 08's harness against the PRODUCT — `ui/src/home/SessionGrid.tsx` →
// `SessionPane.tsx` → the REAL, UNMODIFIED `ui/src/terminal/TerminalControl.tsx` — so "sixteen
// sockets were constructed" is a fact about the shipped grid rather than about sixteen mounts a
// test handed to sixteen controls. That distinction is TECH_DEBT 29 exactly: milestone 46 shipped
// a control that opened NO SOCKET AT ALL past 537 green tests because every harness stubbed the
// component by module path.
//   task 00 — the row set: `sessions[]` and NOTHING else (an assignment is not a session, and five
//   tempting payload shapes contribute zero tiles), the NON-EMPTY-STRING id test (`"0"` is a
//   legitimate id), and the ONE sort site — `(nodeId, repo, sessionId)` by plain codepoint
//   comparison, with the DESIGN-vs-index order conflict pinned to DESIGN's rule.
//   task 01 — THE SOCKET, and its URL, and the pane host the xterm paints into.
//   task 02 — the honest feed states: a session nothing will ever relay opens no socket and says
//   so once, a tuple that leaves the index keeps its socket and gains an annotation naming the
//   ROSTER, and no degraded roster condition is ever dressed up as `unavailable`.
//   task 03 — the cap holds the rest: twenty rows, sixteen sockets, four tiles listed and at rest
//   naming the limit from the CONFIGURED number, and nothing demoted behind the operator's back.
//   task 04 — focus and expand: twelve tiles are ONE tab stop, arrows move by rendered geometry,
//   and `Enter` presents the pane for the price of a layout change.
//   task 05 — one live region, not N — and the other three hosts keep their own.
import { terminalsHomeGridTests } from "./terminals-home-grid.test.mjs";
// ── milestone 45 / story 01 — THE ROUTE MODEL (ADR-001/002/003/006): ui/src/app/routes.mjs,
// the ONE pure route table (`routeFor`) plus the ONE legacy `?mode=` translation
// (`legacyRedirectFor`). Framework-free by contract — this repo has NO React test harness, so
// the route decision lives in a plain .mjs that node:test drives headlessly, in the house
// pattern of ui/src/fleet/scope.mjs + test/ui/fleet-scope.test.mjs. Three @executable task
// features: 00_route-table (four paths, one shared 404, frozen/origin-blind table),
// 01_legacy-mode-redirect (every advertised ?mode= URL onto its path, `mode` the only thing
// removed, idempotent), 02_query-and-fragment-passthrough (`?scope=`, unknown parameters and
// the `#ref` fragment survive, in order).
import { appRoutesTests } from "./app-routes.test.mjs";
// ── milestone 45 / story 03 — THE APP SHELL & THE ENTRY (ADR-002 + ADR-005 with its five
// [Build-N] amendments). `ui/src/main.tsx` stops being a surface (its 1,260-line config editor
// moved to `ui/src/config/App.tsx`) and becomes three acts: mount, apply the legacy `?mode=`
// translation ONCE as a replace, render the shell around the surface the ONE route table names.
// Four @executable task features, each with its own suite:
//   00_entry-selects-a-surface — the entry's decision (`ui/src/app/entry.mjs`): four canonical
//     addresses, the whole advertised legacy set rewritten exactly once, the surface read from
//     the POST-rewrite address, and every parameter and fragment reaching the surface in order.
//   01_shell-regions — the layout MODEL (`ui/src/app/shell-layout.mjs`): five rows in one
//     order, the 88px chrome budget with the notice rail exempt/additive/REPORTED, the one
//     published `--aof-shell-chrome-height`, the two content modes, one banner and one `<main>`
//     (driven through the REAL shell AND the real fleet/board, which is where the absorption of
//     their own bars could regress), DG-45-1's one brand mark and DG-45-2's one ladder.
//   02_navigation — the nav MODEL (`ui/src/app/shell-nav.mjs`): four real links from the ROUTE
//     TABLE's order, three non-colour active signals, the positional href rule that carries the
//     current address's own parameters and invents none, honest locality, the 390 disclosure,
//     and the four-item/ten-character budget REPORTED rather than absorbed.
//   03_unmatched-path-and-fullscreen — the two states that are not surfaces: an unknown path
//     rendered in place with nothing marked current, and the ONE shell-owned fullscreen door
//     whose closed transition set carries no path, no parameter and no history entry.
//   05_surface-crash-degrades-in-shell — the @bug task raised at the milestone end gate
//     (F-45-M-1): a surface that throws while rendering takes down ITSELF, never the chrome.
//     `/config` on the fleet origin blanked the whole application; the shell now contains a
//     throwing surface into the `failed` state it already rendered, and `<App>` degrades
//     through its own error state before it ever gets there.
// (04_app-shell-visual-review is @uat — a person's render verdict — and deliberately has no
// suite here.)
import { shellEntryPlanTests } from "./shell-entry-plan.test.mjs";
import { shellRegionsTests } from "./shell-regions.test.mjs";
import { shellNavigationTests } from "./shell-navigation.test.mjs";
import { shellNotFoundAndFullscreenTests } from "./shell-not-found-and-fullscreen.test.mjs";
import { shellSurfaceContainmentTests } from "./shell-surface-containment.test.mjs";
// milestone 45 / story 02 (ADR-004) — the BEHAVIOURAL half of the static-serving rules, and
// the traceability wiring for all three of that story's @executable task features
// (00_one-traversal-guard, 01_history-fallback, 02_missing-asset-still-404s). Real HTTP
// against real started servers — serveBoard, serveSetupUi and serveMeshUi on ephemeral
// ports, all three serving one fixture bundle — because the features' own LITMUS is "every
// Then is a real HTTP request against a started server", never "the predicate returns true".
// The PLACEMENT invariants (one definition, pure leaf, guard-before-fallback ordering) stay
// in acd-spa-fallback-never-masks above; that division is deliberate.
import { staticServeFallbackTests } from "./static-serve-fallback.test.mjs";
import { inAppCrossLinksTests } from "./in-app-cross-links.test.mjs";
// milestone 43 / story 04 — STALENESS, NEVER EVICTION (ADR-006 + DESIGN's freshness ramp).
// Task 03: the fifth ramp. One pure headless module (ui/src/board/freshness.mjs) emits the
// three states and both renderings with `now` passed in and strict `>`, so it agrees with
// src/'s shared isStale AT the threshold instant; the board paints `stale` as a dashed
// `muted` pill immediately left of the right-anchored status chip; and the badge appears
// within ONE SECOND of the crossing off a Board-root cosmetic tick with ZERO network — the
// clause that proves the crossing is clock-driven rather than fetch-driven, which is what a
// settled item (the very case a stale row IS) depends on. Driven through the REAL <Board/>
// mounted headlessly against the REAL board face on a controllable clock.
import { boardFreshnessRampTests } from "./board-freshness-ramp.test.mjs";
// …and the story's UI BEHAVIOUR half, every lane driven through the REAL <Board/> mounted
// headlessly against the REAL board face on a controllable clock. Task 04: the provenance
// line renders for EVERY cache-published item (not only executing ones), each doc states its
// own provenance above its body, and RemoteContentNotice's "documents aren't bridged" copy
// is retired to a cache-miss placeholder. Task 05: ONE Resync door, on the provenance line,
// only while stale — it reports the CALL, never the DATA, so there is no success toast and
// the badge clearing is the only confirmation; both in-flight legs are bounded. Task 06:
// DESIGN's Resync states as a table — muted when the world did not answer, destructive ONLY
// when the request was rejected, acknowledgements decaying while facts persist, never
// pre-disabled on presence. Task 07: both legends paint the real badge and state the window
// from the wire, degrading to WORDS rather than a guessed number. Task 08: the programmatic
// a11y contract — the word carries the meaning, Resync names its object and agrees visibly
// and programmatically about being busy, and the crossing is deliberately NOT announced.
import { boardProvenanceAttributionTests } from "./board-provenance-attribution.test.mjs";
import { boardResyncDoorTests } from "./board-resync-door.test.mjs";
import { boardResyncOutcomesTests } from "./board-resync-outcomes.test.mjs";
import { boardFreshnessLegendTests } from "./board-freshness-legend.test.mjs";
// milestone 127 / story 04 — the board shows the backlog as rows (task 03), hides the archive
// behind one toggle with one mark (task 04), and the fleet partitions the backlog out (task 05).
import { boardBacklogAndArchiveTests } from "./board-backlog-and-archive.test.mjs";
import { boardStalenessA11yTests } from "./board-staleness-a11y.test.mjs";
// milestone 50 / story 04, lane C — THE OPERATOR-FACING AFFORDANCE (ADR-008 decision 10;
// DESIGN §The picker's shape / §The state machine / §The failure map). Both suites drive the
// SHIPPED `ui/src/home/session-launcher.mjs` — a pure module by ADR, because the rules being
// tested (options from the payload alone, a derived-not-remembered target, eight states, two
// deadlines and fourteen coded rows) would otherwise be reachable only through a React
// component this repo has no harness for.
//   task 01 — the picker: every node and workspace ANNOTATED and never filtered, the item field
//   a PICK from `items[]`, no `assistant` control at all, a panel that survives a poll, and the
//   four empty cases each stating their own reason.
//   task 02 — the state machine, on an INJECTED clock: the POST deadline (2 × HOME_POLL_MS) and
//   the outcome window (3 × HOME_POLL_MS) as two numbers waiting on two facts, the GRID as the
//   success authority and the lane as the failure one, a late arrival clearing `no answer`, a
//   NEW sessionId on every retry, and one lane per coded refusal.
import { homeSessionLauncherPickerTests } from "./home-session-launcher.test.mjs";
import { homeSessionLauncherStateTests } from "./home-session-launcher-states.test.mjs";

export const tests = [
  ...boardApiTests,
  ...boardServeTests,
  ...boardActionTests,
  ...workUiVerbRenameTests,
  ...workUiBoardServesUnchangedTests,
  ...boardFleetOriginSeamTests,
  ...workUiFleetOriginStandaloneTests,
  // milestone 46 / story 05 — the dock's home in the shell (tasks 00-02's @executable halves; 03
  // is @uat), and the gate the `fixed inset-0` prohibition never had.
  ...shellDockRegionTests,
  ...shellDockInsetAndClampTests,
  ...boardFaceContractTests,
  // milestone 21 — board-run-observability (story 00: run-observability route +
  // pure helpers; story 01: rerun verb + in-flight predicate)
  ...boardRunStatusRouteTests,
  ...boardWorkerContentTests,
  ...boardRunsPureTests,
  ...fleetScopeTests,
  ...renderPlanTests,
  ...setupUiTests,
  // task 04 — BLOCKER F-38.06c: the (nodeId, sessionId) join key reaches the browser
  // (persist → surface → render) and the fleet gains its read-only terminal-VIEW
  ...fleetTerminalViewSurfaceTests,
  // task 04 — the same chain asked of its REAL producers, WHILE the run is live
  // (F-38.06d, closed; F-38.06e's end-of-stream lane stays red pending its own pass)
  ...fleetTerminalViewProducerFedTests,
  // VERIFICATION (2026-07-25) — the board's mesh-execution overlay (is this item being
  // executed, by whom, on which branch) + the branch-backed work stream (the stories a
  // refine authored on the mesh branch this checkout does not carry).
  ...boardMeshExecutionTests,
  ...fleetAssignAffordanceTests,
  ...fleetAssignAcknowledgmentTests,
  ...fleetAssignRowGeometryTests,
  ...fleetAssignmentChipTests,
  ...catalogTests,
  // milestone 47 / story 01 — the board drill-in + the deletion of the branch it hid behind
  // (tasks 00–01, both @executable; 00's @uat design lane is a person's render verdict)
  ...fleetBoardDrillInTests,
  ...fleetBoardsBranchDeletedTests,
  // milestone 47 / story 03 — the filtered fleet (tasks 00–03, all @executable; task 01's and
  // task 02's @uat design lanes and task 03's @manual browser lane are a person's)
  ...fleetNarrowingSeamTests,
  ...fleetFilterControlTests,
  ...fleetEmptyStatesTests,
  ...fleetFilterAddressTests,
  ...fleetSlotAndPickerTests,
  ...homeFeedAxisTests,
  ...homeSocketCapArbiterTests,
  ...homeLayoutFilterTests,
  ...uiDirectoryBudgetTests,
  // milestone 49 / story 04 — `/` becomes the terminals home. Task 00 is the route switch (the
  // four edits as one diff, the half-landed truth table, the containment, `content:fixed`, the
  // deletion and the file-budget accounting by the gate's OWN arithmetic); task 01 is the page's
  // own states. Task 00's last scenario is @manual and task 01's is @uat — recorded at
  // `aof:verify 49`, not here.
  ...terminalsHomeRouteTests,
  ...terminalsHomePageStatesTests,
  ...homeSessionMountTests,
  // milestone 49 / story 05 — the grid of live panes: the row set and its ONE sort site, the
  // socket every subscribed tile really constructs (mounted through the PRODUCT's own grid, never
  // a stub), the honest feed states, the cap that lists rather than evicts, the roving stop and
  // the expand door, and the one live region that replaced twelve.
  ...terminalsHomeGridTests,
  // milestone 45 / story 01 — the route model (tasks 00–02, all @executable)
  ...appRoutesTests,
  // milestone 45 / story 03 — the app shell & the entry (tasks 00–03; 04 is @uat)
  ...shellEntryPlanTests,
  ...shellRegionsTests,
  ...shellNavigationTests,
  ...shellNotFoundAndFullscreenTests,
  ...shellSurfaceContainmentTests,
  // milestone 45 / story 02 — the static-serving leaf (tasks 00–02, all @executable)
  ...staticServeFallbackTests,
  ...inAppCrossLinksTests,
  // milestone 43 / story 04 — the freshness ramp + the stale badge (task 03)
  ...boardFreshnessRampTests,
  // …and the UI behaviour half: the provenance line, the Resync door and its
  // outcome table, the legends, and the programmatic a11y contract (tasks 04–08)
  ...boardProvenanceAttributionTests,
  ...boardResyncDoorTests,
  ...boardResyncOutcomesTests,
  ...boardFreshnessLegendTests,
  // milestone 127 / story 04 — the backlog region, the archive toggle + mark, the fleet partition
  ...boardBacklogAndArchiveTests,
  ...boardStalenessA11yTests,
  // milestone 50 / story 04 lane C — the new-session picker (task 01) and the
  // operator-visible state machine (task 02), both over the pure launcher module
  ...homeSessionLauncherPickerTests,
  ...homeSessionLauncherStateTests,
];
