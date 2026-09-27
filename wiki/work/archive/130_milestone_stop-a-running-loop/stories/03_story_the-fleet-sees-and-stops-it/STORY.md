---
type: story
number: 03
slug: the-fleet-sees-and-stops-it
title: "The fleet sees and stops it — presence gains an additive `loops` key read by the same pass as activeRuns, the status body names the serving node, one guarded loop-stop route in assign's shape, and one line + one button on this node's card"
parent: 130
depends: [2]
status: done
owner: product-owner
created: 2026-09-13
updated: 2026-09-23
adrs: [ADR-005, ADR-006, ADR-002, ADR-001]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/130_milestone_stop-a-running-loop/DESIGN.md
  - wiki/work/48_milestone_fleet-session-identity/ARCHITECTURE.md#ADR-004
  - wiki/work/38_milestone_cross-machine-worker-execution/DESIGN.md
  - wiki/work/TECH_DEBT.md
  - src/loop/stop-request.mjs
  - src/loop/stop.mjs
  - src/mesh/presence.mjs
  - src/mesh/launcher.mjs
  - src/commands/mesh/heartbeat.mjs
  - src/global-node-registry.mjs
  - src/global-mesh-query.mjs
  - src/mesh/ui-serve.mjs
  - src/board-ui.mjs
  - src/run-store.mjs
  - ui/src/fleet/api.ts
  - ui/src/fleet/runs.mjs
  - ui/src/fleet/runs.d.mts
  - ui/src/fleet/scope.mjs
  - ui/src/fleet/scope.d.mts
  - ui/src/fleet/Fleet.tsx
  - ui/src/fleet/assign-affordance.mjs
  - ui/src/fleet/AssignmentChip.tsx
  - test/mesh/presence/mesh-presence-record.test.mjs
  - test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs
  - test/mesh/ui/mesh-ui-serve.test.mjs
  - test/ui/fleet-scope.test.mjs
  - test/support/mesh-ui-assign-fixture.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/session/acd-captured-producer-fixture.test.mjs
  - test/arch/session/acd-session-presence-additive.test.mjs
  - test/arch/run/acd-active-runs-frozen-string-array.test.mjs
  - test/arch/mesh/acd-mesh-ui-read-only.test.mjs
  - test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs
  - test/arch/mesh/acd-mesh-ui-no-core-import.test.mjs
  - test/arch/ui/acd-fleet-face-single-mutation-route.test.mjs
  - test/arch/ui/acd-fleet-board-link-resolved.test.mjs
  - test/arch/testing/acd-ui-surface-file-budget.test.mjs
  - test/arch/loop/acd-loop-module-import-boundary.test.mjs
files:
  - src/mesh/presence.mjs
  - src/mesh/launcher.mjs
  - src/commands/mesh/heartbeat.mjs
  - src/mesh/ui-serve.mjs
  - ui/src/fleet/api.ts
  - ui/src/fleet/runs.mjs
  - ui/src/fleet/runs.d.mts
  - ui/src/fleet/scope.mjs
  - ui/src/fleet/scope.d.mts
  - ui/src/fleet/Fleet.tsx
  - test/mesh/presence/mesh-presence-record.test.mjs
  - test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs
  - test/mesh/ui/mesh-ui-serve.test.mjs
  - test/ui/fleet-scope.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/mesh/acd-mesh-ui-read-only.test.mjs
  - test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs
  - test/arch/mesh/acd-mesh-ui-no-core-import.test.mjs
  - test/arch/ui/acd-fleet-face-single-mutation-route.test.mjs
  - test/arch/ui/acd-fleet-board-link-resolved.test.mjs
  - wiki/work/TECH_DEBT.md
  - ui/src/fleet/assign-affordance.mjs
  - ui/src/fleet/assign-affordance.d.mts
  - src/global-node-registry.mjs
  - test/arch/ui/acd-fleet-assign-targets-item-workspace.test.mjs
  - test/arch/ui/acd-rendered-component-fed-by-route.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/mesh/session/mesh-session-index-attribution.test.mjs
  - test/session/session-spawn-outcome-lane.test.mjs
  - test/ui/terminals-home-route.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The fleet sees and stops it

## User story

As **the operator looking at the fleet (`http://127.0.0.1:4181/?mode=fleet`) while a loop runs on
this machine**,
I want **this node's card to name each live loop on a line of its own in the current-work slot
(`loop 129 · continue 129/04 · cycle 1 of 3`, `stopping`/`cancelling` once a request stands) from
an additive `presence.loops[]` the node already publishes beside `activeRuns`, and ONE Stop on this
node's card only — `Stop` (drain) then `Stop now` (cancel), absent after — that POSTs a guarded
`/api/mesh/loop-stop` in the exact shape of the assign route into `stopLoop` for that workspace,
while a remote node's loop line renders with no button**,
so that **the loop's existence and its stop are one glance and one click on the surface that
already shows what the node is doing, with nothing added to the board and nothing invented on the
wire that the presence record did not already carry the shape for**.

What lands (ADR-005, ADR-006 §1): `readActiveLoops` beside `readActiveRuns` (one eleven-key entry
per `loopRunId` from the running runs' `brief.loop`, `stop` read through story 01's module and
`STOP_LEVELS`); `assemblePresenceRecord` emitting `loops` LAST and only when non-empty (the
`buildId` discipline — six keys byte-identical when no loop runs); both producers (the heartbeat
verb and the launcher tick) and the registry reshape carry it; `localNodeId` stamped on the
`/api/mesh/status` body (TECH_DEBT 18 (b) paid); item 44's `admitWriteRequest` /
`resolveLocalWorkspaceRow` hoisted inside `ui-serve.mjs` with the three detectors re-aimed; `POST
/api/mesh/loop-stop` lifting exactly `{ scope, workspaceId }` and answering the verb's document or
its coded refusal; pure `fleetLoopLines` / `loopStopAffordance` / `rememberStopRung` in `runs.mjs`
and `nodeWorkRegion` in `scope.mjs` (`fleetCurrentWorkLines` and `nodeCurrentWork` byte-identical
— the Rust drift pin); ≤ ~10 lines of JSX in `Fleet.tsx`; `fleetApi.loopStop`; FF-5307 re-pinned
with the measurement.

## Tasks

- [x] `tasks/00_presence-carries-the-loops.feature` — `readActiveLoops` over the run records; the record's six keys byte-identical without loops; `loops` last and omitted when empty; both producers and the reshape carry it; `activeRuns` unchanged
- [x] `tasks/01_the-status-body-names-the-serving-node.feature` — `localNodeId` on the `/api/mesh/status` body from the control node id; `null` on an unconfigured machine; the projection untouched; item 18 (b) discharged
- [x] `tasks/02_the-loop-stop-route-is-assign-shaped.feature` — the two helpers hoisted and the assign/session routes calling them; `POST /api/mesh/loop-stop` admitted, lifted, resolved to the local workspace, answered with the verb's document or its coded refusal; the enumerations grown; item 44 discharged
- [x] `tasks/03_the-line-and-the-button-are-pure.feature` — `fleetLoopLines` (order, anatomy, `title`), `loopStopAffordance` (local-only, rung 1 → 2 → none, `max(wire, remembered)`), `rememberStopRung` (never lowers, never expires), `nodeWorkRegion` (drops `idle`, keeps the pinned lines)
- [x] `tasks/04_the-card-renders-and-repins.feature` — `Fleet.tsx` renders the entries in the existing paragraph map with the DESIGN's classes and the assign affordance's hold guard; `fleetApi.loopStop` is the one fetch; `Fleet.tsx` ≤ 1,560; FF-5307 re-pinned with `git diff -- ui/` naming only the six fleet files and nothing under `ui/src/board/`

## Notes

- No new file under `ui/src/fleet/` (20/20) or `src/mesh/` (34/34); every suite here is extended
  (`test/ui`, `test/mesh/ui`, `test/mesh/presence` are at ceiling). Story 05 owns the budget table.
- DESIGN §Surface 1 wrote `loops` as always-present; ADR-005 §1 rules it OMITTED when empty and
  every reader treats absence as `[]` — the ADR governs (recorded in STATE).
- `acd-mesh-ui-no-core-import`'s allow-list grows by exactly `../loop/stop.mjs`; the face imports
  no `commands/*`.
- FF-5202: no `loops-*` token enters `ui/`; `loop-stop` and `work:loop` are outside its set.
- Build (2026-09-21): the loop line's Stop rides `runAssign` (assign-affordance.mjs) with two
  additive options (`refusalCopy`, `timedOut`) rather than a second copy of its deadline race —
  so `git diff -- ui/` is EIGHT fleet files, not six, and FF-5307's re-pin says so. Item 44's
  hoist had a FOURTH detector requiring the copy (`acd-fleet-assign-targets-item-workspace`),
  re-aimed with the three. `files:` widened accordingly; the widened set is listed above.
