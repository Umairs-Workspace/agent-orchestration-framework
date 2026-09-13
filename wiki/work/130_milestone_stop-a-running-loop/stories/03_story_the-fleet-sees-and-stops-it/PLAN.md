# 03 · The fleet sees and stops it — build plan

## Mechanism

Three seams, each an existing one widened by one fact. On the NODE, presence assembly already
reads every item's run records once to answer `activeRuns`; `readActiveLoops` walks the same
records and reduces the `running` runs that carry a usable `brief.loop` to one entry per
`loopRunId`, asking story 01's module for a standing request and mapping its level through
`STOP_LEVELS`. `assemblePresenceRecord` appends `loops` after `buildId` in exactly `buildId`'s
shape — present only when it says something — so the eleven suites that deep-equal the record's key
list stay green with no re-pin. The launcher's tick is the record this machine actually publishes
(the heartbeat verb's record is overwritten by it), so BOTH producers pass the key or the fleet
never sees it.

On the WIRE, the fleet server stamps `localNodeId` on the status body the way `board-ui.mjs`
stamps `nodeId` — a fact about the server, not the store, so `shapeGlobalStatus` is untouched —
and gains a third write route that is a COPY of assign's admission and workspace resolution made
into two helpers first (TECH_DEBT item 44's hoist, inside `ui-serve.mjs` because `src/mesh/` is
full), then `stopLoop(workspace, { scope })` from story 02's core, answering its document verbatim.

In the UI, every rendered fact is precomputed in `runs.mjs` / `scope.mjs` (node:test drives them
without React): the loop lines, the affordance (`button: null` unless the payload's `localNodeId`
is this card's node and the rung is below 2), the never-decaying rung memory. `Fleet.tsx` swaps
one call (`nodeCurrentWork` → `nodeWorkRegion`) and maps the entries inside the paragraph block it
already renders, with the assign affordance's in-flight hold as the click guard.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`: `node scripts/test.mjs --only test/mesh/presence/mesh-presence-record.test.mjs test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs test/mesh/ui/mesh-ui-serve.test.mjs test/ui/fleet-scope.test.mjs test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs test/arch/mesh/acd-mesh-ui-read-only.test.mjs test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs test/arch/mesh/acd-mesh-ui-no-core-import.test.mjs test/arch/session/acd-captured-producer-fixture.test.mjs test/arch/testing/acd-ui-surface-file-budget.test.mjs`.
Then the end-to-end observation: stand up `serveMeshUi` over a fixture whose one workspace holds a
`running` run with a `brief.loop`; `GET /api/mesh/status` carries `localNodeId` and a `loops[0]`
with eleven keys and `stop: null`; a same-origin `POST /api/mesh/loop-stop {scope, workspaceId}`
answers 200 with `request: "drain"` and a file appears under `<home>/mesh/loop-stops/`; the next
status answers `stop: "drain"`; a cross-origin POST is 403 before any read; `npm run build` in
`ui/` passes and `wc -l ui/src/fleet/Fleet.tsx` ≤ 1560; `git diff --stat -- ui/` lists only the six
fleet files.

A wrong build shows as: the six-key record changing its key list when no loop runs (a re-pin
demanded by eleven suites), a `loops` entry from a remote workspace, a button on a card whose node
is not `localNodeId`, a fetch string in `ui/` other than the one in `api.ts`, or a `git diff -- ui/`
touching `ui/src/board/`.

## Out of scope

- The desktop's rows and the declarations producer's `stopped` set — story 04.
- The board — 53/ADR-004 froze it; `src/board-ui.mjs` byte-identical, nothing under `ui/src/board/`.
- A remote node's stop — the line renders, the button does not; ADR-006.
- Any new `test/**` file or budget row — story 05.

## Known traps

- `fleetCurrentWorkLines` is pinned byte-for-byte to the Rust `current_work()` by
  `acd-captured-producer-fixture`: the loop line is a SIBLING projection composed in
  `nodeWorkRegion`, never a line inside that function.
- FF-5307's `ui/` hash: re-pin ONLY with the measurement written into the pin comment (the three
  precedents there show the shape); a re-pin without it is the rubber stamp the control warns of.
- The launcher's `assembleActiveRunsAndSubsumedWorkspaces` is the producer that matters; a key
  added to `heartbeat.mjs` alone is erased on the next tick.
- Item 44's three detectors REQUIRE the duplication today; re-aim them at the helpers in the same
  diff or the hoist reds them.
