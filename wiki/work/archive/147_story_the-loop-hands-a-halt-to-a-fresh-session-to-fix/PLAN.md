# 147 · The loop hands a halt to a fresh session to fix, then resumes — build plan

## Mechanism

The seam is `runLoopLaunch` (`commands/loop.mjs`), which already receives the loop's final raw act
through `onLoopEnd` before it notifies. Before notifying, it asks the engine's pure
`decideHaltRepair({ stop, repairOn, priorRepair })`, which returns `repair` or `stop`.
`REPAIRABLE_STOPS` is a new engine export holding the three lane stops. A parked-ask halt is never
handed over.

On `repair` the launch does four things:
1. Mints a run on the halted ref with `brief.loop = { loopRunId, phase: "repair", cycle: 1 }` and
   `brief.halt = { stop, producer }`.
2. Writes the hand-over JSON to `loop-repairs/<runId>.json` beside `loop-fixes/` under the aof
   home, never inside a checkout (129/ADR-005 §3).
3. Spawns `aof work drive repair <ref> --run <runId> --halt <file> --json` through
   `ctx.spawnPhaseDrive`, the seam the sequential drive already uses.
4. Settles the run with `childDriveOutcome`'s answer.

On `done` the launch narrates the `Repaired …` line and calls `runLoopBody({ ...input, resume:
true })`, in a loop, so a second halt goes through the same decision. Because the input object is
the same one, the 143 session choices carry over with no extra work.

`priorRepair` comes from the run store: a `repair` run under this loopRunId, on this ref, with this
stop. That makes the bound hold across an operator `--resume`, which keeps the loopRunId. A
`duplicate-run` refusal on the mint is a stop, with `repair=refused:duplicate-run` in Details.

**Defaults taken (EXAMPLES.md Q5–Q8):**
- **Q5:** the session runs in the PRIMARY checkout and is handed the lane path. Merge-home and lane
  reopen both act from the primary, and the lane may not exist.
- **Q6:** the outcome is recorded as its own run on the halted ref (the design above).
- **Q7:** the loop resumes in the same process. It is not relaunched by a supervisor, because an
  unsupervised loop has none (131/ADR-009 §6 is the supervised path, and stays as it is).
- **Q8:** `STATE.md merge=union` in a nested `<work.dir>/.gitattributes`. A milestone STATE.md's
  frontmatter is only `doc: state`, so union cannot duplicate a key.

`work:drive-repair` is a fourth `createPhaseDriverCommand`. It types
`/aof:repair <ref> <haltFile>` and resolves its session as `continue` (`SESSION_PHASES` stays
three). `createWorkLoopContribution` takes it as a fifth command.

Source fixes. `ensureWorkDirGitFiles` sits beside `ensureAofGitignore` in `aof-gitignore.mjs`, uses
the same additive idiom, and is called from init and update. In `commitWorktreeChanges`, the
unscoped door adds one more step after the `.aof` reset: `git rm -r --cached -q --ignore-unmatch --
':(glob)**/runs/.heartbeats.ndjson' ':(glob)**/runs/.heartbeats.ndjson.batch'`. This keeps a live
queue out of a commit and untracks one an earlier commit tracked. The mesh worker's commit gets the
fix too, because it is the same verb.

## Verification step

Run `node scripts/test.mjs --only` over the story's suites and the two arch-tests in `reads:`, with
`AOF_GLOBAL_HOME` isolated. Then run `aof work update --dry-run --json` at the root: the three
repair renders must report `skip`. Then run `git ls-files | grep heartbeats.ndjson`, which must
print only source paths and no `runs/` queue.

Task 04 (`@manual`) is the real proof. A loop whose account shows the halt and then a normal halt
line, with no `Repaired` line, means the decision was not reached. The usual cause is the launch
reading `state.act` (whose `remedy` is dropped) instead of the raw `ended.act`.

## Out of scope

- Repairing any other stop — the operator settled lane halts only (Q1).
- A repair under `aof work drive` by the supervisor or the trigger — only the foreground launch
  repairs; a daemon never spawns a loop (131/ADR-009).
- Moving lane build notes out of the milestone STATE.md — union makes it unnecessary.

## Known traps

- `git rm --cached` of a tracked queue makes merge-home DELETE the primary's working copy when the
  lane merges. The consumer treats ENOENT as empty (`heartbeats.mjs`), so that is harmless. Do not
  "fix" it with a `--force`.
- The notification must fire once, on the final halt only. A repaired halt sends none.
- `acd-gate-propagation-never-discards` bans destructive verbs in the merge module. The union lives
  in `.gitattributes`, so add no git verb there.
