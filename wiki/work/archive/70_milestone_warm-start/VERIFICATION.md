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
# 70 · Warm start — Verification

<!--
  OPENED AT REFINE (2026-08-21), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept
  decision to write — and an empty "None" placeholder is not information. Those three sections are
  authored by `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eight controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 70` reports as
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

     ALL TEN CONTROLS HAVE NOW LANDED and every row below is `green` with a recorded probe.
     70/00 carried FF-7001 + FF-7003 (and FF-7002, an EXTENSION of m53's driver single-home
     guard); 70/01 carried FF-7004 + FF-7005 + FF-7006; 70/03 carried FF-7008; 70/04 carried
     FF-7007; 70/05 carried FF-7009 + FF-7010 — the last two, both EXTENSIONS of the two guards
     70/00 landed. `ARCHITECTURE.md` marks none of the ten `pending`.

     SEVEN OF THE TEN EXTEND A GUARD ALREADY IN SERVICE (FF-7002, FF-7004, FF-7005, FF-7006,
     FF-7008, FF-7009, FF-7010). Their `enforced by` file already exists and already passes, so
     `control-unresolved` never fires for them — which makes the red probe the ONLY evidence that
     the *extension* is armed. An extension that was never observed failing is indistinguishable
     from an extension that was never written. That is not theoretical at this gate:
     `aof work doctor 70/05` reports no `control-unresolved` at either severity, and would have
     reported exactly the same had neither extension been written.

     **Do not accept this milestone while any row still reads `pending`** — marker or no marker. A
     standing `pending` downgrades `control-unresolved` to `warn`, and a warn-only doctor result
     does not fail `aof:validate`, so nothing refuses the transition for you. What clears a row is
     landing the file or dropping the declaration, never re-marking it `pending`. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-7001 | `test/arch/acd-phase-brief-single-bag.test.mjs` | `green` | Moved the context OFF the bag into a rival payload position in `src/commands/drive.mjs` — deleted the `...(phaseContext != null ? { context: phaseContext } : {})` sibling spread and introduced `const driverOptions = { context: phaseContext }` → the control reported `context is never a driver OPTION (a rival payload position)`. Restored, re-run green. |
| FF-7002 | `test/arch/acd-session-driver-single-home.test.mjs` *(extended)* | `green` | Two probes, both against the EXTENSION rather than the pre-existing seventeen-export assertion (which stayed green in probe (a)). **(a) Purity:** prepended `import path from "node:path";` + `const _probeStamp = Date.now();` to `src/phase-brief.mjs` → `the phase-brief leaf imports nothing from src/ (pure)`. **(b) Re-export:** appended `export { compilePhaseBrief } from "./phase-brief.mjs";` to `src/agent-session-driver.mjs` → `adding the phase-brief import must not leak any phase-brief export onto the driver`. Both restored, re-run green. |
| FF-7003 | `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` | `green` | Two probes, one per leg of the control. **(a) A caller applying its own bound:** appended `const _probeCut = String(phaseContextProbe).slice(0, 400);` to `src/commands/drive.mjs` → `commands/drive.mjs applies no size limit or truncation of its own`. **(b) A second ceiling literal:** appended `const _probeCeiling = 8000;` to the same file → `no second ceiling literal exists outside the compiler`. Both restored, re-run green. |
| FF-7004 | `test/arch/acd-worker-driver-no-headless-print.test.mjs` *(extended)* | `green` | Re-performed at this gate against the live bytes (the cell as first written was authored at build time; the probe below is the one observed by the single writer). Replaced the seam's `"--exclude-dynamic-system-prompt-sections", "--append-system-prompt"` pair with `"--system-prompt"` in `src/agent-session-driver.mjs:661` → the extension reported `no src module constructs a --system-prompt (replacement) argv — the cache flag can never be silently inert`. The same plant collaterally tripped three m38 invariants (3, 4, 6), which is the append form's own guard reacting. Restored; `git status src/` clean, re-run green. |
| FF-7005 | `test/arch/acd-session-driver-single-home.test.mjs` *(extended)* | `green` | Re-performed at this gate against the live bytes. Planted `src/commands/rogue.mjs` exporting a second launch builder returning `["--permission-mode", "auto", "--append-system-prompt", "rogue"]` → the extension reported `no module outside resolveInteractiveDriverLaunch's home assembles a claude launch argv (permission-mode / append-system-prompt / stable-prefix)`. Removed; `git status src/` clean, re-run green. |
| FF-7006 | `test/arch/acd-agent-model-source-map.test.mjs` *(extended)* | `green` | Re-performed at this gate against the live bytes. Repointed BOTH the declared constant `SESSION_MODEL_CONFIG_PATH` and the resolver's own read (`config?.work?.agents?.session`) to `work.agents.models` in `src/session-model.mjs` → the extension reported `the session resolver reads work.agents.session (its own distinct path)`. Restored; `git status src/` clean, re-run green. |
| FF-7007 | `test/arch/acd-review-never-resumed.test.mjs` | `green` | Two probes, one per leg of the control, both against the live bytes of `src/commands/drive.mjs`. **(a) The phase guard:** dropped `phase === "continue" &&` from the `fix` derivation, so a fix payload became ambient → the control reported `work:drive-refine` / `true !== false` on the refine launch's `--resume`. **(b) The caller-supplied target:** replaced the `const { resumeSessionId: _suppliedResumeTarget, ...baseOptions }` strip with a plain spread → BOTH tests went red, the second on `ordinary continue is cold despite a raw caller option`. Restored after each; `git status src/` clean, re-run 2/2 green. |
| FF-7008 | `test/arch/acd-work-artifact-set-single-home.test.mjs` *(extended)* | `green` | Two probes, one per leg of the control. **(a) A sibling per-ADR artifact:** appended `Object.freeze({ name: "ARCHITECTURE_ADR_001", file: "ARCHITECTURE.md" })` to `WORK_ITEM_ARTIFACTS` in `src/work-artifacts.mjs` → `exactly one architecture artifact is enumerated` / `2 !== 1`. **(b) A sibling-file reader:** appended an exported helper returning the template path ``adrs/${id}.md`` to `src/phase-brief.mjs` → `the extractor expects no sibling per-ADR file or directory`. Both restored; `git status src/` clean, re-run 6/6 green. |
| FF-7009 | `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` *(extended)* | `green` | Deleted `fitness: condenseFitnessRegister,` from the frozen `BRIEF_SECTION_CONDENSERS` map in `src/phase-brief.mjs`, leaving `fitness` declared in **neither** the condenser map nor the non-condensable set — the by-omission case the control exists to refuse. **Two of the four FF-7009 assertions went red**: `the union of the two declarations is EXACTLY the declared section list — every section, and no section that does not exist`, and `fitness is declared bounded, so it declares the condenser that states its own count` (the ADR-010 §1 subset leg). The other two — the every-declared-section-reaches-a-phase assertion and the planted-rival self-check — stayed green, correctly: neither is the leg the plant broke, and the self-check staying green is what says the detector did not simply fire on any edit. Restored by `cp` from an explicit backup, never `git checkout --` (this story's own STATE lesson); the file is byte-identical to its pre-probe state and the suite is 7/7 green. |
| FF-7010 | `test/arch/acd-phase-brief-single-bag.test.mjs` *(extended)* | `green` | Reverted the call site to the exact violation ADR-009 §4 names: `objective: objectiveSection` → `objective: specDoc` in `src/phase-brief-read.mjs`, a raw disk read handed straight to `compilePhaseBrief`. **Both FF-7010 assertions went red**: `objective is bound to a named const …Section, not to an expression (objective: specDoc)` and `no document reaches the compiler: objective: specDoc is an identifier bound directly from a disk read` — the second naming the offending field, which is what makes the failure actionable rather than merely loud. The probe the register anticipated at refine (*"the probe needs no fabrication"*) is this one, performed here against the **live bytes** rather than against HEAD before the reader was fixed. Restored by `cp`; byte-identical, suite 5/5 green. |

## Verification evidence

<!-- Story 70/00 `phase-brief`, verified 2026-08-22. The lane is SCOPED TO THE STORY — its own three
     `@executable` task features plus its own three declared controls — not the whole repo's suite,
     which runs once at the milestone gate where the per-story commits make bisecting a cross-story
     poisoner mechanical. No `@manual` and no `@uat` scenario exists on this story (all three
     features are tagged `@executable @cli @work @work-stream` and nothing else), so no human
     acceptance step applies. Milestone 70 has no `DESIGN.md` and the story delivers no frontend
     surface, so no design-conformance review applies either. -->

### The scoped `@executable` lane — 33/33 green

Run against the story's registered suites, each test under its own throwaway `AOF_GLOBAL_HOME`
(the per-test hermetic global home the suite runner gives them), never the real `~/.aof`:

| lane | tests | result |
|---|---|---|
| `test/phase-brief-compile.test.mjs` — tasks 00 + 01 | 14 | green |
| `test/phase-brief-seams.test.mjs` — task 02 | 7 | green |
| FF-7001 `test/arch/acd-phase-brief-single-bag.test.mjs` | 3 | green |
| FF-7003 `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` | 3 | green |
| FF-7002 `test/arch/acd-session-driver-single-home.test.mjs` *(extended)* | 6 | green |

**Traceability is 1:1 and non-vacuous.** The three features declare twenty scenarios in total —
task 00: four Scenarios + two Scenario Outlines; task 01: five + two; task 02: five + two — and the
two behavioural suites export twenty correspondingly named tests (`70/00 task00` ×6, `task01` ×7,
`task02` ×7), each naming the scenario it discharges. `phase-brief-compile.test.mjs`'s fourteenth
test (`composePhaseBriefInput` — the phase context reaches the model as input when present, a bare
command when absent) is the seam-composition pin that discharges task 02's *absence stays benign*
premise from the compiler side. *verifies →* `tasks/00_compile-the-brief.feature`,
`tasks/01_bounded-and-truncated.feature`, `tasks/02_passed-at-both-seams.feature`.

### Registration was confirmed by reading, not assumed

`aof work doctor 70` reports `control-runner-unchecked` — no `work.controls.runners` is configured
in `.aof/aof.config.json`, so doctor's leg B (*does a runner name this file?*) did not run for any
control in this milestone. Checked by hand instead: the story's two behavioural suites and its two
own arch suites are imported at `scripts/test.mjs:1110-1113` **and spread** into the registry at
`scripts/test.mjs:3086-3089`, inside the story's own labelled block; FF-7002's host is imported at
`:2704` and spread at `:2780`. Logged as F-03 below, because a check that cannot run is not a check
that passed.

### The gate

`aof work validate 70/00` → **PASS — 70/00 is well-formed.** `aof work doctor 70/00` returns no
`control-unresolved` at either severity (the milestone-scope run reports one, FF-7007, which is
70/04's and correctly declared `pending`). The whole-stream `aof work validate` exits 1 on a
pre-existing dangling `depends` in milestone 78 — F-01 below, outside this story's span.

<!-- Story 70/01 `cache-stable-launch`, verified 2026-08-22. Same scoping rule as 70/00: the story's
     own three `@executable` task features plus its own three declared controls, not the whole repo's
     suite. All three features are tagged `@executable @cli @work @work-stream` and nothing else, so
     no `@manual` and no `@uat` lane exists and no human acceptance step applies. Milestone 70 has no
     `DESIGN.md` and the story delivers no frontend surface, so no design-conformance review applies. -->

### The scoped `@executable` lane — 34/34 green

Run against the story's registered suites, each test under its own throwaway `AOF_GLOBAL_HOME`, never
the real `~/.aof`:

| lane | tests | result |
|---|---|---|
| `test/session-model.test.mjs` — task 01, the pure resolver | 13 | green |
| `test/cache-stable-launch.test.mjs` — task 01, the drive path + the settled record | 3 | green |
| `test/agent-session-driver-drives.test.mjs` — the `70/01`-labelled seam tests (task 00 ×6, task 01 ×4, task 02 ×5) | 15 | green |
| FF-7004 `test/arch/acd-worker-driver-no-headless-print.test.mjs` *(the 70-series extension)* | 1 | green |
| FF-7005 `test/arch/acd-session-driver-single-home.test.mjs` *(the 70-series extension)* | 1 | green |
| FF-7006 `test/arch/acd-agent-model-source-map.test.mjs` *(the 70-series extension)* | 1 | green |

**Traceability is 1:1 and non-vacuous.** The three features declare **nineteen** scenarios — task 00:
five Scenarios + two Scenario Outlines; task 01: five + two; task 02: four + one — and every one
resolves to a named test. The one scenario NOT discharged behaviourally is task 00's *aof never
replaces the system prompt*, which is structural by nature and is discharged by FF-7004's extension
(`no --system-prompt replacement argv is constructed anywhere in src/**`) — the contract says so in
its own body. *verifies →* `tasks/00_stable-prefix-flag.feature`,
`tasks/01_model-and-effort-chosen.feature`, `tasks/02_one-hour-ttl-held.feature`.

### Registration was confirmed by reading, not assumed

F-03's `control-runner-unchecked` still stands (no `work.controls.runners` in
`.aof/aof.config.json`), so doctor's leg B did not run here either. Checked by hand: the story's two
new suites are imported at `scripts/test.mjs:1073-1074` **and spread** at `:3068-3069` inside the
story's own labelled block; the three control hosts are imported at `:163`, `:2704`, `:1595` and
spread at `:3297`, `:2780`, `:3180`.

### The launch itself, read at the seam

`resolveInteractiveDriverLaunch` (`src/agent-session-driver.mjs:661`) now builds
`[…, "--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections", "--append-system-prompt", WORKER_SESSION_INSTRUCTION]`,
appends `--model`/`--effort` only when `options.session` supplies non-empty strings, and sets
`sessionEnv.ENABLE_PROMPT_CACHING_1H = "1"` **after** the IDE-attachment scrub — the ordering task 02
makes load-bearing. Both spawn callers reach the flag and the TTL unconditionally; only the per-phase
`--model`/`--effort` are scoped to the phase-scoped drive caller, which is ADR-005's declared
boundary and is stated in task 01's own body.

### The gate

`aof work validate 70/01` → **PASS — 70/01 is well-formed.** `aof work doctor 70/01` reports no
`control-unresolved` at either severity (milestone-scope reports one, FF-7007, which is 70/04's and
correctly `pending`). The three stale `— **pending**` tokens F-04 recorded against this story are
cleared in `ARCHITECTURE.md` at this gate, so only FF-7007 and FF-7008 still read `pending` there.

<!-- Story 70/02 `cache-economics`, verified 2026-08-22. Same scoping rule as 70/00 and 70/01: the
     story's own two `@executable` task features, plus the narrowest lane that contains the surface
     it changed. Both features are tagged `@executable @cli @work @work-stream` and nothing else, so
     no `@manual` and no `@uat` lane exists and no human acceptance step applies. Milestone 70 has no
     `DESIGN.md` and the story delivers no frontend surface, so no design-conformance review applies.

     **This story declares NO fitness function.** `ARCHITECTURE.md` § Story partition assigns all
     eight of the milestone's controls elsewhere — FF-7001/7002/7003 to 70/00, FF-7004/7005/7006 to
     70/01, FF-7008 to 70/03, FF-7007 to 70/04 — so no row of the register above is owed by 70/02
     and no red probe is owed here. The register is unchanged by this gate. -->

### The scoped `@executable` lane — 15/15 green

Run against the story's registered suite by focused test-array import, under a throwaway
`AOF_GLOBAL_HOME`, never the real `~/.aof`:

| lane | tests | result |
|---|---|---|
| `test/work-observe-cache-economics.test.mjs` — tasks 00 + 01 | 15 | green |

**Traceability is 1:1 and non-vacuous.** The two features declare **thirteen** scenarios — task 00:
five Scenarios + two Scenario Outlines; task 01: four + two — and the suite exports fifteen
correspondingly named tests (`work-observe-cache/00` ×7, `/01` ×8), each naming the scenario it
discharges. The two tests beyond the thirteen are door pins rather than duplicates: they drive the
**registered** `observeCommand.run` against a temp fixture workspace to prove the configured target
is read from `work.observability.cacheRatioTarget` and that an absent one states neither verdict nor
target. Every test exercises the real `src/work-observe.mjs` exports — `rollupRunsByPhase`,
`applyCacheTarget`, `verdictForCacheBucket`, `cacheTargetIsHonourable` — over real run-record shapes,
never a re-implementation. *verifies →* `tasks/00_ratio-per-phase.feature`,
`tasks/01_target-and-verdict.feature`.

### The blast radius, run as the narrowest containing lane — 60/60 green

The story changed `renderReportMarkdown`'s `## Per phase` block and the `observeMilestone` signature,
which the rest of the observe surface shares. Those four suites are the narrowest lane containing the
change; the repo's full suite is deliberately **not** run here, per § *Scope the suite to the item*.

| lane | tests | result |
|---|---|---|
| `test/work-observe.test.mjs` (`node --test` — a genuine `node:test` file, not a test array) | 21 | green |
| `test/work-observe-attribution.test.mjs` | 12 | green |
| `test/work-observe-scope.test.mjs` | 17 | green |
| `test/work-observe-snapshots.test.mjs` | 10 | green |

`work-observe-attribution.test.mjs` — one of the two F-05 flaky-race scenarios — was green in
isolation at this gate, as it was at 70/01's.

### Registration was confirmed by reading, not assumed

F-03's `control-runner-unchecked` still stands (no `work.controls.runners` in
`.aof/aof.config.json`), so `aof work doctor`'s leg B did not run here either — and this story
declares no control for it to check in any case. Checked by hand for the behavioural suite: it is
imported at `scripts/test.mjs:1119` **and spread** into the registry at `:3092`, inside the story's
own labelled block, whose comment at `:1117` states the same "declares no control" fact recorded
above.

### The report itself, read at the real door on real records

Read-only `aof work observe`, no `--write`:

- **`aof work observe 66/00`** (a real item carrying a real run record) renders the new columns on
  live data: the target line reads *"No cache-ratio target is configured, so no met/missed verdict is
  stated — only the ratio"*, and the run — which carries no `spend` — reports `cache ratio:
  unmeasured`, `verdict: —`, `unmeasured spend: 1`. **The un-instrumented run is not a 0.0**, which
  is the story's own load-bearing premise, observed rather than asserted.
- **`aof work observe 70/02`** renders with no `## Per phase` block at all — the story's folder holds
  no run records, and the block is conditional on there being some. Absence renders as absence.
- **The three non-arithmetic cases, rendered through the real `renderReportMarkdown`** against a
  fixture rollup carrying one warm phase (reads, no creations), one cold phase (creations, no reads)
  and one unmeasured phase (no `spend`), with a target of `1.5`:

  | phase | cache read | cache create | cache ratio | verdict |
  |---|---|---|---|---|
  | cold | 0 | 500 | `0.000` | `**missed**` |
  | dark | 0 | 0 | `unmeasured` | `—` |
  | warm | 1.0k | 0 | `∞ (warm, unbounded)` | `met` |

  Reads-with-no-creations is flagged unbounded rather than divided by zero; creations-with-no-reads
  is a measured `0.000` and is distinguishable from the unmeasured row; the unmeasured row is never
  judged missed. *verifies →* `tasks/00_ratio-per-phase.feature`, `tasks/01_target-and-verdict.feature`.

### The target, measured across all four configuration cases

Driven through the **registered** `observeCommand.run` against temp fixture workspaces, one config
each — the four rows of task 01's *target configuration that cannot be honoured* outline, observed at
the door an operator actually uses:

| `work.observability.cacheRatioTarget` | target line rendered | verdict | ratio still reported |
|---|---|---|---|
| absent (`{}`) | *No cache-ratio target is configured…* | `—` | `2.000` |
| `1.5` | *The cache-ratio target is **1.5**…* | `met` | `2.000` |
| `"1.5"` (a string) | *No cache-ratio target is configured…* | `—` | `2.000` |
| `-1` | *No cache-ratio target is configured…* | `—` | `2.000` |

The contract's stated outcome holds in every row — a target that cannot be honoured yields no verdict
and never takes the measurement down with it. The wording in rows three and four is what F-09 below
records.

### The gate

`aof work validate 70/02` → **PASS — 70/02 is well-formed.** `aof work doctor 70/02` reports **no
`control-unresolved` at either severity** (its only finding is the repo-wide `numbering-gap` warn
about missing top-level driver numbers, which is not this story's and not a control). The story
declares no control, so there is nothing for the accept rule's marker clause to catch here.

<!-- Story 70/03 `architecture-slice`, verified 2026-08-22. Same scoping rule as every story before
     it: the story's own three `@executable` task features plus its one declared control, not the
     whole repo's suite. All three features are tagged `@executable @cli @work @work-stream` and
     nothing else, so no `@manual` and no `@uat` lane exists and no human acceptance step applies.
     Milestone 70 has no `DESIGN.md` and the story delivers no frontend surface, so no
     design-conformance review applies. -->

### The scoped `@executable` lane — 32/32 green

| lane | tests | result |
|---|---|---|
| `test/architecture-slice.test.mjs` — tasks 00 + 01 + 02 | 26 | green |
| FF-7008 `test/arch/acd-work-artifact-set-single-home.test.mjs` *(extended)* | 6 | green |

**Traceability is 1:1 and non-vacuous.** The three features declare **21** scenarios — task 00: five
Scenarios + one Outline; task 01: seven + one; task 02: six + one — and the suite exports 21
correspondingly named tests (`70/03 task00` ×6, `task01` ×8, `task02` ×7), each naming the scenario it
discharges, plus **five** `70/03 regression` tests that pin the structural-heading scan against
documentation examples: fenced and HTML-commented `## ADR-NNN` headings are neither addresses nor
block boundaries, a fenced or commented fake fitness register preceding the real one is ignored, and
the slice/register fallback applies to stories while a milestone brief keeps the full architecture.
*verifies →* `tasks/00_adrs-declared.feature`, `tasks/01_adr-block-addressable.feature`,
`tasks/02_budget-binds-at-accept.feature`.

### The declaration, read at the real door on a real milestone

`adrs:` was driven through the registered `aof work validate` command against a throwaway copy of
this milestone's own folder — measured, not inferred:

| `adrs:` on the story | what `aof work validate 70` reports |
|---|---|
| `[ADR-006, ADR-007]` on 70/03 (both real) | nothing — the declaration resolves silently |
| `[ADR-008, ADR-999]` on 70/04 | `04_story_warm-fix-loop\STORY.md — ADR declaration "ADR-999" does not resolve in 70/ARCHITECTURE.md` |
| a block list (`adrs:` then `  - ADR-008`) | `STORY.md — ADR declaration adrs must be an inline list (for example: adrs: [ADR-001])` |
| absent (every one of this stream's 201 stories) | nothing — `aof work validate 70` is **PASS** |

The resolution **moved home during review** (`f4a9a3a`): it was first written as a sixth
`aof work doctor` register family inside `src/work-doctor-controls.mjs` and now lives in
`src/commands/validate.mjs`, leaving the core validator untouched. That move is verifiable at the
source rather than taken on the commit message: `src/work.mjs`'s sha256 is `c38f47f…` at 70/00's
merge, at 70/01's, at 70/02's and at HEAD, and only the intermediate 70/03 build commit `61ec7ad`
drifted it to `e27b747…`. Milestone 70 leaves the frozen core exactly as it found it. *verifies →*
`tasks/00_adrs-declared.feature`.

### The budget, read at the accept door itself

ADR-007's binding point is the `→ done` preflight in `src/commands/item-status.mjs:99-115`: it runs
the SAME `budgetGroup` over the SAME snapshot measurement and the SAME `budgetsFromConfig` numbers as
the advisory sweep, with only `acceptingRef` injected, and refuses with `artifact-budget-exceeded`
(409) on any `doc-over-budget` finding that resolves to `error`. No other status edge pays or applies
the gate. Measured on this milestone's own artifacts at this gate, every one is inside its budget —
`SPEC.md` 122/300, `ARCHITECTURE.md` 450/700, the five `STORY.md` at 53–59/150, and every `.feature`
at 55–93/300 — so the preflight this milestone is accepted through passes on measurement rather than
on absence. *verifies →* `tasks/02_budget-binds-at-accept.feature`.

### Registration was confirmed by reading, not assumed

`architectureSliceTests` is imported at the suite registry's line 1119 and **spread** at line 3128,
inside the story's own labelled block; FF-7008's host suite is imported at 1912 and spread at 3590.
Checked by hand for the same reason as every gate before it — F-03 below: no `work.controls.runners`
is configured, so `aof work doctor`'s leg B never runs anywhere in this repo.

### The gate

`aof work validate 70/03` → **PASS — 70/03 is well-formed.** `aof work doctor 70/03` reports **no
`control-unresolved` at either severity**; its only finding is the repo-wide `numbering-gap` warn,
which is not a control and not this story's.

<!-- Story 70/04 `warm-fix-loop`, verified 2026-08-22. Same scoping rule. Both features are tagged
     `@executable @cli @work @work-stream` and nothing else, so no `@manual` and no `@uat` lane
     exists and no human acceptance step applies; no `DESIGN.md`, so no design-conformance review
     applies. -->

### The scoped `@executable` lane — 21/21 green

| lane | tests | result |
|---|---|---|
| `test/warm-fix-loop.test.mjs` — task 00 | 14 | green |
| `test/review-stays-cold.test.mjs` — task 01 | 5 | green |
| FF-7007 `test/arch/acd-review-never-resumed.test.mjs` | 2 | green |

**Traceability is 1:1 and non-vacuous.** The two features declare **12** scenarios — task 00: five
Scenarios + two Outlines; task 01: four + one — and the suites export 12 correspondingly named tests
(`70/04 task00` ×7, `task01` ×5). Five further tests in `warm-fix-loop.test.mjs` pin the findings this
story's own review raised: the change-under-review excludes staged and unstaged work that predated the
build while retaining the build delta, a positively unavailable target falls back cold **on a visible
retry record** rather than as a hidden second process inside one attempt, a generic failed resumed
process is not disguised as a second cold one, interruption after review preserves the pending fix's
identity and findings through the existing run lineage, and the cap survives repeated interruption.
*verifies →* `tasks/00_fix-resumes-the-build.feature`, `tasks/01_review-stays-cold.feature`.

**Two of the fourteen tests in `test/warm-fix-loop.test.mjs` are milestone 69's, not this story's**
(`69/00 amended F-6900 …` ×2, the production review-cap pair). They sit here because the production
fix path is where 69/00's cap binds. Noted rather than moved, and recorded as F-13 below.

### The distinction, read in the production source

FF-7007's structural claim is that the resume target is derived from the PHASE, never from a caller.
Read at `src/commands/drive.mjs`: the caller's `resumeSessionId` is destructured OFF the options
before they reach the launch (`:171`); `fix` is admitted only when `phase === "continue"` **and** the
loop supplied a `buildRun` (`:176`); `recordedSessionForFix` (`:31`) returns `null` for every phase
that is not `fix` and for any session id that is not a bare basename; and the compiled brief is
attached only when `resumeSessionId == null` (`:247`) — a resumed session already holds the tree, so a
cold degrade is the only path that pays for a brief. Foreign-node admission is decided by the loop
(`admitResumeBuildRun`, `src/commands/loop.mjs:97`), so the executor never makes a node-placement call
of its own. A resume whose transcript baseline cannot be snapshotted degrades through a named
`resume-spend-baseline-unavailable` report rather than a silent mis-settlement (`drive.mjs:229-236`).
*verifies →* `tasks/00_fix-resumes-the-build.feature`, `tasks/01_review-stays-cold.feature`.

### Registration was confirmed by reading, not assumed

`warmFixLoopTests` and `reviewStaysColdTests` are imported at the suite registry's lines 1130–1131 and
`acdReviewNeverResumedTests` at 1132, all three **spread** at 3133–3135 inside the story's own
labelled block.

### The gate

`aof work validate 70/04` → **PASS — 70/04 is well-formed.** `aof work doctor 70/04` reports **no
`control-unresolved` at either severity**; its only finding is the repo-wide `numbering-gap` warn.

<!-- Story 70/05 `brief-carries-the-contract`, verified 2026-08-23. Same scoping rule as its four
     accepted siblings: the story's own three `@executable` task features plus its own two declared
     controls, and — because this story rewrites the compiler 70/00 and 70/03 delivered — the two
     stories whose lanes that compiler carries, run as the narrowest containing regression. All
     three features are tagged `@executable @cli @work @work-stream @bug @finding-F-11` and nothing
     else, so no `@manual` and no `@uat` lane exists and no human acceptance step applies. Milestone
     70 has no `DESIGN.md` and the story delivers no frontend surface, so no design-conformance
     review applies. -->

### The scoped `@executable` lane — 46/46 green, and its regression 48/48

Run against the story's registered suites, each under a throwaway `AOF_GLOBAL_HOME`, never the real
`~/.aof`:

| lane | tests | result |
|---|---|---|
| `test/brief-carries-the-contract.test.mjs` — tasks 00 + 01 | 22 | green |
| `test/brief-pinned-to-the-stream.test.mjs` — task 02 | 12 | green |
| FF-7009 + FF-7003 `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` *(extended)* | 7 | green |
| FF-7010 + FF-7001 `test/arch/acd-phase-brief-single-bag.test.mjs` *(extended)* | 5 | green |
| *regression* — 70/00's `phase-brief-compile` + `phase-brief-seams` | 22 | green |
| *regression* — 70/03's `architecture-slice` | 26 | green |

**The regression lane is named rather than skipped.** This story rewrites `assemble` in
`src/phase-brief.mjs` and the whole call site in `src/phase-brief-read.mjs` — the two surfaces 70/00
and 70/03 were accepted on. Their suites are the narrowest lane that contains the blast radius, so
they were run here rather than deferred to the milestone gate; the whole-repo suite still runs once,
at that gate. *verifies →* `tasks/00_the-contract-reaches-the-phase.feature`,
`tasks/01_the-budget-is-spent.feature`, `tasks/02_pinned-against-the-real-stream.feature`.

### The headline claim, re-measured at the gate rather than re-read

The milestone's own recorded lesson is that *verification kept reaching for a verdict before the
measurement*, so the build's and the review's figures were **re-derived here** through the
production reader (`compileBriefForItem`), over every story folder under `wiki/work/` — 219 of them,
at whatever size the stream now has:

| phase | items | with `tasks/` | contract carried | architecture or fitness carried | sacrificed | unshippable | husks | over ceiling | mean chars |
|---|---|---|---|---|---|---|---|---|---|
| `refine` | 219 | 211 | **211** | 194 | 0 | 0 | 0 | 0 | 7,440 / 8,000 |
| `continue` | 219 | 211 | **211** | 194 | 0 | 0 | 0 | 0 | 7,234 / 8,000 |
| `verify` | 219 | 211 | **211** | 194 | 0 | 0 | 0 | 0 | 6,753 / 8,000 |

The zero columns are stronger than counters: across all 657 compilations the **only** disposition
the compiler ever emitted was `condensed` (438 / 484 / 322 occurrences per phase) — `sacrificed` and
`unshippable` were not merely rare, they never occurred, and no condensed section named zero of its
own entries. Husk-freedom is read from each bounded condenser's **own `kept`/`total` count**, never
from a byte length; inferring content from size is the exact error this story's STATE records both
the build and the review lane making in turn.

Named-item comparison against F-11's own measurement, through the same reader:

| item | phase | before (F-11, 2026-08-22) | after |
|---|---|---|---|
| 70/00 | `verify` | 244 chars — an item ref plus a notice saying everything was dropped | **7,298** chars carrying the contract index and the fitness register |
| 70/00 | `continue` | `item`, `story` | 6,701 chars, contract index + register |
| 70/03 | `continue` | `item`, `story` — its own 5,306-char ADR slice evicted with ~4,400 chars unused | 6,742 chars, contract index + register |
| 70/05 | `continue` | — | 4,691 chars: user story, all **27 of 27** scenarios named, and its three declared ADRs |

### The declared-ADR path is exercised by the real stream, not by emptiness

`70/05` is the **only** story of all 219 that carries an `adrs:` line, and its brief carries
`ARCHITECTURE SLICE (declared ADRs): ADR-002, ADR-003, ADR-009` — *2 of 3 decisions listed, 1
omitted*, counted, and pointed at `ARCHITECTURE.md` — rather than the milestone register. Stories
that declare nothing (`70/00`, `70/03`) correctly receive `STRUCTURAL CONSTRAINTS (fitness register)`
in its place. This discharges F-11 below and the first two gaps in 70/03's `OUTCOME.md`.

### Registration was confirmed by reading, not assumed

`aof work doctor 70` still reports `control-runner-unchecked` — no `work.controls.runners` exists in
`.aof/aof.config.json`, so doctor's leg B never runs for any control in this milestone (F-03).
Checked by hand instead: both behavioural suites are imported at `scripts/test.mjs:1130-1131` **and
spread** into the registry at `scripts/test.mjs:3152-3153`, inside the story's own labelled block;
the two arch hosts are imported at `:1114-1115` and spread at `:3144-3145`. Both new suites export
`{ name, run }` entries — the harness shape the register's own header requires.

### The gate

`aof work validate 70/05` → **PASS — 70/05 is well-formed.** `aof work doctor 70/05` reports **no
`control-unresolved` at either severity**; its only finding is the repo-wide `numbering-gap` warn.
Both red probes were performed against the **live bytes** and reverted by `cp` from an explicit
backup — never `git checkout --`, which on this all-uncommitted branch destroyed `ARCHITECTURE.md`
once during this story's own review. Both files were confirmed byte-identical to their pre-probe
state afterwards, and the whole lane re-run green.


<!-- Story 70/06 `saving-is-measured`, verified 2026-08-24. THE LANE IS DIFFERENT IN KIND from its six
     siblings and deliberately so: the story authors no task `@executable` feature. All three of its
     features are tagged `@cli @work @work-stream` at the Feature level and every scenario is
     `@manual` — except ONE, task 01's `@uat`, which is the FIRST human-acceptance scenario milestone
     70 has carried. So `aof work doctor 70/06` reports no `rubric-join-unchecked` (there is no
     `@executable` scenario to join), the evidence below is agent-run rather than suite-run, and step
     2's human sign-off applies for the first time in this milestone. Milestone 70 has no `DESIGN.md`
     and the story delivers no frontend surface, so no design-conformance review applies. -->

### The story's guard suite — 11/11 green

The story declares no fitness function and authors no task feature, but it did author production
code (see F-25), and that code carries its own suite:

| lane | tests | result |
|---|---|---|
| `test/warm-start-local-drive.test.mjs` — D1 trust key, D2 env scrub, D3 paste transport | 11 | green |

Registered at the suite registry's line 1081 (import) and 3217 (spread), inside the story's own
labelled block. Checked by reading, as at every gate before it — F-03 below: no
`work.controls.runners` is configured, so `aof work doctor`'s leg B never runs in this repo.

### Task 00 — the run record, read at the source rather than from the snapshot

The snapshot's headline claim is that a phase was driven through the door that declares it and left
a run record carrying a `spend` envelope. The record was opened and read directly at
`aof-test-repo/wiki/work/01_milestone_warm-measure/stories/00_story_warm-measure/runs/node-7297/20260824T101918473Z-0005.json`:

| field | value read |
|---|---|
| `state` / `outcome` | `done` / `done` |
| `sessionId` | `71a2a8d5-f786-4232-9569-da566e1ffa67` |
| `brief.loop.phase` | **`continue`** — the declared phase, minted by the loop door, not by a bare drive |
| `spend.tokens` | `input` 298 · `output` 75,070 · `cacheRead` **5,026,907** · `cacheCreate` **389,056** |
| `spend.model` / `spend.effort` | `claude-opus-5` / **`unknown`** — see F-26 |
| `spend.costUsd` / `costSource` / `priceTable` | `4.0939761` / `priced` / `price-table-2026-08-v1` |

All four buckets, the model, the effort and a cost source are present, and the four buckets sum to
the reported total with no term counted twice. *verifies →* `tasks/00_a-real-phase-is-measured.feature`.

### Task 00 — the directive crossed as ONE input, read out of the live transcript

The contract 70/00 states is that the brief reaches the model **as input, by value**. Read directly
from the session transcript (`~/.claude/projects/C--Source-umami-aof-test-repo/71a2a8d5-….jsonl`)
rather than from the snapshot's account of it:

- the directive is **one** user message of **1,249 characters across 37 lines**, first line
  `/aof:continue 01/00`, the compiled brief following in the same message;
- the message contains **no ESC byte** — the bracketed-paste framing the driver writes was consumed
  by the TUI as protocol and never entered the content.

That second measurement is what makes F-21 below a test-double drift rather than a production
defect, and it is the reason the finding is routed as it is.

### Task 00 — the report at the real door

`aof work observe 01/00`, run in the fixture repo through the registered command:

| phase | runs | tokens | cost | unmeasured spend | cache read | cache create | cache ratio | verdict |
|---|---|---|---|---|---|---|---|---|
| `continue` | 5 | 5491.3k | $4.0940 | 4 | 5026.9k | 389.1k | **12.921** | **missed** |
| _no declared phase_ | 1 | 0 | $0.0000 | 1 | 0 | 0 | unmeasured | — |

`unmeasured` is no longer the whole answer for this item, and the two routes to it — a run under the
declared phase whose spend is absent, and a run carrying no loop declaration at all — are reported
distinguishably rather than conflated. *verifies →* `tasks/00_a-real-phase-is-measured.feature`.

### Task 01 — the baseline was re-counted here, not accepted from the snapshot

The comparison's before is admitted only if it was re-read rather than quoted. Every one of the six
committed `observability/report.md` files was re-opened at this gate and its per-agent rows counted
independently:

| milestone | rows counted here | report generated |
|---|---|---|
| 45 | 1 | 2026-08-08 14:24Z |
| 48 | 23 | 2026-08-11 20:40Z |
| 47 | 42 | 2026-08-13 11:30Z |
| 49 | 45 | 2026-08-13 22:27Z |
| 50 | 6 | 2026-08-14 00:52Z |
| 52 | 26 | 2026-08-14 19:20Z |
| **total** | **143** | range **2026-08-08 14:24Z → 2026-08-14 19:20Z** |

Both the row count and the date range reproduce the snapshot's exactly. The snapshot's own agreement
check against the SPEC — 955,524 against 927,588 cache-create per spawn (+3.0%), 320.98:1 against
316:1 (+1.6%), and the worst single run at **9,429,600 against the SPEC's 9.43M, exact** — therefore
rests on a baseline this gate has counted for itself. *verifies →* `tasks/01_the-before-and-after.feature`.

### Task 01 — the regression is recorded with its measured direction

The delta is stated on the per-agent instrument on both sides and is not restricted to the figures
that improved: cache-create per spawn 955,524 → 100,499 (**−89.5%**), context-in ÷ output 320.98 →
65.93 (−79.5%), and the read÷create ratio **23.936 → 10.383 — a regression**, recorded as measured
with the structural reason it is probably a lifetime artefact and the plain statement that the
comparison *cannot settle whether prefix sharing improved*. Four figures are reported **not taken**
with a reason each, none estimated or carried across. Sample sizes are stated throughout (n=143
before, n=2 after per-agent, n=1 per-phase). *verifies →* `tasks/01_the-before-and-after.feature`.

### Task 02 — the target took, and it changes no run

The target is verified by the report stating it, not by the config file, because a green validate
proves nothing about a key the schema does not declare (F-07/F-09). Driven live against the fixture
repo, all four configuration cases render as the contract requires — `13` states the target and a
`missed` verdict; `"13"` and `-1` state *configured but invalid* with no verdict and the ratio still
reported; absent states no target configured.

**And the verdict actuates nothing, read at the source rather than assumed.** `cacheRatioTarget` and
`cacheTargetStatus` are read in exactly two modules — `src/commands/observe.mjs` and
`src/work-observe.mjs`, both reporting surfaces. No loop, drive, run-store or transition module reads
either, so ADR-008's reporting-only boundary holds by construction: no run is failed, retried, capped
or killed by a missed target. *verifies →* `tasks/02_the-target-is-set-from-what-was-measured.feature`.

### Task 02 — STATE stops calling the target open

`STATE.md` § Still open now carries the target line struck through and closed **by measurement rather
than by decision**, naming the run, the declared phase, the session, the measured 12.921 and the
derivation of 13. *verifies →* `tasks/02_the-target-is-set-from-what-was-measured.feature`.

<!-- THE MILESTONE GATE, 2026-08-22. The whole-repo suite runs ONCE, here — the point at which the
     per-story commits make bisecting a cross-story poisoner mechanical. -->

### The milestone gate — the whole unit lane, 6,578 of 6,579 tests

The full suite cannot be run as `node scripts/test.mjs` on this machine: its integration lane binds
`127.0.0.1:4182`, which the live control daemon holds, and the run dies there rather than reporting.
It was run instead by importing the assembled `tests` array and driving every entry under the same
per-test hermetic `AOF_GLOBAL_HOME` the suite runner gives them.

**One test is not covered and is named rather than folded into the total:**
`global-work-propagation/03 launcher publishes an initial snapshot and retries on each propagation
tick` binds `:4182` itself. It is environment-blocked on this node, not failing.

The reds are enumerated in the register below. Every one was attributed **at the source** — run in a
detached worktree at the commit that introduced it — rather than inferred from its message.

### The uncommitted tree the gate ran on

The working tree carries **milestone 54 story 00 in flight** (`src/work-grade.mjs`, five new test
files, and their registry block) and milestone 69 record edits. Two consequences, both measured:
`arch/53 FF-5311` is red on the working tree and **green at clean HEAD**, so it is 54/00's
uncommitted registry edit and nothing committed; and the 54/00 suites themselves ran inside this
lane. Every other red below reproduces at clean HEAD.

<!-- THE MILESTONE GATE, 2026-08-24 — the SECOND one. The 2026-08-22 gate above refused the
     milestone and scaffolded 70/05 and 70/06 against F-11 and F-12; both have since landed, and
     this gate re-runs the whole unit lane over the tree those two produced. It is where F-21 was
     found — by nothing else. -->

### The milestone gate — the whole unit lane, 6,838 of 6,839 tests

Run the same way as the 2026-08-22 gate and for the same reason: `node scripts/test.mjs` cannot
complete on this machine (F-16), so the assembled `tests` array was imported and every entry driven
under the same per-test hermetic `AOF_GLOBAL_HOME` the suite runner gives them. One test is skipped
and named rather than folded into the total — `global-work-propagation/03`, which binds `:4182`,
held by the live control daemon: environment-blocked on this node, not failing.

**Result: 6,755 ok / 83 not-ok.**

### Every failure was attributed at the source, not inferred from its message

The 83 were re-run **by name** in a detached worktree at pristine `89c15f1`, so each one is
classified by measurement rather than by whether it looks familiar:

| | count |
|---|---|
| **inherited** — red at pristine `89c15f1` too | **45** |
| **new on the working tree** — green at `89c15f1` | **38** |

The 45 inherited are the standing red baseline this milestone has recorded three times and does not
own: F-18's merge-base cluster (mesh clone/credential, `worktree-cleanup-retention`,
`release-workflow-lint`, `claude-settings`, `66/00 parse`), F-15's `FF-5308` digest, the four
environment reds (`work-init/runtime`'s codex binary, `arch/ADR-002` and
`arch/graphify-backend-selection`'s memory seam, `memory-integration`'s sqlite status), the schema
runtime/resource enums, and F-05/F-17's load-flaky pairs. None is milestone 70's, and their
persistence is itself F-18's point: **a red baseline nobody owns is the condition that lets a new
red hide.**

**All 38 of the new ones are milestone 70's, and all 38 are one story's.** They are recorded as
**F-21**, with the probe chain that separates their two causes. The count matters more than any
single failure: 38 scenarios across **five** milestones — 38, 53, 54, 69 and 70 — four of which are
already accepted.

### The uncommitted tree the gate ran on

The working tree carries **70/06 in flight** and nothing else of substance: `.aof/aof.config.json`
(the `cacheRatioTarget: 13` this milestone measured), `src/agent-session-driver.mjs`,
`src/claude-trust.mjs`, seven test files and one new one (`test/warm-start-local-drive.test.mjs`),
plus this milestone's own records and the committed observability snapshot. That narrowness is what
makes F-21's attribution clean: there is no second in-flight lane to share the blame with, and the
three-step probe confirmed it by exoneration as well as by cause — `src/claude-trust.mjs` swapped in
alone changes nothing.

### All ten declared controls re-run green at this gate

Every row of the register above was re-run here rather than carried on its earlier report:
**20 assertions across the ten controls, all green** — FF-7001 (×3), FF-7002, FF-7003 (×3), FF-7004,
FF-7005, FF-7006, FF-7007 (×2), FF-7008 (×2), FF-7009 (×4), FF-7010 (×2). `ARCHITECTURE.md` marks
none of the ten `pending`, and `aof work doctor 70` reports no `control-unresolved` at either
severity. **The controls were green through all 38 failures** — which is the honest measure of what a
structural register does and does not reach: not one of the ten is aimed at the bytes the directive
crosses on.

### The five green story lanes, re-run on the working tree

70/00, 70/01, 70/02, 70/03 and 70/05's scoped lanes were re-run together on the tree being shipped
rather than trusted from their own gates: **113/113 green**. Only 70/04's lane is red, and F-21
records why it is not 70/04's.

## User sign-off

<!-- Milestone 70's FIRST and ONLY human-acceptance step. Six of its seven stories carry no `@uat`
     scenario at all — the technical/foundational shape the process expects — and the user was
     deliberately not asked about any of them. Story 70/06 task 01 carries one, because the question
     it asks is not answerable by any suite: whether a measurement settles the thing it was taken to
     settle. -->

**`70/06` task 01 — *the person deciding whether warm start worked reads the delta* — brokered
2026-08-24.**

**Procedure put to the user.** The recorded before-and-after was presented in full: cache-create per
spawn 955,524 → 100,499 (−89.5%), context-in ÷ output 320.98 → 65.93 (−79.5%), the largest single
after-era agent at 145,763 against the before's worst single run of 9,429,600 (**1.55%** of it), and
the read÷create ratio moving the **wrong** way, 23.936 → 10.383. Presented alongside them, from the
snapshot's own Confounders section: the two sides come from different repositories (`aof` vs
`aof-test-repo`), the before is hours-long production milestones against an after of ~9 minutes on a
one-function fixture, read÷create rises with agent lifetime, and n=2 on the after side.

**The user's result and sign-off.** The user asked for a recommendation before ruling. The
recommendation given, and the reasoning offered for it, was that the delta does **not** answer the
question — and specifically that the −89.5% ingest figure should not be credited as the half that
*is* answered, because the same workload mismatch that explains the ratio regression also explains
most of the ingest drop: a 9-minute one-function fixture ingests less than a multi-hour production
milestone regardless of any flag. **The user ratified that reading**, and separately ruled on its
triage: the finding is a **non-blocker**, milestone 70 is to be accepted on it, and the
matched-workload measurement that would answer the question is routed forward to milestone 71 rather
than scaffolded as another story inside 70.

**Recorded as F-22 below**, per the scenario's own second `Then` — *"a delta that does not answer it
is recorded as a finding rather than accepted"*. The scenario is **satisfied**, not failed: it asks
the human to state whether the delta answers the question and to record a finding when it does not,
and both happened. What the story owed was an honest measurement with its confounders; what it did
not owe, and could not have delivered inside its settled scope, is a matched workload.

<!-- THE MILESTONE GATE, 2026-08-24 (SECOND RUN, after F-21 was fixed at this gate). The run above
     refused the milestone; this one is the re-measurement on the repaired tree. -->

### The re-run gate — 6,838 of 6,839 tests, 6,792 ok / 46 not-ok

Same method and the same single skip as every gate before it (`global-work-propagation/03` binds
`:4182`, held by the live control daemon — environment-blocked, not failing; F-16).

**Every failure classified by measurement, not by familiarity**, by diffing this run's failure set
against the pre-fix run's and against the pristine-`89c15f1` baseline:

| | count |
|---|---|
| inherited baseline — red at pristine `89c15f1` | **45**, all 45 still red, none milestone 70's |
| `item-status/if-applicable` — load-flaky, green in isolation (F-17's recorded pair) | 1 |
| **introduced by the F-21 fix** | **0** |
| of the 38 scenarios F-21 named, still red | **0** |

**The fix cost three regressions before it was right, and they were caught here rather than shipped.**
The first re-run reported 50 failures — 45 inherited plus three the repair itself introduced:
milestone 53's driver census (the new fixture comment named the driver module, putting a
`test/support/` file inside a closed ADR-015 §2 allowlist), and two of 70/06's own transport
assertions in `drive-command-phase-drivers` and `mesh-worker-command-timing` that were still reading
the un-framed `chunk` where they meant the wire. All three are the same mistake in two directions —
the wire/input split was correct and was not applied everywhere it applies. Fixed by dropping the
module name from the comment and by reading `rawChunk` at both transport sites, which also let the
local re-derivation of the paste strip be **deleted** rather than duplicated: the point of a
single-homed double is that consumers stop re-deriving.

### The five green story lanes and the ten controls, re-confirmed on the accepted tree

70/00, 70/01, 70/02, 70/03 and 70/05's scoped lanes: **113/113**. 70/04's lane, red at the previous
gate through no fault of its own: **20/20**. All ten declared controls green (20 assertions), with
`ARCHITECTURE.md` at exactly **700/700** lines — measured, because ADR-007 makes that budget refuse
the accept rather than warn about it, and it did refuse until the document was compacted.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `aof work validate` (whole stream) exits 1 on `78_milestone_loop-execution-record/SPEC.md — depends "79" does not resolve to a milestone/uat item`. Item 79 exists, but as a top-level **story** (`79_story_committed-loop-graph`), and a milestone's `depends:` resolves milestone/uat items only. Pre-existing, outside 70's span — `aof work validate 70/00` is PASS. Already recorded at the previous milestone gate as `m68/F-02`; re-recorded here only because it is what makes the stream-level command red at this gate. | non-blocker | low | defer to backlog | milestone 78 | open |
| F-02 | **A milestone-53 control is RED on the integration branch, and neither contributing lane is individually wrong.** `arch/53 FF-5301` (`test/arch/acd-session-driver-mesh-blind.test.mjs`) asserts the assignment sink's root-inclusive import reach equals exactly `58` — a literal **70/00 itself authored**, whose message reads *"the ADR-015 §5 baseline 58 (+2 for 70/00's phase-brief-read + phase-brief…)"*. It now measures **59 !== 58**. The 59th module is `src/run-session-capture.mjs`, which the sink imports as of `1863102` *(68/01 drive seam — the F-04/F-09 fix, ADR-009)*. **Proven at the source, not inferred:** the control was run against 70/00's own commit `5a768a9` in a detached worktree and is **3/3 green** there, and is 2/3 on `HEAD` — so this is a merge interaction between two independently-correct lanes, not a defect in 70/00's delivery. It is an exact-equality reach ratchet, so the remedy is `58 → 59` with the message amended to name `run-session-capture.mjs` — but per FF-5302's own stated convention (*"raising the ceiling is an ADR decision, not a diff"*) the same reasoning applies to a reach count, so it routes to the architect rather than being edited at this gate. **Does not block 70/00**: FF-5301 is milestone 53's declared control, not one of 70/00's three, all of which are green with recorded red probes; and `aof:verify` § *Scope the suite to the item* states this class of cross-milestone breakage is caught at the milestone gate by design. No `@bug` scenario is owed — the control **is** the regression guard. | non-blocker (for 70/00) / **blocker at the milestone 70 gate** | high | architect ratifies the reach amendment, then the one-line ratchet update | milestone 70 gate → `aof-architect` | **closed 2026-08-22** — the architect-ratified reach amendment **landed** in 70/03's review commit `f4a9a3a` (58 → 59, message naming `run-session-capture.mjs`). The control is red again at HEAD from a NEW and later cause, recorded separately as F-14; this finding as observed is discharged. |
| F-03 | No `work.controls.runners` is configured in `.aof/aof.config.json`, so `aof work doctor`'s leg B never runs anywhere in this repo — no declared control is known by the check itself to be registered in a suite. Surfaced here as `control-runner-unchecked` across all eight of 70's controls; the five that have landed were confirmed registered by reading the suite runner (above). The key is real and read at `src/work-doctor.mjs`. Already recorded as `m68/F-03` and still open. | non-blocker | medium | defer to backlog | repo config / TECH_DEBT | open |
| F-04 | **`ARCHITECTURE.md`'s register still marks FF-7004, FF-7005 and FF-7006 `— **pending**` while this file already records all three `green` with red probes.** 70/00 cleared its own three stale pending tokens in `6f28a49`; 70/01's three were filled in the verification register without the matching clear in the declaring file. Cosmetic today — `control-unresolved` does not fire for them because their `enforced by` files exist and pass — but a standing `pending` is exactly what downgrades a real `control-unresolved` to `warn`, which is the mechanism this file's own header warns about. Not 70/00's to clear. | non-blocker | low | defer to backlog | story 70/01 | **closed 2026-08-22** — cleared at 70/01's gate; only FF-7007 and FF-7008 still read `pending`, both correctly |
| F-05 | **A flaky drive-settlement race, pre-existing and not this story's.** `test/drive-command-phase-drivers.test.mjs` (*"bare drives mint a run…"*) and `test/work-observe-attribution.test.mjs` (*"outline the local drive command"*) intermittently read `'running' !== 'done'` under full-suite load, with the failure alternating between the two across runs. Both were re-run in isolation at this verify and are **13/13 and 12/12 green**, so the story's lane is unaffected. Same neighbourhood as `m68/F-05` (scenarios that race the scheduler rather than forcing the state they name), and the same remedy applies — inject the race rather than hope for it. | non-blocker | medium | defer to backlog | milestone 68/70 backlog | open |
| F-06 | **A merge landed DURING this verification and turned two other milestones' controls red.** The story's lane was **78/78 green** on its first run; minutes later the same command reported 76/78. The branch had moved: `a90e5c9` *(Merge branch `aof/mesh/69-05`, 14:31:42)* rewrote the assignment sink's status-frame emission (`sendAssignmentStatus?.(…)` → `reportSettled(…)` / `reportDurably(…)`) and grew it from 2,360 to **2,391** lines. Two controls broke: `arch/38 ADR-013` invariant 4 (*sessionId is surfaced on BOTH the done and needs-input status frames* — its detector reads the old emission shape) and `arch/53 FF-5302`'s sink line-count ratchet (**2391 > 2377**). **Proven at the source, not inferred:** both were run in a detached worktree at `7f482e4` (the commit immediately before the merge) and are **green there**, and both are red at `a90e5c9`; invariant 4 is deterministic, 5/5 red in isolation. **Not 70/01's**: 70/01 merged at `1189daf` with the sink at 2,364 — under the ceiling — and touches neither the sink nor the emission path. Same class as F-02: an integration-branch collision between independently-correct lanes. | non-blocker (for 70/01) / **blocker at the milestone 70 gate** | high | architect ratifies the ratchet raise (FF-5302's own convention: *raising the ceiling is an ADR decision, not a diff*) and decides whether invariant 4's detector follows the new emission helpers or the emission is restored | milestone 70 gate → `aof-architect` (m69 lane) | **closed 2026-08-22** — both controls re-run at HEAD at this gate and are **green**: `arch/38 ADR-013` invariant 4 passes against the new emission helpers, and `arch/53 FF-5302`'s sink ratchet passes with the sink at **2,338 lines** against its 2,377 ceiling. The m69 lane's later fixes discharged it. |
| F-07 | **The story's new operator-facing config surface is undocumented and unvalidated.** `work.agents.session` is the one contract decision 70/01 made rather than inherited, and nothing tells an operator they got it wrong: `aof project doctor` reports **`config-valid — Config is valid`** for `work.agents.session: "opus"` (a bare string where the routing object belongs — measured, not inferred), and the launch then silently carries no `--model`/`--effort`. `README.md` documents `work.agents.models` (the *role* surface) and never names the session path, so an operator reading it finds only the map ADR-005 exists to keep separate. The resolver's absence-is-silence behaviour is the declared contract and its scenarios pass — the gap is that a misconfiguration is indistinguishable from no configuration at every surface an operator can see. Not a schema hole specific to this story. **Correction, measured at 70/02's gate (2026-08-22):** this cell first read *"`schemas/aof.schema.json` declares **no** `work.*` properties at all"*, which is false. The schema declares `work` at `#/$defs/work` with eight properties — `agents`, `dir`, `doctor`, `headroom`, `integrations`, `roadmap`, `tags`, `ui` — and `work.agents` is `additionalProperties: false` with `session` among none of its four declared keys. The real shape of the hole is therefore narrower and sharper than recorded: `work.agents.session` is not merely undeclared, it is a key a **closed** object rejects, and nothing runs Ajv at validate time (the schema's own `models` description says so), which is why `aof project doctor` reports `config-valid` regardless. | non-blocker | medium | defer to backlog — README entry naming both surfaces, and a config diagnostic for a malformed `work.agents.session` | milestone 70 backlog / docs | open |
| F-08 | **ADR-005 ratifies the rule but never names the path.** STATE's 70/01 feedback asked review to *"ratify or rename"* `work.agents.session` — *"the one contract decision 70/01 made rather than inherited"*. The review commit `d7de0c0` amended ADR-005 with the mesh-caller Scope note but left the request unanswered: the ADR still says only *"distinct config paths"*, so the literal exists in `SESSION_MODEL_CONFIG_PATH` and in FF-7006's assertion, and nowhere in the architecture record. The structural guard makes a silent rename impossible, so this is a record gap rather than a live risk. | non-blocker | low | architect adds the path to ADR-005 (one line) | `aof-architect` | open |
| F-09 | **A target that cannot be honoured is reported as an absent one — in the milestone whose own thesis is that absence must stay honest.** `work.observability.cacheRatioTarget` is the one operator-facing decision 70/02 adds. Driven through the registered `observeCommand.run` against four fixture configs (measured, not inferred): `"1.5"` (a string) and `-1` render **byte-identically to an absent target** — *"No cache-ratio target is configured, so no met/missed verdict is stated"*, `cacheTarget: null`, verdict `—`. The contract's stated outcome is honoured exactly in both (*"no verdict, and the ratio is still reported"*, and the ratio is `2.000` in all four rows) — the defect is that the report then **asserts something false**: a target IS configured, it is simply unusable, and the one sentence an operator reads tells them it is not there. Compounding it, `observability` is declared **nowhere** in `schemas/aof.schema.json` (whose `work` object is `additionalProperties: true`, so the key is legal but wholly unvalidated), and `README.md` contains **zero** occurrences of the word — the pre-existing `work.observability.enabled` is documented only inside `src/bundle/commands/retrospective.md`, which never names the target. Same class as F-07, a different surface and a different story. | non-blocker | medium | defer to backlog — declare `work.observability` (both keys) in the schema, add a README entry, and reword the unhonourable case to name the configured-but-unusable value rather than claim absence | milestone 70 backlog / docs | open |
| F-10 | **`cacheRatio: Infinity` crosses the `--json` door as `null`, the same value an unmeasured phase carries.** A warm phase (cache reads, no creations) is modelled as `cacheRatio: Infinity`, and `JSON.stringify(Infinity)` is `null` — measured at the source, so `aof work observe --json` reports `cacheRatio: null` for BOTH a warm phase and an unmeasured one. They stay distinguishable, but only via the sibling `cacheState` (`"unbounded"` vs `"unmeasured"`), never via the ratio field a consumer would naturally read. The markdown door is unaffected and correct — it renders `∞ (warm, unbounded)` against `unmeasured`, verified above — and task 00's *distinguishable in the report* scenario is about the zero-vs-unmeasured pair, which holds in both doors, so no contract is breached. The exposure is a future JSON consumer that reads `cacheRatio` alone and silently folds the milestone's best outcome (a fully warm phase) into "no measurement". | non-blocker | low | defer to backlog — carry the unbounded case across the JSON door as a value that survives serialisation (e.g. the string `"unbounded"`, or a `cacheRatioIsFinite` sibling), or document `cacheState` as the field a consumer must branch on | milestone 70 backlog | open |
| F-11 | **THE MILESTONE'S HEADLINE DELIVERABLE IS INERT ON REAL DATA.** Compiled through the real reader (`compileBriefForItem`) against this milestone's own five stories — measured, not inferred — the brief drops the task contracts and the architecture/fitness section in **every story, in every phase**. A `continue` brief retains `item` + `story` alone; a `verify` brief retains `item` alone at **244 characters**, an item ref plus the notice saying everything was dropped. Briefs land at 3,119–3,736 chars against the 8,000-char ceiling, so **under half the budget is spent while the contract is discarded**. Two independent causes, both in `assemble` (`src/phase-brief.mjs`): **(a)** task contracts measure 7,115–12,311 chars, so they never fit — a section is retained or dropped whole, with no truncation *within* a section; **(b)** `lowerPriorityDropped` stops packing at the first miss, so 70/03's 5,306-char declared ADR slice is evicted with ~4,400 chars of budget unused. No contract is breached — every scenario passes, and the truncation notice is honest and names what it dropped — because every fixture is sized to fit. **The consequence is that 70/03's whole capability reaches no brief in this repo, and the milestone's answer to a 927k-token spawn is currently 244 characters.** | blocker | high | **milestone NOT accepted; new story scaffolded** | **`70/05` brief-carries-the-contract** | **closed 2026-08-23** — discharged by `70/05`, re-measured at that story's gate through the same reader over all **219** stories in this stream: **211 of 211** stories with contracts now carry them, 194 carry their milestone's architecture or fitness register, and across all 657 compilations (`refine`/`continue`/`verify`) the only disposition emitted is `condensed` — **zero** sacrificed, **zero** unshippable, **zero** husks, **zero** over the unchanged 8,000-char ceiling. The named cases invert exactly: 70/00's `verify` brief is **7,298** chars carrying the contract index and the register where it was 244, and 70/03's declared-slice capability now reaches a brief. |
| F-12 | **Nothing this milestone claims has been measured.** `aof work observe 66/00` reports `cache ratio: unmeasured`, `unmeasured spend: 1`, verdict `—`, and every other run record in the stream reports the same. 70/01's flags, 70/02's reading and 70/04's warm fix loop have never run together, so the SPEC's own baseline figures — 927,588 cache-creation tokens per spawn, 316:1 context-in to output, $5.79 vs $0.46 per spawn — have no measured successor. The SPEC's Dependencies note states the consequence exactly: *"the cache-hit ratio and the per-phase ingest cost are the only way to prove any of this worked. Without 68 this milestone ships on faith."* It is shipping on faith. `work.observability.cacheRatioTarget` is unset, so every phase reports verdict `—`. | blocker | high | **milestone NOT accepted; new story scaffolded** | **`70/06` saving-is-measured** | **closed 2026-08-24** — discharged by `70/06`, re-verified at this gate at the source rather than from the story's own snapshot. `aof work loop 01 --cap 1` drove a phase to `done` through the door that declares one: run `20260824T101918473Z-0005`, `brief.loop.phase: "continue"`, session `71a2a8d5-…`, and a `spend` envelope carrying all four buckets (cacheRead **5,026,907** / cacheCreate **389,056**), the model, the effort and a priced cost source. `aof work observe 01/00` states **12.921 / missed** where every run record in this stream said `unmeasured`, and the SPEC's baseline figures now have a re-read successor (955,524 vs 927,588 per spawn; 320.98:1 vs 316:1; the worst single run reproduced **exactly** at 9,429,600). The milestone no longer ships on faith. What the measurement cannot settle is recorded separately as **F-22**, on the human verdict the `@uat` scenario asked for |
| F-13 | **70/04's own control file adds a second violation to an ALREADY-RED rule, and that is why it was not noticed.** `test/arch/acd-review-never-resumed.test.mjs` uses `args.slice(args.indexOf("--resume"), args.indexOf("--resume") + 2)`, which trips `arch/47 F-47-04-ARCH-2` (*no fitness function grows a NEW positional slice over source text*). The detector cannot distinguish slicing an argv **array** from slicing source **text**, so the violation is false in spirit and real in effect. **Proven at the source, not inferred:** the control is green at the branch base `8167486`; at `b4adcc8` (70/02's merge) it is red with **one** offender, `acd-no-lease-store-run-record-untouched.test.mjs` (milestone 69's); at `c6a4764` (70/04's merge) it is red with **two**, the second being 70/04's. Milestone 70 did not turn the control red — it added to a red it inherited, which is chore 64's exact pathology (*a genuinely new red hides in a suite that is already expected to be red*) recurring inside the milestone whose ARCHITECTURE quotes it. The remedy is two lines — resolve the index once and assert on the element — but it is 70/04's to make, not this gate's. | blocker (for 70/04) | medium | fix in 70/04 before it is accepted; consider whether the m47 detector should exempt non-source slices | story 70/04 → `aof-developer`; detector question → `aof-architect` | **closed 2026-08-24** — fixed rather than ledgered. `test/arch/acd-review-never-resumed.test.mjs` now resolves the index once (`const resumeAt = args.indexOf("--resume")`) and asserts on the elements, and the file appears nowhere in `POSITIONAL_SLICE_LEDGER`, so the ratchet gained the ground rather than admitting the offender. `arch/47 F-47-04-ARCH-2` is **2/2 green** at this gate, including its own non-vacuity self-check |
| F-14 | **`arch/53 FF-5301` is red at HEAD again, at `60 !== 59`, and it is not this milestone's.** F-02's recorded remedy (58 → 59) **did land**, in 70/03's review commit `f4a9a3a`, which discharges F-02 as recorded. The control then went red again from a new cause. **Proven at the source:** the reach set was computed at `f4a9a3a` (59 modules) and at HEAD (60) and diffed — the 60th is `src/mesh-park-resume.mjs`, imported directly by the assignment sink, added by `ec88023` *(fix(69/05): make parked resumes idempotent)*, which landed **after** all of milestone 70's stories merged. Milestone 69 is `in-progress` with three stories still building, so its lane will keep moving the sink's reach. The literal `59` is 70's own, which is the only sense in which this is 70's; the change that broke it, and the discipline of raising a ratchet you break, are 69/05's. | non-blocker (for 70) | medium | milestone 69 raises the ratchet it broke, naming `mesh-park-resume.mjs`; per FF-5302's convention the raise is an ADR decision, not a diff | milestone 69 → `aof-architect` | open |
| F-15 | **Milestone 53's `FF-5308` is red on `src/work.mjs`'s digest, and milestone 70 leaves that file exactly as it found it.** The guard pins a sha256 of `e1e0fab…`; HEAD reads `c38f47f…`. Traced through the file's whole history: the baseline was true at `0a22fb1` and drifted at `8167486` *(Stories 74 and 80 …)*, **before** milestone 70's first commit. Milestone 70 did briefly widen it — 70/03's build commit `61ec7ad` moved to `e27b747…` — and its own review commit `f4a9a3a` moved the ADR validation off the frozen core, restoring `c38f47f…`. The digest at HEAD is byte-identical to the digest at 70/00's merge, at 70/01's and at 70/02's. | non-blocker | low | defer to backlog — the ratchet's baseline is owed an update by milestone 74/80's lane, or the guard is owed a decision about what it now pins | milestone 74/80 backlog → `aof-architect` | open |
| F-16 | **The full suite cannot complete on this machine, and the milestone gate is the one place that matters.** `node scripts/test.mjs` dies on `EADDRINUSE 127.0.0.1:4182` — the live control daemon holds the port and `global-work-propagation/03` binds it. The gate was run instead by importing the assembled `tests` array and driving all 6,579 entries under the same per-test hermetic `AOF_GLOBAL_HOME` the suite runner gives them, skipping that single test, which is **environment-blocked on this node, not failing**. Coverage is therefore 6,578 of 6,579. Already the standing operating constraint for this repo; recorded here because a gate that cannot run its own suite unattended is a gap in the gate, not merely an inconvenience. | non-blocker | medium | defer to backlog — the port-binding test wants an ephemeral port or a skip-when-held guard, so the suite is runnable on a machine hosting the daemon | repo test harness / TECH_DEBT | open |
| F-17 | **Two flaky-under-load scenarios that pass in isolation at both attribution commits.** `item-status/if-applicable: --json reports the refusal as a RESULT and exits 0` and `build-sea-recipe-guards/F14 refuses an --out that resolves to the repo root` fail inside the full lane and are **green in isolation at both the branch base `8167486` and at 70/04's merge `c6a4764`** — so they are order- or load-dependent, not regressions. Same class as F-05, and the same remedy: force the state the scenario names rather than racing for it. Recorded separately from F-05 because these two are a different pair. | non-blocker | low | defer to backlog | repo test harness backlog | open |
| F-18 | **~35 of the suite's 53 failures pre-date this branch entirely.** Run in a detached worktree at `8167486` — the merge-base with `main`, before milestones 68, 69 and 70 existed — the mesh clone/credential cluster (`worker-repo-checkout` ×6, `clone-credential-pull` ×5, `clone-url-pull` ×2, `mint-failure-loud-no-fallback` ×2), `worktree-cleanup-retention/03`, `release-workflow-lint/03` + `/09`, `m49/07`, `claude-settings/03` ×4, `66/00 parse` ×3 and `arch/m42-item-3` are **already red there**. They are inherited from `main`, and the milestone gate's obligation is to attribute them rather than to fix them. Recorded as one row because they share one cause — a red baseline nobody owns — which is the condition that let F-13 hide. | non-blocker | medium | defer to backlog — the standing red baseline needs an owner and a ledger, or the next new red will hide the same way | repo / TECH_DEBT → `aof-architect` | open |
| F-19 | **An imported milestone's record doc is invisible to its own brief, and this stream contains one.** `compileBriefForItem` reads `SPEC.md` alone (`src/phase-brief-read.mjs:81`), while `recordDoc()` resolves milestones **AOF.md-first** (`src/work.mjs:326`) — so for an imported milestone the brief addresses a document that is *not* the item's record. Measured, not inferred: `wiki/work/42_structural-overhaul` carries **both** `AOF.md` (7,296 chars, no `## Objective` heading) and `SPEC.md` (9,269 chars, with one), and its `refine` brief carries 3,727 chars addressed from `SPEC.md`. It is benign here only because that milestone happens to retain a SPEC; an imported milestone with `AOF.md` alone gets **no objective section at all**, and the reader has no way to say so. This corrects the story's own STATE note, which recorded *"no such milestone is in this stream today"* — there is one. Outside 70/05's scope: the reader's document set is 70/00's, and the brief's AOF.md-blindness predates this story. | non-blocker | medium | defer to backlog — address the milestone objective through `recordDoc()` so the brief reads whichever document is the record, rather than hard-coding `SPEC.md` | milestone 70 backlog → `aof-architect` | open |
| F-20 | **The story-level architecture section is condensed hardest exactly where a story is being refined.** Measured at this gate over the same 219 stories, using each bounded condenser's own `kept`/`total` count: the architecture/fitness section's median retention is **0.86** at `verify`, **0.60** at `continue` and **0.38** at `refine`, with **34** stories receiving under a quarter of their register at `refine` against 8 at `verify`. Nothing is dropped or husked — every one of the 194 briefs carries the section and states its own count — so no contract is breached and ADR-010 §1's honesty property holds throughout. The gap is one of quality rather than correctness: the phase that most needs the structural constraints receives the least of them, because `refine` is the only phase that also carries `objective` and `dependencies` and the register is the largest condensable section competing for what is left. | non-blocker | low | defer to backlog — a phase-aware share for the register at `refine`, or an accepted statement that a refine brief carries constraints by reference | milestone 70 backlog → `aof-architect` | open |
| F-21 | **70/06'S DIRECTIVE TRANSPORT TURNS 38 DELIVERED SCENARIOS RED ACROSS FIVE MILESTONES — 38, 53, 54, 69 AND 70.** The working tree runs **6,755 ok / 83 not-ok**; **45 of the 83 are inherited** (red in a detached worktree at pristine `89c15f1` too) and **38 are new**. Every one of the 38 is attributable to 70/06's uncommitted `src/agent-session-driver.mjs`, and to **two** changes inside it, separated by probe rather than by reading: **(a) the bracketed-paste framing** (`ESC[200~` … `ESC[201~`) accounts for **37**, and **(b) the separated Enter** accounts for the remaining **1**. The probe chain, each step run over exactly the 38 names: all 38 are **green** at pristine `89c15f1`; **36 of 38 go red** in that worktree with ONLY `src/agent-session-driver.mjs` swapped in from the working tree (`src/claude-trust.mjs` left at HEAD, so it is exonerated); **37 of 38 return green** with just the two paste markers removed and every other 70/06 change — env scrub, separated Enter, marker strip, settle guard — left in place; and **38 of 38 return green** once the Enter is also folded back into the body write. **(a) is test-double drift.** Every suite that models the spawn reads the written chunk as the directive — `test/warm-fix-loop.test.mjs`'s fake does `chunk.replace(/[\r\n]+$/u,"").split("\n\n")[0]` — so the framing makes that expression yield `\x1b[200~/aof:continue 03/01`, the fake stops recognising its own directive, stops writing the build delta, and the loop halts (`'halted' !== 'done'`). Production is unaffected, and that is **measured, not argued**: the live run's transcript records the directive as ONE user message of 1,249 chars over 37 lines with **no ESC byte in the content** — the TUI consumed the framing as protocol, which is the premise of the change. **(b) is different in kind and is the sharper half.** `task01/38-05 — the directive's command string is typed into the PTY stdin as a whole line` is milestone 38's **delivered acceptance criterion**, and "a whole line" is exactly what 70/06 stopped writing: the body and its Enter are now two writes. That is not a double that drifted, it is a contract that changed. A delivered `.feature` is immutable, so 38-05 may not be edited to match; the new rule belongs in the accepting item's own contract. | blocker | high | **Refused the accept, then fixed inline at the same gate.** For **(a)**: the double was taught the framing in the ONE shared `createScriptedPty` home — `pty.writes`/`rawChunk` are the wire, `chunk` is the input — so every consumer was fixed by one edit. For **(b)**: `task01/38-05`’s `.feature` was left exactly as delivered and the superseding spelling was written into this milestone’s `ARCHITECTURE.md` as an ADR-004 Amendment, per *new rules go in the accepting item’s contract*. **No `@bug` scenario is owed** — the 38 failing scenarios ARE the regression guard, and they already failed; a thirty-ninth would test the fix rather than the invariant. Same call F-13 was closed on. | **DONE at this gate** — both halves landed here rather than being routed onward; see the status cell | **closed 2026-08-24 — fixed at this gate, in the one shared home.** **(a)** `test/support/mesh-worker-terminal-fixture.mjs`'s `createScriptedPty` now models a paste-aware terminal: `pty.writes` and a new `rawChunk` carry THE WIRE (framing included), while `chunk` carries THE INPUT the session received (frame stripped, exactly as the TUI strips it). Every consumer that read the raw write as the directive is fixed by that one change, and a future transport change now breaks doubles in one place instead of twenty. The strip is deliberately conditional on a COMPLETE frame — a partial paste is handed through unrepaired, because a double that quietly fixed a malformed paste would hide the very defect the marker-strip exists to prevent. **(b)** The two milestone-38 tests that assert on the wire were updated to the superseding transport, and `task01/38-05`'s `.feature` was **not touched** — the supersession is recorded where new rules belong, as an **ADR-004 Amendment** in this milestone's own `ARCHITECTURE.md`, preserving ADR-013 invariant 2 verbatim (*one atomic input, never argv*) and changing only the bytes that achieve it. **(c)** One of the 38 turned out not to be a double at all: `autonomous-shell-out/black-box` drives a REAL provider process over a REAL PTY, and it was receiving literal `ESC[200~` bytes because its shim never enabled paste mode. The shim now strips the frame as a paste-aware receiver does — and the fact that it did not is what surfaced **F-28**. **Re-measured, not assumed: all 38 named scenarios are green on the working tree**, and the whole unit lane is re-run below |
| F-22 | **The recorded before-and-after does not answer whether this milestone paid for itself, and the human deciding said so.** Brokered as 70/06 task 01's `@uat` scenario (see § User sign-off). The delta is real, honestly recorded and states its own confounders — but the two sides come from different repositories, the before is hours-long production milestones against ~9 minutes on a one-function fixture, and read÷create rises with agent lifetime. The ratio regression (23.936 → 10.383) is the half the snapshot already concedes it cannot settle; the ingest drop (−89.5%) is the half that *looks* settled and is not, because the same workload mismatch explains most of it. The one figure that stands on its own is the per-phase **12.921**, which has no before to be a delta against. Recorded per the scenario's own second `Then` rather than accepted as an answer. **Not a failure of 70/06:** its contract was a measured before-and-after carrying its sample size and confounders, and that is exactly what it delivered, including the regression it would have been easier to omit. | non-blocker | medium | **PO ruling 2026-08-24: non-blocker, milestone accepted on it.** The discharge condition is a matched-workload per-agent measurement — the before and after taken on comparable work in one repository — which means driving a production milestone through the loop, explicitly outside 70/06's settled scope. | milestone 71 | open |
| F-23 | **`aof work observe` no longer attributes any pre-70 session, and it is not transcript retention.** Task 01 admits two baselines: a committed snapshot, or the same reader re-run over pre-70 sessions. The second was attempted for all six baseline milestones and returns `agentCount = 0`, `sessions = []`, `unattributedAgentRuns = 284`. Milestone 45's own session (`ad539a61-…`) is still on disk and 136 transcripts survive back to 2026-07-26 — the reader simply attributes none of them to a milestone any more. The consequence is narrow but real: the committed snapshots are the only admitted baseline available today, so the milestone's claim that the per-agent table "exists for both eras" is true of the *files* and not of the *reader*, and the second admitted baseline route is dead without anything saying so. | non-blocker | medium | defer to backlog — either restore milestone attribution over historical sessions, or have the reader report *why* 284 runs went unattributed rather than reporting an empty agent list | milestone 70 backlog → `aof-architect` | open |
| F-24 | **The first verdict the new instrument ever states is a miss, and the rule that forces it is a delivered acceptance criterion.** Task 02 refuses a target at or below the worst measured phase, because a number already beaten cannot go missed. With exactly one measured phase (12.921) that rule forces `ceil(12.921) = 13`, so `work.observability.cacheRatioTarget: 13` ships already-missed. The scenario is satisfied as written (*each measured phase carries a met-or-missed verdict instead of a dash*) and the delivered `.feature` is immutable, so this is a ruling rather than a defect: **the target stands as delivered.** It is recorded because it has chore 64's shape — a signal that is red by construction is a signal nobody will read as news — and because the honest remedy is a second measured phase, not a softer rule. | non-blocker | low | defer — re-derive the target once a second phase is measured (naturally discharged alongside F-22's matched-workload run); until then the `missed` verdict is expected and must not be read as a regression | milestone 71 | open |
| F-25 | **70/06 authored production code after its own contract stated it would not.** `STORY.md` says plainly: *"this story authors no production module. Its deliverables are evidence… plus one config value."* Two production modules changed — `src/agent-session-driver.mjs` (114 lines) and `src/claude-trust.mjs` (32 lines). The deviation is **forced rather than chosen**: the measurement task 00 requires could not be taken at all until the local drive path could start a turn on Windows, and the three defects repaired (the trust key claude actually reads, the nested-session env scrub that suppressed transcript writing entirely, and the paste transport) each independently prevented it. It is recorded because a contract that says "no production code" and a delivery that ships 146 lines of it is exactly the drift a later reader cannot reconstruct. **Ruled at this gate: no new ADR is owed for the repair itself**, but see F-21(b) — the transport change supersedes a delivered milestone-38 criterion, and *that* supersession is an architectural decision the accepting story owes in its own contract. The change is a defect repair against the *delivered* 38/53 driver contract (F27/F27b — the directive is typed into stdin as one input), whose invariant is unchanged and whose guard FF-7004 was extended rather than replaced. The one genuinely new structural rule it introduces — *the submit settle derives from the readiness delay, never a second knob* — has no guard of its own, and that is the part worth carrying forward. | non-blocker | medium | defer to backlog — give the derived-settle rule an assertion, or record it as an ADR amendment on the 38/53 driver contract (F-21(b) carries the supersession itself) | milestone 70 backlog → `aof-architect` | open |
| F-26 | **The measured envelope's `effort` reads `"unknown"`, so ADR-005's effort routing is not evidenced by the one measurement this milestone has.** Task 00 requires the envelope to carry all four token buckets, the model, **the effort** and a cost source. All six keys are present and the key is honest about its own absence — but the fixture repo configures no `work.agents.session`, so no per-phase effort was resolved to pass and none was recorded. The stable-prefix flag and the 1-hour window *were* carried (both unconditional in the argv/env builder), and the model *was* (`claude-opus-5`), so 70/01's delivery is partly evidenced and its effort half is not. | non-blocker | medium | defer — a second measurement with `work.agents.session` configured in the fixture repo closes it; naturally discharged alongside F-22's matched-workload run | milestone 71 | open |
| F-27 | **A delivered `.feature` row now predicts behaviour the code no longer has, because the finding it was written against was fixed first.** 70/06 task 02's Examples row predicts that a string or negative `cacheRatioTarget` renders **byte-identically to an absent one** — the behaviour F-09 recorded at 70/02's gate. Verified live at this gate against all four configuration cases: it no longer does. 70/02 ships `cacheTargetStatus` of `absent`/`valid`/`invalid`, and an invalid value gets its own message (*"configured but invalid… no met/missed verdict is stated — the ratio is still reported"*). The row's **intent** — the value did not take, no verdict is stated, the ratio is still reported — holds exactly, which is why the scenario passes and no contract is breached. Recorded so the divergence is never read later as a regression, and because a delivered acceptance criterion is immutable: the row stays as written and this finding is the correction. | non-blocker | low | no code change — F-09's own backlog entry (reword the unhonourable case) should cite this row so the two are closed together | milestone 70 backlog / docs | open |
| F-28 | **The bracketed-paste framing is UNCONDITIONAL across providers, and only `claude` was measured to enable paste mode.** 70/06 wraps every interactive directive in `ESC[200~`…`ESC[201~` at the single launch seam, regardless of which provider `terminal-providers.mjs` resolved — and this repo's `runtimes` config declares three (`claude`, `codex`, `opencode`). Bracketed paste is **opt-in by the receiving application**: `claude` enables it itself at startup (`ESC[?2004h`, measured ~1.9s after spawn, inside the readiness delay), so the markers are consumed as protocol and never enter the content — verified in the live transcript, which holds the directive with no ESC byte in it. A provider that never enables the mode would receive `ESC[200~` as literal bytes at the head of its input. **This was not reasoned into existence — it was surfaced by a test**: `autonomous-shell-out/black-box` drives a real Node provider over a real PTY, and it failed at this gate with `'\x1B[200~/aof:verify 03'` where it expected `'/aof:verify 03'`. That shim now models a paste-aware receiver, which is correct for a stand-in for `claude` — and it means the one signal that would have caught a non-paste-aware provider no longer exists. No non-`claude` provider has been driven end-to-end on this tree, so a conditional would be a guess at behaviour nobody has observed; the honest artefact is a named assumption. Recorded in ADR-004's Amendment as consequence (3). | non-blocker | medium | defer to backlog — before any non-`claude` provider is driven for real, either gate the framing on an observed `ESC[?2004h` from the provider, or measure that provider's paste handling and record the result. Until then the framing is `claude`-shaped by assumption, stated rather than implied | milestone 71 / `aof-architect` | open |

## Accept decision

**70/00 `phase-brief` — ACCEPTED 2026-08-22.**

The story's scoped lane is **33/33 green** (its three `@executable` task features' twenty scenarios,
plus its three declared controls), `aof work validate 70/00` is **PASS**, and `aof work doctor 70/00`
reports no `control-unresolved` at either severity. All three of the story's controls — FF-7001,
FF-7002, FF-7003 — are `green` in the register above with a **recorded red probe**, each planted
against the live bytes, observed failing with the message quoted, then reverted; `git status` on
`src/` and `test/` is clean afterwards. No `@manual` and no `@uat` scenario exists on this story, so
no human sign-off was brokered; the milestone has no UI surface, so no design-conformance review
applies.

**Accepted with F-02 open, deliberately and on the record.** `arch/53 FF-5301` is red on the
integration branch (`59 !== 58`). It is milestone 53's declared control, not one of 70/00's three,
and it was proven **green against 70/00's own commit `5a768a9`** in a detached worktree — the red is
a merge interaction with `1863102` (68/01's F-09 fix), which added `src/run-session-capture.mjs` to
the assignment sink's reach. `aof:verify` § *Scope the suite to the item* states plainly that a
cross-milestone poisoner is caught at the **milestone** gate and that a story may need rework after
being marked done — *"that is the intended trade, not an oversight"* — so the trade is taken here
rather than silently widened. F-02 carries the routing: the architect ratifies the reach amendment
before milestone 70 is accepted. **Milestone 70 must not be accepted while F-02 is open.**

The remaining findings (F-01, F-03, F-04, F-05) are non-blockers deferred to their owners; none
touches this story's delivered surface, and F-01/F-03 are re-records of findings already open from
the previous milestone gate.

`OUTCOME.md` is authored in the story's own folder.

**70/01 `cache-stable-launch` — ACCEPTED 2026-08-22.**

The story's scoped lane is **34/34 green** — its three `@executable` task features' nineteen
scenarios, plus its three declared controls — `aof work validate 70/01` is **PASS**, and
`aof work doctor 70/01` reports no `control-unresolved` at either severity. All three of the story's
controls — FF-7004, FF-7005, FF-7006 — are `green` in the register above with a **red probe
re-performed at this gate against the live bytes**, not inherited from the build-time cells: each was
planted, observed failing with the message quoted, then reverted, with `git status` on `src/` clean
afterwards. The three stale `— **pending**` tokens F-04 recorded against this story are cleared in
`ARCHITECTURE.md`, which discharges F-04. No `@manual` and no `@uat` scenario exists on this story, so
no human sign-off was brokered; the milestone has no UI surface, so no design-conformance review
applies.

**Accepted with F-02 and F-06 open, deliberately and on the record.** Two of milestone 53's and 38's
controls are red on the integration branch and neither is this story's. F-02 (`FF-5301`, reach
`59 !== 58`) was re-confirmed red at HEAD at this gate and is unchanged from 70/00's. F-06 is new and
was allocated here: the `aof/mesh/69-05` merge landed **during this verification** — the lane was
78/78 green before it and 76/78 after — and it broke `arch/38` invariant 4 and `arch/53` FF-5302's
sink ratchet. Both were proven **green at `7f482e4`**, the commit immediately before that merge, in a
detached worktree; 70/01 merged at `1189daf` with the sink at 2,364 lines against a 2,377 ceiling and
touches neither the sink nor the status-frame emission. `aof:verify` § *Scope the suite to the item*
states plainly that a cross-milestone poisoner is caught at the **milestone** gate and that a story
may need rework after being marked done — *"that is the intended trade, not an oversight"* — so the
trade is taken here rather than silently widening this story's lane to the whole repo.
**Milestone 70 must not be accepted while F-02 or F-06 is open.**

The remaining findings (F-01, F-03, F-05, F-07, F-08) are non-blockers deferred to their owners. F-07
and F-08 are the only two that touch this story's own surface, and both are record/observability gaps
rather than defects in delivered behaviour: the resolver's absence-is-silence contract is what its
scenarios specify and they pass, but a misconfigured `work.agents.session` is indistinguishable from
an absent one at every surface an operator can see, and ADR-005 never names the path it ratified.

`OUTCOME.md` is authored in the story's own folder.

**70/02 `cache-economics` — ACCEPTED 2026-08-22.**

The story's scoped lane is **15/15 green** — its two `@executable` task features' thirteen scenarios,
plus the two registered-command door pins — and the narrowest lane containing the surface it changed
is a further **60/60 green**. `aof work validate 70/02` is **PASS**, and `aof work doctor 70/02`
reports **no `control-unresolved` at either severity**; its only finding is the repo-wide
`numbering-gap` warn, which is not a control and not this story's.

**No fitness function is owed by this story, and that is a refine decision rather than a gap in this
gate.** `ARCHITECTURE.md` § Story partition assigns all eight of the milestone's declared controls to
70/00, 70/01, 70/03 and 70/04; 70/02's row declares none. The register above is therefore unchanged
by this gate — no row was filled, and no red probe was owed. The accept rule's marker clause has
nothing to catch here: a story that declares no control cannot carry an unresolved one.

**The story's own premise was verified by observation, not by assertion.** Its load-bearing claim is
that absence stays honest — an un-instrumented run must be *unmeasured*, never a 0.0 that would make
it look like a cache failure and corrupt the very before/after the milestone is judged by. That was
read at the real door on a real record (`aof work observe 66/00` → `cache ratio: unmeasured`,
`unmeasured spend: 1`, verdict `—`) and through the real renderer for the two other non-arithmetic
cases: reads-with-no-creations renders `∞ (warm, unbounded)` rather than dividing by zero, and
creations-with-no-reads renders a measured `0.000` that is distinguishable from an unmeasured row.
No `@manual` and no `@uat` scenario exists on this story, so no human sign-off was brokered; the
milestone has no UI surface, so no design-conformance review applies.

**Accepted with F-02 and F-06 open, deliberately and on the record — both re-measured at HEAD at this
gate rather than carried on trust.** `arch/53 FF-5301` is still red (`59 !== 58`, 2/3), and `arch/53
FF-5302`'s sink ratchet is still red (`sink grew to 2391 lines past the 2377 post-move ceiling`, 5/6)
— while 70/00's FF-7002 and 70/01's FF-7005, which live in the same file, are green at HEAD. Neither
red is 70/02's: this story touches `src/work-observe.mjs` and `src/commands/observe.mjs` only, neither
of which is the assignment sink or the driver, and it adds no import to either. Both remain routed to
the architect at the milestone gate. **Milestone 70 must not be accepted while F-02 or F-06 is open.**

**Two new findings were allocated here, both non-blockers on this story's own surface, and both
record/observability gaps rather than defects in delivered behaviour.** F-09: a
`work.observability.cacheRatioTarget` that cannot be honoured renders byte-identically to an absent
one, so the report asserts "No cache-ratio target is configured" when one *is* configured but
unusable — the contract's stated outcome holds in every measured row (no verdict, ratio still
reported), but the sentence an operator reads is false, in the milestone whose thesis is that absence
must stay honest. F-10: `cacheRatio: Infinity` serialises to `null` across the `--json` door, the same
value an unmeasured phase carries, leaving `cacheState` as the only field that separates a fully warm
phase from an unmeasured one. The markdown door is correct in both cases and no scenario is breached.

F-07's cell was **corrected in place** at this gate: it recorded that
`schemas/aof.schema.json` declares no `work.*` properties at all, which is false — the schema declares
eight, and `work.agents` is a **closed** object, which makes that hole narrower and sharper than
recorded rather than absent. The register is the product owner's to keep accurate as its single
writer, and leaving a measured-false premise in it would mislead whoever picks the finding up.

The remaining findings (F-01, F-03, F-05, F-08) are non-blockers deferred to their owners; none
touches this story's delivered surface. F-05's `work-observe-attribution.test.mjs` — one of the two
flaky-race scenarios — was green in isolation at this gate, as it was at 70/01's.

`OUTCOME.md` is authored in the story's own folder.

**MILESTONE 70 — NOT ACCEPTED 2026-08-22. Two stories added instead.**

`aof work validate 70` is **PASS**, `aof work doctor 70` reports **no `control-unresolved` at either
severity**, all eight declared controls are `green` with recorded red probes, and every one of the
five stories' scoped lanes is green. The milestone is refused anyway, and the reason is not a failing
test.

**The milestone's objective is not met, and the gate is the first place anyone checked.** Its stated
answer to a 927,588-token spawn is a ~2,000-token brief. Compiled through the real reader against its
own five stories, that brief carries the story description and nothing else on a `continue`, and
**244 characters** on a `verify` — an item ref plus a notice saying everything was dropped. The
acceptance criteria never fit; the declared ADR slice that 70/03 exists to deliver is evicted with
~4,400 characters of budget unused. That is F-11, and it makes 70/03's capability inert on every real
item in this repo.

**And nothing the milestone claims has been measured.** Every run record in the stream reports
`unmeasured`. The SPEC's own Dependencies note says what that means — *"without 68 this milestone
ships on faith"* — and it is still true after five stories. That is F-12.

**Neither was findable from the story lanes, and that is the finding behind the findings.** Every
`@executable` scenario passes, on fixtures sized to fit the ceiling. No scenario in 70/00 or 70/03
ever compiled a brief for a real item under `wiki/work/`. Three story gates and a structural review
passed over it. Checking took four minutes at this gate.


**70/05 `brief-carries-the-contract`** and **70/06 `saving-is-measured`** are scaffolded into this
milestone against F-11 and F-12. Their task contracts are `aof:refine`'s to author; the measurements
above are what they must be written against.

**Stories 70/03 and 70/04 are NOT accepted at this gate either**, and only one of them for a reason
of its own. Both delivered their contracts and both lanes are green — 70/03 at 32/32, 70/04 at 21/21
— but **F-13 is 70/04's**: its own control file adds a second violation to milestone 47's
positional-slice guard, which milestone 69 had already turned red, so the new offender was invisible
inside an expected failure. It is a two-line fix and it is 70/04's to make, not this gate's. 70/03 is
held only because F-11 leaves its delivered capability unreachable; its `OUTCOME.md` records that as
its first Gap, with the discharge condition naming 70/05.

**Findings routed outward rather than fixed here.** F-14 (`FF-5301` at `60 !== 59`) is milestone
69/05's — proven at the source by diffing the sink's reach set and naming `mesh-park-resume.mjs`,
added by `ec88023` after all of 70's stories merged. F-15 (`FF-5308`'s `work.mjs` digest) pre-dates
this branch, and milestone 70 leaves that file byte-identical to how it found it. F-18 covers the ~35
suite failures already red at the merge-base `8167486`. F-16 records that the full suite cannot be
run unattended on a machine hosting the control daemon, and F-17 two further load-flaky scenarios.

**F-02 and F-06 are closed** — both recorded remedies landed and were re-measured at HEAD at this
gate, rather than being carried forward on trust. The three story gates that wrote *"milestone 70
must not be accepted while F-02 or F-06 is open"* are satisfied on their own terms; the milestone is
refused on F-11 and F-12, which are new and are its own.

**No `OUTCOME.md` is authored for the milestone.** It is written at accept, and there is no accepted
delivery to state. The five story outcomes stand; `m70/03`'s and `m70/04`'s are authored and each
records what its story does and does not yet reach.

**70/05 `brief-carries-the-contract` — ACCEPTED 2026-08-23.**

The story's scoped lane is **46/46 green** — its three `@executable` task features (22 + 12 tests
across the two behavioural suites) plus its two declared controls — and the narrowest lane containing
its blast radius, 70/00's and 70/03's suites, is a further **48/48**. `aof work validate 70/05` is
**PASS** and `aof work doctor 70/05` reports no `control-unresolved` at either severity. Both
FF-7009 and FF-7010 are `green` above with a **recorded red probe** performed against the live bytes,
each observed failing with the message quoted and then restored by `cp` from an explicit backup —
never `git checkout --`, the operation that destroyed `ARCHITECTURE.md` once during this story's own
review. Both files were confirmed byte-identical to their pre-probe state. No `@manual` and no `@uat`
scenario exists on this story, so no human sign-off was brokered; the milestone has no UI surface, so
no design-conformance review applies.

**F-11 is closed, on a re-measurement rather than on the build's report.** The milestone's own
recorded lesson is that verification kept reaching for a verdict before the measurement, so every
figure was re-derived here through the production reader over all 219 stories in `wiki/work/`:
211 of 211 contracts carried, 194 registers, and across 657 compilations the only disposition the
compiler emits is `condensed` — zero sacrificed, zero unshippable, zero husks, zero over the
unchanged ceiling. 70/00's `verify` brief is 7,298 chars where F-11 measured 244.

**Two gaps in 70/03's `OUTCOME.md` are discharged by this acceptance**, and are marked so in that
file: the declared slice now survives the ceiling on this repo's own data, and the stream now
contains a story that declares `adrs:` — `70/05` itself, the only one of the 219.

**Accepted with F-19 and F-20 open, both new at this gate and both non-blockers.** F-19 is the
brief's blindness to an imported milestone's `AOF.md`, which is 70/00's document set rather than this
story's, and which this gate corrects a STATE note about — the stream does contain such a milestone.
F-20 is a quality gap in the same delivery: the architecture register is condensed hardest at
`refine`, the phase that most needs it. Neither breaches a contract; both are recorded as gaps in
this story's `OUTCOME.md` and routed to the milestone backlog.

**The milestone stays open.** `70/06 saving-is-measured` is not done and F-12 stands: nothing this
milestone claims has yet been measured. The `RETROSPECTIVE.md` and the `STATE.md` compaction are the
milestone gate's, not this story's — the `## Feedback (for retro)` notes from 70/05's build, review
and close are left intact for it, and they are substantial.

**70/03 `architecture-slice` — ACCEPTED 2026-08-24.**

Held at the 2026-08-22 gate for one reason only — *"F-11 leaves its delivered capability
unreachable"* — and that reason is gone. F-11 was closed at 70/05's gate on a re-measurement over
all 219 stories in this stream, and 70/03's own `OUTCOME.md` records both of its declared gaps as
**discharged**: the declared slice now survives the ceiling (its own `continue` brief carries the
register at 6,742 of 8,000 chars), and the stream now contains a story that declares `adrs:`.

Re-verified on the working tree at this gate rather than carried on the earlier report: the story's
scoped lane is green inside the 113/113 run of milestone 70's five other story lanes, its declared
control FF-7008 is green with its recorded red probe, `aof work validate 70/03` is **PASS**, and
`aof work doctor 70/03` reports **no `control-unresolved` at either severity** (its findings are the
repo-wide `numbering-gap` warn, the `rubric-join-unchecked` warn that F-03 explains, and an
`mtime-ahead-of-updated` warn — none of them a control, none of them this story's). No `@manual` and
no `@uat` scenario exists on this story, so no human sign-off was brokered; the milestone has no UI
surface, so no design-conformance review applies.

Its two remaining `OUTCOME.md` gaps stay **open** and are correct as written: an `adrs:` declaration
is not surfaced by `aof work doctor`, and the key is undeclared in the schema and undocumented. Both
are recorded gaps in a delivered capability, not unfinished work.

**70/04 `warm-fix-loop` — ACCEPTED 2026-08-24, with F-21 open at the time and closed since.**

F-13 — the reason this story was held at the last gate — is **closed**. Its control file no longer
adds a violation to milestone 47's positional-slice guard: `test/arch/acd-review-never-resumed.test.mjs`
now resolves the index once and asserts on the elements, and it was fixed rather than ledgered —
the file appears nowhere in `POSITIONAL_SLICE_LEDGER`. `arch/47 F-47-04-ARCH-2` is **2/2 green** at
this gate, including its own non-vacuity self-check.

`aof work validate 70/04` is **PASS**, `aof work doctor 70/04` reports **no `control-unresolved` at
either severity**, and FF-7007 is `green` above with its recorded two-leg red probe, re-run 2/2 green
here. No `@manual` and no `@uat` scenario exists on this story; no design-conformance review applies.

**Accepted with its own lane red on the working tree — deliberately, and on evidence.** Seven of this
story's scenarios are failing at this gate, among 38 new reds that span five milestones. The story's delivery is
not what broke them: the lane is **20/20 green in a detached worktree at pristine `89c15f1`**, and
**20/20 again** with 70/06's uncommitted change applied minus its two paste markers. The cause is `70/06`'s directive transport meeting fake PTYs that parse the raw
chunk, recorded in full as F-21 — where the same probe returns **all 38** of the new reds to green. This is the same trade `70/00` was accepted on at the 2026-08-22 gate, and `aof:verify`
§ *Scope the suite to the item* states it plainly — a cross-story poisoner is caught at the milestone
gate, and a story may need rework after being marked done: *"that is the intended trade, not an
oversight."* The difference here is in the story's favour: F-02's poisoner was a merge of two
**committed** lanes, whereas F-21's is **uncommitted and unaccepted**, so 70/04's lane returns to
green the moment 70/06's fake is taught the framing — with nothing in 70/04 changing.

**Milestone 70 must not be accepted while F-21 is open** — the condition this accept was written under, met by closing F-21 rather than by waiving it.

**70/06 `saving-is-measured` — REFUSED, FIXED, then ACCEPTED 2026-08-24.**

Recorded as one decision with its history, because the refusal and the acceptance happened at the
same gate and the second is only meaningful with the first.

**Refused first, on F-21.** The story's own delivery was never in question — every one of its three
tasks is evidenced above at the source rather than from its own snapshot: the run record's `spend`
envelope was opened and read; the directive was read out of the live transcript as one
1,249-character message with no ESC byte in its content; the 143-row baseline was re-counted here and
its date range reproduced exactly; the report was driven at the real door and states **12.921 /
missed** against the target `13`; and the target was proved to actuate nothing by reading every
consumer of the key in `src/`. What refused it was collateral: its production change altered the bytes
every directive crosses on, and **38 delivered scenarios across five milestones — 38, 53, 54, 69 and
70, four of them already accepted — went red**, while production was provably correct.

**Fixed inline at the same gate, in the one shared home.** The full remedy is recorded in F-21's
status. The shape of it matters more than the diff: the 37 doubles were fixed by ONE change to
`createScriptedPty`, separating the wire (`pty.writes`, `rawChunk`) from the input (`chunk`) — because
the double was already single-homed, so twenty suites' worth of drift cost one edit. The
thirty-eighth was not a double at all but milestone 38's delivered criterion, and it was resolved the
only way a delivered criterion may be: **its `.feature` was left untouched** and the superseding
spelling was written into this milestone's own `ARCHITECTURE.md` as an **ADR-004 Amendment**,
preserving ADR-013 invariant 2 verbatim (*one atomic input, never argv*) and changing only the bytes
that achieve it.

**Then accepted.** All **38** named scenarios are green, re-measured rather than assumed, and the
whole unit lane was re-run afterwards (below). `aof work validate 70/06` is **PASS** and
`aof work doctor 70/06` reports **no `control-unresolved` at either severity**. The story declares no
fitness function, and that is a refine decision rather than a gap: its deliverables are evidence and
one config value, and the production code it was forced to author (F-25) is guarded by the eleven
tests of `test/warm-start-local-drive.test.mjs` plus the extended FF-7004.

**The `@uat` scenario is SATISFIED, and its answer is a finding.** Brokered with the user — see
§ User sign-off. It asks a human to read the delta and state whether it answers *did this milestone
pay for itself*; the human read it and said **no**, and the scenario's own second `Then` requires
exactly that to be recorded as a finding rather than accepted. It is **F-22**, and the user ruled it a
non-blocker with the matched-workload measurement routed to milestone 71.

**One new finding was surfaced by the fix itself and is recorded rather than absorbed.** F-28: the
paste framing is applied unconditionally to every provider, and only `claude` has been measured to
enable paste mode. The test that would have caught a non-paste-aware provider was the real-provider
shim, which is now paste-aware — correctly, since it stands in for `claude` — so that signal no longer
exists and the assumption is carried explicitly instead.

`OUTCOME.md` is authored in the story's own folder.

**MILESTONE 70 — ACCEPTED 2026-08-24, having been refused twice on the way.**

Both refusals are left in this document above rather than tidied away, because the reason this
milestone is acceptable is that each refusal was discharged by a measurement rather than by a
decision to stop worrying.

**The gates.** `aof work validate 70` is **PASS**. `aof work doctor 70` reports **no
`control-unresolved` at either severity**, **no error**, and **no `doc-over-budget`** — the last of
those measured rather than assumed, and it bound: recording F-21's ADR-004 amendment pushed
`ARCHITECTURE.md` to 740 lines against the 700-line budget **this milestone itself introduced**, and
the accept could not proceed until the document was compacted back to exactly 700. All **seven**
stories are `done`. All **ten** declared controls are `green` with a **recorded red probe**, each
planted against the live bytes, observed failing with the message quoted, then restored
byte-identically; seven of the ten extend a guard already in service, where the probe is the only
evidence the extension is armed at all.

**What each refusal cost and bought.**

- **2026-08-22, on F-11 and F-12.** The brief was 244 characters on a real item and nothing had been
  measured. Two stories were scaffolded rather than the milestone waved through. **Both are now
  closed on re-measurement**: 70/05's brief carries the contract for 211 of 211 stories with
  contracts, with zero sacrificed across 657 compilations; and 70/06 drove a phase through the loop
  door to `done`, stamping the first `spend` envelope this stream has ever held.
- **2026-08-24, on F-21.** 70/06's transport change turned 38 delivered scenarios red across five
  milestones, four already accepted. Fixed at this gate — one edit to the shared PTY double for 37 of
  them, and for the thirty-eighth an ADR-004 Amendment that supersedes milestone 38's spelling while
  leaving its delivered `.feature` untouched.

**The claim this milestone can now make, and the one it cannot.** It can say that a phase spawn is
handed its context by value, that the launch prefix is deliberately shareable, that the fix loop
resumes rather than re-ingests, and that all of it is now **observable** — a per-phase cache ratio
with a target derived from a measurement instead of guessed. It cannot say that any of that paid for
itself. The one measurement taken is confounded by workload and by repository, and the human asked to
judge it said so plainly. That is **F-22**, ruled a non-blocker with the matched-workload measurement
routed to milestone 71 — and it is recorded as the milestone's first `OUTCOME.md` gap rather than
buried, because a milestone whose objective is a number and whose evidence cannot yet produce that
number should say so in the artifact people read.

**Findings at the close.** Two closed at this gate (**F-21** fixed here, **F-13** fixed in 70/04's
lane and confirmed fixed rather than ledgered); four closed earlier (F-02, F-04, F-06, F-11) and
**F-12** closed here on the measurement it demanded. Fourteen stay open and every one is routed:
F-22, F-24, F-26 and F-28 to milestone 71; F-07, F-09, F-10, F-19, F-20, F-23, F-25 and F-27 to the
milestone 70 backlog and docs; F-01 to milestone 78; F-14 to milestone 69; F-03, F-15, F-16, F-17 and
F-18 to the repo/TECH_DEBT ledger, where **F-18 is the one that matters most** — 45 of this gate's 46
failures are inherited from a red baseline nobody owns, and attributing them by hand at every gate is
what let F-13 hide in the first place.

`OUTCOME.md` is authored for the milestone and for `70/06`; `RETROSPECTIVE.md` carries `R1`–`R10`;
`STATE.md` is compacted with its 60 feedback entries archived into those lessons; and
`aof work memory ingest` has folded both into the recall surface for milestone 71.
