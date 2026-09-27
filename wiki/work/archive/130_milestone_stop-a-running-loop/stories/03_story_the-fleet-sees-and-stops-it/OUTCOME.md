# 03 · The fleet sees and stops it — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### Presence carries the node's live loops
`readActiveLoops` beside `readActiveRuns` yields one eleven-key entry per live `loopRunId` (scope, level, cap, phase, cycle, ref, runId, supervised, `stop`); both presence producers (the heartbeat verb and the launcher tick) and the registry reshape carry it as `loops`, emitted LAST and only when non-empty, so a node with no loop publishes its record byte-identical to before (FF-13005).

### The status body names the serving node
`/api/mesh/status` carries `localNodeId` — the control node's id, `null` on an unconfigured machine (TECH_DEBT item 18 (b) discharged).

### One guarded loop-stop route in assign's shape
`POST /api/mesh/loop-stop` is admitted by the same same-origin + `application/json` guard as `/api/mesh/assign` (the hoisted `admitWriteRequest` / `resolveLocalWorkspaceRow`, TECH_DEBT item 44 discharged), lifts exactly `{ scope, workspaceId }`, resolves the local workspace and answers `stopLoop`'s document or its coded refusal.

### One line and one button on this node's card
The fleet node card's current-work region appends one line per live loop (`loop <scope> [· stopping | · cancelling] · <phase> <ref> · cycle <n> of <cap>`), drops `idle` when loops exist, and renders `Stop` then `Stop now` (destructive) only on the card whose node is `localNodeId`; a remote node's loop line renders with no button (FF-13006).

### The rung is remembered per drive
The card's rung memory is keyed to the drive — `rememberStopRung(memory, loopRunId, rung, runId)` — so a cancelled-then-resumed loop shows its button again on the new drive without a reload.

### The board and the Rust drift pin are untouched
`fleetCurrentWorkLines` and `nodeCurrentWork` are byte-identical, nothing under `ui/src/board/` moves, and `git diff -- ui/` names eight fleet files (FF-5307 re-pinned with that measurement).

## Assumptions

- **Liveness is the latest running record's** — a loop reads as live while its latest run under that `loopRunId` is `running`; a `needs-input` run left open keeps a finished loop's line on the card (m130/F-07).
- **The presence tick reads each item's runs twice** — `readActiveRuns` and `readActiveLoops` are separate passes, inside today's 25 ms presence budget.

## Gaps

### The loop line has no overflow rule
- **Status:** open
- **Discharge condition:** DESIGN §Surface 1 states the line's truncation/wrap rule (m130/F-08).
On the card's width the line truncates mid-anatomy (`loop 02 · continue 02/04 · cycle 1 …`).

### `Fleet.tsx` has zero line headroom
- **Status:** open
- **Discharge condition:** TECH_DEBT item 18(a)'s shared fleet layer lands, so the next card addition has a sibling file to go to.
`Fleet.tsx` is at 1560/1560 and `ui/src/fleet/` at 20/20 files; the next card change has nowhere to grow.
