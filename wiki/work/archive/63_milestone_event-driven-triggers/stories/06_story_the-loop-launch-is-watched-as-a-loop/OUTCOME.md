# 06 · The loop launch is watched as a loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### An unattended loop launch is watched as a process, not as a session
`loopShapedTranscriptWatch(launchOptions)` (`src/mesh-worker-execution.mjs`) returns `null` for every session launch and, for an unattended loop, supplies both transcript-watch seams as functions resolving `null` — each the driver's own documented no-op — so a dispatched `aof work loop` is no longer bound to the first inner session it writes into its own worktree and killed roughly ten seconds later with `done`.

### An unattended loop run settles on the process exit the loop already has
Settlement falls through to `term.onExit` and the delivered exit mapping: exit 0 settles `done`, non-zero settles `failed`. No thirteenth loop stop, no second completion signal and no halt vocabulary exists in any mesh module; `LOOP_STOPS` is still 53's frozen twelve.

### Exactly two spawn-bag forwards are launch-conditional, and each takes exactly one expression
`watchTranscriptSessionId` and `watchTranscriptCompletion` are `injected ?? loopShape`; `ptySpawn`, `which`, `onOutputChunk` and `onSessionEnd` remain bare shorthand, and a fifth that stops being one fails `FF-6306`. `src/agent-session-driver.mjs` is byte-unchanged — no PTY, streaming, completion-detection or NEEDS_INPUT machinery moved.

### An injected watch still wins over the loop shape
A caller supplying its own session-id or completion watch keeps it for every launch kind, so no launch kind can render a supplied producer inert.

### A session assignment is handed exactly what a delivered tree hands it
A session-phase directive supplies no session-id watch and no completion watch at all, so the driver reaches its own session-shaped default unchanged.

### The loop-shaped seam is held by a control that has been seen red
`FF-6306` carries the ADR-013 §1 leg with its own positive control — the session-shaped default is run first over the same worktree and must bind a planted inner transcript before anything is concluded from the loop-shaped seam refusing to — and the relaxed §3a form's red probe is the revert to bare shorthand, which reds both the structural and the driven leg.

## Assumptions

- **The driver's null seams stay no-ops** — a null session id skips `onSessionIdCaptured` and never arms the completion watch (`src/agent-session-driver.mjs:1051-1060`, `:1298`), and a null completion result is ignored (`:1329`); the fix supplies seam VALUES and edits no machinery, so it rests on those three sites keeping their delivered meaning.
- **`done` on an assignment means the dispatch ended normally, not that the item is complete** — a loop halting on a member of `LOOP_STOPS` exits 0 and settles `done`, leaving the item's own status telling the truth and `aof work loop <scope> --resume` as the continuation.
- **`aof work loop` sets no exit code of its own for a halt** — a completed walk and a declared stop both exit 0, which is what makes the delivered mapping the right one rather than an approximation.

## Gaps

### An unattended loop run's output has no route to the fleet terminal view
- **Status:** open
- **Discharge condition:** a run-scoped (rather than session-scoped) frame identity that the fleet mirror accepts, so an unattended loop's output binds to the run it came from without a claude session id standing in for one.
With no session id, this run's terminal frames carry a null tuple and the fleet mirror drops them (ADR-014 invariant 4), so an unattended loop is not visible in the terminal view. Inventing an id — the run id or the assignment id — is refused: the seam's contract is *the session id a transcript is written under*, and a synthetic value there is written onto the run record by `captureSessionIdOnRecord` and read downstream as if a transcript existed.
