// THE SESSION SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 53 / story 00 — the session driver's extraction into src/agent-session-driver.mjs
// (ADR-001), and the five suites its six @executable features name. They land in the SAME diff
// as the move they mechanise, in this story's own labelled block (ADR-011 §1): a story accepted
// on evidence the runner never invokes is TECH_DEBT item 48 exactly. Import AND spread, both —
// an imported-but-never-spread suite reads green at the orphan gate (which keys on this file's
// TEXT) while running never, TECH_DEBT item 50's shape.
import { agentSessionDriverDoorTests } from "./agent-session-driver-door.test.mjs";
import { agentSessionDriverDrivesTests } from "./agent-session-driver-drives.test.mjs";
import { agentSessionDriverTranscriptTests } from "./agent-session-driver-transcript.test.mjs";
import { agentSessionDriverRuntimeDispatchTests } from "./agent-session-driver-runtime-dispatch.test.mjs";
import { agentSessionDriverGateAimTests } from "./agent-session-driver-gate-aim.test.mjs";
// milestone 55 / story 03 — append-only raw feedback, later referenced triage,
// and the structural no-classification capture boundary (FF-5507).
import { rawCaptureBeforeClassificationTests } from "./raw-capture-before-classification.test.mjs";
import { terminalDockTests } from "./terminal-dock.test.mjs";
import { terminalWsTests } from "./terminal-ws.test.mjs";
// milestone 46 / story 00 (ADR-008) — the pre-session frame queue: frames the route
// accepted before the PTY existed are drained in arrival order (task 00), and that
// queue is bounded, newest-wins and reports its drops (task 01).
import { terminalWsPreSessionQueueTests } from "./terminal-ws-presession-queue.test.mjs";
import { terminalWsPreSessionBoundTests } from "./terminal-ws-presession-bound.test.mjs";
import { terminalSessionsTests } from "./terminal-sessions.test.mjs";
// milestone 46 / story 03 (ADR-001/002/003/004/005; DG-46-2) — THE SHARED TERMINAL CORE.
// One framework-free `.mjs` set at `ui/src/terminal/`, imported by nothing yet: this repo has
// NO React test harness, so every decision the two terminals disagree about is landed as a
// value plain `node` can drive BEFORE a single pixel renders it. Five @executable task
// features, each with its own suite:
//   00_the-session-source-table — ADR-002's FROZEN two-entry table (`local-pty`, `mirror`) as
//     DATA: six declared fields per row, an unknown kind refused with its cause named and
//     never coerced, a relayed `local-pty` not constructible at all, and every derivation
//     keyed on the descriptor's FIELDS rather than on its kind.
//   01_the-merged-state-ramp — DESIGN §THE ONE STATE VOCABULARY: seven states plus the
//     self-labelling `unknown`, the 30-cell transition matrix driven exhaustively (the ramp is
//     a TOTAL function), the exit code that outranks a later bare close, the failure that is
//     never laundered into a clean finish, and the fleet's assignment-derived wording arriving
//     as an INJECTED string so the shared set imports nothing from `ui/src/fleet/`.
//   02_fit-or-scale-is-derived-from-the-source — ADR-003: `fit ⇔ the source declares a resize
//     control frame`, exactly one resize frame per fit (and silence for an unmeasured box),
//     and `terminalFitScale`'s FIRST coverage — its predecessor's header named a test file
//     that had never existed, so the mirror's whole scale math was untested AND believed
//     tested (ARCHITECTURE §Codebase health finding 1).
//   03_the-socket-url-is-built-from-an-origin — ADR-004: ONE pure builder taking `{ origins }`
//     as an argument and reading no browser global, a half-tuple yielding no URL at all, and
//     the `wss` decision keyed on the DIALLED origin rather than on the page (today's
//     `mirrorWsUrl` has that wrong, which is how an `http` fleet gets dialled at `wss://`).
//   04_input-is-capability-times-posture — ADR-002's `inputEnabled = source.canInput &&
//     !mount.readOnly`, driven over the WHOLE frozen table x BOTH postures. This is arch-test
//     invariant 4's POLICY half, and it is load-bearing: once the control leaves
//     `ui/src/fleet/`, that gate's directory sweep reads green and VACUOUS, which is worse
//     than deleting it.
import { terminalCoreSourceTableTests } from "./terminal-core-source-table.test.mjs";
import { terminalCoreStateRampTests } from "./terminal-core-state-ramp.test.mjs";
import { terminalCoreGeometryTests } from "./terminal-core-geometry.test.mjs";
import { terminalCoreSocketUrlTests } from "./terminal-core-socket-url.test.mjs";
import { terminalCoreInputPolicyTests } from "./terminal-core-input-policy.test.mjs";
// …plus the two capabilities the shared core was missing, both ruled to belong in this leaf at
// the architect's review: the PER-PANE IDENTITY (the multiplex key, keyed on the descriptor's
// own declared params rather than on one surface's tuple, and m38/ADR-014 invariant 4's V1 —
// "a terminal with no visible owner is never rendered", which its predecessor carried
// STRUCTURALLY and 46/04 deletes), and the DRAG CLAMP (ADR-009: off the viewport and onto the
// published chrome height, with the DEFAULT clamped too — the desktop app's 760x520 window
// gives a 432px content box, so an unclamped 280 opens the dock at a height the operator is
// not allowed to drag it to).
import { terminalCorePaneIdentityAndClampTests } from "./terminal-core-pane-identity-and-clamp.test.mjs";
// milestone 46 / story 04 (ADR-001..006; DESIGN §Surfaces) — ONE CONTROL, BOTH CALL SITES, AND THE
// DUPLICATE DELETED IN THE SAME DIFF. `ui/src/board/TerminalDock.tsx`, `ui/src/board/terminal/` and
// `ui/src/fleet/terminal-view/` are gone; `ui/src/terminal/TerminalControl.tsx` is the one
// component, and each surface hands it a SOURCE and a POSTURE computed by its own mount module
// (`ui/src/board/dock-mount.mjs`, `ui/src/fleet/terminal-mount.mjs`). Four @executable task
// features, each with its own suite:
//   00_one-control-renders-both-sources — the COMPOSITION 46/03's core suites deliberately do not
//     cover: what each CALL SITE hands the control, what it derives from that (route, geometry
//     mode, resize frames, input path, cursor, label), and the URL the handed origins compose. Plus
//     the bar-is-paid-for-out-of-the-byte-area pair, asserted as a PAIR — the row that catches a
//     hard-coded scale literal — and the board dock's unmocked `mirror` band.
//   01_collapse-keeps-the-session-hide-ends-it — the two operations that look alike and cost
//     differently, asserted SEPARATELY. The session's identity is a STRING now, so "collapsing must
//     NOT tear the session down" stops being a comment beside a dependency array (a mechanism only
//     React can read, in a repo with no React test) and becomes a value a `node:test` compares.
//   02_the-duplicate-is-deleted-and-the-gates-follow — invariant 4's POLICY half over the whole
//     frozen table x both postures x every malformed declaration, the two call sites' declarations,
//     and the deletion's REGRESSION LIST: every distinction either dead ramp could make, made by
//     the one ramp, with the same word arriving on both surfaces for the same far-end event.
//   03_the-unavailable-pane-names-its-cause — the labelled state that names its cause and opens no
//     socket, and the boundary it must never blur with "no panel at all" (ADR-014 inv.4 / V1).
//     DG-46-3: the state has NO production producer in m46 and is driven from a fixture.
import { terminalControlBothSourcesTests } from "./terminal-control-both-sources.test.mjs";
import { terminalCollapseIsNotHideTests } from "./terminal-collapse-is-not-hide.test.mjs";
import { terminalOneImplementationTests } from "./terminal-one-implementation.test.mjs";
import { terminalUnavailablePaneTests } from "./terminal-unavailable-pane.test.mjs";
import { terminalFullscreenAdoptsLiveNodeTests } from "./terminal-fullscreen-adopts-live-node.test.mjs";
// ── milestone 46 — THE REGRESSION SUITE FOR THE BLOCKER OF 2026-08-09, and the answer to the
// test gap that let it ship. The one control rendered correctly and NEVER OPENED A SOCKET, at
// both call sites, for both sources: `idle`'s pane treatment withheld the very host element whose
// ref the session effect needs, and the line that leaves `idle` sat after that guard.
//
// 537 green tests said nothing, because all three surface harnesses stub the component out by
// module path and every other suite in the milestone drives the framework-free model. This is the
// first suite in the repo that mounts the REAL `TerminalControl.tsx` and asserts the OBSERVABLE —
// a WebSocket was constructed, to the URL the handed origins compose — through
// `test/support/terminal-control-harness.mjs` and mini-react's new opt-in host-node refs.
import { terminalControlOpensItsSocketTests } from "./terminal-control-opens-its-socket.test.mjs";
// ── milestone 46 — the OTHER three defects the same browser pass found, and they are the same
// blindness: the dock's header overflowed its own frame at 390 (`scrollWidth 451` vs
// `clientWidth 390`), which put `✕ Close terminal dock` outside the frame and collapsed the
// identity to width 0 under `provider:`; C1's yield was keyed to the VIEWPORT, so a ~395px fleet
// card inside a 1280 window kept the whole session tail and truncated the ref instead
// (CONFORMANCE C13, inverted); and the fullscreen exit — the ONLY exit once the pane claims
// `Escape` — rendered at 17×28 because `h-7 w-7` is a flex basis nothing had marked `shrink-0`.
import { terminalControlHeaderYieldTests } from "./terminal-control-header-yield.test.mjs";
// ── milestone 49 / story 08 — THE INSTRUMENT, taken from ONE control to a grid. TECH_DEBT 29's
// remedy finished: the harness was built to the size of m46's problem — one control — and m49 is
// the first milestone to need many. Four capabilities, each of which turned a family of
// assertions from unreachable into observable: N controls from a caller-supplied entry with a
// PER-PANE driver; the shell declared on the BUNDLE the control reads, so the fullscreen door
// genuinely opens; a live `activeElement` a real `focus()` moves, with keys routed BY FOCUS; and
// events that propagate up the rendered tree and can be stopped. Both suites are also the guard
// on the one forbidden fix — `TerminalControl` may never enter a stub set the harness controls.
import { terminalHarnessDrivesAGridTests } from "./terminal-harness-drives-a-grid.test.mjs";
import { terminalHarnessShellFocusKeyboardTests } from "./terminal-harness-shell-focus-keyboard.test.mjs";
// milestone 68 / story 01 — attribution-at-spawn: the session id persisted onto the
// run record by the driver's two production callers (ADR-005 §1) + the OTel spawn
// attribution with no receiver (ADR-005 §2). Traced by test/session/attribution-at-spawn.test.mjs;
// the story's one fitness function FF-6808 (acd-no-otlp-receiver) is registered below.
import { attributionAtSpawnTests } from "./attribution-at-spawn.test.mjs";
// milestone 70 / story 01 — cache-stable-launch (ADR-004/005): the shareable-prefix
// flag, the chosen session model/effort, and the held 1-hour cache window, at the
// launch seam and the drive path, plus the pure session-model resolver.
import { sessionModelTests } from "./session-model.test.mjs";
// milestone 33 (story 00) — per-install-node-identity: the four @executable task
// features (00_identity-sidecar-persist / 01_loadworkspace-hydration /
// 02_backcompat-migrate-doctor / 03_self-heal-hostname-mismatch). Task 04
// (cross-os-distinct-identity) is @manual real-hardware — no test, verified at
// aof:verify.
import { identitySidecarPersistTests } from "./identity-sidecar-persist.test.mjs";
import { selfHealHostnameMismatchTests } from "./self-heal-hostname-mismatch.test.mjs";
import { agentModelOverrideTests } from "./agent-model-override.test.mjs";
import { agentModelSoloInertTests } from "./agent-model-solo-inert.test.mjs";
import { modelTests } from "./model.test.mjs";
// ── milestone 49 / story 03 — THE PANE DECLARES ITSELF, AND THE GATE SAYS SO (ADR-007 the fourth
// host + the posture; ADR-008 the amendment). THE MILESTONE'S ONE DELIBERATE REVERSAL, and the
// three task features below are one story for one reason: part 1's new surface → posture-home
// table NAMES `ui/src/home/session-mount.mjs` and the amended gate IMPORTS it, so before the
// module exists CI is red for a whole story, and after the module exists but before the table is
// updated CI is GREEN AND VACUOUS about the new interactive surface — the dangerous one, and this
// gate's own recorded history (m46/ADR-006).
//   task 00 — the control's FOURTH host (`HOST_GRID_PANE = "grid-pane"`): eight affordances, two
//   ON and six OFF with a stated reason each, every plant fed to the SHIPPED
//   `affordanceFormViolations` (never a copy — m46's mutation review), plus the two declarations
//   ADR-007's amendment adds: the byte area's PRESENCE as a host fact (replacing the control's
//   `{subscribed ? … : null}` guard) and the pane-activation FORM beside the icon control.
import { terminalGridPaneHostTests } from "./terminal-grid-pane-host.test.mjs";
//   …and task 00's two source-lane @executable scenarios (1 and 5): the class the ramp emits is
//   one a preference silences by ONE of DESIGN's two sanctioned mechanisms and is spelled ONCE,
//   motion is on exactly `connecting…` and `streaming` and on no other row (the `unknown`
//   descriptor included — it is not a member of `TERMINAL_STATES` and carries its own row), and
//   the module's stated mechanism is the mechanism actually in force.
import { terminalMotionReducedEscapeTests } from "./terminal-motion-reduced-escape.test.mjs";
// milestone 50 / story 04 — task 00, the SPAWN-OUTCOME LANE (ADR-008 lanes A + B). The
// worker's `session-spawn-ack` had a builder, a sender, a transport and a test across
// THREE accepted stories, and no reader: it fell through the control's kind table into
// `unknown-frame-kind` and reached the operator as a log sentence with three false claims
// in it. Lane A gives it one — an ephemeral, tuple-keyed, bounded registry in the mesh-ui
// process, fed by the SHIPPED loopback relay and read at one new GET route (the WRITE
// allowlist does not move) — plus the one refusal only the control can see,
// `session-target-not-connected`, synthesised onto the same lane. Lane B is the producer
// FACT: the worker states `relaying: true` on its session record, it survives four hops,
// and the browser's feed axis becomes a disjunction so a launched session renders as a live
// pane instead of a dead tile.
import { sessionSpawnOutcomeLaneTests } from "./session-spawn-outcome-lane.test.mjs";

export const tests = [
  // milestone 53 / story 00 — the session driver's two doors, its drive, its transcript
  // watches, its runtime dispatch, and the split arch gate's aim
  ...agentSessionDriverDoorTests,
  ...agentSessionDriverDrivesTests,
  ...agentSessionDriverTranscriptTests,
  ...agentSessionDriverRuntimeDispatchTests,
  ...agentSessionDriverGateAimTests,
  // milestone 55 / story 03 — raw-first capture, separate triage, and no menu
  ...rawCaptureBeforeClassificationTests,
  ...terminalDockTests,
  ...terminalWsTests,
  ...terminalWsPreSessionQueueTests,
  ...terminalWsPreSessionBoundTests,
  ...terminalSessionsTests,
  // milestone 46 / story 03 — the shared terminal core (tasks 00–04, all @executable), the two
  // capabilities the architect's review added to the leaf, and every gate clause this story
  // turns green. The remaining whole-tree clauses are parked for 46/04; see the import block
  // above for why they are not named here.
  ...terminalCoreSourceTableTests,
  ...terminalCoreStateRampTests,
  ...terminalCoreGeometryTests,
  ...terminalCoreSocketUrlTests,
  ...terminalCoreInputPolicyTests,
  ...terminalCorePaneIdentityAndClampTests,
  // milestone 46 / story 04 — the headline story's four @executable suites, and the gate split out
  // of the fleet's input gate. The two parked WHOLE-TREE gate halves 46/03 could not turn green
  // are NOT separate imports: 46/04 merged them back into their registered siblings above, in the
  // same diff that deleted the duplicate, so each invariant has one file again.
  ...terminalControlBothSourcesTests,
  ...terminalCollapseIsNotHideTests,
  ...terminalOneImplementationTests,
  ...terminalUnavailablePaneTests,
  ...terminalFullscreenAdoptsLiveNodeTests,
  // milestone 46 — the mounted-for-real control: it opens its socket, or this suite is red.
  ...terminalControlOpensItsSocketTests,
  // …and its header yields in DESIGN's order, keyed to its own width, with a door that stays 28px.
  ...terminalControlHeaderYieldTests,
  // milestone 49 / story 08 — the same instrument, now able to drive a GRID: N panes each
  // addressable on its own, a shell that is really there, a focus model that really moves, and
  // gestures that really propagate. Proved at N=1 against milestone 46's own passing values.
  ...terminalHarnessDrivesAGridTests,
  ...terminalHarnessShellFocusKeyboardTests,
  // milestone 68 / story 01 — attribution-at-spawn: the two @executable task
  // features + the story's one fitness function (FF-6808, acd-no-otlp-receiver).
  ...attributionAtSpawnTests,
  // milestone 70 / story 01 — cache-stable-launch (ADR-004/005): the shareable-prefix
  // flag, the chosen session model/effort and the held 1-hour cache window, at the
  // launch seam and the drive path, plus the pure session-model resolver.
  ...sessionModelTests,
  // milestone 33 (story 00) — per-install-node-identity: tasks 00–03
  ...identitySidecarPersistTests,
  ...selfHealHostnameMismatchTests,
  ...agentModelOverrideTests,
  ...agentModelSoloInertTests,
  ...modelTests,
  // milestone 49 / story 03 — the pane declares itself, and the gate says so. Task 00's fourth
  // host (34 cases over the SHIPPED affordance tables and the SHIPPED form/cost detector), task
  // 01's mount declaration (37 cases over the SHIPPED posture, read through the SHIPPED policy),
  // and task 02's amendment (64 cases over the gate's OWN exported detectors, including the
  // per-surface floor plant that deletes the home's mount site while the other two remain). The
  // AMENDED gate itself is registered at the top of this file and is unchanged in registration —
  // one part changed, two did not, and nothing was exempted.
  ...terminalGridPaneHostTests,
  ...terminalMotionReducedEscapeTests,
  // milestone 50 / story 04 — task 00: the spawn-outcome lane (A) and the producer fact
  // (B), plus the three gates ADR-008 decision 11 owes
  ...sessionSpawnOutcomeLaneTests,
];
