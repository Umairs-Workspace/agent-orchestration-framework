---
doc: state
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files — State

## Progress

- 2026-11-24 — Refined: six stories. Story 00 supplies the board definition that 01, 02 and 04 use. Story 03 extends publication with conflict recovery. Story 05 exercises the assembled workflow and owns the live Azure evidence.
- 2026-11-25 — 00–02 built and reviewed, then committed at `672446a2`.
- 2026-11-26 — 03–05 refined, built and reviewed. The first `aof:verify 209` accepted 00–04 and declined 05 on blocker F-02. 05's task04 fixed F-02.
- 2026-11-26 — The second `aof:verify 209` pass closed F-02 and provisioned the "AOF Agile" process and the AOF Board Test project in `umair-butt`, with the operator's go-ahead. 05's live run passed both scenarios, and 05 was accepted. 03–05 were committed at `bc9776cb`. The gate was red there (F-03, F-04) and at `26ddfca0` (F-05). Each was fixed inline. The operator stopped a third full run at `eb2c25c4`, and 209 was accepted on a targeted 831-case run with a recorded gate override (VERIFICATION, Accept decision).

## Closure record

Compacted at verify, 2026-11-26. The build-time notes as they stood, including each story's write-set overruns, review rounds and by-file test counts, are in this milestone's commit `eb2c25c4`.

- **Durable decisions** are ADR-001 to ADR-004 (ARCHITECTURE). These were settled during refine and build and stay as recorded:
  - AOF drives board updates, and the local folder stays the document home through completion. First publication happens when refinement completes (209/02 Q1). Archiving is local file mode only (209/02 Q2).
  - Only someone else's change to a tracked field stops the workflow: title, state, parent, dependencies or order (209/03 Q1). The stop covers every workflow under the same top-level ref (209/03 Q2). A board-deleted item is never recreated by resync (209/03 Q3). `board-conflict` is an operator stop that no repair session clears.
  - `aof work board-access` is read-only, and the desktop preflight runs it in the daemon's environment (209/04).
  - `BOARD_KEY_FILE` lives in `identity.mjs`, which keeps `work find` at 763 modules (FF-16004).
- **Left in Azure DevOps (`umair-butt`):** the process "AOF Agile", the project AOF Board Test, items #2508–#2510 and the fields `Custom.AofRef`, `Custom.AofKey` and `Custom.AofMembership`. Spike 206's process "AOF Agile spike 206" and items #1–#2507 remain from before.
- **Carried forward:** two story proposals from 209/03 review, a board conflict shown in the read verbs and a cheaper first position for Azure's feed, are open gaps in 03's OUTCOME. The daemon payload predates 209/04, an open gap in 05's OUTCOME. Board mode on Windows and WSL, and ADR-003's diagram, are open gaps in the milestone's OUTCOME.

## Feedback (for retro)

Archived at verify. Its lessons graduated into `RETROSPECTIVE.md` (209 R1–R3) and into each story's own (03 R1–R3, 04 R1–R2, 05 R1–R4).
