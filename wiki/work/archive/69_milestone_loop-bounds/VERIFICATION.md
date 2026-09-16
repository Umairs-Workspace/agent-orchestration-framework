---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Four sections: the evidence, the fitness register (the red probe per declared control), the
  findings, and the accept decision. Write only the sections that have content — the absence of a
  section is information, and an empty "None" placeholder is not.
-->
# 69 · Loop bounds — Verification

<!--
  OPENED AT REFINE (2026-08-21), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept
  decision to write — and an empty "None" placeholder is not information. Those three sections are
  authored by `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eleven controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 69` reports as
  `verification-register-missing`. Every row's red-probe cell holds the frozen placeholder, which
  reads as a MISSING probe — the honest state at refine, and the state each row leaves the moment
  its arch-test lands and is observed failing.
-->

## Fitness functions

<!-- THE RED-PROBE REGISTER. This block CITES: every row resolves to a declaration in the sibling
     `ARCHITECTURE.md` `## Fitness functions` register and declares nothing of its own.

     The `red probe` cell records what was changed to make the control fail, and the message
     observed. A control must fail when the invariant it guards is broken, so the probe is that
     assertion's positive control. A guard whose passing state is "found nothing" is
     indistinguishable from a broken one by every signal except a red probe.

     ALL ELEVEN CONTROLS LANDED by the 2026-08-23 integrated verification pass. Each remains owned
     by its subject story — 69/00 carries FF-6901 + FF-6902; 69/01 carries FF-6903 + FF-6904;
     69/02 carries FF-6905; 69/03 carries FF-6906; 69/04 carries FF-6907 + FF-6910 + FF-6911;
     69/05 carries FF-6908 + FF-6909.

     FOUR OF THE ELEVEN EXTEND A GUARD ALREADY IN SERVICE (FF-6901, FF-6904, FF-6905, FF-6911). Their
     `enforced by` file already exists and already passes, so `control-unresolved` never fires for
     them — which makes the red probe the ONLY evidence that the *extension* is armed. An extension
     that was never observed failing is indistinguishable from an extension that was never written.

     FF-6909 WAS DECLARED AT THE 2026-08-22 CONTRACT AMENDMENT, not at refine, and its subject is an
     ORDERING. Its red probe is therefore a reordering: publishing the park before the process is
     confirmed gone, or clearing it after a resumed process exists, must trip it — a guard that only
     checks the code's presence would pass on both.

     FF-6910 AND FF-6911 WERE DECLARED AT ADR-006's 2026-08-22 AMENDMENT, when independent review
     rejected the first answer to 69/04's per-machine half. Both are 69/04's. FF-6910's subject is an
     ORDERING and a SOURCE: the counted set is read from the lanes git reports, and it is read BEFORE
     any lane is opened — so its red probe is a reordering (count after materialising) or a
     substitution (count something other than the lane set), either of which must trip it. FF-6911
     EXTENDS 69/04's own landed guard rather than joining it with a sibling, so — like the three
     above — the red probe is the only evidence the extension is armed: adding a door that starts or
     resumes work without consulting the counted set, or re-spelling the occupancy predicate in a
     second module, must trip it.

     FF-6907 HAS LANDED (18d642f) and no longer carries `pending` in `ARCHITECTURE.md`. Its invariant
     was RESTATED by the same amendment to what the landed control actually asserts; the discredited
     clause — a production caller read as the admission authority — is now FF-6910's subject. A
     restated invariant over a landed file was not cleared until its self-check planted the
     ungoverned/open-after-send variants recorded below.

     FF-6908 IS A NEGATIVE CONTROL OVER AN UNCHANGED FILE. Its subject is what 69 does NOT do to
     `src/run-store.mjs`. Its red probe is therefore the interesting one: adding a seventeenth key
     to the record, or a sixth state to LEGAL_TRANSITIONS, must trip it — a guard that passes
     because it inspects nothing would look identical on every other signal.

     No row below remains pending. Each control's production-tree assertion and its planted-defect
     self-check ran in the same registered suite; the red-probe cells state the plant observed. -->

| id | control | landed | red probe (what was broken, and the message observed) |
|---|---|---|---|
| FF-6901 | One bound home; `work.dispatch.concurrency` and `work.autonomous.maxAttempts` not annexed | **green**, 2026-08-23 | The suite planted a second `work.loop.*` reader, a duplicate heartbeat default, the retired heartbeat key, and a `maxAttempts` read in the new leaf. The shared classifier named each second home/annexation; the unmodified tree reported none. |
| FF-6902 | No framework loop record declares `uncapped`; every `config:` pointer resolves | **green**, 2026-08-23 | Removing the resolver registry made every real config ceiling unresolved; a temporary module pointer to a missing export was also rejected. Both use the same loaders/checkers as the production registry. |
| FF-6903 | Liveness is consumed, never pinged; one staleness constant | **green**, 2026-08-23 | A planted `setInterval(() => heartbeat())` tripped the periodic-ping detector, and replacing `heartbeatFromConfig(ws)` with literal `900000` tripped the second-threshold detector. |
| FF-6904 | Every bundled hook body derives nothing and exits 0 on every path | **green**, 2026-08-23 | The class guard enumerated both bundled `.mjs` hook bodies and their exec-form descriptors. A planted `src/` import, `loadWorkspace()` call, and `process.exit(2)` produced all three expected violations. |
| FF-6905 | Enforcement is out-of-process; no bound argv is constructed for `claude` | **green**, 2026-08-23 | Appending a planted `"--max-turns"` argv to the measured driver source tripped the model-bound detector; the live source arms both timers and reaches `term.kill()`. |
| FF-6906 | Progress is measured, never judged; the ledger's writer is append-only | **green**, 2026-08-23 | A planted import from `agent-model.mjs` tripped the judge-surface detector; replacing `appendFile` with `writeFile` tripped the rewrite detector. |
| FF-6907 | One production admission door per surface, each consulting its bound before it opens work; one concurrency resolution site | **green**, 2026-08-23 | The self-check planted an unpooled local open, moved mesh counting after send, added an ungoverned scheduler, and removed scheduler serialization; each was named by the production classifier. |
| FF-6908 | No lease store; `run-store.mjs`'s key set and `LEGAL_TRANSITIONS` byte-unchanged | **green**, 2026-08-23 | Planted lease symbols, a `slot_leases` table, a claim file write, and a `slot_claims` insert were all rejected. The frozen `run-store.mjs` SHA-256 also matched `40fd3ee61226cb3d25d411e4dbde6d87586525da27ba69433eecdb053e52d3dd`. |
| FF-6909 | The park is published once, after a confirmed exit; the durable reactor admits the park edge and no other non-terminal state; the clear precedes the resumed spawn | **green**, 2026-08-23 | Live and duplicate park publications, broadened non-terminal admission, and clear-after-spawn mutations each tripped the same ordering/cardinality detector used on production sources. |
| FF-6910 | The local slot is the LANE, counted before one is materialised; an over-bound member is refused with a code; no lane-occupancy fact is persisted outside git's own worktree list | **green**, 2026-08-23 | Ordering, occupied-set, refusal-code, projection-store, persisted lane-registry, and persisted lane-cache plants each tripped the source-wide guard. |
| FF-6911 | Occupancy membership has one home; every door that starts OR RESUMES work reads the counted set against the bound before it sends | **green**, 2026-08-23 | A second occupancy definition, a re-spelled state predicate, a once-guard count, and an uncounted resume door each failed the shared-membership/door classifier. |

## Verification evidence

### Integrated milestone lane — 415 assertions, green, measured four times

Re-measured **2026-08-23** at the accepting `aof:verify 69` pass, after the two blockers the
previous pass left open (F-69-V4, F-69-V5) were closed in the tree. Each registered suite is
imported by name and its array run under a per-test hermetic `AOF_GLOBAL_HOME`, mirroring
`scripts/test.mjs`'s own loop — the whole-repo runner cannot be used on this control node, where
`global-work-propagation` binds `:4182` and the live control daemon holds it.

The lane was run **four times** rather than once, which is what surfaced F-69-V6: the two reds seen
across those four runs were in different suites each time, neither of them 69's, and both traced to
a concurrent milestone-70 verification writing into this tree mid-run. **Milestone 69's own six
lanes were green in all four runs.**

| lane | count | result |
|---|---:|---|
| 69/00 — declared bounds, review cap, resolved ceilings, FF-6901/6902, suite registration | 103 | green |
| 69/01 — heartbeat consumption, bundled hooks, FF-6903/6904 | 23 | green |
| 69/02 — four deadlines, FF-6905, driver door + gate aim | 46 | green |
| 69/03 — progress ledger and policy, FF-6906 | 23 | green |
| 69/04 — local and mesh admission, FF-6907/6908/6910/6911 | 112 | green |
| 69/05 — parking and resume, FF-6909 | 31 | green |
| adjacent modules 69 edits — mesh directive/dispatch/outbox, phase-brief, artifact set, bundle | 77 | green |
| **total** | **415** | **green (runs 1–3); run 4 carried one non-69 red, F-69-V6** |

All eleven fitness controls are inside the green count.

### The two blockers the previous pass left open are closed

- **F-69-V4** — the driver's undeclared-completion idle window now reads the declared bound. The
  production call site (`src/agent-session-driver.mjs:1170`) resolves
  `idleMs: positiveMs(deadlinePolicy?.heartbeatMs) ? deadlinePolicy.heartbeatMs : COMPLETION_IDLE_MS`,
  and all three production callers supply that policy from the workspace —
  `src/commands/drive.mjs:212` and `src/mesh-worker-execution.mjs:1689,2230`, each via
  `loopBoundsFromConfig(ws)`. Re-run of the `@manual` scenario below is green.
- **F-69-V5** — the orphaned inward binding is gone. `src/mesh-worker-execution.mjs:158` now imports
  `{ defaultSpawnRuntime, driveInteractiveClaudeSession }` — `defaultPtySpawn` was dropped from the
  inward clause and kept in the re-export block (`:911`), the second of the two remedies the finding
  named. `test/agent-session-driver-door.test.mjs` derives the inward census from the sink's own body
  and is green, including the 53/00 task00 lane that was red.

### `@manual` — 69/01 task 02, one staleness constant

The milestone's only `@manual` feature; there is no `@uat` scenario anywhere in 69, so no human step
applies. **Run, not read** — this is the lane whose scenario 2 caught F-69-V4 by being executed
rather than inspected. Agent-run inline: the three named consumers resolved at one moment against a
workspace declaring nothing and against a workspace declaring `work.loop.heartbeatMs: 60000`, then
`dualStalenessDecision` evaluated over a stale-presence/fresh-liveness pair and a
fresh-presence/silent-run pair.

| scenario | result |
|---|---|
| every consumer resolves the same staleness value | green — reclaim threshold, loop-shell default and driver idle window all answer `900000`, each reached through `DEFAULT_HEARTBEAT_MS` rather than its own literal; `src/` holds exactly one 15-minute literal, in `src/loop-bounds.mjs` |
| overriding the value moves every consumer together | green — all three answer `60000`. This is the assertion that was red at the previous pass (F-69-V4) |
| the dual-staleness gate reads a real heartbeat for the first time | green — a fresh liveness stamp holds the gate off, an expired one reclaims, and the production join reads `run.heartbeatAt` before falling back to `updatedAt` |
| a fresh node with a silent run is still hands-off | green — not reclaimed, and presence precedence is the recorded reason |

verifies → `stories/01_story_heartbeat-by-consumption/tasks/02_one-staleness-constant.feature`

### Command and static checks

- `aof work validate 69 --json` returned `[]`.
- `aof work doctor 69 --json` reports `healthy: true`, `errors: 0`, `warnings: 2` — repository-wide
  numbering gaps and an absent `work.controls.runners` (F-69-V2, backlog). **No `control-unresolved`
  finding at either severity**: all eleven declared controls resolve, and none carries a standing
  `pending` marker that could be masking one.
- `aof work loops validate --json` reports zero errors and 38 warning-level graph/authority
  findings. Doctor's `loopReady` block turns those same 38 into four blocking registry checks
  (grounding, pairing, reference-ownership, actuator-arbitration), scoring `L1`/56. Recorded; that
  is milestone 53's surface, not this milestone's accept gate, and it was equally true before 69.
- All six stories read `in-review` at the start of this pass.

### Production-consumer audit — one row per story's delivered leaf

The check this milestone's own objective demands, applied to its own delivery: a leaf that resolves,
validates and passes its suite is still prose if nothing in `src/` calls it. Measured by resolving
each story's central export set against every importer in `src/**`, excluding the defining module.

| story | delivered leaf | production consumer | wired |
|---|---|---|---|
| 69/00 | `decideReviewRound` (`src/work-loop.mjs`) | `src/work-loop.mjs:180`, reached from `src/commands/loop.mjs` | yes |
| 69/01 | `run-heartbeat-consumption.mjs` | `commands/drive.mjs:19`, `effects/run-transitions.mjs:16`, `mesh-assignment-reclaim.mjs:22`, `mesh-worker-execution.mjs:166` | yes |
| 69/02 | deadline arming in `agent-session-driver.mjs` | `commands/drive.mjs:212`, `mesh-worker-execution.mjs:1689,2230` | yes |
| 69/03 | `src/loop-progress.mjs` (nine exports) | **none — zero importers in `src/`** | **no (F-69-V7)** |
| 69/04 | `dispatchReadySet`, `countDispatchSlotsByTarget` | `commands/dispatch.mjs:104`; `commands/mesh-terminal-resume.mjs`, `mesh-assignment-reclaim.mjs` | yes |
| 69/05 | `createMeshParkResume` (`mesh-park-resume.mjs`) | `mesh-worker-execution.mjs:132` | yes |

### Story 69/06 — the ledger binds the build loop (F-69-V7's remedy)

Verified **2026-08-23** at `aof:verify 69/06`, scoped to this story: its own two `@executable`
features plus the lanes its blast radius touches. The whole-repo runner is still unusable on this
control node (`global-work-propagation` binds `:4182`, held by the live control daemon), so each
registered suite was imported by name and its array run under a per-test hermetic `AOF_GLOBAL_HOME`,
mirroring the repo runner's own loop. There is no `@manual` and no `@uat` scenario in this story —
both features are tagged `@executable @cli @work @work-stream @bug @finding-F-69-V7` — and no UI
surface, so no human step and no design-conformance step applies.

| lane | count | result |
|---|---:|---|
| 69/06 — `loop-progress-production` (both amendment tasks, production path) | 10 | green |
| 69/06 — `acd-progress-ledger-consumed` (the F-69-V7 consumer guard) | 3 | green |
| 69/03 leaf + FF-6906, re-measured against the new caller | 23 | green |
| stop vocabulary and the two frozen literals that pin it — `work-loop-stop-set`, `acd-loop-probe-contract` | 9 | green |
| declared-bound homes and ceilings — FF-6901, FF-6902, `work-loops-resolved-ceilings`, `loop-bounds` | 46 | green |
| loop shell regression — `work-loop-production-review-bound`, `loop-command-resume`, `work-loop-gate-order`, `loop-gate-cost-ladder` | 47 | green |
| FF-6908 negative control over `src/run-store.mjs` | 4 | green |
| **total** | **142** | **green** |

**The two arch assertions 69/06 inherited red are green.** `aof:refine 69/06` recorded that 69/02
had added `deadline-exhausted` to `LOOP_STOPS` without widening the two frozen literals that pin it
(`test/arch/acd-loop-probe-contract.test.mjs`, `test/work-loop-stop-set.test.mjs`), and that 54/03
independently claimed the same array for `grade-indeterminate`. All three now declare the same set
in the same order, and both literal-holding suites are green.

**F-69-V7's own defect is closed, measured the way the finding was raised.** `src/loop-progress.mjs`
now has production importers outside its own module: `src/work-loop.mjs:3` imports
`decideBuildProgress` and `evaluateProgressPolicy`; `src/commands/loop.mjs:35-39` imports
`sampleWorktreeProgress`, `appendProgressSample` and `readProgressSamples`. The loop shell carries
the ordering decision (`decideLoopProgress`, `src/work-loop.mjs:188`) — sample policy first, the
failing-count derivative only when it says continue — and the command resolves both bounds through
`src/loop-bounds.mjs` (`commands/loop.mjs:709-710`), declaring no literal.

| story | delivered leaf | production consumer | wired |
|---|---|---|---|
| 69/03 | `src/loop-progress.mjs` (nine exports) | `work-loop.mjs:3`, `commands/loop.mjs:35-39`, reached from `runLoopBody` | **yes (was F-69-V7)** |
| 69/06 | `decideLoopProgress`, `recordBuildProgress`, `failingCountFromGrade` | `src/commands/loop.mjs`'s build round; exercised end-to-end by `the loop command appends measurable rounds to the attempt ledger` | yes |

**Run, not read.** `69/06 task00 the loop command appends measurable rounds to the attempt ledger`
and `69/06 task01 production resets start cold, persist their tally, and eventually escalate` drive
`runLoopBody` against a real git tree with a stub rubric: the first halts on `no-progress` after
three measured `3,3,3` rounds with three samples in the run's own ledger; the second takes two
resets, spawns the post-reset attempt without `--resume`, carries the summary into the next round's
brief, escalates on `progress-exhausted`, and reconstructs its reset tally on `--resume` without
starting a fourth attempt.

**The three declared config ceilings all have production readers**, checked directly rather than
inferred from the pointer resolving: `work.loop.reviewRounds` → `commands/loop.mjs:708`,
`work.loop.buildNoProgressRounds` / `work.loop.progressMaxResets` → `commands/loop.mjs:709-710`,
`work.autonomous.maxAttempts` → `commands/loop.mjs:407` and `commands/resume.mjs:119`.

**No new fitness control is declared by this story** — `ARCHITECTURE.md`'s register still holds
eleven, all landed. The four inside 69/06's blast radius were re-measured green above (FF-6901,
FF-6902, FF-6906, FF-6908); their red probes stand as recorded in the register and are not restated.

verifies → `stories/06_story_the-ledger-binds-the-build-loop/tasks/00_the-loop-writes-the-ledger.feature`
verifies → `stories/06_story_the-ledger-binds-the-build-loop/tasks/01_the-ledger-halts-the-build-and-resets-the-attempt.feature`

### Command and static checks — 69/06

- `aof work validate 69/06 --json` returned `[]`.
- `aof work doctor 69/06 --json` reports `healthy: true`, `errors: 0`, `warnings: 2`
  (`numbering-gap`, repository-wide; `rubric-join-unchecked` — see F-69-V9). **No `control-unresolved`
  finding at either severity**, checked at both precisely because a standing `pending` marker
  downgrades that finding without changing whether the control exists; no row in `ARCHITECTURE.md`
  carries `pending`.
- `aof work loops validate --json` reports zero errors and 38 warn-level graph/authority findings —
  the same 38 as the previous pass, and none of them a ceiling-consumption code. Milestone 53's
  surface, not this story's gate.

### The repository sweep, 2026-08-24 — 6,828 registered, 48 red, ONE of them 69's

Re-run at the accepting pass against a tree that was, for the first time in this milestone's life,
**clean and committed**: `71a7b02` swept every in-flight 68/69/70/54 change into one commit at
00:19, and `git status` reported nothing but one untracked issue note. Every subject file's mtime
predates the sweep's start (00:18:29), so this measurement is coherent in a way the previous four
were not. That is worth stating because F-69-V18 recorded the opposite condition as the honest limit
on the last pass.

The whole registered array minus the six `global-work-propagation` tests (they bind `:4182`, held by
the live control daemon), each under a per-test hermetic `AOF_GLOBAL_HOME`, mirroring
`scripts/test.mjs`'s own loop:

**`TOTAL=6828 RAN=6822 PASS=6774 FAIL=48 SKIPPED=6`**

The previous pass measured `PASS=6617 FAIL=205` on the same array. The improvement is the five
blockers closing plus F-69-V13's `ui/` workspace install landing (`clsx` resolves; the 123 link
failures are gone).

**Every one of the 48 was attributed at source, not read off the last pass's table.** The instrument
is the one the retro named: a detached `git worktree` at **`0a22fb1`** — the last commit touching
these seams before 68, 69 and 70 — with `node_modules` junctioned in, plus a per-suite isolated
re-run at `HEAD` for anything the baseline could not answer.

| attribution | count | evidence |
|---|---:|---|
| pre-existing at `0a22fb1` | 41 | reproduced red in the baseline worktree, same assertion, same message. **This cell first read 44, which was wrong** — it was written by hand rather than counted, and the buckets then summed to 50 against a total of 48. Recomputed mechanically from the sweep output: 41 + 2 + 3 + 1 + 1 = 48. |
| introduced, milestone **70**'s | 2 | `arch/53 FF-5308` (`src/work.mjs`, 1,339 lines against the frozen 1,209 — `61ec7ad`/`f4a9a3a`, the architecture-slice and phase-brief work); `arch/FF-6601` (a second Gherkin recogniser in `src/phase-brief.mjs`, 70/05's brief-carries-the-contract) |
| sweep-order artifacts | 3 | `item-status/if-applicable` and the two `66/00 refuse` rows — each **green in isolation at `HEAD`**, `item-status` three times consecutively |
| **introduced, milestone 69's** | **1** | **`bundle-asset-manifest-complete/00` — F-69-V21, the blocker of this pass** |
| 69-owned, load-sensitive | 1 | `69/04 task 02` atomicity — F-69-V22, 35/35 green in isolation three times |

The 17-assertion milestone-38 worker-clone family (`task00`/`task01`/`task02`/`task05`/`task04`,
`clone-url-pull`) sits inside the pre-existing 44 and is **identical at baseline** — F-69-V16's
attribution, which this document got wrong twice before, holds on a third independent measurement.
The four `claude-settings/03` rows are likewise the four F-69-V17 already identified as somebody
else's red; the two that WERE 69's are green.

**Milestone 69's own controls are green, re-measured rather than carried forward.** All eleven
declared controls plus their planted-defect self-check legs: **46 assertions, 0 failing**, run from
the repository root. Every FF row's red probe stands as recorded; none holds the frozen placeholder.

### `@manual` — 69/01 task 02, executed rather than inspected, at the accepting pass

All four scenarios green against the committed tree. The reclaim threshold, the loop shell's default
and the driver's idle window each answer `900000` against a workspace declaring nothing and `60000`
against one declaring `work.loop.heartbeatMs`, each reached through `DEFAULT_HEARTBEAT_MS` rather
than a literal — the driver via `positiveMs(deadlinePolicy?.heartbeatMs)` at
`src/agent-session-driver.mjs:1170`, fed by `loopBoundsFromConfig(ws)`. `src/` holds exactly one
15-minute literal, at `src/loop-bounds.mjs:6`. The dual-staleness gate reclaims on stale presence +
expired liveness and holds off on all three other combinations — stale presence + fresh liveness
(the second signal doing work), fresh presence + a silent run past the deadline, and an absent
presence record read as unknown rather than stale.

verifies -> `stories/01_story_heartbeat-by-consumption/tasks/02_one-staleness-constant.feature`

### The five blockers of the previous pass — closed, and re-checked at source

Not taken on the register's word; each re-measured against the committed tree.

- **F-69-V10** — `loop-bounds.mjs` is recorded in `EXPECTED_DIRECT`
  (`test/arch/acd-session-driver-mesh-blind.test.mjs:26`), the driver ceiling reads `<= 24` and the
  sink pin `=== 62`, each message naming the leaf that moved it, and the ADR-015 §5 amendment those
  ceilings require is authored in this milestone's `ARCHITECTURE.md`. FF-5301 green.
- **F-69-V11** — `src/work-loop.mjs` imports nothing; *"the module copied alone decides with every
  source dependency absent"* is green, and the two deciders are handed in through
  `decideLoopProgress`'s input by `src/commands/loop.mjs`.
- **F-69-V17** — `artifact-sync-enqueue-hook` green; `claude-settings-merge`'s only reds are the
  four that are red at baseline.
- **F-69-V19** — `src/mesh-launcher.mjs` imports neither `global-work-store.mjs` nor
  `assignment-record.mjs`'s restore; it reaches the store through
  `restoreRefusedResumeReservation` at `src/global-work-publisher.mjs:216` — ADR-004's seam.
- **F-69-V20** — `fleet-terminal-view-producer-fed` green in the sweep.


### The sweep re-run, 2026-08-24 — the two fixes measured against the same array

Both findings of the previous section were fixed inline at the operator's direction, and the whole
array was re-run rather than the two suites alone, because a fixture edit shared by three suites and
a moved census in a manifest gate are exactly the changes whose blast radius is not local.

| | sweep 1 (at the decline) | sweep 2 (after the fixes) |
|---|---|---|
| result | `PASS=6774 FAIL=48` | **`PASS=6777 FAIL=45`** |
| milestone 69's | **2** — F-69-V21, F-69-V22 | **0** |
| milestone 70's | 2 — FF-5308, FF-6601 | 2 — unchanged |
| sweep-order artifacts | 3 | 3 |
| pre-existing at `0a22fb1` | 41 | 40 |

**The set difference is the evidence, not the count.** Diffed failure-set to failure-set, sweep 2
removes exactly three rows and **adds none**: `bundle-asset-manifest-complete/00` (F-69-V21),
`69/04 task 02 … atomically` (F-69-V22), and `mesh-coordination-launcher/03` — the last of which is
F-69-V15's known flake, red at `0a22fb1` and simply green on this roll, so it is NOT claimed as a
fix. That empty add-side is what says the two edits regressed nothing; the three-row drop alone would
not.

**Zero of the remaining 45 are milestone 69's**, bucketed mechanically from the sweep output rather
than by hand: 40 reproduce at the pre-68/69/70 baseline, 2 are milestone 70's introduced reds
(`FF-5308` over `src/work.mjs`; `FF-6601`, the second Gherkin recogniser in `src/phase-brief.mjs`),
and 3 are sweep-order artifacts that are green in isolation at `HEAD`.

**The honest limits, unchanged.** `global-work-propagation`'s six assertions cannot run on this
control node — the live daemon holds `:4182` — and they belong to CI. Milestone 70's lane was
writing `STATE.md`, its observability snapshot and `06_story_saving-is-measured/STORY.md` during
this sweep; none is a file milestone 69 delivers or edits, and 69's own suites were green in both
runs. The baseline worktree was removed at the operator's instruction after the attribution was
taken, so re-deriving the 40 requires recreating it (`git worktree add --detach <path> 0a22fb1`
plus a `node_modules` junction).


## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-69-V1 | `npm run test:unit` and `npm test` could not link: all 124 tracked `ui/` files were deleted in the working tree, uncommitted, with the directory empty on disk. Four suites failed on `ERR_MODULE_NOT_FOUND` for `ui/src/fleet/*`. | environment / working-tree state | blocker for the repository gate | Re-triaged 2026-08-23: no work item plans a `ui/` removal and nothing uncommitted lived there, so this was collateral rather than deferred work. Restored from `HEAD`; the four suites now pass. Confirmed still restored at the accepting pass — `git status` reports no `ui/` deletions. | — | resolved |
| F-69-V2 | Doctor cannot check control registration because `.aof/aof.config.json` declares no `work.controls.runners`. | process configuration | low | Milestone-69 imports and spreads were checked directly against `scripts/test.mjs`, and the registration gate's own positional-slice checks pass. Configuring `work.controls.runners` is a stream-level chore, not 69's. | backlog | mitigated |
| F-69-V3 | The global `acd-loop-suite-registration` gate reported untracked milestone-70 suite `test/brief-carries-the-contract.test.mjs` as imported by neither runner. | concurrent worktree state | blocker for the repository gate | Re-measured 2026-08-23: the suite is imported and spread by `scripts/test.mjs`, and all 12 checks in that gate pass. The original reading was taken while `ui/` was deleted, which stopped the gate's own census from linking. Recurred at the accepting pass with a different m70 file — see F-69-V6, which supersedes the "re-measure and it clears" reading. | — | resolved |
| F-69-V4 | `@manual` 69/01 task 02 scenario 2 fails. `COMPLETION_IDLE_MS` is bound to `DEFAULT_HEARTBEAT_MS` at module scope (`src/agent-session-driver.mjs:316`) and **no production caller passes `idleMs`**, so a workspace declaring `work.loop.heartbeatMs` moves the reclaim threshold and the loop-shell default but leaves the driver's undeclared-completion idle window at 15 minutes. | contract gap — the third consumer never reads the declared bound | blocker | Fixed in production, not in the scenario: the driver's idle window is now resolved from the workspace at its call site (`:1170`) through the `deadlinePolicy` all three production callers supply from `loopBoundsFromConfig(ws)`. The delivered feature was not edited. `@manual` scenario 2 re-run green at the accepting pass. | 69/01 | resolved |
| F-69-V5 | `test/agent-session-driver-door.test.mjs` "53/00 task00" is red: the sink's derived inward census returns two names against the frozen three. An **uncommitted** removal of the m42 `pty-selftest` probe from `src/mesh-worker-execution.mjs` deleted the last body use of `defaultPtySpawn`, leaving it imported (`:158`) and re-exported (`:911`) but unused. | regression — an orphaned inward binding breaks the m53 door invariant | blocker | Closed by the second remedy the finding named: `defaultPtySpawn` dropped from the inward `import` clause at `:158` and kept in the re-export block at `:911`. The census derives the inward set from the sink's body, so it now returns two against two. Suite green in all four lane runs. | 69/02 | resolved |
| F-69-V6 | The integrated lane is **not reproducible on this tree**: run 1 was red on `acd-phase-brief-single-bag` FF-7010 (`objective: specDoc` — a value the live source does not contain), runs 2–3 were fully green, and run 4 was red on `acd-loop-suite-registration` FF-5311 (`test/grade-rubric-is-declared.test.mjs` imported by neither runner). Cause measured, not inferred: a **concurrent `aof:verify 70` session is writing this working tree**. `src/phase-brief-read.mjs` and `src/phase-brief.mjs` were rewritten at 10:41, `src/commands/grade.mjs` at 10:46, and `test/grade-rubric-is-declared.test.mjs` created at 10:52 — untracked, unregistered — while `wiki/work/70_milestone_warm-start/**` records were written as recently as 10:54. | concurrent-session interference — a moving tree, not a defect in 69 | non-blocker **for 69**; blocker for any repository-wide gate run while m70 is in flight | Neither red is 69's and neither touches a control 69 declares: FF-7010 and FF-5311 belong to milestones 70 and 53. Milestone 69's own six lanes were green in **all four** runs, and its eleven controls were green in all four. Registering the new m70 suites in `scripts/test.mjs` is m70's own accept obligation and its files are still being written, so it cannot be discharged from here. Routed to 70 rather than deferred to backlog, because it is that milestone's live accept gate. | 70 | open (not 69's) |

| F-69-V7 | **`src/loop-progress.mjs` has zero consumers in `src/`.** All nine exports — `progressSample`, `sampleWorktreeProgress`, `progressLedgerPath`, `appendProgressSample`, `readProgressSamples`, `madeProgress`, `progressPolicyFromConfig`, `evaluateProgressPolicy`, `decideBuildProgress` — are unreferenced outside their own module. `src/work-loop.mjs`, the loop shell, contains no progress, stall or failing-count logic at all, and nothing in `src/` reads or writes the `runs/<runId>.progress.ndjson` ledger. `build-to-green.md` declares `ceiling: [config:work.loop.buildNoProgressRounds]` — a config pointer FF-6902 confirms resolves, which is a declaration, not a caller. | contract gap — the milestone's progress ledger is not in the runtime | **blocker** | The delivered criteria do not catch this: 69/03's three features are all leaf-level ("When a progress sample is taken", "When the policy is evaluated") and none demands a caller, so the suite is legitimately green. The milestone's SPEC scope item is not: *"A progress ledger … with `maxStalls` → reset with a summary, `maxResets` → escalate"* describes a runtime behaviour, and ADR-005's Consequences assert it — *"The one signal that would have caught the 22 hours exists"*. It does not; no production path samples progress, resets a stalled attempt, escalates on repeated resets, or halts a build on the derivative. This is **the same class as F-6900** (69/00's cap declared and never consumed), which this milestone triaged as a blocker and closed with amendment task `03_the-cap-binds-the-loop.feature` rather than as a deferred gap. The consistent remedy is the same: bind the ledger to the build loop's production path, and do not edit the delivered features. Routed 2026-08-23 to **new story `69/06_story_the-ledger-binds-the-build-loop`**, added inside this milestone at the operator's direction rather than as a separate item, since 69/03 is accepted `done` and its delivered features are immutable, so it takes no amendment task. Awaiting `aof:refine 69/06`. **Closed by story 69/06, accepted 2026-08-23.** `src/loop-progress.mjs` has production importers in two modules — `src/work-loop.mjs` and `src/commands/loop.mjs` — reached from `runLoopBody`; the build loop writes the ledger, resets a stalled attempt with its summary, escalates on exhausted resets, and halts on `no-progress`. Re-measured at the milestone gate and still true after F-69-V11's inversion moved the import to the command layer: the ledger is consumed on the production path either way. | 69/06 | **resolved** |


| F-69-V8 | **The `@executable` scenario *"the declared ceiling has a consumer, not merely a resolvable pointer"* (69/06 task01) is implemented by no check.** Nothing in `src/**` or `test/**` walks the framework loop records that declare a `config:` ceiling and resolves a production reader for each bound they point at, and no finding code — in the arch suites, in `work-doctor.mjs`, or among `aof work loops validate`'s seven codes — can name a ceiling whose pointer resolves but whose bound nothing reads. `test/work-loops-resolved-ceilings.test.mjs` asserts RESOLUTION only, which is the exact half the scenario exists to distinguish from consumption. The subject bound is guarded — `acd-progress-ledger-consumed` asserts `commands/loop.mjs` genuinely reads through the producer — but only for `build-to-green`, by literal substring match, with no quantification over the other records. | contract gap — a locked acceptance criterion with no implementing check | **blocker** | The scenario is the generalisation of F-6900 that the story's own `## Notes` committed to: *"Whatever guard this story lands should be able to tell those two states apart, which is the generalisation of F-6900 the milestone did not make the first time."* Accepting 69/06 without it leaves the third recurrence of the declared-but-unconsumed class unguarded, inside the story written to end the second. **Nothing is broken today** — all three declared config ceilings were resolved to their readers by hand at this pass and each has one — so the remedy is to land the guard the criterion already demands, not to change behaviour; the guard passes on the tree as it stands. **Closed inline at the accepting pass (2026-08-23), by landing the guard rather than by editing the criterion.** `test/arch/acd-progress-ledger-consumed.test.mjs` — 69/06's own consumer guard, extended rather than joined by a sibling — now walks every `config:` ceiling on every framework loop record (`loop:autonomous-cascade`, `loop:build-to-green`, `loop:review-fix-rereview`, `loop:run-resilience` → three distinct keys) and resolves the production readers of each bound they point at. `unconsumedCeilings(ceilings, units)` is pure and emits a named `loop-ceiling-unconsumed` finding per ceiling whose pointer resolves but whose bound nothing reads. A read is the declared resolver called by name, a direct config read, or the resolved field taken off the policy the declaring home composes — the last admitted only for a module that imports that home. **Quoted config paths are stripped before matching**, so `resolveLoopBound(cap, "reviewRounds", "work.loop.reviewRounds")`'s diagnostic does not stand in for the reader it reports missing. Three cases: the real registry against the real `src/` tree (no findings, key set asserted whole so the quantification cannot silently narrow); a surgical mutation that elides one bound's read spellings and asserts exactly that ceiling names itself, while `resolvesLoopBoundConfigKey` still returns `true` for it — which is the resolution/consumption distinction made executable; and a detector self-check over the three admitted spellings plus the four refused ones. | 69/06 | resolved |

| F-69-V9 | **Five of the nine rows of 69/06 task01's failing-count outline are asserted by no test.** The `—` rows — `9, —, 9`, `9, 9, —`, `9, 9, —, 9`, `—, —, —`, `—, 0` — encode the feature's own headline semantic (*"An unmeasured round is DROPPED from the derivative, not counted either way"*), and no case drives `decideLoopProgress` or `decideBuildProgress` over a sequence containing an absent round, nor over `samples: []`. The companion scenario *"a round with no measurable failing count neither halts nor counts as a stall"* is unasserted for the same reason. Separately, `rubric-join-unchecked` is warn-only on this item: `work.rubric.report` declares `format` and `floor` but no `path`, so `declaredReportFrom` (`src/work-doctor-rubric.mjs:86-90`) returns null and 54/04's traceability lane no-ops rather than joining emitted case names to scenario names — which is the mechanical check that would have surfaced the rows above without a reading pass. | test-coverage gap on a locked outline, plus the traceability lane that would have found it being unarmed here | non-blocker | **The behaviour holds and was confirmed by reading the production path**, not assumed: an unmeasurable round appends no sample at all (feature 00's rule, asserted by `69/06 task00 an absent failing count appends nothing`), so `decideLoopProgress` derives its counts from `samples.map(s => s.failingScenarios)` over measured rounds only — the drop is a consequence of a tested producer rule — and `samples.length === 0` returns `{ act: "continue", measured: false }`. What is missing is the assertion, so a future change that appended a zero-count sample for an unmeasured round — *"the absence of a measurement wearing the shape of one"*, named in the feature's own narrative — would pass the whole suite. Fixed in the same pass as F-69-V8, since both land in `test/loop-progress-production.test.mjs`. **Closed inline at the accepting pass (2026-08-23).** `test/loop-progress-production.test.mjs` gains two cases. `69/06 task01 [outline] the failing counts a build measured, and what the loop does next` drives all nine rows through `decideLoopProgress`, the five `—` rows included, building each round's ledger through `ledgerFor(rounds)` — which APPLIES task 00's producer rule (a round with no measured count appends no sample) rather than restating it, so the drop stays a property of the producer. It also asserts `9, 9, —, 9` and `9, 9, 9` reach the same stop over the same two transitions. `69/06 task01 an unmeasured round neither halts nor counts as a stall, and its absence is never a zero` carries the companion scenario and both halves of the drop, each non-vacuous on its own: `9, 9, —` continues (an absent round counted as a stall would halt it), `9, 9, —, 9` halts (an absent round that cleared the run would let it continue), the ledger for `9, 9, —` holds two samples carrying `[9, 9]` and no manufactured zero, a MEASURED zero crosses the phase instead, and `samples: []` — with `decideLoopProgress({})` alongside it — is `{ act: "continue", measured: false }`. The second half stands: `rubric-join-unchecked` is warn-only here and setting `work.rubric.report.path` is 54's surface, not this story's. | 69/06 | resolved (report path → 54) |

| F-69-V10 | **`src/agent-session-driver.mjs` imports `./loop-bounds.mjs`, and milestone 53's frozen import census does not record it.** `test/arch/acd-session-driver-mesh-blind.test.mjs`'s `EXPECTED_DIRECT` freezes the driver's direct source-import set at seven — `claude-trust`, `degrade`, `terminal-providers`, `terminal-ws`, `work-observe`, `otel-attribution`, `phase-brief`. The live driver imports an eighth at `:56`, `DEFAULT_HEARTBEAT_MS` from `./loop-bounds.mjs`, added by this milestone. FF-5301 is red. **The import is already committed on this branch** (present at `HEAD`), so it has been red since 69/01–69/02 merged, across three prior verify passes. | regression — a milestone-53 structural control over a file milestone 69 edits | **blocker** | Not a defect in the import: `src/loop-bounds.mjs` is a pure leaf with zero imports of its own and appears nowhere in FF-5301's `DENIED_TRANSITIVE` list, so it is exactly the shape the census admits. The remedy is to RECORD it, the same way the file already records milestone 68's `otel-attribution.mjs` and milestone 70's `phase-brief.mjs` in its own header comment. What makes it a blocker is not the risk but the rule: a milestone is not accepted while its own edits leave the repository suite red. **Re-measured 2026-08-23 after this finding was first written as "cheap to record", which was wrong: the same control pins two REACH ceilings besides the import set, and both have moved.** The driver's root-inclusive reach is **24** against a `<= 23` ceiling (+1, `loop-bounds.mjs`, a zero-import leaf), and the assignment sink's is **62** against a pinned `=== 59` (+3 — 69/01's `run-heartbeat-consumption.mjs`, 69/02's `loop-bounds.mjs`, 69/05's `mesh-park-resume.mjs`). The driver ceiling's own message states the governing rule — *"raising it requires an ADR"* (ADR-015 §5) — so this is three census moves plus an ADR amendment, not a one-line edit, and it is milestone 53's ADR to amend. **Fixed 2026-08-24.** `loop-bounds.mjs` recorded in `EXPECTED_DIRECT` beside 68's `otel-attribution.mjs` and 70's `phase-brief.mjs`, with the reason stated in the file; the driver reach ceiling raised 23 → 24 and the sink reach pin 59 → 62, each naming the leaf that moved it (69/01's `run-heartbeat-consumption.mjs`, 69/02's `loop-bounds.mjs`, 69/05's `mesh-park-resume.mjs`). The ADR amendment ADR-015 §5 asks for is recorded in this milestone's `ARCHITECTURE.md`. FF-5301 3/3 green. | 69 / 53 (ADR-015 §5) | **resolved** |

| F-69-V11 | **`src/work-loop.mjs` is no longer loadable alone, and milestone 53's determinism contract requires that it is.** `test/work-loop-determinism.test.mjs` — *"the module copied alone decides with every source dependency absent"* — copies `src/work-loop.mjs` into an otherwise empty `src/` and imports it. 69/06 added `import { decideBuildProgress, evaluateProgressPolicy } from "./loop-progress.mjs"` at `:3`; the module was dependency-free at `HEAD`. Reproduced directly at this pass: `ERR_MODULE_NOT_FOUND: Cannot find module '…/src/loop-progress.mjs' imported from '…/src/work-loop.mjs'`. | regression — a milestone-53 determinism control, broken by the amendment story accepted this morning | **blocker** | This is the only one of the three that is a genuine design question rather than a census to re-record. Milestone 53 froze "the loop shell decides with every dependency absent" deliberately; 69/06 needed the progress authority *inside* the shell to close F-69-V7, and putting it there is what made the decision reachable from `runLoopBody`. Both positions are defensible and they conflict. The two candidate remedies — invert the dependency so the shell receives the decision rather than importing it, or amend 53's contract to admit a pure-leaf import — are not equivalent, and choosing between them is not this gate's call. Routed to `aof:continue 69` with 53's owner named. **The capability 69/06 delivered is unaffected**: the ledger is still written and still consulted on the production path; what broke is a structural property of the module, not its behaviour. **Fixed 2026-08-24 by inverting the dependency, at the operator's direction, rather than by amending milestone 53's contract.** `src/work-loop.mjs` imports nothing again — it loads alone, and `work-loop-determinism` is green. The two deciders are HANDED IN through `decideLoopProgress`'s input by `src/commands/loop.mjs`, the layer that already holds `src/loop-progress.mjs`. Both contracts are satisfied at once: the engine has no dependency, and 69/06's own consumer guard still finds `evaluateProgressPolicy(` before `decideBuildProgress(` in the engine source, because the calls are still there — only the import moved. 110 assertions green across the determinism, production, ledger-consumer, stop-vocabulary and loop-shell lanes. | 69/06 | **resolved** |

| F-69-V12 | **The bundle manifest census moved 96 → 97, but the suite that reports it was ALREADY RED before this milestone — so 69 added a second cause to an existing failure rather than introducing one.** `src/bundle/manifest.json` `entries` is 96 at `HEAD` and 97 in the working tree, the single added row being 69/01's `run-heartbeat-enqueue` hook; `test/autonomous-shell-out-prompt.test.mjs` asserts *"the complete pre-story manifest membership remains closed"* and reports `97 !== 96`. | census delta caused by 69, on a suite already failing for other reasons | **downgraded from blocker — not a regression 69 introduced** | **Corrected 2026-08-23 by measurement, having first been written up here as a blocker.** Run against a detached worktree at the pre-68/69/70 baseline `0a22fb1`, BOTH of this suite's distribution assertions already fail, and on assertions that come EARLIER than the membership count: *"continue address is byte-unchanged"* and *"every other command/member/path/hash is byte-identical to the integrated pre-story manifest"*. The suite has therefore never been green on this branch, and re-freezing 96 → 97 would not turn it green. 69's manifest row is still a real delta and still needs recording when that suite is repaired — but the repair is milestone 70's, the red is not 69's, and calling it a 69 blocker was wrong. | 70 (suite repair) / 69 (the row, when repaired) | open (not a 69 blocker) |

| F-69-V13 | **The `ui/` workspace is not installed, and 52 assertions cannot link because of it.** Every `grid` (15), `terminal-control` (14), `shell` (11), `work-ui-board-serves-unchanged` (5), `work-ui-fleet-origin` (4), `work-ui-verb-rename` (3) and `board-staleness-a11y` (4) failure in the repository sweep is one esbuild error: `ui/src/lib/utils.ts` cannot resolve `clsx` or `tailwind-merge`, and `ui/src/board/Markdown.tsx` cannot resolve `marked`. All three are declared in `ui/package.json`, all three are present in the root `package-lock.json`, and none is on disk under `node_modules/`. The same root cause appears a second way in `mesh-ui-cli-face` and `mesh-ui-global-scope`, which fail with the daemon's own message — *"The fleet UI build is missing at `ui\dist`. Build it first: `npm --prefix ui run build`"* — because a workspace that never installed was never built. | environment — an incomplete workspace install, not a code defect | non-blocker **for 69**; blocker for the repository gate | **This has an owner and it is named rather than deferred**, which is the standing lesson from F-69-V1/F-69-V3 (*"an unattributable blocker is an unowned one"*). The owner is the workspace install: `npm install` at the repository root, which is workspace-aware (`workspaces: ["ui"]`) and restores all three from the existing lockfile without changing it. **It was deliberately NOT run at this pass**, for a stated reason rather than an omission: this is the live control node, the desktop supervisor is up, and a root install can attempt to rebuild `node-pty` against a binary a running daemon holds open — the failure mode `scripts/install-local.mjs` explicitly tolerates with a skip-and-warn. Restoring an install under a live daemon is an operator act, not a verify act. Milestone 69 touches no file under `ui/`, and the 52 failures are one defect counted 52 times. **Fixed 2026-08-24.** `npm install --workspace ui --ignore-scripts` restored all 23 declared-and-locked packages from the existing lockfile — scoped to the workspace and script-free precisely so the live daemon's `node-pty` was never rebuilt (verified after: `node-pty` still loads, and it uses `prebuilds/`, so the `build/Release/` path this finding worried about never existed). `package-lock.json`, `ui/package-lock.json` and both manifests are byte-unchanged. `npm --prefix ui run build` then produced `ui/dist`, which the `mesh-ui` / `work-ui` / `asset-base-seam` lanes need. Spot-checked green immediately after: `board-staleness-a11y` 10/10, `terminals-home-grid` 33/33. | repository / operator | **resolved** |

| F-69-V20 | **The fleet terminal view's needs-input path is behaviourally broken: the producer now applies ZERO `needs-input` frames where milestone 38's contract expects exactly one.** `test/fleet-terminal-view-producer-fed.test.mjs` — *"task04/38-06 (F-38.06e, needs-input) a session that ends on the needs-input sentinel ALSO ends its stream — the assignment stays `running`, the view does not"* — drives a real `createMeshWorkerExecutionHandler` against a fake PTY, emits `NEEDS_INPUT_SENTINEL`, and asserts `control.applied.filter(f => f.code === "needs-input").length === 1`. Measured: **`0 !== 1`**. Absent at the pre-68/69/70 baseline, so introduced. | **regression in delivered behaviour**, not a frozen census — the one blocker of this milestone that changes what the system does | **blocker** | **This is 69/05's own amendment landing on a contract nobody re-read.** ADR-007's 2026-08-22 amendment moved the park from a fire-once direct frame to *"the same durable assignment-report outbox as terminal lifecycle facts"*, published once after a confirmed exit — which is correct, and is exactly what FF-6909 pins. The consequence is that `sendAssignmentStatus` no longer carries the park in this fixture's path, so a control-side observer counting applied frames sees none. **Milestone 38's terminal-view contract asserts the old mechanism**, and 69/05's `## Gaps` even predicted the user-visible half of this (*"the in-place answer is superseded, not preserved"*) without anyone checking which existing tests encoded the superseded path. The remedy is a decision, not a number: either the park's durable publication must also surface to the fleet's frame observer, or milestone 38's assertion must be re-aimed at the outbox — and which one is right depends on whether the fleet view is meant to see a park at all. **The `@executable` scenarios 69/05 delivered are all green**, because none of them looks at the fleet's applied-frame stream; this is the seam between two milestones, which is precisely where this gate's lane-selection blind spot lives. **Fixed 2026-08-24 by wiring the fixture to the channel 69/05 actually publishes on.** The m38 lane injected `sendAssignmentStatus` alone, so a park that rides the durable `assignment.reported` outbox reached nothing — the frame count was 0 by design, not by defect. `controlSide` now also provides `sendEffectStep`, landing on the SAME store through the SAME frame builder (mirroring `createStatusRecorder`'s documented both-channels idiom), and the scenario's precondition reads the ASSIGNMENT ROW — `state: running`, `code: needs-input` — which is where 69/05's own suite asserts the park and what the sentence always meant. The scenario's real subject, that the view reads ENDED, is untouched and green. `fleet-terminal-view-producer-fed` 4/4. | 69/05 / 38 | **resolved** |

| F-69-V19 | **`src/mesh-launcher.mjs` imports the SQLite projection store directly, which milestone 34's ADR-004 forbids.** `test/arch/acd-global-publisher-single-seam.test.mjs` — *"arch/34 ADR-004: mutation commands and launcher reach the global store only through the shared publisher seam"* — reports `src\mesh-launcher.mjs does not import the SQLite store directly`. The live import is `openGlobalWorkProjectionStore` from `./global-work-store.mjs` at `src/mesh-launcher.mjs:119`. Absent at the pre-68/69/70 baseline. | regression — a milestone-34 layering invariant | **blocker** | **Attributed to a commit, not to a guess:** `git log -S "openGlobalWorkProjectionStore" -- src/mesh-launcher.mjs` names exactly one commit, **`d9fb8ca "Fix dispatch admission and resume races"` (2026-08-22)** — dispatch admission and resume being 69/04's and 69/05's subjects, landed during this milestone's blocker-fix wave. The import is byte-identical at `HEAD` and in the working tree, so it is committed 69 work rather than uncommitted drift. Whether the launcher genuinely needs the store handle (69/04's counted set is read from assignment rows, which the publisher seam already serves) or whether this was the shortest path under blocker pressure is the question for `aof:continue 69`; ADR-004 exists to stop the launcher growing a second door to the same data. **Fixed 2026-08-24 by routing through the seam ADR-004 names, not by exempting the launcher.** `src/global-work-publisher.mjs` gains `restoreRefusedResumeReservation`, which opens the store inside the one module allowed to; `src/mesh-launcher.mjs` calls it and no longer imports `global-work-store.mjs` or `assignment-record.mjs`'s restore. The durable `assignment.reported` reactor remains the normal path — this is the narrow control-process fallback it always was. `acd-global-publisher-single-seam` green, with the launcher, parking and terminal-input lanes green beside it (70 assertions). | 69/04–69/05 (d9fb8ca) / 34 | **resolved** |

| F-69-V18 | **Milestone 54's session is editing milestone 69's OWN delivered control and production consumer while 69 sits at its accept gate.** Measured by mtime during this pass: `test/arch/acd-progress-ledger-consumed.test.mjs` — 69/06's control, the file that carries F-69-V7's consumer guard and F-69-V8's remedy — rewritten at **21:52**, its new comment naming the author (*"RE-AIMED AT WHAT THIS CONTROL'S NAME CLAIMS (54/03 review finding D5, cross-lane; recorded in `54/STATE.md` citing 54/02's standing rule)"*); `src/commands/loop.mjs`, 69/06's production consumer, rewritten at **21:59**; `.aof/aof.config.json`'s `work.rubric` changed at **21:36** from `["node","scripts/test.mjs"]`/floor 1 to `["node","scripts/test-rubric.mjs"]`/floor 500; and `scripts/test-rubric.mjs` created at **21:24**. This milestone's 455-assertion green lane was measured at ~20:15 and is therefore stale on two of 69's own subject files. | cross-lane concurrency — an item cannot be given a stable verdict while another lane re-aims its controls | non-blocker for the verdict already reached; **blocking for any RE-measurement** | **The edit is deliberate and recorded, not rogue** — 54/03's own review finding, and its reasoning is sound: the old assertion pinned `["node","scripts/test.mjs"]`, which on this control node is precisely what a runnable rubric is NOT (it spawns the whole suite with no `AOF_GLOBAL_HOME`, and `global-work-propagation` binds `:4182`, which the live daemon holds). So the re-aim improves the control. **The problem is not the change, it is the timing and the tree.** Re-measured at 22:56 after the edits: `acd-progress-ledger-consumed` 6/6, `loop-progress-production` 12/12, `loop-bounds` 23/23, `work-loops-resolved-ceilings` 14/14 — 69/06's capability survives intact, so nothing this milestone claims is falsified. What IS true is that **69's accept evidence has a shelf life measured in minutes**, and the four blockers cannot be fixed and re-verified until 54's session stops writing `src/commands/loop.mjs`. Recorded as the operational precondition for the fix batch, not as a defect in either milestone. One consequence to carry: 69/06's `OUTCOME.md` stated the rubric command literally, and that statement went stale within hours — an outcome should state the capability, not pin another lane's configuration value. | 69 / 54 (sequencing) | open |

| F-69-V17 | **69/01's bundled hook is the SECOND `PostToolUse` hook aof installs, and three shipped assertions assumed there was exactly one.** `src/bundle/hooks/claude-run-heartbeat.json` declares `event: PostToolUse` with `matcher: ".*"`, beside the pre-existing `claude-artifact-sync.json` (`matcher: "Write\|Edit\|NotebookEdit"`). Introduced, measured against the pre-68/69/70 baseline: `artifact-sync/00` (*"exactly one aof-authored group, from the bundle alone"*, `2 !== 1`), and two of `test/claude-settings-merge.test.mjs`'s cases — the fresh-workspace trigger and the no-whole-file-plan rule. | regression — a shipped single-hook assumption meeting the milestone's second hook | **blocker** | **Scope corrected TWICE by measurement, having first been written up as seven assertions.** It is three. The other four `claude-settings/03` cases already fail at `0a22fb1` and are somebody else's red. **And the diagnosis was wrong too:** this finding claimed *"`claude-settings-merge` asserts behaviour, so the merge logic has to become plural"* — it does not. The merge already lands both hooks correctly; what had not been told were three frozen expectations, each of which was a PROXY that only held while the bundle shipped one hook. **Fixed 2026-08-24 by re-aiming each proxy at what it actually meant**, never by relaxing it: `artifact-sync/00` now selects its group by matcher and asserts one aof-authored entry **per group** (a stronger claim than the old total-count); the two `claude-settings` id lists gained `claude-run-heartbeat`; and *"the same id is ONE entry, not two"* now counts that id rather than the total, which is what the sentence always said. `artifact-sync-enqueue-hook` 9/9 green, `claude-settings-merge` 7 pass / 4 pre-existing fail. **The silent-catch row is NOT a 69 blocker and this finding said otherwise.** `arch/m42-item-3` is red at baseline for four files 69 does not touch; 69's hook adds a fifth to an already-failing control. The underlying conflict is real and is left recorded rather than resolved: FF-6904 requires every bundled hook body to *derive nothing and exit 0 on every path*, and `acd-no-new-silent-catch` requires every catch to emit a coded event through a `src/` sink the hook is forbidden to import. One of the two controls must admit the other's case in its own words — m42's, on the evidence, since the constraint FF-6904 encodes is the harder one. | 69/01 (assertions) / m42 (the conflict, backlog) | **resolved** (conflict → backlog) |

| F-69-V16 | **Seventeen assertions across the milestone-38 worker clone/checkout suites are red on this machine, and they are PRE-EXISTING — they predate milestones 68, 69 and 70 entirely.** `mesh-worker-clone-register-fallthrough` (4), `mesh-worker-clone-location-config` (3), `mesh-worker-clone-credential-pull` (5), `mesh-worker-clone-url-pull` (2), `mesh-clone-credential-mint-failure-loud` (2), `mesh-worker-clone-scoped-checkout` (1). | environment / platform — pre-existing on the Windows control node | non-blocker, and **not 69's, established by experiment** | **Attributed by three controlled swaps rather than by argument, and the first two hypotheses were WRONG — both are recorded because a refuted candidate is the useful part.** (1) *Candidate: milestone 70's fixture edit.* `test/support/mesh-worker-exec-fixture.mjs` was restored to its `HEAD` version and the six suites re-run: **37 pass / 17 fail** — identical to the working tree. Refuted. (2) *Candidate: 69's uncommitted spawn-seam wiring.* `src/mesh-worker-execution.mjs` was restored to `HEAD` (removing 69's `deadlinePolicy` / `readHeartbeatAt` / `heartbeat` options) and re-run: **37 pass / 17 fail** — identical. Refuted. (3) *Settled:* a detached `git worktree` at **`0a22fb1`** — the last commit touching this module before 68, 69 and 70 began — with `node_modules` junctioned, ran the same six suites: **37 pass / 17 fail**, identical again. Both swapped files were restored and verified by SHA-256 (`ff0d0116…`, `751c0464…`). The likely root cause is the platform, not any milestone: `task01/38`'s traversal case fails with `ENOENT … mkdir 'C:\…\checkouts\C:\Windows\.aof'`, which cannot succeed on Windows by construction, and the repository's CI runs `ubuntu-latest`. The family carries partial `win32` handling (`shell: process.platform === "win32"` on its git spawns), so it is a partial port rather than an unported suite — worth a real fix or an explicit platform guard, but it belongs to milestone 38's owner and to whoever wants a green sweep on Windows. | 38 / platform (backlog) | open (not 69's — measured) |

| F-69-V15 | **`mesh-coordination-launcher/03 the healthy launcher refreshes this node's durable presence on each propagation tick` is flaky under load.** It asserts the node presence record's `heartbeatAt` advances from `10:00:00` to `10:00:05` after one propagation tick, waiting on a bare `setTimeout(…, 25)` (`test/mesh-coordination-launcher.test.mjs:261`). Re-run in isolation five times on this machine while the repository sweep was running: **4 pass, 1 fail**. | test flake — a fixed 25 ms sleep standing in for a completion signal | non-blocker, and not 69's | Established as a flake rather than assumed: the failure reproduced in isolation once, then passed four of five repeats with nothing changed. It is not milestone 69's — the presence publisher is untouched by 69, whose `src/mesh-launcher.mjs` diff is confined to the durable-outbox comments and `pickupEscalatedIds`, and whose heartbeat work is the RUN heartbeat, a different record from node presence. Recorded so the next gate does not spend the attribution again, and so the sleep is replaced with a real await when its owner next touches the file. | backlog | open (not 69's) |

| F-69-V14 | **Six of milestone 69's seven stories carried no `OUTCOME.md`.** Story 80 (`outcome-per-delivered-item`) has read `done` since 2026-08-20, so the rule that every delivering item — story included — carries an outcome was in force when 69/00–69/05 were accepted on 2026-08-23. Only 69/06, accepted at its own later gate, had one. Nothing reported it: `aof work doctor` has no missing-outcome code, so the omission is invisible to every check in the stream. | process gap — a shipped rule with no enforcing check | non-blocker | **Closed inline at this pass**: the six were authored into their own story folders, each stating product state at story granularity so the milestone outcome can cite rather than repeat them. The second half is not closed and is not 69's — that a rule shipped in story 80 has no doctor code means the next milestone will reproduce this silently. Routed as a stream-level gap rather than fixed here, since adding a finding code to `work-doctor.mjs` is a change to the doctor's contract and belongs with the item that owns it. | 69 (authored) / stream (the missing check) | resolved (check → backlog) |
| F-69-V21 | **The bundle asset census tripwire is stale by exactly milestone 69's two hook files.** `test/bundle-asset-manifest-complete.test.mjs:58` pins `assert.equal(direct.length, 74, "the real src/bundle/** tree carries exactly 74 files")`; the tree at `HEAD` carries **76**. Attributed by enumeration rather than inference: the pin's own breakdown comment reads *2 root + 8 agents + 25 commands + **11 hooks** + 3 skills + 16 templates + 9 loops*, and the tree matches it category-for-category except hooks, which is **13** — `src/bundle/hooks/claude-run-heartbeat.json` and `src/bundle/hooks/run-heartbeat-enqueue.mjs`, both 69/01's. Remove those two and the count is 74. No other milestone contributes to this delta. | regression — a frozen census moved by this milestone's own addition, on a control 69 does not own | **blocker** (by the rule this milestone has applied to itself four times: a milestone is not accepted while its own edits leave the repository suite red) | **The load-bearing property is INTACT and was measured separately, which is what keeps this a one-line record rather than a defect.** `assert.equal` throws before the set-equality on the next line, so that check never ran in the suite; run directly against the generator's own output it is **green** — 76 direct, 76 in `manifest.bundle`, empty diff both directions, order-sensitive. Both of 69's files ARE manifested. So what is red is the tripwire, not the completeness it guards. **The remedy is the one the pin's own comment demands, in its own words** — *"THE LITERAL MOVES IN THE SAME DIFF AS THE TREE, or the suite goes red for the wrong reason and the next reader debugs the wrong thing"* — 74 -> 76, with the two hooks named in the breakdown beside the m49/m53/opencode entries already recorded there. **This is the FIFTH instance of the class this milestone's retro already named** (F-69-V10, F-69-V11, F-69-V12, F-69-V17), and the pin records the same recurrence happening to milestone 53 at *its* gate (F-20, the opencode change `d5cea70`). The lesson has now been paid for twice by two different milestones and the mechanical form of it is still not built. **Not fixed at this pass**: moving another milestone's frozen census is a deliberate act and no operator direction to close inline was given here. **Fixed 2026-08-24 at the operator's direction, by moving the literal rather than softening it.** `74 -> 76` with the breakdown corrected at the one category that moved (hooks `11 -> 13`) and the recurrence recorded in the comment beside milestone 53's, naming both files and noting that story 80's `OUTCOME.md` template was a MOVE (`templates/milestone/` -> `templates/shared/`) and nets zero. The stale `(71 files)` in the test's own NAME — wrong since before this milestone, and the first thing a reader sees — was corrected to `(76 files)` in the same diff; no suite pins that name. **Proved non-vacuous rather than merely observed green:** planting a 77th file under `src/bundle/hooks/` trips it with `77 !== 76`, and removing it returns the tree to 76 tracked / 0 dirty. 3/3 green. | 69/01 / 28 (the pin's owner) | **resolved** |
| F-69-V22 | **A 69-owned concurrency scenario is red under the loaded whole-suite sweep and green in isolation.** `69/04 task 02: independent dispatch processes observe inspect-plan-materialise atomically` (`test/lane-is-local-slot.test.mjs`) failed once in the 6,822-test sweep. Re-run in its own process it is **35/35 green, three times consecutively**. | test reliability — a real-process atomicity scenario that is sensitive to machine load, on this milestone's own delivery | non-blocker for the verdict; **a standing hazard for every future gate** | **Recorded rather than waved through, and the limit of the measurement is stated.** Green-in-isolation establishes that the red is load-dependent; it does NOT establish that the production admission path is sound under contention — those are two different claims and the milestone's own retro (*"reproduced in isolation proves a red is REAL; it says nothing about who caused it"*) is the inverse of this one. What IS measured: the scenario passes deterministically when the machine is not saturated, and every other 69/04 assertion passed in the sweep itself. The scenario spawns independent processes to observe an ordering, so a scheduler-starved process reorders what the assertion reads. Same family as F-69-V15 (`mesh-coordination-launcher/03`, which is additionally red at baseline) and the two the previous pass found vanishing under isolation. **The carryable fix is a completion signal rather than a wall-clock assumption**, which is F-69-V15's routing too. **Fixed 2026-08-24, and the diagnosis was WRONG until it was reproduced.** This finding assumed the atomicity assertion was losing a race. It is not: driven to failure under a saturated machine (14 concurrent workers against 6 CPU burners), **ten of eleven failures were `EBUSY: rmdir` in the fixture's TEARDOWN** and the eleventh was `timed out waiting for .first-lane-opened` in its SETUP. **The assertion never failed once.** Both are wall-clock assumptions in `test/support/dispatch-lane-fixture.mjs` and `test/lane-is-local-slot.test.mjs`, not in the delivered admission path: cleanup allowed 5 retries at the default 100ms (500ms of patience) for Windows to reap handles the children had already released by exiting, and `waitForPath` allowed 5000ms for a child to boot node and dynamically import two `src/` modules before writing its marker. Raised to `maxRetries: 20, retryDelay: 100` and `30000ms` respectively — both are LIVENESS guards, so a longer deadline costs a healthy run nothing because each wait ends on its signal, never on the clock. **Measured before and after on the identical load: 11 failures -> 56/56 green.** 127 assertions green across the three suites sharing that fixture and the two arch controls over the same seam. The carryable lesson is the milestone's own, inverted: *green in isolation* said the red was load-dependent and said NOTHING about which line was fragile — only driving it to failure did, and it named a different line than the one this finding accused. | 69/04 (the fixture) / backlog (the flake class) | **resolved** |

## Accept decision


**Accepted 2026-08-23, then CORRECTED the same pass. The acceptance was premature. The milestone
was returned to `in-progress` on 2026-08-23 at the operator's direction.**

The transitions were run: all six stories moved `in-review → done`, milestone 69 moved
`in-progress → done`, and the six `## Stories` boxes in `SPEC.md` were ticked. **F-69-V7 was then
found, and it is a blocker.**

**The first version of this paragraph claimed the accept "cannot be withdrawn". That was wrong, and
the error is worth keeping visible because it is the interesting part.** `aof work status 69 in-progress`
does refuse — `ITEM_STATUS_EDGES.done` is `[]` in `src/acceptance-horizon.mjs:73` — but that table's own
comment says what the refusal means: *"`done` is TERMINAL: re-opening an accepted item is a deliberate
hand edit, never a lifecycle move a command makes on its own."* Terminal names what **a command** may do
unattended, not what is **true**. A milestone with an unfinished story is not done, and a record that
says otherwise is a lie the board, `aof work next` and every downstream reader consume. So `status:` on
`SPEC.md` was hand-edited back to `in-progress` — which is precisely the deliberate operator act the
lifecycle reserves, not a circumvention of it.

**69/03 stays `done` and is not reopened.** Its leaf is delivered and its features are true of it; the
missing caller is 69/06's subject, per the remedy below. The premature accept that mattered was the
milestone's, and that is the one corrected.

**A lifecycle gap is recorded by this, and is NOT closed here.** There is no reopen door: `work:status`
takes no `--force` and no `reopen` verb (`src/commands/item-status.mjs:47-65`), so the only path back
from a wrong accept is an unguarded hand edit of a frontmatter line — outside the writer that exists to
keep exactly that honest, unstamped in `updated:`, and invisible to any check. Whether `done → in-progress`
should be a declared edge, or a coded operator act with its own refusal vocabulary, is a real design
question this milestone raised and did not answer.

What was verified genuinely holds, and F-69-V7 does not touch it: both previously open blockers are
closed in production code (F-69-V4's `@manual` scenario re-run green, F-69-V5's census green);
`aof work validate 69` returns `[]`; `aof work doctor 69` reports zero errors with **no
`control-unresolved` finding at either severity**; and all eleven declared controls are green with
their red probes recorded. Five of the six stories are wired into production paths —
`decideReviewRound` through `commands/loop.mjs`, the heartbeat consumers through `drive.mjs` /
`run-transitions.mjs` / `mesh-assignment-reclaim.mjs` / `mesh-worker-execution.mjs`, the deadlines
through the session driver's two spawn seams, `dispatchReadySet` through `commands/dispatch.mjs`,
and the park/resume reactor through `mesh-worker-execution.mjs`.

**Story 69/03 is the exception and should not have been accepted.** Its ledger is a pure leaf that
nothing calls, which is the precise defect this milestone's own objective names — *"The heartbeat is
a producer nobody calls"*, *"The concurrency bound is prose"* — reproduced in the story written to
end it. The audit that catches this is a production-consumer check per delivered leaf, and it was
run after the accept transitions rather than before them; run in the other order it would have held
69/03 at `in-review` and 69 at `in-progress`.

**The close is therefore NOT complete.** `OUTCOME.md` (milestone and per story), `RETROSPECTIVE.md`,
`aof work memory ingest` and the `STATE.md` compaction are the closing acts of a clean close, and
this close is not clean; writing them now would index a capability the runtime does not have. They
are deliberately not written.

**F-69-V7's remedy, decided by the operator 2026-08-23: a new story inside this milestone**, not a
new milestone and not a separate item — `stories/06_story_the-ledger-binds-the-build-loop`,
scaffolded and given its user story, awaiting `aof:refine 69/06`. 69/03 stays `done` and its
delivered features stay unedited; 69/06 supplies the caller they never demanded, exactly as
69/00's `03_the-cap-binds-the-loop.feature` closed F-6900. Milestone 69's `## Stories` checklist
carries the new story unticked, so the milestone's own record shows one story outstanding against
its `done` status — that disagreement is the honest state and is left visible rather than tidied.
The closing acts run when 69/06 lands and this gate is re-run.

**Doctor named the premature accept, and the fix was to stop lying rather than to wait it out.** With
69/06 added, `aof work doctor 69` reported `healthy: false`, `errors: 1` —
`lying-parent: milestone 69 is done but child story 69/06 is not done` — plus a `missing-retrospective`
warning for the same reason. The original reading of that was *"neither is suppressible without lying:
69 cannot leave `done` (terminal)"*. It had the direction backwards: the `done` **was** the lie, and
doctor was reporting it correctly. Returning 69 to `in-progress` clears both findings by making the
record true — the `missing-retrospective` warning included, since an open milestone is not expected to
carry one. The gate readings recorded above — `validate` `[]`, doctor zero errors, no
`control-unresolved` — were true of the tree as measured before 69/06 was added, and are left as the
record of what the accept was decided on.

**One further finding is open and is not 69's.** F-69-V6 is a concurrent milestone-70 verification
writing into this working tree while 69 was being measured — established by file mtimes and an
untracked, unregistered suite appearing mid-run. Its two symptoms landed on milestone 70's and
milestone 53's controls; no control milestone 69 declares was red in any of the four lane runs, and
69's own six lanes were green in all four.

Both blockers the previous pass left open are closed, and both were closed in production code rather
than by editing the criteria that caught them. F-69-V4's `@manual` scenario — the one that only
failed because it was executed rather than inspected — is green on re-run, with the driver's idle
window now resolving from the workspace through the same `deadlinePolicy` the other two consumers
already read. F-69-V5's orphaned inward binding is gone and the m53 door census is green.

The gates are clear: `aof work validate 69` returns `[]`; `aof work doctor 69` reports zero errors
and **no `control-unresolved` finding at either severity**, so every one of the eleven declared
controls resolves to a file that exists — checked at both severities precisely because a standing
`pending` marker downgrades the finding without changing whether the control is there. All eleven
red probes are recorded in the register above, none left holding the frozen placeholder.

**One finding is open and it is deliberately not a bar to this acceptance.** F-69-V6 is a concurrent
milestone-70 verification writing into this working tree while 69 was being measured — established
by file mtimes and an untracked, unregistered suite appearing mid-run, not by inference from a
single red. Its two symptoms landed on milestone 70's and milestone 53's controls; **no control
milestone 69 declares was red in any of the four runs, and 69's own six lanes were green in all
four.** Accepting 69 on evidence that excludes another milestone's in-flight files is the correct
reading. What would be wrong is the reverse: holding 69 hostage to a suite that milestone 70 is
still writing, or "re-measuring until it clears", which is the reading F-69-V3 encouraged and which
F-69-V6 now supersedes — the flake is not noise to be re-rolled away, it is another lane's work
arriving.

The honest limit on this pass: 69 is verified against a tree that was moving. That is stated rather
than smoothed over, and it is why the lane was run four times instead of once.

### 69/06 — NOT ACCEPTED, 2026-08-23 (`aof:verify 69/06`)

**Status left at `in-review`.** One blocker finding is open (F-69-V8), and the accept rule is that a
blocker holds the transition regardless of what the gates say. The gates themselves are clear:
`aof work validate 69/06` returns `[]`, `aof work doctor 69/06` reports `healthy: true` with zero
errors and **no `control-unresolved` finding at either severity**, and all 142 assertions across the
story's own lane and its blast radius are green.

**What this story genuinely delivered, and it is the substance of it.** F-69-V7 is closed in the
tree: `src/loop-progress.mjs` has production importers in two modules, the loop shell decides on the
ledger it now writes, an attempt whose samples stop moving is reset with its summary carried
forward, an attempt whose resets are exhausted escalates with the work preserved, and a build that
has stopped reducing its failing count halts on `no-progress` rather than running out the engine
cycle cap. Both of those paths are driven end-to-end through `runLoopBody` against a real git tree,
not asserted at the leaf — which is the distinction the whole finding was about. The two arch
literals 69/02 left red are reconciled, and the failing count is read from `work:grade`'s own
`cases.failed` with `indeterminate` treated as absent rather than as zero.

**Why that is not sufficient.** The story's task01 contract carries an `@executable` scenario —
*"the declared ceiling has a consumer, not merely a resolvable pointer"* — quantified over **every**
framework loop record that declares a config ceiling, and no check in the repository implements it.
The subject bound is guarded; the generalisation is not. That generalisation is the whole reason the
scenario was written: F-6900 and F-69-V7 are the same defect twice, and the criterion exists so
there is not a third. Accepting the story with its own recurrence guard unbuilt would be the exact
trade this milestone already made once and had to withdraw.

**This is cheap to close and changes no behaviour.** All three declared config ceilings were
resolved to production readers by hand at this pass and each has one, so the guard passes on the
tree as it stands — what is missing is the guard, not the property. F-69-V9's uncovered outline rows
land in the same file and should be closed in the same pass.

**Routing.** Both findings go back to `aof:continue 69/06`. The locked features are not edited —
they already say what is owed; what is owed is the check. `OUTCOME.md`, `RETROSPECTIVE.md`,
`aof work memory ingest` and the `STATE.md` compaction are the closing acts of milestone 69 and are
deliberately still not written: 69/06 is the last story between this milestone and the runtime
behaviour its SPEC claims, and writing them now would index a guarantee the tree does not yet make.

**Milestone 69 stays `in-progress`** with its `## Stories` box for 69/06 unticked, which remains the
honest record.

### 69/06 — re-run 2026-08-23, second pass (`aof:verify 69/06`) — STILL NOT ACCEPTED

**Nothing moved between the two passes, and that is the finding of this one.** The gate was re-run
in full rather than read off the section above: all fifteen lanes re-imported and re-executed under a
per-test hermetic `AOF_GLOBAL_HOME` (the whole-repo runner is still unusable here —
`global-work-propagation` binds `:4182`, held by the live control daemon). **142 assertions, 0
failing** — lane-for-lane and count-for-count identical to the previous pass.

`aof work validate 69/06 --json` returns `[]`. `aof work doctor 69/06 --json` reports
`healthy: true`, `errors: 0`, `warnings: 2` (`numbering-gap`, repository-wide; `rubric-join-unchecked`,
F-69-V9's second half) — and **no `control-unresolved` finding at either severity**, checked at both
because a standing `pending` marker downgrades that finding without changing whether the control
exists. No row in `ARCHITECTURE.md` carries `pending`.

**Both open findings were re-measured at the source, not carried forward on the record's word.**

- **F-69-V8 stands.** No check in `src/**` or `test/**` walks the framework loop records that declare
  a `config:` ceiling and resolves a production reader for each bound they point at.
  `test/work-loops-resolved-ceilings.test.mjs` (14 assertions) and FF-6902
  (`acd-no-uncapped-framework-loop`) both assert **resolution and grammar only** — `ceilingProblems`,
  `resolverProblems`, `LOOP_BOUND_CONFIG_RESOLVERS[operand]` is callable, and the absence of
  `loop-ceiling-uncapped` / `loop-ceiling-pointer-unresolved`. `acd-progress-ledger-consumed` still
  holds three assertions and still guards the subject bound alone, by literal substring match on
  `commands/loop.mjs`, with no quantification over the other records. `src/work-loops.mjs` gained no
  finding code. The `@executable` scenario *"the declared ceiling has a consumer, not merely a
  resolvable pointer"* remains implemented by nothing.
- **F-69-V9 stands.** `test/loop-progress-production.test.mjs` is unchanged at 10 cases. The only
  `failingScenarios: null` in it is on the **producer** side (`recordBuildProgress`, `:107`) — which
  is precisely the half already asserted. No case drives `decideLoopProgress` or `decideBuildProgress`
  over a sequence containing an absent round, and none drives it over `samples: []`. Five outline rows
  (`9, —, 9`; `9, 9, —`; `9, 9, —, 9`; `—, —, —`; `—, 0`) and the companion scenario stay unasserted.

**No `aof:continue 69/06` has run since the previous verdict.** Established by mtime, not inference:
`VERIFICATION.md` was written at 13:33; the newest file anywhere in `src/`, `test/`, `wiki/` or `.aof/`
inside this story's blast radius is `test/loop-progress-production.test.mjs` at 13:11, and the only
four files touched after 13:33 belong to milestone 54 (`STATE.md`, `01_story_the-declared-rubric/STORY.md`,
`test/grade-spawn-bounded-and-single.test.mjs`) plus this document.

**No new finding is raised by this pass, and none is withdrawn.** Re-running a gate against an
unchanged tree produces no new information about the tree; it produces information about the routing,
which is that F-69-V8's remedy has not been picked up. Status stays `in-review`, milestone 69 stays
`in-progress` with 69/06's `## Stories` box unticked, and `OUTCOME.md` / `RETROSPECTIVE.md` /
`aof work memory ingest` / the `STATE.md` compaction stay deliberately unwritten for the reason the
previous pass gave. The routing is unchanged: **`aof:continue 69/06`**, both findings landing in
`test/loop-progress-production.test.mjs` and a new ceiling-consumption guard beside it. The locked
features are not edited.

### 69/06 — ACCEPTED, 2026-08-23 (third pass, `aof:verify 69/06`)

**Both open findings were closed inline at this pass, at the operator's direction, and both were
closed by landing what the contract already demanded rather than by editing the criteria that caught
them.** The locked features are unedited.

| lane | count | result |
|---|---:|---|
| 69/06 — `loop-progress-production` (both amendment tasks; **+2 cases**, F-69-V9) | 12 | green |
| 69/06 — `acd-progress-ledger-consumed` (F-69-V7's consumer guard; **+3 cases**, F-69-V8) | 6 | green |
| 69/03 leaf + FF-6906, re-measured against the caller | 23 | green |
| stop vocabulary — `work-loop-stop-set`, `acd-loop-probe-contract` | 9 | green |
| declared-bound homes and ceilings — FF-6901, FF-6902, `work-loops-resolved-ceilings`, `loop-bounds` | 46 | green |
| loop shell regression — `work-loop-production-review-bound`, `loop-command-resume`, `work-loop-gate-order`, `loop-gate-cost-ladder` | 47 | green |
| FF-6908 negative control over `src/run-store.mjs` | 4 | green |
| **story total** | **147** | **green** |
| registration + vocabulary meta-gates, re-run because two suites changed — `acd-test-suite-registration`, `acd-loop-suite-registration`, `acd-roundtrip-registration`, `acd-controls-never-execute`, `acd-loop-vocabulary-closed`, `acd-loop-records-parse` | 31 | green |

**No new suite file was created, deliberately.** F-69-V8's guard EXTENDS 69/06's own
`acd-progress-ledger-consumed` — already registered, and already the module whose stated job is
distinguishing a resolvable pointer from a runtime reader. A sibling file would have been a second
home for one invariant and would have moved the `acd-test-suite-registration` census and the
byte-pinned runner regions for no gain. Both changed suites were already imported and spread by the
runner, so the registration gates are green unchanged — re-run above, not assumed.

**The new guard was proved non-vacuous from both directions, not merely observed green.** Against an
empty production tree it names all four ceilings (`loop:autonomous-cascade`, `loop:build-to-green`,
`loop:review-fix-rereview`, `loop:run-resilience`); against the real tree it names none; and the
surgical mutation that elides ONE bound's read spellings reports exactly that ceiling while leaving
the other three standing. The first mutation written for it blanked whole reader files and
collaterally silenced `work.loop.reviewRounds`, which is why the probe is spelling-level: a mutation
that kills more than the property under test proves less than it appears to.

**What the F-69-V8 guard does NOT reach, recorded rather than left to be discovered.** It proves the
BOUND has a production reader outside its declaring home — which is exactly what the criterion says —
not that the reader is itself reachable from a production entry point. `src/loop-progress.mjs` read
`work.loop.buildNoProgressRounds` throughout F-69-V7 while nothing called `src/loop-progress.mjs`.
Reachability for this bound is the first case in the same file; the quantified check is the register,
not the call graph. The limit is stated in the suite's own header comment so the next reader does not
mistake it for cover.

### Command and static checks — 69/06 (accepting pass)

- `aof work validate 69/06 --json` returned `[]`.
- `aof work doctor 69/06 --json` reports `healthy: true`, `errors: 0`, `warnings: 2`
  (`numbering-gap`, repository-wide; `rubric-join-unchecked`, F-69-V9's second half, routed to 54).
  **No `control-unresolved` finding at either severity**, checked at both because a standing `pending`
  marker downgrades that finding without changing whether the control exists; no row in
  `ARCHITECTURE.md` carries `pending`.
- **No new fitness control is declared.** The register still holds eleven. F-69-V8's guard is a
  finding-level check inside an existing control's suite, not a twelfth invariant. The four controls
  inside 69/06's blast radius (FF-6901, FF-6902, FF-6906, FF-6908) were re-measured green above;
  their red probes stand as recorded and are not restated.

verifies → `stories/06_story_the-ledger-binds-the-build-loop/tasks/00_the-loop-writes-the-ledger.feature`
verifies → `stories/06_story_the-ledger-binds-the-build-loop/tasks/01_the-ledger-halts-the-build-and-resets-the-attempt.feature`

**Accept decision: 69/06 is accepted.** Validate PASS, doctor clean at both severities, 147 story
assertions plus 31 meta-gate assertions green, and **no blocker finding open** — F-69-V8 and F-69-V9
both read `resolved` in the register above. `aof work status 69/06 done` was run, the milestone
`SPEC.md` `## Stories` box is ticked, and `OUTCOME.md` is authored into the story's own folder.

**The honest limit on this pass, unchanged from the previous two:** the whole-repo runner is still
unusable on this control node (`global-work-propagation` binds `:4182`, held by the live control
daemon), and milestones 54 and 70 are writing this working tree concurrently — F-69-V6, still open
and still not 69's. Every lane above was imported by name and run under a per-test hermetic
`AOF_GLOBAL_HOME`, mirroring the repo runner's own loop. The full suite belongs to the **milestone**
gate, which is where it is owed and where the per-story commits make bisecting a cross-story poisoner
mechanical.

**Milestone 69 is now at its own gate.** All six stories read `done`. `aof:verify 69` re-run is what
accepts the milestone and runs the closing acts — the milestone `OUTCOME.md`, `RETROSPECTIVE.md`,
`aof work memory ingest` and the `STATE.md` compaction — and it is deliberately NOT run from this
story's gate.

### 69 — NOT ACCEPTED, 2026-08-23 (milestone gate, `aof:verify 69`)

**Status left at `in-progress`.** **Five** blocker findings are open — F-69-V10, F-69-V11, F-69-V17,
F-69-V19, F-69-V20 — every one of them milestone 69's own change, and every one found by the
repository-wide sweep and by nothing else.

**The sweep, measured.** The whole registered unit array minus the six `global-work-propagation`
tests (they bind `:4182`, held by the live control daemon): **`TOTAL=6828 RAN=6822 PASS=6617
FAIL=205 SKIPPED=6`**.

**Then attributed, which corrected this section twice.** Every failure was re-run in its own process,
then again against a detached `git worktree` at `0a22fb1` — the last commit touching these seams
before 68, 69 and 70 — with `node_modules` junctioned in. **193 are pre-existing on this machine,
11 were introduced by 68/69/70, 1 is in a suite that did not exist at baseline.** The 123 `ui/`
link failures (F-69-V13) fall inside the pre-existing 193.

**Six of the eleven introduced are milestone 69's, and the list is not the one this document first
carried:**

| assertion | finding | kind |
|---|---|---|
| `arch/53 FF-5301` driver import census + two reach ceilings | F-69-V10 | frozen census + ADR |
| `loop determinism — the module copied alone` | F-69-V11 | frozen behaviour |
| `artifact-sync/00` one aof-authored PostToolUse group | F-69-V17 | frozen "exactly one" |
| `claude-settings/03` × 2 (fresh-workspace trigger; no whole-file plan) | F-69-V17 | frozen "exactly one" |
| `arch/34 ADR-004` launcher reaches the store directly | **F-69-V19** | layering invariant |
| `task04/38-06` needs-input frames `0 !== 1` | **F-69-V20** | **delivered behaviour** |

The other five introduced failures are not 69's (`arch/53 FF-5308` over `src/work.mjs`, which 69 does
not touch; `arch/FF-6601` over the Gherkin recogniser) or are unreliable signals
(`mesh-coordination-launcher/03`, F-69-V15's flake; `build-sea-recipe-guards/F14` and
`item-status/if-applicable`, both of which vanish under isolation).

**Two findings this document called blockers were wrong, and both are corrected in the register
above.** F-69-V12 (manifest 96 → 97) and F-69-V16 (seventeen worker-clone assertions) were each
downgraded by measurement: the first because its suite was already red at baseline on earlier
assertions, the second because it is identical at baseline, with 70's fixture restored, and with
69's worker module restored. **F-69-V20 is the finding that replaces them, and it is worse than
either** — it is the only blocker here that changes what the system does rather than what a census
says.

**Milestone 69's own lanes are green, and that was never the question this gate asks.** 455
assertions across every 69 suite, its eleven fitness controls, the adjacent modules 69 edits and the
registration meta-gates: `PASS=455 FAIL=0`, run from the repository root under a per-test hermetic
`AOF_GLOBAL_HOME`.

| lane | count | result |
|---|---:|---|
| 69/00 — declared bounds, review cap, resolved ceilings | 82 | green |
| 69/00 — FF-6901, FF-6902 | 9 | green |
| 69/01 — heartbeat consumption; FF-6903, FF-6904 | 11 | green |
| 69/02 — four deadlines, driver door + gate aim; FF-6905 | 46 | green |
| 69/03 — progress ledger and policy; FF-6906 | 23 | green |
| 69/04 — local and mesh admission; FF-6907/6908/6910/6911 | 99 | green |
| 69/05 — parking and resume; FF-6909 | 31 | green |
| 69/06 — the ledger binds the build loop | 18 | green |
| stop vocabulary and the two frozen literals that pin it | 10 | green |
| loop shell regression | 9 | green |
| adjacent modules 69 edits | 94 | green |
| registration and control meta-gates | 23 | green |
| **total** | **455** | **green** |

**The five blockers.** F-69-V10: the session driver imports `./loop-bounds.mjs` and milestone 53's
frozen import census still reads seven — plus two reach ceilings that have moved with it (driver 24
against `<= 23`, sink 62 against a pinned `59`), the first of which the control says *"requires an
ADR"*. F-69-V11: `src/work-loop.mjs` imports `./loop-progress.mjs` and milestone 53's determinism
contract requires that module to load with every dependency absent. F-69-V17: 69/01's heartbeat hook
is the second `PostToolUse` hook aof installs, and three assertions were written when there was
exactly one. F-69-V19: `src/mesh-launcher.mjs:119` imports the SQLite projection store directly,
which milestone 34's ADR-004 forbids, landed by `d9fb8ca "Fix dispatch admission and resume races"`.
F-69-V20: the fleet terminal view's needs-input path applies **zero** frames where milestone 38
expects one.

**Four of the five are the same shape — a guard another milestone wrote when the surface 69 extends
had one occupant.** A frozen import list, a module frozen as loadable-alone, a hook merge frozen at
"exactly one", a layering rule frozen before the launcher needed the data. **Two of those are genuine
contract conflicts, not censuses to bump:** F-69-V11 pits milestone 53's *"the loop shell decides
with every dependency absent"* against 69/06's need for the progress authority inside the shell;
F-69-V17 pits 69's own FF-6904 — *every bundled hook derives nothing and exits 0 on every path* —
against m42's `acd-no-new-silent-catch`, which requires every catch to emit a coded event through a
`src/` sink the hook is forbidden to import. In each, two defensible rules meet and one must admit
the other's case in its own words.

**F-69-V20 is not that shape, and it is the one to read first.** It is a behavioural regression:
ADR-007's 2026-08-22 amendment correctly moved the park onto the durable outbox, and milestone 38's
terminal-view contract still asserts the fire-once frame the amendment replaced. 69/05's own
`## Gaps` predicted the user-visible half of this — *"the in-place answer is superseded, not
preserved"* — and nobody checked which existing tests encoded the superseded path. Every
`@executable` scenario 69/05 delivered is green, because none of them observes the fleet's
applied-frame stream. That is the seam between two milestones, which is exactly where this gate's
lane-selection blind spot lives.

**Why the milestone lane did not catch them, stated plainly, because it is the same mistake twice.**
The lane above was assembled from the suites milestone 69 is *filed under*. FF-5301
(`acd-session-driver-mesh-blind`), `work-loop-determinism` and `autonomous-shell-out-prompt` are
filed under milestones 53 and 70, over three files 69 edits — `agent-session-driver.mjs`,
`work-loop.mjs`, `manifest.json`. This milestone's own `STATE.md` `## Feedback (for retro)` already
records the lesson from the 2026-08-23 pass: *"A per-milestone lane must be selected from what the
change touches, not from what the change is filed under."* It was written about
`agent-session-driver-door`, one guard over one of those same three files, and the correction was
applied to that guard alone rather than to the rule. F-69-V10's import has been red **since 69/01–02
merged** and survived three verify passes for exactly this reason.

**This is what the full suite at the milestone gate is for.** The trade the process states — a
poisoning story is caught at the gate rather than immediately — was paid here as designed. Nothing
about it is a surprise; the sweep found what the scoped lanes structurally could not.

**Not blockers, and not 69's.** F-69-V13 accounts for **123** of the sweep's 205 failures as one
defect: the
`ui/` workspace is not installed, so `clsx`, `tailwind-merge` and `marked` — all three declared in
`ui/package.json`, all three in the root lockfile, none on disk — cannot resolve, and every board /
grid / terminal-control / shell suite fails to link. Milestone 69 touches no file under `ui/`. The
owner is named (a root `npm install`, workspace-aware) rather than deferred to nobody, which is the
standing lesson from F-69-V1; it was not run because this is the live control node with the desktop
supervisor up, and a root install can attempt to rebuild `node-pty` against a binary a running daemon
holds. That is an operator act, not a verify act. The remaining sweep failures are also not 69's and
were attributed at source rather than by assumption: `arch/53 FF-5308` (`src/work.mjs` byte-changed,
1339 lines against the frozen 1209 — 69 does not touch it), `arch/ADR-002` and `memory-integration`
(`work-init.mjs` / `work-memory.mjs` — 69 touches neither), `work-init/runtime --runtime codex` (69
modifies no bundle command, agent or skill), and the *"continue address is byte-unchanged"* half of
the distribution suite, whose expected `sha256:b2a34c2b…` is already stale against the `566d3c30…`
the manifest carries **at `HEAD`** — stale before this milestone, not by it.

**The gates themselves are clear, and they were not sufficient.** `aof work validate 69 --json`
returns `[]`. `aof work doctor 69 --json` reports `healthy: true`, `errors: 0`, `warnings: 9`, with
**no `control-unresolved` finding at either severity** — checked at both precisely because a standing
`pending` marker downgrades that finding without changing whether the control exists, and no row in
`ARCHITECTURE.md` carries one; all eleven declared control files resolve on disk. `aof work loops
validate --json` reports zero errors and 38 warn-level graph/authority findings, none a
ceiling-consumption code — milestone 53's surface, and equally true before 69. **Every one of those
gates was green while three of this milestone's edits held the repository suite red**, which is worth
recording: validate and doctor read the work stream, not the test tree.

**`@manual` — 69/01 task 02, re-run rather than read.** The milestone's only `@manual` feature; there
is no `@uat` scenario anywhere in 69 and no `DESIGN.md`, so no human step and no design-conformance
step applies. All four scenarios green: the reclaim threshold, loop-shell default and driver idle
window each answer `900000` against a workspace declaring nothing and `60000` against one declaring
`work.loop.heartbeatMs`, each reached through `DEFAULT_HEARTBEAT_MS`; `src/` holds exactly one
15-minute literal, at `src/loop-bounds.mjs:6`. The dual-staleness gate reclaims on stale
presence + expired liveness, holds off on stale presence + *fresh* liveness — the second signal doing
work for the first time — holds off on fresh presence + a silent run past the deadline, and treats an
absent presence record as unknown rather than stale. The production join reads
`run?.heartbeatAt ?? run?.updatedAt ?? row.updatedAt` at `src/mesh-assignment-reclaim.mjs:201`.

verifies → `stories/01_story_heartbeat-by-consumption/tasks/02_one-staleness-constant.feature`

**Production-consumer audit, re-measured at this pass.** The check this milestone's objective
demands, applied to its own delivery. All seven leaves have production importers outside their own
module — including `src/loop-progress.mjs`, whose absence was F-69-V7: `src/work-loop.mjs:3` and
`src/commands/loop.mjs:39`, reached from `runLoopBody`. `decideReviewRound` is reached through
`decideReviewGate` (`src/work-loop.mjs:264`) from `src/commands/loop.mjs:1015,1429`. FF-6908's byte
freeze was re-checked at source: `src/run-store.mjs` normalised SHA-256 is
`40fd3ee61226cb3d25d411e4dbde6d87586525da27ba69433eecdb053e52d3dd`, matching the pin.

**The closing acts are deliberately not run.** No milestone `OUTCOME.md`, no `RETROSPECTIVE.md`, no
`aof work memory ingest`, no `STATE.md` compaction — the same reasoning the two previous declines
gave: writing them now would index a milestone the repository suite does not currently support. The
six missing **story** outcomes WERE authored (F-69-V14), because those stories are accepted and their
delivered state is true of them; that is a backfill of an already-taken decision, not a close.

**The attribution pass, run 2026-08-23 after the verdict, and it CORRECTED this record twice.**
Every one of the 205 sweep failures was re-run in its own process, then again against a detached
`git worktree` at **`0a22fb1`** — the last commit touching these seams before milestones 68, 69 and
70 began — with `node_modules` junctioned in.

- **202 of 205 reproduce in isolation.** Only three were sweep-order artifacts:
  `mesh-coordination-launcher/03` (F-69-V15's flake, independently confirmed), `build-sea-recipe-guards/F14`,
  and `item-status/if-applicable`. The sweep is therefore a reliable instrument, which is worth
  knowing before anyone re-runs it.
- **F-69-V16's attribution was wrong, twice, and the corrections are measured rather than argued.**
  The first candidate (milestone 70's fixture edit) and the second (69's uncommitted spawn-seam
  wiring) were each refuted by restoring the file to `HEAD` and re-running: 37 pass / 17 fail both
  times, identical to the working tree. At the pre-68/69/70 baseline: **37 pass / 17 fail again**.
  Those seventeen predate all three milestones and are almost certainly the platform — the
  repository's CI runs `ubuntu-latest`, and one case fails with
  `ENOENT … mkdir 'C:\…\checkouts\C:\Windows\.aof'`, which cannot succeed on Windows. Both swapped
  files were restored and verified by SHA-256.

**The lesson in that correction is the same one this milestone keeps paying for.** A plausible
causal story — a concurrent session editing a shared fixture, with its own comment naming the lane —
survived two write-ups and was wrong. What settled it was a controlled swap, which cost minutes and
was available the whole time. *"Reproduced in isolation"* establishes that a red is real; it says
nothing about who caused it, and the two questions had been run together.

**Routing: `aof:continue 69`.** F-69-V10 and F-69-V12 are census recordings. F-69-V11 and F-69-V17
each need a decision between two defensible contracts, with 53's and m42's owners named. The locked
features are not edited for any of the four — none of them says anything a criterion got wrong.

**The honest limit on this pass.** The tree was moving while it was measured: a concurrent milestone
54 session rewrote `src/commands/loop.mjs` at 19:24 and `scripts/test.mjs` at 19:24, after the sweep
had begun at 19:19. 69/06's consumer binding was re-checked after that write and is intact, and the
455-assertion lane was run as a single coherent read afterwards. The three blockers were each
reproduced directly at source rather than taken from the sweep's word.


### 69 — NOT ACCEPTED, 2026-08-24 (milestone gate, `aof:verify 69`)

**Status left at `in-progress`.** One blocker is open — **F-69-V21** — and it is milestone 69's own
edit leaving the repository suite red. That is the rule this milestone has applied to itself at
every prior gate, and relaxing it now, on the pass that would close it, would be the worst possible
moment to start.

**This gate is a far better measurement than any before it, and the verdict is still no.** The tree
was clean and committed for the first time (`71a7b02`), every subject file predates the sweep's
start, the sweep went from 205 red to 48, and 44 of those 48 reproduce at `0a22fb1`. Milestone 69's
own 46 control assertions are green, its `@manual` lane is green executed rather than inspected, and
all five of the previous pass's blockers are closed in production code with none of the criteria
that caught them edited. What holds the transition is one stale literal.

**F-69-V21 in one line: `src/bundle/**` carries 76 files, a tripwire says 74, and the two extra
files are 69/01's hooks.** The property that tripwire guards — that the generated manifest covers
the tree exactly — is **green**, measured separately because `assert.equal` throws before the
set-equality ever runs: 76 direct, 76 manifested, empty diff both directions, order-sensitive. So
nothing this milestone claims is falsified and no shipped behaviour is wrong. The remedy is the one
the pin's own comment spells out in capitals for exactly this case: the literal moves in the same
diff as the tree.

**It was NOT closed inline, deliberately.** The pin belongs to milestone 28, a frozen census is
somebody's declared contract, and the previous pass closed its blockers inline only under explicit
operator direction — none was given here. Routed to `aof:continue 69` as a one-line record plus its
breakdown comment: 74 -> 76, with `claude-run-heartbeat.json` and `run-heartbeat-enqueue.mjs` named
beside the m49 / m53 / opencode entries the comment already carries.

**The fifth instance of one class, and the class is now this milestone's headline lesson.**
F-69-V10 (an import census), F-69-V11 (a module frozen as loadable-alone), F-69-V12 (a manifest
membership count), F-69-V17 (a hook merge frozen at "exactly one") and now F-69-V21 (a bundle file
count) are the same defect five times: **a control that freezes a SET is making a claim about the
future, and a milestone that extends shared surfaces will break every one of them.** The pin
F-69-V21 fires on even records the identical thing happening to milestone 53 at its own gate (its
F-20, the opencode change `d5cea70`). Two milestones have now paid for this lesson and the
mechanical form of it — resolve the changed-file set from git, run every suite that reads one of
those paths, before the gate — is still not built. That is `RETROSPECTIVE.md`'s primary carry.

**F-69-V22 is recorded and is not a bar.** `69/04 task 02`'s atomicity scenario went red once in the
loaded sweep and is 35/35 green in isolation three times over. Green-in-isolation proves the red is
load-dependent; it does not prove the admission path is sound under contention, and that limit is
written into the finding rather than smoothed away.

**The gates were all clear and again were not sufficient.** `aof work validate 69 --json` returns
`[]`. `aof work doctor 69 --json` reports `healthy: true`, `errors: 0`, `warnings: 9`, with **no
`control-unresolved` at either severity** — checked at both because a standing `pending` marker
downgrades that finding without changing whether the control exists, and no row in
`ARCHITECTURE.md` carries one; all eleven control files resolve on disk. `aof work loops validate
--json` reports zero errors and 38 warn-level graph/authority findings, none a ceiling-consumption
code. **Every one of those was green while a 69 edit held the suite red** — the second time this
milestone has recorded that sentence, and the reason the full suite is owed at this gate and
nowhere else.

**The closing acts stay unwritten.** `RETROSPECTIVE.md`, `aof work memory ingest` and the `STATE.md`
compaction are the closing acts of a clean close, and this close is not clean. The milestone
`OUTCOME.md` already exists from the fix pass and is left as authored — it states product state
that is true of the tree, and F-69-V21 falsifies none of it. All seven stories stay `done` with
their `## Stories` boxes ticked: every one is genuinely delivered, and the open finding is a census
in another milestone's suite, not a gap in any story's contract.

**The honest limit on this pass.** The full array minus `global-work-propagation` is the most this
control node can run, and the exclusion is structural rather than a choice — the live control daemon
holds `:4182`. Those six assertions are unmeasured here and belong to CI.


### 69 — ACCEPTED, 2026-08-24 (milestone gate, `aof:verify 69`, after the inline fix pass)

**Both blockers of the decline above are closed in the tree, and both were closed by landing what
the contract already demanded rather than by editing what caught them.** The decline stands in this
document as written; it is not revised, because it was correct when it was made.

- **F-69-V21** — the `src/bundle/**` census literal moved with the tree, `74 -> 76`, its breakdown
  corrected at the one category that actually moved and the recurrence recorded beside milestone
  53's. Proved non-vacuous: a planted 77th file trips it (`77 !== 76`).
- **F-69-V22** — fixed, **and the finding's own diagnosis was refuted on the way.** It accused the
  atomicity assertion of losing a race. Driven to failure under a saturated machine, ten of eleven
  failures were `EBUSY: rmdir` in the fixture's TEARDOWN and the eleventh a setup timeout; the
  assertion never failed once. Two wall-clock assumptions in the fixture were raised. Measured
  before and after on identical load: **11 failures -> 56/56 green.**

**The gate, re-read at the accepting pass and not carried forward from the decline:**

- `aof work validate 69 --json` returns `[]`.
- `aof work doctor 69 --json` reports `healthy: true`, `errors: 0`, and **no `control-unresolved`
  finding at either severity** — checked at both because a standing `pending` marker downgrades that
  finding without changing whether the control exists, and no row in `ARCHITECTURE.md` carries one.
  All eleven declared control files resolve on disk.
- `aof work loops validate --json` reports zero errors; its warn-level graph/authority findings carry
  no ceiling-consumption code and are milestone 53's surface, equally true before 69.
- The full registered array minus `global-work-propagation`: **`PASS=6777 FAIL=45`**, with **zero of
  the 45 attributable to milestone 69** and an empty add-side against the previous sweep.
- All eleven fitness controls plus their planted-defect self-check legs: 46 assertions green. Every
  red probe in the register above is recorded; none holds the frozen placeholder.
- The one `@manual` feature, executed rather than inspected: 4/4. No `@uat` scenario and no
  `DESIGN.md` exist anywhere in this milestone, so no human sign-off and no design-conformance step
  apply — that is a measured absence, not a skipped step.
- All seven stories read `done` and every `## Stories` box is ticked.

**Accept decision: milestone 69 is accepted.** Validate PASS, doctor clean at both severities, no
blocker finding open, and the repository suite carrying nothing of 69's. `aof work status 69 done`
was run, and the closing acts follow: `RETROSPECTIVE.md`, `aof work memory ingest`, and the
`STATE.md` compaction. The milestone `OUTCOME.md` was already authored at the fix pass and is left
as it stands — F-69-V21 and F-69-V22 falsify nothing in it, since neither touched a delivered
capability.

**What this acceptance does NOT claim.** It does not claim the repository suite is green — 45
assertions are red and 40 of them predate this milestone by more than a week. It does not claim
milestone 69's bounds are the right VALUES; every one is a starting point under measurement, which
`OUTCOME.md` `## Assumptions` states. And it does not claim the frozen-set class is closed: five
instances inside one milestone, and the mechanical guard against a sixth is still unbuilt, which is
`RETROSPECTIVE.md`'s primary carry rather than a gap in any story.
