# 53 · The loop as a CLI artifact — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — SPEC.md remains that.
-->

## Delivered

### `aof work loop <ref|range>` — the code-owned loop shell
The loop's sequencing, phase dispatch, gate, bounded retry and stop conditions are code in
`src/commands/loop.mjs` over the pure engine `src/work-loop.mjs`; no prose document decides them.

- **Never driven for real** — every claim about the shell rests on fixtures and the injected spawn
  seam; it has not driven a milestone end to end under observation (F-12, waived).
- **Foreground only** — the launcher body owns the terminal for the whole run; nothing resumes it
  unattended.

### The registered `work:loop` command is a read-only probe
`work:loop`'s registered `run` returns a ten-key `LoopState` and never spawns, mints or writes; the
executing form is the `cli.launch` body, which `--json` and `dryRun` resolve before reaching.

- **The probe/launcher split is the machine face** — a caller that reaches the registry gets the
  probe; only the CLI launcher path executes.

### Three atomic phase drivers — `work:drive-refine|continue|verify`
Each spawns one session running that phase's existing prompt through
`src/agent-session-driver.mjs`, watches the transcript to completion and gates; the three ACD phase
prompts are byte-unchanged at their pinned addresses.

- **The prompts stay the agent node** — the CLI owns the shell only; no phase logic moved into code.

### The PTY session driver has one home
`src/agent-session-driver.mjs` holds the seventeen frozen names, re-exported by
`src/mesh-worker-execution.mjs` so all pre-existing importers bind the same values by identity; the
sink is measurably smaller and carries a shrink-only line ratchet.

- **The re-export is the compatibility surface** — dependents resolve through the sink, so a future
  extraction must keep following the chain rather than typing a second filename.

### The ladder ships L1 and L2; L3 is locked
`LOOP_LEVELS` is the frozen pair `["L1","L2"]` and `LOCKED_LOOP_LEVELS.L3` refuses with a coded
refusal before any spawn or mint, naming milestone 55 as its unlock.

- **L1 writes nothing** — a full L1 drive reports one act per in-scope item through the report
  channel and moves no byte, adds no path and mints no run record.

### Loop state rides the run record
A loop's declaration is a seven-key `brief.loop` on the run record and round-trips unchanged through
`work:run-status`; `--resume` reads it back. There is no loop store and no command-side file write.

- **Observability is the run store's face** — loop state reaches the board through the same surface
  as every other run, never a side channel.

### Loop-Ready scores on `aof work doctor`, registry-optional
`aof work doctor` reports a Loop-Ready percentage that composes milestone 52's structural checks when
a loop registry is declared and falls back to its own base checks when none is. This repo reports
**56% (5/9) — clears L1**, blocking on grounding, pairing, reference-ownership and actuator-arbitration.

- **The scorer reaches the registry only through a deferred command invocation** — it holds no
  import of the loop-registry module and sits outside `CHECK_GROUPS`.
- **A repo with no registry still scores** — an absent registry removes five rows from the
  denominator rather than failing the check.

### The loop registry ships in the bundle at `.aof/loops/`
Nine framework loop records install into a consumer repo's `.aof/loops/` as verbatim, framework-owned
bundle assets, each carrying the `# aof-generated:` stamp; `work loops show` and `work loops validate`
read them from `workspace.aofDir`, the sole production home.

- **Consumer edits are preserved, not overwritten** — an edited record produces a drift warning and
  keeps its bytes; `--force` restores the shipped ones.
- **The retired `wiki/work/loops/` home is gone** — nothing reads a work-stream registry path.

### `/aof:autonomous` hands its range to the shell
`src/bundle/commands/autonomous.md` names `aof work loop <range> --level L2` as its body and carries
none of the seven loop-shell tokens it owned before; `--solo` and `--ship` survive, re-anchored on the
shell's report. The door keeps its id, file, namespace, argument hints and every caller.

- **The prose loop is gone from the body, not the door** — one authored source still renders to both
  the Claude command and the mapped Codex skill.

### Thirteen architectural controls enforce the above, and each has been watched to fail
FF-5301…FF-5313 are landed, registered in the runner's own labelled milestone-53 blocks, green, and
each was red-probed at accept by mutating its own subject.

- **Non-vacuity is measured, not assumed** — every probe produced a failure message naming the
  invariant it broke.

## Assumptions

- **The spawn seam is faithful** — every drive-path claim is asserted through an injected
  `{ptySpawn, which}` seam with real provider resolution; the real PTY is exercised only by 53/04's
  black-box child lane.
- **Transcript watching settles on wall-clock quiet stretches** — completion detection depends on real
  elapsed time, which makes a small number of lanes load-sensitive on a busy machine (F-06, F-07).
- **`work.controls.runners` is unconfigured** — `aof work doctor` cannot check that a runner names each
  control file, so registration is evidenced by FF-5311 rather than by doctor.
- **The registry stamp rides the frontmatter comment** — the nine records self-identify with a `#`
  comment inside their frontmatter, which the record grammar ignores; the manifest hash, not the stamp,
  is what drift detection actually compares.

## Gaps

### The soak that defines "proven"
- **Status:** open
- **Discharge condition:** one `aof work loop <NN> --level L2` run on this repo's own stream, driven
  to `done` or to exactly one genuine halt, observed start to finish by an operator who wrote their
  reading of the halt down before reading the shell's stop id.

`aof work loop` has never driven a real milestone end to end under observation. ADR-008 §3's
definition of "proven" is not met; the gate was runnable at accept and was waived by operator decision
(F-12), not closed by evidence.

### The prose prompt still exists
- **Status:** open
- **Discharge condition:** the soak above is signed off, AND `resolveDirectivePhase`'s `"autonomous"`
  return is superseded in the same diff that deletes the file (ADR-002 §4).

`src/bundle/commands/autonomous.md` is still shipped. Its body is a shell-out rather than a second loop,
so there is one home for the rules, but the file itself has not been removed and accepting this
milestone does not authorise raising the chore that would remove it.

### L3 is declared and locked
- **Status:** open
- **Discharge condition:** milestone 55 supplies the anchored measurements and the enforced frozen set,
  and unlocks the level.

`LOCKED_LOOP_LEVELS.L3` exists as a refusal, not a capability. No unattended self-driving loop is
available at any level.

### Loop-Ready blocks L2 and above in this repo
- **Status:** open
- **Discharge condition:** grounding, pairing, reference-ownership and actuator-arbitration each
  resolve — milestones 55, 57 and 58.

The score reports 56% (5/9) and clears L1 only. The readiness bar an unattended run must clear is
declared and measured, and this repo does not clear it.

### The board has no door for the loop
- **Status:** open
- **Discharge condition:** a deliberate decision to give the board a "drive this range" affordance,
  taken as its own work item.

`work:loop` and the three `work:drive-<phase>` commands are CLI-only: they are recorded in
`BOARD_DEFERRED`, so no `/api/work` route serves them and the board can neither start nor observe a
loop as a loop.

### No control-runner check
- **Status:** open
- **Discharge condition:** `work.controls.runners` is configured, so `aof work doctor` can run leg B
  against each declared control.

`aof work doctor 53` reports `control-runner-unchecked` for all thirteen controls. That a runner
invokes them is proved by FF-5311 and by reading the runner's blocks, not by the doctor.
