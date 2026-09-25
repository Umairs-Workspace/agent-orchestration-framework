
# 03 · The session waits and the loop keeps going — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### One composer at every needs-input site
Every `NEEDS_INPUT` goes through `awaitAnswer` in `src/loop/ask.mjs`: the wave's lanes, the shell's primary drive, the retry ladder and the verify branch. It reads the question, records it on the run, writes the ask file, notifies `session-needs-input` and narrates `NN/SS — waiting on you (<phase>, <elapsed>): <question>`, in that order.

### A waiting run stays alive on a ref'd wait
While a run waits, its record stays `running` with a live heartbeat, the process is held open by a ref'd `setTimeout` per check, and the wait is bounded by `scheduleToCloseMs` counted from the ask.

### The answer resumes the same session
An answer re-drives the ask's own session through `work:drive --answer`, and `spawnLaneDrive({ answerFile })` does the same for a lane. The answer is typed verbatim as the session's first input. A foreign or unreadable answer is refused before any mint or spawn (FF-13104).

### A waiting lane does not halt the loop
Under `refine_first` a waiting lane keeps its slot while the other lanes build and merge. At the bound it is parked (committed, not merged), set aside and notified `session-parked-unanswered`. `session-needs-input` is minted only by `parkedHalt`, and only when nothing else can run (FF-13105).

### `--resume` re-enters a standing ask
`aof work loop <scope> --resume` re-drives an answered ask and re-waits a waiting one with a fresh bound and no second notice. It also clears stale ask files. Ownership is read from the last ask's `parkedAt`.

### The loop reports its own halt and death
`loop-halted` fires once after the account, but never for `session-needs-input`, whose ask already went out. `loop-died` and `loop-relaunched` fire on `--resume` from the last loop-diag event (`readLastLoopDiagEvent`). A halt carrying parked lanes prints each ask block.

## Assumptions

- **The live PTY is not held** — the wait belongs to the run's owner, not the process. The answered session is resumed from its transcript (ADR-001 §2). A live-PTY mode would be additive.
- **A stop at level ≥ 1 parks a waiting run silently** — the operator is present, so no notice fires. An answer already in the file wins, except at level 2.
- **After a `--resume` re-entry the pre-ask turn goes uncharged** — spend is settled from the waiting drive's first baseline.
