# 209/03 · Conflict and resync

## Mechanism

The board store gains an `observe` handle. The launcher already arms one per workspace through `createWorkItemObservations`, so polling needs no new daemon wiring. Each poll calls the adapter's `readChanges` from the saved feed position at the five-second interval measured in spike 206. It compares each reported revision with the link's acknowledged revision and the tracked values. A revision AOF acknowledged, or one that changes nothing AOF maps, advances the acknowledgement. Any other change records a conflict. Observations and conflicts reach disk before the feed position moves. A feed that answers `coverage: false` falls back to reading every linked item by ID.

Keep conflicts in a module of their own beside the journal. Record each one under the link's stable key, with the ref, board ID, observed revision and whether the item was deleted. A conflict is a durable latch, not a pending write, so it stays distinct from `pending` and `acknowledged`.

Three doors read the latch. `mutateBoardLifecycle` and placement refuse `work-board-conflict` before any write. A stale refusal from `reconcileBoardItem` triggers a reread and classification instead of a bare pending result. Dispatch refuses a lane whose milestone contains a conflicted item. The loop checks the latch before driving each phase and halts with a new operator stop, `board-conflict`, appended to `LOOP_STOPS` and `OPERATOR_STOPS`. It is the operator's stop because resync is an explicit operator request (ADR-003), so no repair session may clear it. "Contains" means the loop's or lane's scope shares the conflicted item's top-level ref. A conflict on 17/02 therefore holds every loop and lane under milestone 17 and none under 18 (Q2).

`aof work resync-board <ref>` follows the `publish-board` command's shape. Under the journal's write claim it reads the current revision, writes only AOF's tracked fields and relations expecting that revision, and reads the item back. It clears the latch only when the revision and the canonical values both match. A deleted item is refused with the recycle-bin instruction (Q3).

## Verification step

Use the project-owned fixture adapter from 02's suite, extended with a scripted change feed. Link 17/02 and 18/00, then script a teammate's state change on 17/02's item. Poll and restart the store, then show that a status change on 17/02 is refused while one on 18/00 lands. Drive one loop scoped to 17 and one scoped to 18, and confirm that only 17's halts `board-conflict`. Run `resync-board`, once with a competing edit between the read and the write, then cleanly. Confirm that the comment and the unmapped field the fixture planted survive. Resume the loop.

## Out of scope

Story 04 owns the daemon access probe. Story 05 replays the 205 captures and exercises Azure's recorded feed through the public CLI. Showing a conflict in read verbs (`find`, `status` with no target) is left for later. The refusals and the loop halt name it.
