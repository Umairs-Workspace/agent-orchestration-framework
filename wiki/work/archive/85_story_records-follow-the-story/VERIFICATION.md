---
doc: verification
updated: 2026-09-04
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 85 truly done, and what is the evidence?
  Written at aof:verify 85. Only sections with content appear (absence is information).
  Standalone story (parent: null) → this is the story's own verification record; there is no milestone
  SPEC box to tick. It carries an OUTCOME.md and a RETROSPECTIVE.md — by its OWN delivered rule.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a @cli + @docs concern, no DESIGN.md, no Route) → the design-conformance lane was
  not entered and no ## Design conformance section appears.
  NO ## Fitness functions register → story 85 is standalone and declares no ARCHITECTURE.md, so it
  declares no `FF-NN` id for a citing register to resolve to. The controls it had to keep green
  belong to other milestones and are recorded in evidence, against the run that armed them.
-->
# 85 · Records follow the story — Verification

## Method

Lanes in scope: **`@executable` + one `@manual`**. `tasks/00` carries `@docs @work @work-stream` and
`tasks/01` carries `@cli @work @work-stream`; between them there are **nine** `@executable` scenarios
(counting each Examples row) and **one** `@manual`. There is **no `@uat` scenario**, so no human was
brought in, and **no UI surface**, so no render was attempted at any breakpoint.

The suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs` binds
`:4182`, which this machine's live control daemon holds, and a full run on this node is a known false
signal. Selection was by `node scripts/test.mjs --only <file …>`, so the runner's own `runSuite()`
executes what the named files export and per-case global-home isolation still applies. Every run
carried a throwaway `AOF_GLOBAL_HOME` (hook-enforced).

Selection was scoped to the story and widened only by **who reads what this story touched** — the two
task suites, the contract test the story had to re-shape (`verify-outcome-per-type`), and the arch
controls that own the two surfaces it edited (the doctor lane and the bundle). It was **not** widened
to everything: the full suite is priced once, at a milestone gate, and this is a standalone story.

The story's code is **uncommitted on `loop-execution-record`** at the time of this gate. Measured
footprint: **246 insertions / 35 deletions across 10 tracked files** under `src/`, `test/` and
`scripts/`, plus **two new test files totalling 505 lines**
(`records-follow-the-story.test.mjs` 272, `delivered-story-records-reported.test.mjs` 233), plus the
shared template (`.aof/templates/work/shared/OUTCOME.md`) and the re-rendered `retrospective`
command across three runtimes. `src/` proper is four files — `work-doctor-coherence.mjs` +71,
`work-doctor.mjs` +24, `commands/doctor.mjs` +9, and the three bundle command prompts.

## Verification evidence

### Automated — the story's own scenarios: **37 / 37 green, 0 failures**

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only \
  test/records-follow-the-story.test.mjs \
  test/delivered-story-records-reported.test.mjs \
  test/verify-outcome-per-type.test.mjs
```

- **`85/00` — 9 assertions.** Both doors are asserted against the *shipped* prompt text: the
  assimilate-code command and the verify command each instruct the outcome instantiation and the
  story retrospective, and each names the same delivering-type partition. The spike/uat exclusion is
  asserted per door, including that each **states its reason** rather than omitting the type. The
  one-writer scan is asserted in three parts — accepting commands may carry the instruction, **no
  agent prompt** carries one, and the scan is **non-vacuous** because the accepting set is exactly
  `verify` + `assimilate-code` and both match the rule the others must not.
  `verifies → tasks/00`, all four `@executable` scenarios.
- **`85/01` — 15 assertions.** The clean case, the three missing-record cases (OUTCOME, RETROSPECTIVE,
  both) each naming what is missing, the four undelivered statuses each owing nothing, the nested case
  where no record outside the story's own folder satisfies it, and the type restriction. Four
  assertions beyond the contract were also run and are green: every finding is `warn`; the code is
  **disjoint from `CONTROL_FINDING_CODES`**, so no severity change here can reach the loop's doctor
  gate; the check is **pure** (byte-identical over a literal snapshot, no filesystem); and it is
  **registered** — reached through `aof work doctor` over a real stream, not only through its own
  exported group. `verifies → tasks/01`, all five `@executable` scenarios.
- **`80/01` — 13 assertions.** The pre-existing contract test, re-shaped by this story from "only
  `verify.md`" to "only the accepting govern commands", still green in both directions: the
  developer agent carries no authoring instruction, and `recordDoc` returns `OUTCOME.md` for no type
  even with an `OUTCOME.md` co-present on disk.

### Automated — the arch controls over the two surfaces touched: **30 / 30 green, exit 0**

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only \
  test/arch/acd-outcome-authored-by-verify.test.mjs \
  test/arch/acd-doctor-engine-determinism.test.mjs \
  test/arch/acd-doctor-finding-envelope.test.mjs \
  test/arch/acd-doctor-gate-scope-and-severity.test.mjs \
  test/arch/acd-doctor-strict-exit.test.mjs \
  test/arch/acd-doctor-validate-keystone.test.mjs \
  test/arch/acd-bundle-manifest-hashes.test.mjs \
  test/arch/acd-bundle-membership.test.mjs \
  test/arch/acd-bundle-location.test.mjs \
  test/arch/acd-spike-chore-record-doc.test.mjs
```

The four that matter most to this change, and what each proves survived it:

- **`FF-5410` (gate scope and severity)** — the new code cannot reach the loop's doctor gate. The
  admitted set stays `CONTROL_FINDING_CODES` minus its two verification members, the gate still
  admits `severity === "error"` only and computes no severity of its own, and the non-vacuity probe
  (a planted stream-wide invocation, a planted `loopReady` read) still fires.
- **`15/ADR-003` (engine determinism)** — `doctorWork` is byte-identical across two runs on the same
  fixture, and **no** module in the `work-doctor*` family reads the wall clock. The new check adds no
  clock and no I/O.
- **`15/ADR-001` (finding envelope)** — every finding is exactly `{ code, severity, path, message }`
  with `severity ∈ {warn, error}`. `story-record-missing` conforms.
- **`ADR-002` (manifest hashes)** — every shipped manifest entry hash equals `hashContent` of the
  re-rendered member, and the member set equals the rendered set. The three edited prompts and the
  edited shared template are all re-hashed in `src/bundle/manifest.json`.

### Agent-run `@manual` — the record sets of the two doors, compared on disk

`verifies → tasks/00`, `@manual Scenario: an assimilated story is indistinguishable from a verified
one in its record set`.

**Procedure.** List the folder of a story that came through assimilation and a story that came
through `aof:verify`, then ask this stream's own new check which of them it reports.

```
ls wiki/work/84_story_story-span-ref/            # assimilated, status: done
ls wiki/work/81_story_bounds-under-a-real-grader/ # verified,    status: done
AOF_GLOBAL_HOME=$(mktemp -d) aof work doctor --json
```

**Result.**

| story | door | `OUTCOME.md` | `RETROSPECTIVE.md` | reported by the new check |
| --- | --- | --- | --- | --- |
| `84` | `aof:assimilate-code` | present | present | no |
| `81` | `aof:verify` | present | present | no |

Both folders carry both records; `81` additionally carries the `VERIFICATION.md` that only the verify
door writes, which is the one record the two doors are *not* claimed to match on. The check reported
**278** `story-record-missing` findings stream-wide — the real backlog the story measured — and
**named neither `84` nor `81`**, so the pass is discriminating rather than vacuous. It also did not
name `85` itself, which is `in-review` at the time of the probe: the "an undelivered story owes
nothing yet" scenario, observed live rather than only in a fixture.

**One honest limit on what this scenario proves.** Story `84`'s `OUTCOME.md` was authored **by hand**
after the fact — `STORY.md` says so, and that hand-authoring is the story's motivating incident. The
disk comparison therefore establishes the *record-set parity*, not that the command produced it. What
establishes the command-level guarantee is `85/00`'s scan of the shipped prompt text, which is green
above. The two together are the claim; neither alone is.

### Live probe — the new check at the item scope, and the control register

```
AOF_GLOBAL_HOME=$(mktemp -d) aof work doctor 85 --json
```

**2 findings, both `warn`, both pre-existing and stream-wide, neither attributable to this story:**
`numbering-gap` (a stream-level fact anchored at `wiki/work`, which counts only top-level *drivers*,
so parentless stories `80`, `81`, `84` and `85` all read as holes) and `rubric-join-unchecked` (the
lane's designed no-op notice, fired **274** times across the stream because the project config
declares no rubric report *path*).

**`control-unresolved`: 0 findings, at BOTH severities**, at the item scope and stream-wide. Story 85
declares no `ARCHITECTURE.md` and therefore no control register, and nothing anywhere in the stream
declares a control that fails to resolve. Nothing was re-marked `pending` to reach that number.

**Stream-wide severity census: 0 `error`, 13 distinct `warn` codes.** No finding at any scope is an
`error`, so nothing here can fail a gate.

## Findings

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | `src/bundle/commands/verify.md` and `assimilate-code.md` carry this story's edits, but **this repo's own rendered bundle does not** — 6 of the 8 rendered copies (`.claude/`, `.opencode/`, `.codex/` × 2 commands) still hold the `2026-08-29` render. Only `retrospective.md` was re-rendered at build. Measured across the whole bundle: **23 commands in sync, exactly 2 drifted**, and both drifted ones are this story's. The gap is live and self-demonstrating: **this very `aof:verify` run was driven by the stale prompt**, which lacks the "EVERY STORY GETS ITS OWN `RETROSPECTIVE.md`, IN ITS OWN FOLDER" paragraph the source now carries. | build-hygiene | non-blocker | defer — the *shipped* source bundle is complete and correct, and it is the source that reaches a consuming repo through `aof work update`; what is stale is this repo's own installed copy, one mechanical re-render away | chore `108` | routed |
| D-02 | `files:` was declared at **build** rather than at refine — the story went straight from scaffold to `aof:continue`, so the write set was never settled by the contract that was supposed to settle it. Self-reported in `STORY.md` `## Notes` rather than papered over. D-01 is the concrete cost: the rendered-bundle paths for two of the three edited commands are absent from that late-declared list, which is why the render was partial. | process | non-blocker | defer to the retrospective — the lesson is the refine-gap, not the file list | `RETROSPECTIVE.md` | routed |

Three further findings were raised at **review round 1** and were already promoted before this gate;
they are recorded here for the register's completeness, not re-triaged:

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| D-03 | `OUTCOME.md` is not in the streamed/requestable artifact set, so the mesh cache can never answer for it (`src/work-artifacts.mjs:28`) | design-gap | non-blocker | defer | chore `105` | routed |
| D-04 | `FF-5905`'s doctor lane-module list is red on a clean tree, and `66`'s fold-the-family ratchet has been passed twice unfolded (`test/arch/acd-controls-never-execute.test.mjs:95`) | pre-existing regression | non-blocker | defer | chore `106` | routed |
| D-05 | `acd-cache-read-surface-boundary` is red on a clean tree: its pinned reader `promote-gap-to-chore.mjs` no longer declares `defaultAt()` (`src/commands/promote-gap-to-chore.mjs:1`) | pre-existing regression | non-blocker | defer | chore `107` | routed |

**D-04 and D-05 were re-run at this gate and are still red — and the failure text is the proof they
are not this story's.** `FF-5905` fails on a *seventh* lane module, `./work-doctor-loop-record.mjs`,
which is story `78/03`'s and which story 85 never touched; story 85 deliberately landed its check
**inside** the existing `work-doctor-coherence.mjs` rather than adding an eighth module, and the
assertion's own diff confirms the added entry is `loop-record`, not a records module.
`acd-cache-read-surface-boundary` fails on `src/commands/promote-gap-to-chore.mjs`, which is in
neither this story's `reads:` nor its `files:`. Both were red before this change set and remain red
after it; **no other arch control in the ten-file selection is red.**

**No blocker finding is open.**

## Accept decision

**ACCEPTED.**

- `aof work validate 85` → **`PASS — 85 is well-formed.`**, exit 0.
- `aof work doctor 85` → 2 `warn`, 0 `error`, **0 `control-unresolved` at either severity**. No
  control was re-marked `pending` to reach that; the accept rule was applied by reading both
  severities, not by reading the marker.
- Every `@executable` scenario in both task features is green — 37 story-lane assertions and 30 arch
  assertions, 0 failures.
- The single `@manual` scenario was executed by this session and is recorded above with its procedure,
  its result, and the one limit on what it proves.
- No `@uat` scenario exists, so no human sign-off was owed or sought.
- Both open findings are **non-blocker** and are routed — D-01 to chore `108`, D-02 to this story's
  `RETROSPECTIVE.md`.

The item was already `in-review`, having been through `aof:continue`'s review gate (two rounds — three
findings promoted at round 1, one at this gate). It is standalone, so there is no milestone `SPEC.md`
`## Stories` box to tick. `aof work status 85 done` stamped the transition, the board and the fleet.

**The story was accepted under its own rule, deliberately.** Story 85's delivered claim is that a
story carries both records whichever door accepted it. This gate wrote **both** into `85`'s own folder
— `OUTCOME.md` and `RETROSPECTIVE.md` — even though the prompt driving the session was the stale one
that does not yet ask for the second. Honouring the delivered source rather than the installed text is
what makes `85` the first story to satisfy its own contract, and it is why D-01 is recorded as
build-hygiene rather than allowed to pass unnoticed.
