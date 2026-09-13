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
# 68 · Loop telemetry — Verification

<!-- Build note (story 68/02, 2026-08-21): the mandatory `aof work memory recall`
     ("spend ingest settle token buckets cost price table transcript" --kind
     near-miss --block) returned EMPTY — nothing to surface. The build-shaping
     gotchas were instead discovered in the code: FF-6803/FF-6804 scan src/*
     excluding run-store.mjs and trip on any module that names the four buckets or
     carries costUsd+priceTable+`*` (even a comment asterisk), which is why the
     vendor→bucket rename and the priced-cost computation were placed in the writer
     (run-store.mjs) rather than in the producer module. See STATE.md ## Feedback. -->

<!--
  OPENED AT REFINE (2026-08-20), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept
  decision to write — and an empty "None" placeholder is not information. Those three sections are
  authored by `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eight controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 68` reports as
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

     ALL EIGHT CONTROLS ARE `pending` IN `ARCHITECTURE.md` — not one arch-test file has landed. Each
     lands with its subject story (68/00 carries FF-6801…FF-6804; 68/01 carries FF-6808; 68/03
     carries FF-6805 + FF-6806; 68/05 carries FF-6807), and its row here is filled at that moment,
     not before.

     **Do not accept this milestone while any row still reads `pending`** — marker or no marker. A
     standing `pending` downgrades `control-unresolved` to `warn`, and a warn-only doctor result
     does not fail `aof:validate`, so nothing refuses the transition for you. What clears a row is
     landing the file or dropping the declaration, never re-marking it `pending`. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-6801 | `test/arch/acd-run-record-node-additive.test.mjs` *(extended)* | **green** — 3/3, 2026-08-21 | In `buildRecord()`, `spend` was moved AHEAD of `resumeAfter` — appended fifteenth rather than last. Observed: `AssertionError: a minted record carries exactly the sixteen keys, in order`, with the key-order diff. The task-00 scenario went red beside it (`the fifteen delivered keys are unchanged in name, order and meaning`). Reverted; tree clean. |
| FF-6802 | `test/arch/acd-run-phase-single-authority.test.mjs` | **green** — 2/2, 2026-08-21 | A rival `"phase"` key was appended to `SPEND_ENVELOPE_KEYS` — a second phase authority beside `brief.loop.phase`. Observed: `AssertionError: the spend envelope declares no phase key` (`acd-run-phase-single-authority.test.mjs:45`). Reverted; tree clean. |
| FF-6803 | `test/arch/acd-token-buckets-mutually-exclusive.test.mjs` | **green** — 3/3, 2026-08-21 | A fifth token key `"totalTokens"` — the fold-in bucket the closed set exists to refuse — was added to `TOKEN_BUCKET_KEYS`. Observed: `AssertionError: the four mutually-exclusive buckets are exactly input/output/cacheRead/cacheCreate`, diff `+ 'totalTokens'`. Reverted; tree clean. |
| FF-6804 | `test/arch/acd-cost-stamped-once.test.mjs` | **green** — 3/3, 2026-08-21 | A third member `"estimated"` was added to `COST_SOURCES`. Observed: `AssertionError: costSource is the closed two-member set reported`+`priced`, diff `+ 'estimated'` — and the writer-seam proof went red with it: `Missing expected rejection: the writer refuses the malformed cost (cost-source-closed)`. Reverted; tree clean. |
| FF-6805 | `test/arch/acd-observe-attribution-by-join.test.mjs` | **green** — 2/2, 2026-08-21 | The retired text matcher was reintroduced as a definition (`function agentMatchesMilestone({ meta, firstUserText }, { id, slug }) { … }`) beside the classifier. Observed: `AssertionError: the text matcher is not defined` (`acd-observe-attribution-by-join.test.mjs:36`). Reverted; tree clean. **Re-performed by the verifier at the 2026-08-21 accept pass** (not read off this row): same plant, same message, and FF-6806's src-wide guard went red beside it (`offenders: src\work-observe.mjs`); `git diff --stat` returned to its pre-probe `154 insertions(+), 79 deletions(-)` and the lane to 14/14. **Re-performed AGAIN at the FOURTH pass (2026-08-21) on the post-F-07-fix bytes**, because `src/work-observe.mjs` changed by 242 lines after the third pass and a probe on superseded bytes proves nothing about the current ones: the matcher was planted beside `classifyToolCallResult`; observed `not ok - arch/68 FF-6805 …` / `AssertionError: the text matcher is not defined`, with FF-6806's src-wide guard red beside it (`offenders: src\work-observe.mjs`). Reverted; `git diff --stat` returned to the identical `162 insertions(+), 80 deletions(-)` it held before the probe, and the lane to 16/16. |
| FF-6806 | `test/arch/acd-observe-attribution-by-join.test.mjs` | **green** — 2/2, 2026-08-21 | The unattributed reporting was dropped in `collectMilestoneAgents` (a no-session run silently `continue`d instead of being counted) — the exact "silent drop" the ADR-006 posture forbids. Observed: `AssertionError: the no-session run is reported unattributed, not assigned and not dropped` (`acd-observe-attribution-by-join.test.mjs:127`). Reverted; tree clean. **Re-performed by the verifier at the 2026-08-21 accept pass**: `unattributedCount += metas.length` deleted at `src/work-observe.mjs:753`; same message, and TWO behavioural scenarios went red beside it (`the count of unattributed runs is stated`; `the no-record session's agent is reported unattributed`). Reverted; lane 14/14. **Re-performed AGAIN at the FOURTH pass (2026-08-21) on the post-F-07-fix bytes**: the same line (now `:760`) replaced by a comment so a no-session run silently `continue`s; observed `AssertionError: the no-session run is reported unattributed, not assigned and not dropped`, with the SAME two behavioural scenarios red beside it. Reverted; tree back to `162 insertions(+), 80 deletions(-)`, lane 16/16. |
| FF-6807 | `test/arch/acd-observe-snapshots-append-only.test.mjs` | **green** — 3/3, 2026-08-21 | The observe write block was regressed to the pre-68 in-place form — `writeFile(path.join(obsDir, "report.md"), …)` / `writeFile(path.join(obsDir, "agents.json"), …)` instead of writing a new timestamped snapshot under `observability/snapshots/<ts>/`. Observed: `AssertionError: no write path opens the legacy root-level report.md/agents.json for truncation or rewrite`, and the behavioural seam proof red with it (`ENOENT: … observability\snapshots\…\report.md`, because the snapshot was written to the root instead of the snapshot dir). The third guard (`no module truncates an observability snapshot`) stayed green — the probe was the in-place write, not a truncate call. Reverted; tree clean. |
| FF-6808 | `test/arch/acd-no-otlp-receiver.test.mjs` | green (68/01) | planted `src/_otlp-receiver-probe.mjs` (`createServer().listen(4317)`), then deleted → detector #1 reported: `no src module receives OTLP — the OTel surface is env-set-at-spawn only (offenders: src\_otlp-receiver-probe.mjs)` |

## Verification evidence

<!-- Story 68/00 `spend-bearing-run-record`, verified 2026-08-21. The lane is SCOPED TO THE STORY —
     its own four `@executable` task features plus its own four fitness functions — not the whole
     repo's suite, which runs once at the milestone gate where the per-story commits make bisecting a
     cross-story poisoner mechanical. No `@manual` and no `@uat` scenario exists on this story (all
     four features are tagged `@executable` alone), and the story has no UI surface, so no
     human-acceptance step and no design-conformance review applies. -->

### The scoped `@executable` lane — 27/27 green

Run against the story's registered suites, each test under its own throwaway `AOF_GLOBAL_HOME`
(the same per-test hermetic global home `scripts/test.mjs` gives them), never the real `~/.aof`:

| lane | tests | result |
|---|---|---|
| `test/run-store-spend.test.mjs` — the four task features' scenarios | 16 | green |
| FF-6801 `test/arch/acd-run-record-node-additive.test.mjs` *(extended)* | 3 | green |
| FF-6802 `test/arch/acd-run-phase-single-authority.test.mjs` | 2 | green |
| FF-6803 `test/arch/acd-token-buckets-mutually-exclusive.test.mjs` | 3 | green |
| FF-6804 `test/arch/acd-cost-stamped-once.test.mjs` | 3 | green |

**Traceability is 1:1 and non-vacuous.** The four features declare sixteen scenarios in total
(three Scenarios + one Scenario Outline each), and `run-store-spend.test.mjs` exports sixteen
named tests — `run-store-spend/00` ×4, `/01` ×4, `/02` ×4, `/03` ×4 — each naming the scenario
it discharges. *verifies →* `tasks/00_sixteenth-key-additive.feature`,
`tasks/01_token-buckets-refused-at-write.feature`, `tasks/02_cost-stamped-once.feature`,
`tasks/03_exit-reason-vocabulary.feature`.

### Registration was confirmed by reading, not assumed

`aof work doctor 68` reports `control-runner-unchecked` — no `work.controls.runners` is
configured in `.aof/aof.config.json`, so doctor's leg B (*does a runner name this file?*) did not
run for any control in this milestone. Checked by hand instead: all five suites are imported at
`scripts/test.mjs:1058-1061` (plus `acdRunRecordNodeAdditiveTests`, already imported for m26)
**and spread** into the registry at `scripts/test.mjs:2985-2989` inside the story's own labelled
block. FF-6801's suite is spread there for the first time — it had been imported for m26 but never
registered, so the extension is now actually enforced. Logged as F-03 below, because a check that
cannot run is not a check that passed.

### The red probes

Each of the four controls was made to FAIL before being recorded green — see the `red probe` cell
of every row above. Each probe perturbed the real writer (`src/run-store.mjs`), was observed red,
and was reverted; `git diff --stat` was empty after each revert, and the lane returned 27/27 green
on the restored tree.

**What these probes do NOT establish**, stated so no later reader over-reads them: they were
performed on this working tree, not on the bytes that shipped; they reach the four declared
`FF-NN` controls alone and no other assertion in the suite; and they cannot distinguish a real
probe from a fabricated one — no declarative model can.

### Story 68/05 `append-only-snapshots`, verified 2026-08-21

The lane is SCOPED TO THE STORY — its own two `@executable` task features plus its own fitness
function (FF-6807). Both task features are tagged `@executable` alone (no `@manual` / `@uat`
scenario), and the story has no UI surface, so no human-acceptance step and no design-conformance
review applies.

| lane | tests | result |
|---|---|---|
| `test/work-observe-snapshots.test.mjs` — the two task features' scenarios | 10 | green |
| FF-6807 `test/arch/acd-observe-snapshots-append-only.test.mjs` | 3 | green |

**Traceability is 1:1 and non-vacuous.** `00_never-overwrite.feature` declares five Scenarios and
`01_legacy-snapshots-marked.feature` declares four Scenarios + one Scenario Outline (four rows).
`work-observe-snapshots.test.mjs` exports ten named tests — `work-observe-snapshots/00` ×5 and
`/01` ×5 (the Outline rows folded into one test iterating the four facts) — each naming the
scenario it discharges. *verifies →* `tasks/00_never-overwrite.feature`,
`tasks/01_legacy-snapshots-marked.feature`.

**Registration was confirmed by reading, not assumed.** Both suites are imported at
`scripts/test.mjs:1062-1063` and spread into the registry at `scripts/test.mjs:2997-2999` inside
the milestone-68 block. `acd-test-suite-registration` (every suite on disk is imported by a
runner) and `acd-loop-suite-registration`'s REG-MUT-11 freeze (the runner logic + every line
outside the labelled blocks is digest-frozen) both pass on the registered tree. The FF-6807 red
probe is recorded in the register row above.

### The red probe (FF-6807)

See the `red probe` cell of the FF-6807 row above: the observe write block was regressed to the
pre-68 in-place form, both the source guard and the behavioural seam proof went red, and the tree
was reverted (`git diff --stat` empty on `src/work-observe.mjs` after the revert).

**Memory gotchas that shaped this build.** The near-miss recall (`aof work memory recall … --kind
near-miss --block`) surfaced nothing new; the shaping facts were the graph measurement in
`ARCHITECTURE.md` (work-observe is a self-contained leaf, so region cuts are safe) and the
registration ratchet (`acd-test-suite-registration`'s shrink-only baseline, which is why the two
new suites are registered in `scripts/test.mjs`, not left unregistered like the legacy
`test/work-observe.test.mjs`).

### Story 68/04 `story-and-phase-scoped-observe`, verified 2026-08-21

The lane is SCOPED TO THE STORY — its own three `@executable` task features. The story declares no
fitness function of its own (its content is observable behaviour over the real seam, which is task
`.feature` material by the register's own rule). All three features are tagged `@executable` alone
(no `@manual` / `@uat`), and the story has no UI surface, so no human-acceptance step and no
design-conformance review applies.

| lane | tests | result |
|---|---|---|
| `test/work-observe-scope.test.mjs` — the three task features' scenarios | 17 | green |

**Traceability is 1:1 and non-vacuous.** The three features declare fifteen scenarios (four
Scenarios + one Scenario Outline each); `work-observe-scope.test.mjs` exports seventeen named
tests — `work-observe-scope/00` ×5, `/01` ×6, `/02` ×5 (two Outlines split per-example rather than
folded) — each naming the scenario it discharges. *verifies →* `tasks/00_story-scoped-ref.feature`,
`tasks/01_per-phase-rollup.feature`, `tasks/02_json-contract.feature`.

**Registration was confirmed by reading, not assumed.** `workObserveScopeTests` is imported at
`scripts/test.mjs:1083` and spread into the registry at `scripts/test.mjs:3028` inside the
milestone-68 block. (`aof work doctor`'s leg B still cannot confirm this for itself — see F-03.)

**No red probe is owed.** The story declares no `FF-NN`, so the obligation does not reach it; the
red-probe field never reached every assertion in a behavioural suite, only declared controls.

### Story 68/02 `spend-ingest-at-settle`, verified 2026-08-21

The lane is SCOPED TO THE STORY — its own two `@executable` task features. The story declares no
fitness function of its own: FF-6803 and FF-6804 (68/00) bind its output in the writer, which is
the point of enforcing in the writer rather than in each producer. Both features are `@executable`
alone; no UI surface.

| lane | tests | result |
|---|---|---|
| `test/run-spend-ingest.test.mjs` — the two task features' scenarios + the settle seam | 11 | green |

**Traceability is 1:1 and non-vacuous.** The two features declare ten scenarios (four Scenarios +
one Scenario Outline each); `run-spend-ingest.test.mjs` exports eleven named tests —
`run-spend-ingest/00` ×5, `/01` ×5, plus one `run-spend-ingest/seam` covering the production
call-site the review fix wired (`completeRun` stamping spend when a `projectsDir` is known).
*verifies →* `tasks/00_transcript-to-spend.feature`, `tasks/01_settle-once-and-degrade.feature`.

**Registration was confirmed by reading, not assumed.** `runSpendIngestTests` is imported at
`scripts/test.mjs:1075` and spread into the registry at `scripts/test.mjs:3025`.

**The settle ordering was read at the seam, not inferred.** `completeRun`
(`src/run-store.mjs:759-789`) applies the state transition FIRST and only then attempts the
ingest, inside a `try`/`catch` that degrades — so an unreadable transcript leaves `spend: null`
without touching outcome, state, attempt or retry lineage. Confirmed live during the F-04
reproduction below: the degrade line `run-store: spend not stamped at settle:
transcript-unavailable-or-no-usage` was emitted while the run's own transition had already been
written.

### Story 68/01 `attribution-at-spawn`, verified 2026-08-21 — **one blocker (F-04)**

The lane is SCOPED TO THE STORY — its own two `@executable` task features (whose scenarios are
split across three test files for a structural-constraint reason, below), its one fitness function
FF-6808, and the milestone-53 pinned drive-command suite this story changed. No `@manual` / `@uat`
scenario, no UI surface.

| lane | tests | result |
|---|---|---|
| `test/attribution-at-spawn.test.mjs` — the run-store seam, the drive path, the no-collector completion | 5 | green |
| `test/mesh-worker-driver-session-id.test.mjs` — the handler-seam scenarios (whole file) | 11 | green |
| `test/agent-session-driver-drives.test.mjs` — the driver-seam / OTel-env scenarios (whole file) | 25 | green |
| FF-6808 `test/arch/acd-no-otlp-receiver.test.mjs` | 2 | green |
| `test/drive-command-phase-drivers.test.mjs` — the m53 pin this story updated | 8 | **7/8 — RED, see F-04** |

**Traceability is 1:1 and non-vacuous.** The two features declare ten scenarios (four Scenarios +
one Scenario Outline each). Twelve named `68/01` tests discharge them: task-00's five across
`attribution-at-spawn.test.mjs` (×4) and `mesh-worker-driver-session-id.test.mjs` (×3, including
the worker Outline row), task-01's five across `agent-session-driver-drives.test.mjs` (×4) and
`attribution-at-spawn.test.mjs` (×1, the no-collector completion). *verifies →*
`tasks/00_session-id-persisted.feature`, `tasks/01_otel-attributes-at-spawn.feature`.

**Why the split is structural, not stylistic.** The milestone-53 frozen census pins
`agent-session-driver.mjs`'s export set at exactly seventeen, `mesh-worker-execution.mjs`'s
dependents at 49, and exactly ten `test/` files that may name the driver. To keep those oracles
green the OTel surface (the pure `buildOtelResourceAttributes` builder + the two env keys) lives in
a new leaf `src/otel-attribution.mjs` imported at the spawn seam, and the story's scenarios were
placed in the files that already import the relevant modules rather than a single story-owned file.

**Registration was confirmed by reading, not assumed.** `attributionAtSpawnTests` and
`acdNoOtlpReceiverTests` are imported at `scripts/test.mjs:1066-1067` and spread into the registry
at `scripts/test.mjs:3021-3022`.

**Behaviour change delivered here, recorded so it is not read as drift.** `work:drive-<phase>` now
mints a run record (ADR-005 §1) — the bare phase-driver commands previously minted none. The drive
command is one of the driver's two production callers, so it `startRun`s, persists the captured
session id, and settles done/failed (`needs-input` settles `failed` with reason `needs-input`,
since a one-shot local drive cannot service a parked session). The m53 pin "bare drives mint no
run" was updated accordingly — and it is that updated pin which now fails, on the settle half.

**The red probe (FF-6808)** is recorded in the register row above.

### Re-verification after the F-04 fix — 68/01 and 68/02, 2026-08-21 (second `aof:verify` pass)

The two stories held at the Review gate were re-run in full on `feat/68-loop-telemetry` with the
F-04 fix in the tree. Both lanes are scoped to their story, each test under its own throwaway
`AOF_GLOBAL_HOME` (the runner's own hermetic per-test global home, `scripts/test.mjs:3713-3729`),
never the real `~/.aof`:

| story | lane | tests | result |
|---|---|---|---|
| 68/01 | `test/attribution-at-spawn.test.mjs` | 5 | green |
| 68/01 | `test/mesh-worker-driver-session-id.test.mjs` | 11 | green |
| 68/01 | `test/agent-session-driver-drives.test.mjs` | 25 | green |
| 68/01 | FF-6808 `test/arch/acd-no-otlp-receiver.test.mjs` | 2 | green |
| 68/01 | `test/drive-command-phase-drivers.test.mjs` — the m53 pin **+ the five `@bug @finding-F-04` scenarios** | 13 | green |
| 68/02 | `test/run-spend-ingest.test.mjs` | 11 | green |

**68/01 is 56/56; 68/02 is 11/11.** The previously red lane (`drive-command-phase-drivers`, 7/8) is
now 13/13 — the m53 pin's settle half passes, and the five new F-04 scenarios pass beside it.

**Traceability for the new task feature.** `tasks/02_settle-not-clobbered-by-attribution-write.feature`
declares five Scenarios; `drive-command-phase-drivers.test.mjs` exports five named `68/01 task02`
tests, each naming the scenario it discharges. *verifies →*
`tasks/02_settle-not-clobbered-by-attribution-write.feature`. The suite was already registered
(`scripts/test.mjs:2650` import, `:2727` spread) — the story added scenarios to a registered file
rather than a new unregistered one, so no registration change was owed.

### F-04's close was probed, not assumed — and the probe is what surfaced F-05

A fix for a *silent* defect is exactly the case where a green lane proves nothing, so the fix was
made to FAIL before being recorded closed. `src/commands/drive.mjs` was reverted to its committed
pre-fix shape (`git checkout HEAD -- src/commands/drive.mjs`, restoring the fire-and-forget
`Promise.resolve(recordSessionId(…)).catch(…)`) and the lane re-run four times:

| tree | runs | lane result |
|---|---|---|
| pre-fix (committed shape) | 4 | 12/13, 12/13, **13/13 — fully green on known-defective code**, 11/13 |
| post-fix (the delivered shape) | 4 | 13/13 ×4 |

The defect is real and the fix removes it — but **which** scenario goes red rotates between runs
(the spend-survival one; the drivable-again one; the settled-stays-settled and
neither-write-conditional pair), and one pre-fix run was **fully green**. That is F-05 below: the
scenarios do not arrange their own `Given`. The tree was restored from a copy taken before the
revert; `git diff --stat src/commands/drive.mjs` reads `22 insertions(+), 9 deletions(-)` — the fix
alone — after it.

**The fix is structural, not merely empirically green — read at the source.** Awaiting the persist
inside `onSessionIdCaptured` closes the race because the driver awaits that handler
(`src/agent-session-driver.mjs:833`) *inside the watch chain*, and `finish` awaits that same chain
(`:887`) before settling. So the persist completes before the session resolves, hence before
`completeRun` runs. `src/commands/drive.mjs` then awaits a second, idempotent `recordSessionId`
before `completeRun` (`:126-131`), and `completeRun` receives `projectsDir` (`:142`) so the spend
is stamped after both writes have landed. Neither write is conditional on the other — the
caller-provided hook and the persist are `allSettled` together, ported from the sibling caller
(`src/mesh-worker-execution.mjs:1681-1696`).

### The milestone-scoped regression sweep — 68/00 and 68/05 re-run on the integrated branch

The evidence above for 68/00 and 68/05 was recorded on their own worktrees. Both lanes were re-run
on `feat/68-loop-telemetry` with all five merges in place, to prove no sibling poisoned them:

| lane | tests | result |
|---|---|---|
| 68/00 — `run-store-spend` + FF-6801/6802/6803/6804 | 27 | green |
| 68/05 — `work-observe-snapshots` + FF-6807 | 13 | green |

This is NOT the full-repo milestone gate. That gate runs once, when the milestone is accepted, and
it is not run here because the milestone is not being accepted (68/03 is `not-started`). The
narrowest lanes containing the affected stories were run instead, plus the two adjacent regression
suites named above; nothing was silently widened to everything.

### Story 68/03 `attribution-by-join`, verified 2026-08-21 — **one blocker (F-07)**

The lane is SCOPED TO THE STORY — its own two `@executable` task features plus its own two fitness
functions — with the same-module regression suites run beside it, because 68/03 rewrote 233 lines of
`src/work-observe.mjs`, the module 68/04 and 68/05 also deliver into. No `@manual` and no `@uat`
scenario exists on this story (both features are tagged `@executable @cli @work @work-stream`
alone) and it has no UI surface, so no human-acceptance step and no design-conformance verdict
applies, and their absence here is the information.

| lane | tests | result |
|---|---|---|
| `test/work-observe-attribution.test.mjs` — the two task features' scenarios | 10 | green |
| FF-6805 + FF-6806 `test/arch/acd-observe-attribution-by-join.test.mjs` | 4 | green |
| 68/04 regression — `work-observe-scope` (same module) | 17 | green |
| 68/05 regression — `work-observe-snapshots` + FF-6807 (same module) | 13 | green |
| `test/work-observe.test.mjs` — the pre-68 miner suite this story edited (21 tests, `node --test`) | 21 | green |

**Traceability is 1:1 and non-vacuous.** The two features declare ten scenarios in total (four
Scenarios + one Scenario Outline each), and `work-observe-attribution.test.mjs` exports ten named
tests — `work-observe-attribution/00` ×5 and `/01` ×5 — each naming the scenario it discharges.
*verifies →* `tasks/00_one-run-one-item.feature`, `tasks/01_toolchain-classifier-retired.feature`.

**Registration was confirmed by reading, not assumed.** Both suites are imported at
`scripts/test.mjs:1096-1097` **and spread** into the registry at `scripts/test.mjs:3042-3043`,
inside the story's own labelled block.

**One suite this story edited is not gated by CI, and that is a KNOWN baseline, not a new gap.**
`test/work-observe.test.mjs` — 149 changed lines here — is imported by neither runner: it is a
`node:test` file, so registering it is a conversion rather than a one-line import. It sits on the
shrink-only `UNREGISTERED_BASELINE` in `test/arch/acd-test-suite-registration.test.mjs:66` and is
mirrored in `acd-loop-suite-registration.test.mjs:221`, both of which fail if a *second* orphan
appears. It was therefore run directly here (21/21) rather than assumed green — the edits are real
and green, but nothing in CI would have said so.

#### The red probes (FF-6805, FF-6806) — re-performed at this verify, not read off the register

Both rows were already filled when this pass opened. They were **re-performed by the verifier**
rather than accepted as written, because the register's own rule is that a control's green is
meaningless without a probe and the single writer of this document is the one who must have seen it:

- **FF-6805** — the retired text matcher was reintroduced into `src/work-observe.mjs` as a real
  definition (`function agentMatchesMilestone({ meta, firstUserText }, { id, slug })` building a
  `new RegExp` over the id and slug and testing it against the prompt). Observed:
  `not ok - arch/68 FF-6805 …` / `AssertionError [ERR_ASSERTION]: the text matcher is not defined`.
  FF-6806's fourth guard went red beside it —
  `no module calls the retired text matcher (offenders: src\work-observe.mjs)`. Reverted;
  `git diff --stat` returned to the identical `154 insertions(+), 79 deletions(-)` it held before
  the probe, and the lane returned 14/14.
- **FF-6806** — the unattributed reporting was dropped in `collectMilestoneAgents`: the
  `unattributedCount += metas.length` on the no-session branch (`src/work-observe.mjs:753`) was
  deleted so a no-session run silently `continue`d — the exact "silent drop" ADR-006 forbids.
  Observed: `AssertionError [ERR_ASSERTION]: the no-session run is reported unattributed, not
  assigned and not dropped`, and **two behavioural scenarios went red beside it** —
  `the count of unattributed runs is stated` and `the no-record session's agent is reported
  unattributed`. Reverted; tree restored and lane 14/14.

**What these probes do NOT establish**, stated so no later reader over-reads them: they were
performed on this working tree, not on the bytes that shipped; they reach the two declared `FF-NN`
controls alone and no other assertion in the suite; and they cannot distinguish a real probe from a
fabricated one — no declarative model can.

#### The live smoke is what surfaced both findings

The scoped lane is green on fixtures. `aof work observe` was then run against **this repo's real
corpus** (161 session directories under `~/.claude/projects/C--Source-umami-aof`), which is where
both F-07 and F-08 came from — neither is visible from the suite:

- `aof work observe 68` reports **0 agent runs across 0 sessions** and **283 unattributed agent
  runs** (F-08). Honest, and exactly what ADR-006 asks for — but empty.
- The result-content classifier classifies **705 of 1,323** real Bash tool results as test runs
  (53.3%); of a 400-row sample of those, **380 are not test invocations** — `ls`, `sed -n`, `grep`,
  `cat`, `git status` (F-07).

### The full-repo milestone gate sweep — run at this pass, and it is what caught F-09

The gate was run even though the accept is refused, because F-07 was found by leaving the suite
rather than by running it, and whether the six merged stories poison anything repo-wide deserved an
answer either way. It was worth running: it is the only thing that surfaced F-09.

**Result: 6,158 tests registered · 6,152 ran · 6 skipped · 6,096 pass · 56 fail.**

**How it was run, and how that differs from `npm test`.** `scripts/test.mjs` exports its assembled
`tests` registry and self-runs only when it is the entry point, so the registry was imported and
driven through a replica of the harness's own unit loop — same registry, same order, same per-test
hermetic `AOF_GLOBAL_HOME` under `~/.aof-test/`, never the real `~/.aof`. Two differences from
`npm test`, both stated rather than left implicit:

- **The 6 skipped are `global-work-propagation/*`, EXCLUDED and named here rather than silently
  dropped.** They bind `:4182`, which this control node's live daemon holds, so they would fail on
  the port and not on merit.
- **The integration and cargo lanes were not run** — the replica covers the unit lane only.

**Triage of the 56 — measured against `main`, not judged by eye.** A detached worktree was created
at `main` (`8167486`), given the repo's `node_modules` by junction, and every one of the 56 failing
test names was replayed there through the same runner. The split:

| | count | meaning |
|---|---|---|
| fail on the branch **and** on `main` | **51** | pre-existing or environmental — outside 68's span |
| fail on the branch, **pass** on `main` | **4** | **caused by milestone 68 — F-09** |
| fail only in the full sweep, **pass in isolation on the branch** | **1** | an artifact of the in-process replica's ordering, not a defect |

The one ordering artifact is `item-status/if-applicable: --json reports the refusal as a RESULT and
exits 0…`, which passes 8/8 when its own suite is run alone on the branch. It is recorded because
removing `global-work-propagation` from the registry shifts what runs before it — an honest
consequence of the exclusion above, and the reason the exclusion is named rather than assumed
harmless.

The 51 are not this milestone's to fix and are not re-litigated here; they include the
`claude-settings/03` merge lane (which reads this repo's real `.claude/settings.json`), the
milestone-38 mesh worker-repo/clone-credential families, `reclaim-scheduler/06`,
`release-workflow-lint`, `arch/m42-item-3`, and the five `66/00 parse:`/`66/00 refuse:` rows.
**That `main` itself carries 51 failures under this runner is a repo-health fact worth someone's
attention, but it is NOT established here whether they are true failures or artifacts of driving
the registry outside `scripts/test.mjs`'s own entry point — that question was not resolved and is
not claimed either way.**

**The four that are 68's, each confirmed twice — red on the branch in isolation, green on `main` in
isolation:**

| control | milestone | assertion observed red |
|---|---|---|
| `arch/m42-d2` | 42 | `completeRun is called only by the store + the transition seam (offenders: src/commands/drive.mjs)` |
| `arch/m42-d4-port1` | 42 | `startRun/retryRun are called only by the store + the transition seam (offenders: src/commands/drive.mjs)` |
| `arch/53 FF-5301` | 53 | `the driver's direct source-import set is the frozen five, including export-from` |
| `arch/53 FF-5302` | 53 | `sink grew to 2344 lines past the 2313 post-move ceiling; raising the ceiling is an ADR decision, not a diff` |

Each was additionally proven not to be a working-tree effect: `src/commands/drive.mjs` was swapped
for its `HEAD` content and both m42 controls stayed red, so the uncommitted F-04 fix is not the
cause — the committed story is. All four bisect to the **same commit**, `a24d676`
*(68/01 attribution-at-spawn)*: `git log -S completeRun main..HEAD -- src/commands/drive.mjs`
returns it alone, `git diff main..HEAD -- src/agent-session-driver.mjs` shows the single added
`import … from "./otel-attribution.mjs"` that breaks the frozen-five set, and
`git show a24d676:src/mesh-worker-execution.mjs | wc -l` is the 2,344 that breaks the ceiling.
`main`'s `src/commands/drive.mjs` calls `startRun`/`completeRun`/`retryRun` **zero** times.

### Story 68/03 `attribution-by-join`, re-verified 2026-08-21 — **F-07 closed on measurement** (fourth `aof:verify` pass)

The third pass held this story on blocker F-07. The fix landed during 68/03's review round (STATE
§ Feedback, 2026-08-21) and is re-verified here **at the source rather than off the green lane** —
F-07 was found by leaving the suite, so closing it has to be too.

| lane | tests | result |
|---|---|---|
| `test/work-observe-attribution.test.mjs` — the two task features + 2 added F-07 regressions | 12 | green |
| FF-6805 + FF-6806 `test/arch/acd-observe-attribution-by-join.test.mjs` | 4 | green |
| 68/04 regression — `work-observe-scope` (same module) | 17 | green |
| 68/05 regression — `work-observe-snapshots` + FF-6807 (same module) | 13 | green |
| `test/work-observe.test.mjs` — the unregistered pre-68 miner suite, run directly (`node --test`) | 21 | green |

**Both red probes were re-performed a second time, on the post-fix bytes.** `src/work-observe.mjs`
changed by 242 lines between the third pass and this one, and a probe performed on superseded bytes
establishes nothing about the bytes now in the tree. Both are recorded in the register above; both
reverted to the identical `162 insertions(+), 80 deletions(-)`.

#### F-07 re-measured on the real corpus — the same instrument that found it

The delivered `classifyToolCallResult` was driven over this repo's whole transcript corpus (111
transcripts — the top-level main-session `.jsonl` files AND the per-session agent sub-transcript
directories under `~/.claude/projects/C--Source-umami-aof` — **8,010 Bash tool results**):

| measure | third pass (defective) | this pass (delivered) |
|---|---|---|
| Bash results classified as a test run | 705 / 1,323 — **53.3%** | 540 / 8,010 — **6.7%** |
| false positives among pure read-only inspection calls (`cat`/`grep`/`ls`/`sed`/`head`/`git status`, no runner anywhere in the command) | near-total | **16 / 1,452 — 1.1%** |

The contract probe `tasks/01` names — *"a category reading zero means zero"* — was re-run against
the delivered seam on the exact inputs the finding cited. All four now classify `other`: `ls test/`
listing `*.test.mjs`; `git status --short` listing `*.test.mjs` files; a grep hit containing
"spec"; a document containing "failing". Real `node:test` output (`# tests 21 / # pass 21`) and
this repo's own runner output (`ok - <name>`) still classify `test`.

**The CI fixture the third pass called out has been hardened.** It objected that the scenario
passed only because its fixture hand-picked a `git status` whose result was a single line with no
file list. `test/work-observe-attribution.test.mjs:373` now asserts against a realistic multi-file
`git status --short` — ` M src/work-observe.mjs`, ` M test/work-observe-attribution.test.mjs`,
`?? test/new-spec.mjs` → 0 test runs — so the guard is no longer vacuous on this repo's own output.

**What the fix did NOT reach is recorded as F-10**, not left implicit: 1.1% is not 0%, and the
residual is the same class the story exists to kill, ~50× smaller.

**No `@bug @finding-F-07` task scenario was authored**, unlike F-04's `tasks/02`. The regression is
guarded by two added tests in the story's own suite rather than by a new contract scenario, and the
existing `tasks/01` criterion it restores is the one the fix is measured against above. Recorded as
a process inconsistency rather than a gate: the guard exists and is non-vacuous, but a reader
comparing F-04's close to F-07's will find two different shapes for the same triage instruction.

### The full-repo milestone gate sweep — fourth pass

Run again because the gate is where a cross-milestone break surfaces, and because F-09 stood open
against a story already marked `done`.

**Result: 6,160 registered · 6,154 ran · 6 skipped · 6,097 pass · 57 fail.** Same replica shape as
the third pass (the exported registry driven through a copy of `scripts/test.mjs`'s own unit loop,
per-test hermetic `AOF_GLOBAL_HOME` under `~/.aof-test/`, never the real `~/.aof`);
`global-work-propagation/*` (6) excluded and named — it binds `:4182`, which this control node's
live daemon holds, so it would fail on the port and not on merit. Integration and cargo lanes not run.

**Triage of the 57 — measured against `main` (`8167486`) in a detached worktree, not judged by eye.**
Every failing name was replayed there through the same runner; all 57 exist in `main`'s registry.

| | count | meaning |
|---|---|---|
| fail on the branch **and** on `main` | **50** | pre-existing or environmental — outside 68's span |
| artifacts of the in-process replica, **not defects** | **3** | see below |
| fail on the branch, **pass** on `main`, confirmed in isolation | **4** | **milestone 68's — F-09, unchanged** |

The three artifacts are named rather than counted as failures, because two of them were called
branch-only by the raw replay and are not:

- `item-status/if-applicable: --json reports the refusal as a RESULT and exits 0…` — **8/8 alone on
  the branch**. The same ordering artifact the third pass recorded; excluding `global-work-propagation`
  shifts what runs before it.
- `single-entry-two-mode/00 run(["init"]) dispatches to node mode…` — passes in isolation on the branch.
- `build-sea-recipe-guards/F14 refuses an --out that resolves to the repo root` — **an artifact of
  the verifier's own harness, not of the repo.** `assertSafeOutDir` compares `path.resolve(".")`
  against a `repoRoot` derived from `import.meta.url`, and the two differ only in the DRIVE-LETTER
  CASE when the registry is imported via a lowercase `c:/…` path while the process cwd is `C:\…`.
  The comparison falls through to the source-workspace check, which throws a different message than
  the assertion expects. Re-run with the path constant cased `C:/` it is **5/5**. This is also the
  likely whole of the 56 → 57 delta against the third pass.

`arch/53 FF-5308 (acd-loop-scope-guard)`, `arch/ADR-002` and `arch/graphify-backend-selection` all
fail on `main` too and are outside 68's span.

**F-09's four are unchanged, and were re-confirmed twice** — red on the branch in isolation (a
16-test focused run: 12 pass, 4 fail) and green on `main` in the replay:

| control | milestone | assertion observed red |
|---|---|---|
| `arch/m42-d2` | 42 | `completeRun is called only by the store + the transition seam (offenders: src/commands/drive.mjs)` |
| `arch/m42-d4-port1` | 42 | `startRun/retryRun are called only by the store + the transition seam (offenders: src/commands/drive.mjs)` |
| `arch/53 FF-5301` | 53 | `the driver's direct source-import set is the frozen five, including export-from` |
| `arch/53 FF-5302` | 53 | `sink grew past the 2313 post-move ceiling; raising the ceiling is an ADR decision, not a diff` |

`src/commands/drive.mjs` still imports and calls `startRun`, `recordSessionId` and `completeRun`
directly (`:9`, `:63`, `:135`, `:145`). **No architect review, no fix and no `@bug @finding-F-09`
scenario has landed since the third pass** — the finding is carried forward exactly as filed.

#### A destructive side effect of this pass, recorded because it happened and was repaired

Creating the `main` comparison worktree, the verifier gave it the repo's `node_modules` by NTFS
junction — the third pass's own method. `git worktree remove --force` then followed that junction
and **deleted the contents of the real `node_modules`**, and the `npm ci` that repaired it removed
the `ui/` workspace source (a tracked directory reached through the `@aof/ui` workspace link). Both
were restored — `npm ci` for the packages, `git checkout -- ui/` for the tracked tree — and the
working tree was confirmed byte-identical to its pre-sweep state (the same modified/untracked set,
`src/work-observe.mjs` back to `162 insertions(+), 80 deletions(-)`) before any record below was
written. **Nothing in this milestone's evidence was produced from the damaged tree**: the sweep and
the `main` replay both completed before the removal, and every lane cited above was re-run after
the repair. The lesson for the retrospective is that the junction trick is safe to create and
unsafe to `remove --force` — the worktree must be deleted with the junction unlinked first.

### F-09 closed on the seam, and the close was PROBED — fifth `aof:verify` pass, 2026-08-22

The fourth pass refused the milestone on F-09 alone. Since then `ADR-009` was written (the architect
review the finding's triage routed to) and the fix landed. Verified here in four steps, none of them
read off the previous pass:

**1. The four controls are green.** The same 16-test focused lane the fourth pass ran red (12 pass,
4 fail) is now **16/16**:

| control | milestone | result |
|---|---|---|
| `arch/m42-d2` (3 tests + 1 drain) | 42 | green |
| `arch/m42-d4-port1` (4 tests) | 42 | green |
| `arch/53 FF-5301` (3 tests) | 53 | green |
| `arch/53 FF-5302` (4 tests) | 53 | green |

**2. The m42 pair went green by the CODE moving, not by amending the declaration.**
`test/arch/acd-effects-ledger.test.mjs` and `test/arch/acd-publish-on-mutate-ledgered.test.mjs` are
**untouched** (`git status --porcelain` on both: empty). `src/commands/drive.mjs` now imports
`transitionRunStart` / `transitionRunComplete` from `src/effects/run-transitions.mjs` and calls the
bare store nowhere — exactly ADR-009 Decision 1.

**3. The two amendments match ADR-009 exactly, and were checked against the measured tree — not
against the ADR's prose.** An amended control is only as good as the number it now pins:

| amendment | ADR-009 says | measured on the tree |
|---|---|---|
| FF-5301 frozen direct-import set | five → **six** (`otel-attribution.mjs`) | six, and the leaf has **zero** imports of its own |
| FF-5301 driver root-inclusive reach ceiling | 21 → **22** | 22, the +1 the zero-import leaf provably costs |
| FF-5301 sink contrast baseline | 55 → **57** | 57 (`otel-attribution.mjs` + `run-session-capture.mjs`, both reaching no new subtree) |
| FF-5302 sink shrink-only ceiling | 2313 → **2331**, extraction done FIRST | `wc -l src/mesh-worker-execution.mjs` = **2331** exactly |

**4. The close was probed, not assumed.** The green above proves the code moved; it does not prove
the controls would still object if it moved back. Both m42 legs were made to fail on the current
bytes and reproduced F-09's recorded messages **verbatim**:

- `completeRun` re-imported from `../run-store.mjs` and `await transitionRunComplete(` replaced by
  `await completeRun(` → `AssertionError: completeRun is called only by the store + the transition
  seam (offenders: src/commands/drive.mjs)`.
- The same plant on the mint leg (`transitionRunStart` → `startRun`) → `AssertionError:
  startRun/retryRun are called only by the store + the transition seam (offenders:
  src/commands/drive.mjs)`.

Both reverted; `git diff --stat src/commands/drive.mjs` returned to its identical pre-probe
`58 insertions(+), 44 deletions(-)`.

**What this probe does NOT establish**, stated so no later reader over-reads it: it was performed on
this working tree, not on the bytes that shipped; it reaches the two m42 legs alone, not FF-5301 or
FF-5302 (whose own non-vacuity legs — the two-hop laundering detector and the planted-both-directions
exact-set detector — are green and carry that weight instead); and it cannot distinguish a real
probe from a fabricated one.

### Milestone 68's complete lane set — 252/252 green

Run clean, with no other test process on the box (see the concurrency artifact below for why that
qualifier is load-bearing): all six stories' `@executable` suites, all eight `FF-68NN` controls, and
F-09's four foreign controls in one selection.

| lane | selection | result |
|---|---|---|
| 68/00 `run-store-spend/*` + FF-6801…FF-6804 | | green |
| 68/01 drive/session-driver lanes + FF-6808 | | green |
| 68/02 `run-spend-ingest/*` | | green |
| 68/03 `work-observe-attribution/*` + FF-6805, FF-6806 | | green |
| 68/04 `work-observe-scope/*` | | green |
| 68/05 `work-observe-snapshots/*` + FF-6807 | | green |
| F-09's four (m42 ×2, m53 ×2) | | green |
| **total** | **252 selected** | **252 pass · 0 fail** |

### The full-repo milestone gate sweep — fifth pass

**Result: 6,160 registered · 6,154 ran · 6 skipped · 6,102 pass · 52 fail.** Same replica shape as
the third and fourth passes (the exported registry driven through a copy of `scripts/test.mjs`'s own
unit loop, per-test hermetic `AOF_GLOBAL_HOME` under `~/.aof-test/`, never the real `~/.aof`);
`global-work-propagation/*` (6) excluded and named — it binds `:4182`, which this control node's live
daemon holds. Integration and cargo lanes not run.

**Against the fourth pass: 57 → 52 fail, 6,097 → 6,102 pass.** The delta reconciles exactly and
without remainder: **−4** F-09's four controls, now green; **−1** `build-sea-recipe-guards/F14`,
which the fourth pass diagnosed as a drive-letter-case artifact of the verifier's own harness and
which this pass's runner avoided by importing the registry through a correctly-cased `C:/` path.

**Triage of the 52 — every name replayed against `main` (`8167486`) in a detached worktree.**

| | count | meaning |
|---|---|---|
| fail on the branch **and** on `main` | **50** | pre-existing or environmental — outside 68's span |
| replica artifacts, proven by isolation | **2** | see below |
| fail on the branch, **pass** on `main`, confirmed | **0** | **nothing in this sweep is milestone 68's** |

No failing name contains a 68 subject — no `run-store-spend`, `run-spend-ingest`,
`work-observe-*`, `drive`, `otel` or `arch/68 FF-` row appears among the 52.

**The two artifacts, each confirmed by isolation and a source read rather than by assertion** — the
fourth pass's own lesson is that a branch-only failure is a HYPOTHESIS until both are done:

- `item-status/if-applicable: --json reports the refusal as a RESULT…` — **8/8 green alone on the
  branch.** The same ordering artifact the third and fourth passes recorded; excluding
  `global-work-propagation` shifts what runs before it.
- `build-sea-recipe-guards/F14 refuses an --out that resolves to the repo root` — **8/8 green alone
  on the branch**, and the fourth pass's drive-letter explanation is **superseded**: this pass used
  the corrected `C:/` casing and the test still read red *while the sweep was running*, then green
  the moment nothing else was. The mechanism is `assertSafeOutDir` at `scripts/build-sea.mjs:80`,
  which resolves `path.resolve(outDir)` against the **ambient `process.cwd()`** and ignores the
  `cwd` option its own signature accepts — so the assertion is sensitive to another process on the
  box. Not 68's on any reading: `scripts/build-sea.mjs` and `test/build-sea-recipe-guards.test.mjs`
  are both **byte-identical to `main`** (`git diff main..HEAD` on both: empty), and a direct probe
  of `assertSafeOutDir` throws the expected message for both of the test's inputs.

**A qualification on this sweep's own numbers, stated rather than left implicit.** Several focused
runs were executed concurrently with it, and the artifact above demonstrates that a second replica
process on this box can turn a passing assertion red. The sweep's 52 may therefore include
concurrency noise. That does not weaken the gate, and the direction is why: concurrency
interference **adds** failures, it does not hide them — and every one of the 52 was replayed red on
`main` or proven an artifact, while the decisive evidence for this milestone is the 252/252 lane set
above, run with the box otherwise idle. The reading to carry forward is that the in-process replica
needs the box to itself.

**The `main` comparison worktree was removed without collateral damage this pass.** The fourth pass
recorded that `git worktree remove --force` follows the `node_modules` junction and deletes the real
one. Applying that lesson — `rmdir` the junction first (which unlinks rather than recurses), then
remove the worktree — left `node_modules` at its 84 entries and `git status --porcelain ui/` empty.
The countermeasure works and is now measured, not just reasoned.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | All three test NAMES in `test/arch/acd-run-record-node-additive.test.mjs` still read "the fourteen-key freeze" / "the fourteenth key" / "a thirteen-key (m20) record", and its header still calls itself "The fourteen-key record" — while the assertions they run are the SIXTEEN-key freeze (`SIXTEEN_KEYS`). The red-probe evidence line prints the contradiction verbatim: `not ok - …the fourteen-key freeze…` above `AssertionError: a minted record carries exactly the sixteen keys, in order`. Pre-existing drift from the m348 extension, compounded here. | non-blocker | low | defer to backlog | milestone 68 backlog | open |
| F-02 | `aof work validate` (whole stream) reports `78_milestone_loop-execution-record/SPEC.md — depends "79" does not resolve to a milestone/uat item`. Item 79 exists, but as a top-level **story** (`79_story_committed-loop-graph`), and a milestone's `depends:` resolves milestone/uat items only. Pre-existing (landed in `0a22fb1`), outside 68's span — `aof work validate 68` is PASS. | non-blocker | low | defer to backlog | milestone 78 | open |
| F-04 | **The local drive command leaks a `running` run record.** `src/commands/drive.mjs:85` persists the captured session id FIRE-AND-FORGET (`Promise.resolve(recordSessionId(…)).catch(…)`, never awaited). `recordSessionId` is a whole-record read-modify-write (`src/run-store.mjs:849-857` — `{...record, sessionId}` then `persist`), so when that in-flight promise lands AFTER `completeRun`'s transition it rewrites the record from its pre-settle snapshot: `state` reverts to `running`, `outcome` to `null`, `updatedAt` back to `createdAt`, and any spend 68/02 stamped back to `null`. `startRun` then refuses every later run on that item with `duplicate-run` (409, `src/run-store.mjs:588-590`) — exactly the leak drive.mjs's own comment (`:105-108`) says the settle exists to prevent. Reproduced live: 1 of 5 probe runs, and the story's own registered pin `test/drive-command-phase-drivers.test.mjs` — "bare drives mint a run…" — fails `'running' !== 'done'` (`:271`). The sibling caller does NOT have this defect: `src/mesh-worker-execution.mjs:1681-1694` `allSettled`s the persist against the up-channel precisely so the "attribution write racing the settle" cannot happen. **FIXED 2026-08-21 (`aof:continue 68`)**: the drive caller now awaits the persist inside `onSessionIdCaptured` (the driver awaits that handler — `agent-session-driver.mjs:833` — so the id lands before the settle), a straight port of the sibling's shape. All five `@bug @finding-F-04` scenarios green; the story's prior 43/43 hold. | blocker | high | new `@bug` task scenario + fix | story 68/01 → `aof:continue` | **closed** |
| F-03 | No `work.controls.runners` is configured in `.aof/aof.config.json`, so `aof work doctor`'s leg B never runs **anywhere in this repo** — no declared control is known to be registered in a suite by the check itself. Surfaced here as `control-runner-unchecked` on all eight of 68's controls; the four landed ones were confirmed registered by hand (above). The key is real and read at `src/work-doctor.mjs:686`. | non-blocker | medium | defer to backlog | repo config / TECH_DEBT | open |
| F-05 | **The five F-04 regression scenarios do not arrange their own `Given`, so they pass on defective code roughly a quarter of the time.** `tasks/02_settle-not-clobbered-by-attribution-write.feature` opens each scenario with *"the id's persist has not completed when the run settles"*, but the tests discharging it (`test/drive-command-phase-drivers.test.mjs:318-447`) never force that state — no injected delay, no held promise, no barrier. They call `scriptedDriver(…)` and rely on ambient scheduler timing, which is the same nondeterminism F-04 itself was measured at (1 failure in 5 probe runs). Measured at this verify against the committed pre-fix shape, four runs: `12/13`, `12/13`, **`13/13` — fully green on known-defective code** — and `11/13`, with the failing scenario rotating between the spend-survival one, the drivable-again one, and the settled-stays-settled/neither-conditional pair. Post-fix the lane is 13/13 on 4 of 4 runs. The delivered guarantee is therefore correct and structurally proven (the await chain read at the source, above); what is thin is the *guard* — a future revert of the fix would pass CI outright about one run in four, and when it did fail would name a different scenario each time. This is the milestone's own red-probe principle applied to a behavioural scenario: a guard whose green is indistinguishable from a broken one. | non-blocker | medium | defer to backlog | milestone 68 backlog → harden by injecting the race (hold the persist promise until after `completeRun` is entered) rather than racing the scheduler | open |
| F-06 | **A stale comment describes the exact race that was just fixed, and describes it wrongly.** `src/commands/drive.mjs:126-128` still reads *"The driver invokes onSessionIdCaptured fire-and-forget, and a racing completeRun could otherwise clobber the id back to null"*. It is false as of the F-04 fix: the driver **awaits** that handler (`src/agent-session-driver.mjs:833`, inside the watch chain `finish` awaits at `:887`), which is precisely why awaiting the persist inside the handler closes the race. The block it annotates (the second, idempotent `recordSessionId` before `completeRun`) is still correct and worth keeping as belt-and-braces — only its stated reason is now wrong. A reader trusting it would conclude the mid-run write is still unawaited, which is the reasoning that produced F-04. | non-blocker | low | defer to backlog | milestone 68 backlog | open |
| F-07 | **The replacement classifier reports a test run for slightly over half of every Bash call in this repo, and ~95% of those are not test runs.** `TOOLCHAIN_RESULT_RE` (`src/work-observe.mjs:80-81`) classifies a Bash call by its RESULT text, and its alternation includes the bare word-boundary tokens `tests?`, `spec(?:s)?` and `(?:pass|fail)(?:ed|ing)?`, case-insensitively. In THIS repo every `git status` names `test/*.test.mjs` files, every `ls test/` lists them, and any `sed -n`/`cat` over a spec or story doc contains the word "spec" or "test" — so all of them classify as test runs. Measured on the real corpus at this verify (40 session dirs, up to 6 agent transcripts each, under `~/.claude/projects/C--Source-umami-aof`): **705 of 1,323 Bash tool results classify as `test` (53.3%)**, and of a 400-row sample of those, **380 are not test invocations** — `aof graph impact …`, `ls src/bundle/templates/…`, `sed -n '215,235p' src/commands/migrate-folder.mjs`, `grep -rn … wiki/work`, `git -C … status --porcelain`. **This breaks a delivered acceptance criterion of this story on realistic input.** `tasks/01_toolchain-classifier-retired.feature` — *"a category reading zero means zero"* — requires that an agent run which genuinely ran no tests reports a test-run count of zero. Driven through the real seam at this verify, a transcript whose only two Bash calls are `ls test/` and `git status --short` reports `diagnostics.interleave.testRuns === 2`, not 0. The scenario passes in CI only because its fixture hand-picks a `git status` whose result is the single line `on branch feat/68-loop-telemetry` (`test/work-observe-attribution.test.mjs:273`) — a `git status` with no file list, which this repo never produces. The misclassification is not cosmetic: `toolchainMs` feeds the report's headline **time split** (`model generation X · toolchain wait Y (Z% of active)`, `:1007`), the **grind reason** `"{pct}% of active time waiting on toolchain"` (`:290`), the `>= 15 toolchain runs` reason (`:293`) and the edit↔test `pattern` (`:279-281`) — the exact figures milestones 69-72 are sequenced to act on. This is the SAME defect class the story exists to retire, inverted: the story's own rationale is that *"a classifier that reports zero where the true figure is non-zero is worse than no classifier, because zero reads as a finding"*, and a classifier that calls 53.3% of Bash calls test runs when ~95% of those are `ls`/`sed`/`grep`/`git status` is a confident wrong answer by the same argument, pointing the next milestone's lever the other way. **FIXED 2026-08-21 (68/03 review round)**: the marker set was tightened from word-shaped to COUNT-BEARING/STRUCTURAL only — TAP-ish assertion lines, `# tests`/`# pass` summaries, runner summary keys, count-bearing verdicts and `AssertionError` — with the bare `tests?`, `spec(?:s)?`, `(?:pass|fail)(?:ed|ing)?` and ✓/✗ alternatives removed, and runner NAMES deliberately still absent (re-adding `vitest`/`jest` would have re-introduced the command-name dependence the feature refuses). Re-measured by the verifier on the real corpus at the fourth pass: classify-as-test fell from **53.3% of 1,323 Bash results to 6.7% of 8,010**, and pure read-only inspection calls now false-positive at **16/1,452 — 1.1%**. All four inputs this finding cited (`ls test/`, a file-listing `git status --short`, a grep hit containing "spec", a doc containing "failing") classify `other`; real `node:test` and aof-runner output still classify `test`. The vacuous fixture is hardened at `test/work-observe-attribution.test.mjs:373`. Residue tracked as **F-10**. | blocker | high | new `@bug` (+ `@finding-F-07`) task scenario + fix | story 68/03 → `aof:continue` | **closed** |
| F-08 | **On this repo's real corpus the delivered join attributes nothing: `aof work observe 68` reports 0 agent runs across 0 sessions and 283 unattributed agent runs.** The join resolves an agent run through its session's run record, and the only four run records in the entire work stream (`wiki/work/38_…/runs/umamis-msi/*.json`, `wiki/work/40_…/runs/umamis-msi/*.json`) all carry `"sessionId": null` — they predate 68/01's producer. Milestone 68's own folder has no `runs/` at all, because this repo's ACD work is driven from the main session rather than through `aof work run`/`drive`. The behaviour is CORRECT per ADR-006 — absence is reported with a count, never guessed into an item, and the 283 is the honest number — and it is the direct, intended consequence of retiring the text matcher. It is recorded because it is a delivered-state fact no scenario states and no reader would infer: **for every item in this repo whose runs predate 68/01, `aof work observe` now reports an EMPTY agent table where it previously reported a populated (if double-counting) one.** The trade is deliberate — honest emptiness over a 12.6%-double-counting lie — but "the numbers are true" and "there are no numbers" read very differently to a retrospective author, and SPEC § Out of scope covers only *not retro-fitting existing snapshots*, not this. Discharged when run records minted by 68/01's producer accumulate, or by a stated backfill decision. Must be carried in 68/03's `OUTCOME.md` `## Gaps`. | non-blocker | medium | defer to backlog | milestone 68 backlog → 68/03 OUTCOME `## Gaps` | open |
| F-09 | **Story 68/01 — already accepted and marked `done` — broke four declared fitness functions belonging to milestones 42 and 53, and every one of them was invisible to the story-scoped lanes.** Caught by the full-repo gate sweep at this pass and confirmed twice each (red on the branch in isolation, green on `main` in isolation): **`arch/m42-d2`** — `completeRun is called only by the store + the transition seam (offenders: src/commands/drive.mjs)`; **`arch/m42-d4-port1`** — `startRun/retryRun are called only by the store + the transition seam (offenders: src/commands/drive.mjs)`; **`arch/53 FF-5301`** — `the driver's direct source-import set is the frozen five, including export-from`; **`arch/53 FF-5302`** — `sink grew to 2344 lines past the 2313 post-move ceiling; raising the ceiling is an ADR decision, not a diff`. All four bisect to the single commit `a24d676` *(68/01 attribution-at-spawn)*: it is the only commit `git log -S completeRun main..HEAD -- src/commands/drive.mjs` returns (`main`'s `drive.mjs` calls `startRun`/`completeRun`/`retryRun` **zero** times); it adds the one `import { buildOtelResourceAttributes, … } from "./otel-attribution.mjs"` to `src/agent-session-driver.mjs` that makes the frozen import set six; and it is the commit at which `src/mesh-worker-execution.mjs` reaches 2,344 lines. Proven not to be a working-tree effect: `src/commands/drive.mjs` was swapped for its `HEAD` content and both m42 controls stayed red. **Two of the four are architectural refusals, not ratchets, and cannot be discharged by editing a number.** m42's pair says the run fact never lands without its event — 68/01 mints and settles a run record directly from a command, bypassing the transition seam those controls exist to make unbypassable. FF-5302's own message states the remedy is an ADR decision rather than a diff, and FF-5301's frozen set is likewise a milestone-53 decision about what the driver may reach. So the routing is to the ARCHITECT first (does 68/01's seam belong inside the ledger's transition, or do m42/m53's declarations need an ADR'd amendment?), and only then to a fix. **What this says about the process, recorded because it is the second time this milestone has paid for it:** story-scoped lanes run the story's own scenarios plus its own `FF-NN` — by design — so a story that breaks ANOTHER milestone's control is structurally invisible until the milestone gate. That is the stated, accepted trade (`aof:verify` § Scope the suite to the item: *"a poisoning story is caught at the gate, not immediately, and may need rework after being marked done"*). It worked exactly as written: the gate caught it, and 68/01 needs rework after being marked done. **FIXED 2026-08-22 (`ADR-009`, the architect review this finding routed to, then the port): `src/commands/drive.mjs` mints and settles through `transitionRunStart` / `transitionRunComplete`, so the m42 pair is satisfied by the CODE moving — both arch-tests are byte-untouched. FF-5301 is amended to a frozen SIX (`otel-attribution.mjs`, a zero-import leaf) with its reach ceiling 21→22 and its sink contrast 55→57; FF-5302 is raised 2313→2331 AFTER extracting the duplicated attribution build and session-id persist into `buildRunAttribution` + `captureSessionIdOnRecord` (sink 2344→2331, so +18 rather than +31). All four controls green (16/16 on the focused lane, was 12/4); the close was PROBED on the current bytes — both m42 legs re-planted and observed red with this finding’s exact recorded messages, then reverted. No `@bug` scenario was authored and none is owed: the four controls ARE the regression guard, and a behavioural scenario over a structural refusal would restate them in a weaker form.** | blocker | high | architect review, then new `@bug` (+ `@finding-F-09`) task scenario + fix | story 68/01 → `aof-architect`, then `aof:continue` (NOTE: `aof work status 68/01 in-review` was attempted and REFUSED — *"item 68/01 is \"done\" — it has no legal status move"* — so the story stays `done` on disk while this blocker is open; the lifecycle has no reopen edge, which is itself a gap worth an item) | **closed** |
| F-10 | **The repaired classifier still calls a test run on output that merely MENTIONS test words, in a narrow band the story's own retro lesson names.** Two alternatives of `TOOLCHAIN_RESULT_RE` (`src/work-observe.mjs:85`) reach words a command MENTIONS rather than EMITS. (a) `(?:Test Files|Tests?|Test Suites):?\s*\d+` makes the colon OPTIONAL, so the bare word `test`/`tests` followed by whitespace and a digit matches — ordinary prose and file listings hit it. (b) `AssertionError` matches any document that QUOTES a stack trace — including this milestone's own `VERIFICATION.md`, whose red-probe cells quote `AssertionError` verbatim, so **reading this very file classifies as a test run**. Measured at the fourth pass over 111 transcripts: of 1,452 pure read-only inspection Bash calls (`cat`/`grep`/`ls`/`sed`/`head`/`git status`, no runner anywhere in the command), **16 classify as test runs — 1.1%**; 7 of the 16 are reads of this milestone's `VERIFICATION.md` and 6 are the optional-colon match. This is the SAME defect class as F-07 and it violates the same literal criterion (`tasks/01` — *"a category reading zero means zero"*): an agent whose only Bash calls read this milestone's records reports a non-zero test-run count. It is triaged NON-blocker on magnitude, stated rather than assumed: F-07 mis-called 53.3% of all Bash calls with ~95% of those wrong, inflating `toolchainMs` and the grind reasons by roughly twenty-fold; this residue mis-calls ~1% of inspection calls, so the headline time split and grind reasons milestones 69-72 act on are now approximately right rather than wrong by orders of magnitude. STATE § Feedback already records the generalisation this is the residue of — *"a result-content classifier needs markers that only that kind of command EMITS (counts, summary lines), never words it merely MENTIONS"* — applied to five of the seven alternatives but not to these two. Discharged by requiring the colon in the runner-keys alternative and qualifying `AssertionError` (e.g. anchoring it to a line start, or requiring an accompanying count-bearing marker). Carried in 68/03's `OUTCOME.md` `## Gaps`. | non-blocker | medium | defer to backlog | milestone 68 backlog → 68/03 OUTCOME `## Gaps` | open |

**F-04 is closed (2026-08-21, `aof:continue 68`); F-01 is a label that lies about what its own guard guards; F-02 is
another milestone's edge; F-03 is a repo-wide config gap that 68/00 surfaced and worked around by
hand — none of those three touches a delivered contract. **F-04 did**, and it is now fixed: the drive
caller awaits the persist inside `onSessionIdCaptured`, ported from the sibling caller's `allSettled`
shape, with all five `@bug @finding-F-04` scenarios green. It was triaged blocker
rather than non-blocker on three grounds, each checked rather than assumed:

1. **It breaks a delivered guarantee, not a test.** The leaked `running` row is the precise state
   the settle was added to prevent, and `startRun`'s `duplicate-run` guard makes it *sticky* — the
   item cannot be driven again until the row is reclaimed by hand.
2. **It is silent.** Both write paths are `.catch(reportDegrade)`, so the clobber emits nothing at
   all; the only visible symptom is the next drive on that item being refused, arbitrarily later
   and with an unrelated-looking message.
3. **It corrupts this milestone's own subject matter.** The clobbering write restores the
   pre-settle snapshot wholesale, so it silently un-stamps the spend envelope 68/02 exists to
   write — a telemetry milestone recording `spend: null` for a run that was in fact measured.

**Ordering, stated so blame is not misplaced.** 68/02 did not introduce this. `completeRun`
transitions before it ingests and degrades on failure (verified at the seam above). What 68/02's
`projectsDir` wiring added is an `await` — a dynamic `import()` plus a transcript-tree read —
*after* the transition inside `completeRun`, which widens the window in which the orphaned
fire-and-forget write can land last. The defect is 68/01's unawaited write; 68/02 is what made it
observable.

**Both affected stories were held at the Review gate, and the reason was different for each.** 68/01 owns the defective
seam. 68/02 was held because its own delivered guarantee — *spend is stamped once at settle* — is
violable on the drive path while F-04 stands, notwithstanding its 11/11 green lane. With F-04 fixed
(2026-08-21), both are back at the Review gate: 68/01's five F-04 scenarios and prior 43/43 hold, and
68/02 re-verified green (its stamped spend now survives the drive settle). 68/04 and 68/05
are region-disjoint from the drive seam (both are `src/work-observe.mjs`), so F-04 does not reach
them. **Both were accepted at the second `aof:verify` pass, 2026-08-21** — see the accept decision
below.

**F-05 and F-06 are the residue of closing F-04, and neither holds a story.** Both were found by
probing the fix rather than by reading the green lane, and the distinction that keeps them
non-blockers is the same one in both cases: **the delivered behaviour is correct; what is weak is
what a later reader would be told about it.** F-05 is a guard that would let a revert through about
one CI run in four; F-06 is a comment that states the fixed race as still live. Neither makes the
system do the wrong thing today, and neither is discharged by re-running anything — F-05 is
discharged by injecting the race the scenario names, F-06 by rewriting three lines of comment. They
are recorded rather than fixed in this pass because `aof:verify` accepts and records; it does not
edit the implementation it is judging.

## Accept decision

**68/00 `spend-bearing-run-record` — ACCEPTED, 2026-08-21.**

- The story's scoped `@executable` lane is **27/27 green**, with 1:1 scenario→test traceability.
- Its four declared controls **FF-6801, FF-6802, FF-6803, FF-6804** all resolve to files on disk,
  are registered in the suite, and each carries a **recorded red probe** above.
- `aof work doctor 68/00` reports **no `control-unresolved` at either severity** — the accept rule
  that no gate applies for you. (The milestone-level doctor still reports `control-unresolved` for
  **FF-6805…FF-6808** and `verification-missing-red-probe` for their four rows: those are 68/01,
  68/03 and 68/05's controls, unlanded by design, and they are the **milestone's** gate, not this
  story's.)
- `aof work validate 68` — **PASS — 68 is well-formed.**
- No `@uat` and no agent-runnable `@manual` scenario exists on this story, and it has no UI
  surface — so no human sign-off and no design-conformance verdict is recorded, and their absence
  here is the information.

**68/04 `story-and-phase-scoped-observe` — ACCEPTED, 2026-08-21.**

- The story's scoped `@executable` lane is **17/17 green**, with 1:1 scenario→test traceability,
  re-run on the integrated branch with all five merges in place.
- It declares **no** fitness function, so no red probe is owed; `aof work doctor 68/04` reports
  **no `control-unresolved` at either severity**.
- `aof work validate 68` — **PASS — 68 is well-formed.**
- **F-04 does not reach it** — the story owns the resolver and rollup region of
  `src/work-observe.mjs`, disjoint from the drive/run-store seam the blocker sits on.
- No `@uat`, no agent-runnable `@manual`, no UI surface — so no human sign-off and no
  design-conformance verdict is recorded.

**68/05 `append-only-snapshots` — ACCEPTED, 2026-08-21.**

- The story's scoped `@executable` lane is **13/13 green** (10 behavioural + FF-6807 ×3), re-run on
  the integrated branch.
- Its one declared control **FF-6807** resolves to a file on disk, is registered in the suite, and
  carries a **recorded red probe** in the register above.
- `aof work doctor 68/05` reports **no `control-unresolved` at either severity**.
- `aof work validate 68` — **PASS — 68 is well-formed.**
- **F-04 does not reach it** — the story owns the write block of `src/work-observe.mjs`, disjoint
  from the drive/run-store seam.
- No `@uat`, no agent-runnable `@manual`, no UI surface.

**68/01 `attribution-at-spawn` — HELD 2026-08-21 (first pass), then ACCEPTED 2026-08-21 (second pass).**

The first pass held it at `in-review`: blocker **F-04** was open on the seam this story delivers and
its own registered pin (`test/drive-command-phase-drivers.test.mjs`) was red. Everything else was
already discharged — 43/43 on the other four lanes, FF-6808 green with a recorded red probe, doctor
clean — which is what made the single fix the whole remaining distance. It was routed to
`aof:continue 68/01` against a new `@bug @finding-F-04` task scenario
(`tasks/02_settle-not-clobbered-by-attribution-write.feature`). The second pass accepts it:

- The story's scoped `@executable` lane is **56/56 green** across its five suites, re-run on
  `feat/68-loop-telemetry` with the fix in the tree. The previously red lane is **13/13**.
- **F-04 is closed, and closed on evidence rather than on a green lane.** The fix was reverted and
  the lane re-run four times: the defect reappeared in three of the four runs. The tree was then
  restored and the lane ran 13/13 on four of four. The await chain that makes the fix structural —
  driver awaits the handler (`agent-session-driver.mjs:833`) inside the chain `finish` awaits
  (`:887`), so the persist lands before `completeRun` — was read at the source, not inferred.
- Its one declared control **FF-6808** resolves to a file on disk, is registered in the suite, and
  carries a **recorded red probe** in the register above. `tasks/02`'s five scenarios owe no red
  probe — the obligation reaches declared `FF-NN` ids alone, never a behavioural scenario.
- `aof work doctor 68/01` reports **no `control-unresolved` at either severity** (only the
  repo-wide `numbering-gap` warn, which is not this story's).
- `aof work validate 68` — **PASS — 68 is well-formed.**
- **F-05 and F-06 are open against this story and neither blocks it.** F-05 is a thin regression
  guard, not a wrong behaviour: the code is correct and structurally proven, while the scenarios
  that guard it race the scheduler instead of arranging the race. F-06 is a stale comment. Both are
  recorded above with their discharge conditions; accepting the story does not discharge them.
- No `@uat`, no agent-runnable `@manual`, no UI surface — so no human sign-off and no
  design-conformance verdict is recorded, and their absence here is the information.

**68/02 `spend-ingest-at-settle` — HELD 2026-08-21 (first pass), then ACCEPTED 2026-08-21 (second pass).**

The first pass held it at `in-review` for a reason that was never about its own work: its lane was
11/11 green and it did not introduce F-04, but its delivered guarantee — *spend is stamped once at
settle* — was violable on the drive path while F-04 stood, because the clobbering write restored a
pre-settle snapshot and took the stamped envelope back to `null`. That is now false:

- Its scoped `@executable` lane is **11/11 green**, re-run on the integrated branch.
- **The guarantee that was violable is now directly pinned.** The F-04 scenario *a stamped spend
  survives the attribution write* drives a real transcript through the real drive command and
  asserts the envelope's buckets and model survive the settle. Against the pre-fix shape that
  scenario was observed **red** (`the run is settled` — the record had been clobbered back to
  `running`, taking the envelope with it); against the delivered shape it is green. 68/02's
  guarantee is therefore held by a scenario in 68/01, which is the correct home for it: the defect
  was in 68/01's write, not in this story's ingest.
- It declares **no** fitness function of its own — FF-6803 and FF-6804 (68/00) bind its output in
  the writer — so no red probe is owed.
- `aof work doctor 68/02` reports **no `control-unresolved` at either severity**.
- `aof work validate 68` — **PASS — 68 is well-formed.**
- No `@uat`, no agent-runnable `@manual`, no UI surface.

**68 the milestone — NOT ACCEPTED at the SECOND pass, 2026-08-21.** *(Superseded by the third pass below; the two gates it names have both since cleared. Kept because it is the record of why the second pass stopped, not a current statement.)*

Two of the three gates the first pass named are now cleared: **F-04 is closed**, and **68/01 and
68/02 are `done`**. Five of six stories are accepted. What still refuses the transition is one
story and the two controls that land with it:

- **68/03 `attribution-by-join` is `not-started`.** A milestone is accepted only when ALL its
  stories are done. 68/03 was sequenced behind 68/01 reaching `done` for its live evidence — which
  this pass has now delivered, so **68/03 is unblocked and is the milestone's whole remaining
  distance**.
- **FF-6805 and FF-6806 do not resolve.** `test/arch/acd-observe-attribution-by-join.test.mjs` is
  not a file on disk; `aof work doctor 68` reports both as `control-unresolved` (warn, downgraded
  by the standing `pending` marker) and both empty probe cells as `verification-missing-red-probe`
  (error). Landing 68/03 is what clears them — never re-marking them `pending`.

The full-repo milestone gate suite is therefore still not run in this pass; it runs once, at the
accept that these gates currently refuse. The open non-blockers (F-01, F-02, F-03, F-05, F-06) do
not gate that accept, but F-05 and F-06 should be swept with 68/03 since they sit in the same seam.

---

**68/03 `attribution-by-join` — HELD 2026-08-21 (third `aof:verify` pass). Stays `in-review`.**

Everything the story's own contract can be checked against from the suite is discharged, and one
thing it cannot be checked against from the suite is not:

- The story's scoped `@executable` lane is **14/14 green** (10 behavioural + FF-6805/FF-6806 ×4),
  with 1:1 scenario→test traceability, plus **51/51** across the same-module regression suites
  (`work-observe-scope` 17, `work-observe-snapshots` + FF-6807 13, the unregistered pre-68 miner
  suite 21).
- Its two declared controls **FF-6805 and FF-6806** resolve to a file on disk, are registered in
  the suite (`scripts/test.mjs:1097`, spread at `:3043`), and each carries a red probe
  **re-performed by the verifier at this pass** rather than read off the register.
- `aof work doctor 68/03` reports **no `control-unresolved` at either severity** (only the
  repo-wide `numbering-gap` warn, which is not this story's). `aof work doctor 68` now reports none
  either — all eight controls resolve and no row reads `pending`.
- `aof work validate 68` — **PASS — 68 is well-formed.**
- No `@uat`, no agent-runnable `@manual`, no UI surface — so no human sign-off and no
  design-conformance verdict is recorded, and their absence here is the information.

**What holds it is F-07, and it is a blocker on the same three grounds F-04 was, each checked
rather than assumed:**

1. **It breaks a delivered guarantee, not a test.** `tasks/01`'s *"a category reading zero means
   zero"* is violated on input this repo produces constantly: an agent whose only Bash calls are
   `ls test/` and `git status --short` is reported as having made **2 test runs**. The scenario is
   green in CI only because its fixture uses a `git status` output with no file list.
2. **It is silent, and it is silent in the direction that reads as a finding.** Nothing flags a
   misclassification; the figure simply appears in the report's time split and grind reasons as
   fact. 53.3% of this repo's real Bash results now classify as test runs and ~95% of those are not
   test invocations, so both the run count and the toolchain-wait duration are inflated by roughly
   twenty-fold — against RESEARCH's measured 340 genuinely test-ish calls in the same corpus.
   (The 53.3% is a share of Bash CALLS; the ~6% the story cites is toolchain wait as a share of
   ACTIVE TIME. Different denominators, named so the two are not read as one number.)
3. **It corrupts this milestone's own subject matter.** The milestone's title is *"cost, phase and
   progress are recorded, not inferred"*, and `toolchain wait` is one of the three numbers the
   report infers. Milestones 69-72 are sequenced behind this one precisely so their levers are
   chosen against true figures; F-07 points the same lever the same story documents as
   mis-pointed, in the opposite direction.

**Ordering, stated so blame is not misplaced.** The pre-68 classifier reported 0%. This story
replaced it deliberately and correctly in ARCHITECTURE (ADR-006: classify by what the call *was*,
not by command name) — the defect is in the marker set chosen to implement that decision, not in
the decision. `TOOLCHAIN_RESULT_RE`'s test-report markers (`Test Files`, `not ok`, `Ran N tests`,
`✓`/`✗`) are sound; the bare `\btests?\b` / `\bspec(?:s)?\b` / `\b(?:pass|fail)(?:ed|ing)?\b`
alternatives are what over-match, because in a repo whose files are *named* `*.test.mjs` those
words appear in the output of nearly every file-listing command. Routed to `aof:continue 68/03`
against a new `@bug @finding-F-07` task scenario — which, per F-05's lesson, should arrange its
`Given` from real command output (a `git status` that lists files; an `ls test/`) rather than a
hand-picked clean string.

**F-08 is recorded against this story and does not hold it.** The join attributing nothing on this
repo's corpus is the correct, designed behaviour over run records that predate 68/01's producer —
honest emptiness, reported with a count. It is a delivered-state fact for `OUTCOME.md` `## Gaps`,
not a defect.

**No `OUTCOME.md` is authored for 68/03 at this pass.** An outcome states what the system now IS,
and the classifier half of this story does not yet do what it says. It is authored at the accept
that F-07's fix earns.

---

**68 the milestone — NOT ACCEPTED at the THIRD pass, 2026-08-21. Remains `in-progress`.**

Both gates the second pass named have cleared, and a new one has opened:

- **Cleared — FF-6805 and FF-6806 now resolve.** `test/arch/acd-observe-attribution-by-join.test.mjs`
  is on disk, registered, green 4/4, and both rows carry a verifier-performed red probe. `aof work
  doctor 68` reports **no `control-unresolved` and no `verification-missing-red-probe` at either
  severity**; no row in either register reads `pending`. All eight declared controls resolve.
- **Cleared — 68/03 is no longer `not-started`.** It is built and at `in-review`.
- **Open — 68/03 is not `done`.** A milestone is accepted only when ALL its stories are done, and
  blocker **F-07** is open against 68/03 (above).
- **Open — blocker F-09, against story 68/01, which is already `done`.** The full-repo gate sweep
  (6,152 ran · 6,096 pass · 56 fail) found that 68/01's commit `a24d676` broke **four declared
  fitness functions belonging to milestones 42 and 53**. Fifty-one of the 56 failures reproduce on
  `main` and are outside 68's span; one is an artifact of the replica runner's ordering; these four
  are 68's, each confirmed red on the branch and green on `main` in isolation. A milestone whose
  own delivery leaves four earlier declared controls red cannot be accepted — the accept rule this
  command applies by hand is that a declared control which does not hold is not admitted, and that
  rule does not stop at the controls this milestone declared.

**68/01 could NOT be moved back to `in-review`, and the refusal is recorded rather than worked
around.** The move was attempted at this pass and the verb refused:

```
$ aof work status 68/01 in-review
item 68/01 is "done" — it has no legal status move (asked for "in-review")
```

`done` is terminal in the lifecycle: there is no reopen edge from it. Per this command's own rule a
refusal is read as evidence about the item, never as a licence to hand-edit the `status:` line, so
**68/01 remains `done` on disk and in the fleet while a blocker stands against the code it
delivered.** That state is wrong in substance and correct in procedure, and both halves are stated
here so the next reader does not "fix" it by editing frontmatter.

**This is a genuine process gap, not a quirk of this milestone.** `aof:verify` explicitly documents
the trade that produced F-09 — *"a poisoning story is caught at the gate, not immediately, and may
need rework after being marked done"* — but the lifecycle provides no move that expresses "needs
rework after being marked done". The trade is written down; the mechanism it depends on does not
exist. Recorded for the retrospective, and worth an item of its own: either `done → in-review` is a
legal edge, or the gate needs a way to mark a done story as reopened.

Its acceptance at the second pass was made on evidence that was complete for its own scope and
silent about everything else: its scoped lane and its own FF-6808 were green, and no lane it ran
could have reported an m42 or m53 control. That is the stated trade rather than a mistake in the
second pass. F-09 routes to the architect before any fix, because two of the four are architectural
refusals (the run fact never landing without its event) and a third says in its own message that
raising it is an ADR decision, not a diff.

**Five of six stories read `done`, but only four are sound.** 68/00, 68/02, 68/04 and 68/05 are
unaffected — 68/02's own additions to the drive seam are not what the m42 controls name, and 68/04
and 68/05 are `src/work-observe.mjs` only. 68/01 reads `done` and carries an open blocker; 68/03 is
`in-review` and carries another. Those two are the milestone's remaining distance.

`aof work validate 68` is **PASS**, and PASS is necessary rather than sufficient: validate checks
well-formedness, not whether a delivered contract holds — and `aof work doctor 68` is clean for the
same reason, because 68's own eight controls all resolve and doctor is not asked about milestone
42's or 53's. The accept rule is applied here, by hand, and it refuses.

**On the gate suite itself.** It is recorded in full under `## Verification evidence`, including
what was excluded and why: **`global-work-propagation/*` (6 tests) was excluded and is named rather
than silently dropped** — it binds `:4182`, which this control node's live daemon holds, so it
would fail on the port and not on merit. The integration and cargo lanes were not run.

**The open non-blockers.** F-01, F-02, F-03, F-05, F-06 and F-08 do not gate the accept. F-05,
F-06 and F-08 should be swept alongside F-07 and F-09: F-05, F-06 and F-09 all sit in the
drive/run-store/driver seam that 68/01 and 68/02 delivered, F-08 belongs in 68/03's own outcome,
and all of them are residue of the same three build passes.

---

**68/03 `attribution-by-join` — HELD at the third pass, then ACCEPTED 2026-08-21 (fourth `aof:verify` pass).**

The third pass held it at `in-review` on blocker **F-07** alone; everything its own contract could
be checked against was already discharged. F-07 is now closed, and closed on the instrument that
found it rather than on the lane that missed it:

- The story's scoped `@executable` lane is **12/12 green** (10 scenario discharges + 2 added F-07
  regressions), with 1:1 scenario→test traceability, plus **51/51** across the same-module
  regression suites (`work-observe-scope` 17, `work-observe-snapshots` + FF-6807 13, the
  unregistered pre-68 miner suite 21 run directly).
- **F-07 is closed on measurement.** Re-driven over this repo's whole real corpus (111 transcripts,
  8,010 Bash tool results), classify-as-test fell from **53.3% → 6.7%**, and false positives among
  pure read-only inspection calls are **16/1,452 — 1.1%**. All four inputs the finding cited now
  classify `other`, and the fixture the third pass called vacuous is hardened.
- Its two declared controls **FF-6805 and FF-6806** resolve, are registered in the suite, and each
  carries a red probe **re-performed at this pass on the post-fix bytes** — not read off the
  register, and not inherited from the third pass, because the module changed by 242 lines between.
- `aof work doctor 68/03` reports **no `control-unresolved` at either severity** (only the
  repo-wide `numbering-gap` warn, which is not this story's). `aof work validate 68` — **PASS**.
- **F-08 and F-10 are open against this story and neither blocks it.** F-08 is designed behaviour —
  honest emptiness over run records that predate 68/01's producer. F-10 is the ~1% residue of F-07's
  own fix. Both are carried in the story's `OUTCOME.md` `## Gaps` with discharge conditions.
- No `@uat`, no agent-runnable `@manual`, no UI surface — so no human sign-off and no
  design-conformance verdict is recorded, and their absence here is the information.
- `OUTCOME.md` authored at this accept (story 80), carrying five delivered capabilities, three
  assumptions and the two open gaps.

---

**68 the milestone — NOT ACCEPTED at the FOURTH pass, 2026-08-21. Remains `in-progress`.**

**All six stories now read `done`** — 68/03 was the last, and it is accepted above. The milestone
gate nonetheless refuses, on one finding and one finding only:

- **Blocker F-09 is open, unchanged, and re-confirmed at this pass.** Milestone 68's own delivery
  leaves **four declared fitness functions of milestones 42 and 53 red** — `arch/m42-d2`,
  `arch/m42-d4-port1`, `arch/53 FF-5301`, `arch/53 FF-5302` — all bisecting to `a24d676`
  *(68/01 attribution-at-spawn)*. They were re-run in isolation on the branch (4 red of a 16-test
  focused run) and replayed green on `main` in a detached worktree. `src/commands/drive.mjs` still
  imports and calls `startRun` / `recordSessionId` / `completeRun` directly. **No architect review,
  no fix and no `@bug @finding-F-09` scenario has landed since the third pass filed it.**

The accept rule this command applies by hand is that a declared control which does not hold is not
admitted, **and that rule does not stop at the controls this milestone declared**. Two of the four
are architectural refusals rather than ratchets — m42's pair says the run fact never lands without
its event, and 68/01 mints and settles a run record straight from a command, bypassing the
transition seam those controls exist to make unbypassable. FF-5302's own message states that
raising it is an ADR decision, not a diff. So the routing is unchanged: **`aof-architect` first**
(does 68/01's seam belong inside the ledger's transition, or do m42/m53's declarations need an
ADR'd amendment?), and only then `aof:continue 68/01` against a fix.

**68/01 still cannot be moved back to `in-review`, and the refusal is still recorded rather than
worked around.** `done` is terminal; the lifecycle has no reopen edge. 68/01 therefore reads `done`
on disk and in the fleet while a blocker stands against the code it delivered — wrong in substance,
correct in procedure, and stated again here so the next reader does not "fix" it by editing
frontmatter. This is a genuine process gap worth an item of its own: either `done → in-review`
becomes a legal edge, or the gate needs a way to mark a done story as reopened.

**What cleared at this pass, so the remaining distance is unambiguous.** The third pass named two
open gates; one has closed. F-07 is closed and 68/03 is accepted, which takes all six stories to
`done` and leaves the milestone's eight declared controls all resolving with a recorded red probe
apiece. `aof work validate 68` is **PASS** and `aof work doctor 68` reports no `control-unresolved`
at either severity — both necessary, neither sufficient, because doctor is not asked about
milestone 42's or 53's controls. **F-09 is the whole of what remains.**

**The gate sweep at this pass** is recorded in full under `## Verification evidence`: 6,154 ran ·
6,097 pass · 57 fail, split by replay against `main` into 50 pre-existing/environmental, 3 replica
artifacts (two ordering, one a drive-letter-case artifact of the verifier's own harness — named
because two of the three would otherwise read as branch-only regressions), and F-09's 4.

**The open non-blockers.** F-01, F-02, F-03, F-05, F-06, F-08 and F-10 do not gate the accept.
F-05, F-06 and F-09 sit in the same drive/run-store/driver seam and should be swept together;
F-08 and F-10 are carried in 68/03's `OUTCOME.md` `## Gaps`.

---

**68/01 `attribution-at-spawn` — its outstanding blocker CLOSED, 2026-08-22 (fifth `aof:verify` pass).**

The story was accepted at the second pass and has read `done` since; F-09 then stood against the
code it delivered, with no legal move back to `in-review`. The blocker is now closed on the seam
(evidence above), so the story's `done` is true in substance as well as in procedure. Its
`OUTCOME.md` was corrected at this pass rather than left stale — ADR-009's own Consequence clause
requires it to carry the seam, and two of its statements had been overtaken:

- the drive-command capability claimed the bare-store `startRun` path, and now states the transition
  seam;
- two capabilities were added — the settle seam's `projectsDir` opt (priced without publishing), and
  the single home for the attribution build and the race-free persist;
- the gap *"Consumption of the attribution key"* was moved to **discharged** — 68/03 landed the join
  that reads the key this story writes.

**68 the milestone — ACCEPTED, 2026-08-22 (fifth `aof:verify` pass).**

**All six stories are `done` and all three blockers are closed** — F-04 (second pass), F-07 (fourth
pass), F-09 (this pass). The gate is applied by hand, so each leg is named with what was actually
run rather than asserted:

- **Every declared control resolves and holds, and the rule was applied past this milestone's own
  register.** 68's eight `FF-68NN` each resolve to a file, are registered in the suite, and carry a
  recorded red probe. The accept rule *"do not accept an item whose register declares a control that
  does not resolve"* does not stop at the controls 68 declared: F-09 was four controls belonging to
  milestones 42 and 53, and it gated this milestone for two passes on exactly that reading.
- **`aof work validate 68` — PASS — 68 is well-formed.**
- **`aof work doctor 68` — no `control-unresolved` at EITHER severity.** Read at both, per the rule
  that a standing `pending` marker downgrades the finding to `warn` and a warn-only doctor result
  does not fail validate. What remains is a repo-wide `numbering-gap` warn (not this milestone's)
  and `control-runner-unchecked` (F-03, repo-wide, open non-blocker).
- **Milestone 68's complete lane set — 252/252 green**, run with the box otherwise idle.
- **The full-repo gate sweep — 6,154 ran · 6,102 pass · 52 fail · 6 skipped**, with all 52 triaged
  against `main`: 50 pre-existing/environmental, 2 replica artifacts proven by isolation and a
  source read, **0 attributable to milestone 68**.
- **No `@uat` and no agent-runnable `@manual` scenario exists anywhere in this milestone, and no
  story has a UI surface** — so no human sign-off and no design-conformance verdict is recorded, and
  their absence here is the information, not an omission.
- **`OUTCOME.md` authored at this accept** (story 80) — five delivered capabilities stated at the
  milestone level, four assumptions, five open gaps. It CITES `m68/00`…`m68/05` where a story states
  a capability whole rather than restating it, because the aggregation happens in the memory index.

**The seven open non-blockers do not gate the accept, and each has a home.** F-01 (a test label that
lies about what its own guard guards) and F-02 (milestone 78's unresolved `depends`) are outside
68's delivered contract. F-03 (`control-runner-unchecked`, repo-wide) is a repo config gap. F-05 (a
race guard that passes on defective code ~1 run in 4), F-06 (a comment stating the fixed race as
still live) and F-10 (~1.1% classifier residue) are residue in delivered code, carried in the
stories' own `OUTCOME.md` gaps. F-08 (the join attributes nothing on this repo's corpus) is designed
behaviour, carried in `m68/03`'s gaps and restated at milestone level.

**What this milestone did NOT do, recorded because a later reader will ask.** It enforces nothing:
no cap, budget, timeout, reaper or routing decision landed, `heartbeat()` is still unwired, and four
of the seven `exitReason` members remain unreachable until milestone 69 lands the enforcement that
can produce them. That is ADR-008's scope refusal holding at the close, not an unfinished edge.

**And the honest headline: the numbers are now true, and on this repo's own corpus there are almost
none of them.** `aof work observe 68` reports 0 agent runs across 0 sessions and 283 unattributed —
re-measured at this accept, not quoted from the fourth pass. Every run record predating 68/01 carries
`sessionId: null`, and this repo drives its ACD work from the main session rather than through
`aof work run`/`drive`, so the producer that would populate the join is not on the path this repo
uses. The milestone's deliverable is a measurement system that cannot lie; filling it is 69–72's
problem and a backfill decision's.
