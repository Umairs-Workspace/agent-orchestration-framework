---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 52 · Loop registry & the loop graph — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

| Story | Status | Owns |
|---|---|---|
| `00_story_loop-model-and-loader` | done | `src/work-loops.mjs` — schema, vocabulary, loader |
| `01_story_structural-checks` | done | `src/work-loops-checks.mjs` — the five pure checks |
| `02_story_work-loops-command-family` | done | `src/commands/loops-{show,graph,validate}.mjs` + registration |
| `03_story_the-day-one-registry` | done | `wiki/work/loops/*.md` × 9 — markdown only |
| `04_story_the-fitness-functions` | done | `test/arch/acd-loop-*.test.mjs` × 9 |
| `05_story_behavioural-suites` | done | `test/*.test.mjs` — the 15 `@executable` features of 00–02 |

00, 01 and 03 are startable concurrently (disjoint file sets, disjoint imports). 02 joins when 00+01
land; 04 closes.

Story 00 accepted 2026-08-14: all five executable loader contracts green; architect and QA re-review
both `CONFORMS`; scoped validity gate passed. Review caught and resolved the omitted `prose:` vocabulary
member, malformed reserved-prefix phrase fallback, and intrinsic Set mutation escape before acceptance.

Story 01 accepted 2026-08-14: all six executable structural-check contracts green; architect and QA
both `CONFORMS`; exhaustive cadence, graph-pathology, frozen-input and fresh-process determinism probes
passed. The checks module remains import-free and does not parse loader values.

Story 02 accepted 2026-08-14: the three registered command routes, stable JSON envelopes, deterministic
Mermaid rendering, combined validation summary and general multi-word route-bijection correction are
green; architect and QA both `CONFORMS`. A real nested-cwd probe corrected the authored contract to use
the existing universal explicit `--config` selector: automatic ancestor discovery is not current AOF
behavior and was not introduced locally into this command family.

Story 03 accepted 2026-08-14: nine evidence-cited records load with zero errors; defining-module and
registered-command pointers pass; OQ-1 closes with only the evidenced operator → autonomous-cascade
edge; architect and QA both `CONFORMS`. The day-one result deliberately retains 40 warnings as the
declared gaps and structural absences this milestone exists to expose.

Story 04 accepted 2026-08-14 (resumed run — the first attempt died mid-review leaving an orphaned
`running` run and a RED gate behind a `done`-ticked task list). All nine fitness functions are green
(19 assertions), and so are the two repo-wide gates the story touches. Review found **one blocker and
five majors, all now fixed and each verified by mutation**: the story's own new file tripped the m47
positional-slice ratchet (`acd-test-suite-registration` was RED on this tree, so "all nine land green"
was false at the repo level); a second home for the repo-wide orphan invariant; a five-module
enumeration asserted against its own literal, which left both FF-5201's and FF-5202's scans blind to
any sixth loop module; the frozen cross-lane finding ORDER asserted against the test's own
concatenation rather than the command's (reversing `CHECK_IDS` inside `loops-validate` left all nine
green); and the loader's cadence normalisation — the premise FF-5205's purity argument rests on —
unasserted (`UNIT_MS.s = 1`, or dropping `ms` entirely, left all nine green). Fifteen minor unasserted
`And` clauses were closed in the same pass. 43 of 49 planted mutations were caught before the fixes;
every one named above is caught now.

**Story 04 did not hold the milestone; the missing behavioural evidence did** — `TECH_DEBT.md` item 48,
`VERIFICATION.md` F-52-04-H. Closed by story 05.

**Story 05 added 2026-08-15** (operator decision, option (a) of the F-52-04-H hand-back): rather than
accept 52 on restated "structurally gated, behaviourally unproven" evidence and carry the gap as
scheduled debt, the milestone landed the missing suites. 05 covers the 15 `@executable` features of
00, 01 and 02 — 323 scenarios — as registered, re-runnable suites. It is not a sixth deliverable: it is
the missing evidence for three already-accepted ones, and those three were not re-opened.

Story 05 accepted 2026-08-15, and with it the milestone. Six suites over a shared fixture helper, all
registered by import **and** spread: **139 behavioural cases green**, alongside **26 gate assertions**
(the nine loop fitness functions' 18 legs plus the two shared repo gates the milestone touches, run
against this tree rather than assumed). Coverage is traced rather than asserted — 323 scenarios and 461
rows across 28 tables, each with a deciding assertion or an exclusion whose pointer is looked up. The
suites found **six contract defects, one instrument defect, and no source defect**: the loader, the five
checks and the three verbs behaved as ADR-specified throughout. Two of the six were against story 05's
own features and were corrected at accept (F-52-05-C, F-52-05-D); the four against the closed contracts
of 52/00 and 52/02 (F-52-05-A, B, F, G) were **ruled and routed** to `TECH_DEBT.md` item 53 rather than
rewritten at a successor's accept gate — none of them a source defect, and every disagreement already
driven both ways on disk. QA's
mutation pass found the sharpest one (F-52-05-E): an exclusion whose pointer resolved by name while the
claim it deferred was computed by nothing — F-52-04-H's own species inside the instrument built to close
it.

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken
  together as one arc.
- **Refined 2026-08-14** (`aof:refine 52 --autonomous`) — RESEARCH → ARCHITECTURE (10 ADRs +
  9 fitness functions) → 5 stories → 25 task contracts. Codebase graph rebuilt at the break-down
  (10290 nodes / 24983 edges, egress none) and `graph impact` drove the partition; the rationale is in
  `ARCHITECTURE.md §Story partition`.
- **ADR-011 (contract closure), same day.** Authoring the 25 contracts surfaced 28 gaps in the frozen
  ADR-001…010 contracts — the kind that are otherwise closed by developer guess mid-build, differently
  in each of three parallel stories. All 28 were ruled: most confirmed, **five QA readings overruled**,
  and **two stated invariants corrected**. The two corrections that changed the plan:
  - **The bijection arch-test is NOT free.** `test/arch/acd-work-command-cli-bijection.test.mjs:249`
    is `default: throw` over a **registry-derived** subcommand list, so registering the three
    `work:loops-*` commands throws on three unmapped subs. ADR-008 and FF-5207 both claimed "covered
    with no test edit" — true for the adapter and route-reachability legs, **false for
    spawn-and-parse**. 52/02 now owns three `argsFor` cases; 52/04's "touch no pre-existing test"
    carries that carve-out. The partition's headline property is **withdrawn and restated**: one story
    edits pre-existing files, and two of them.
  - **The finding-code set has two emitters.** 10 of 18 codes are the loader's, not the checks' —
    resolved by **lane-scoping** (each module exports its own set; the sets are disjoint; FF-5209
    imports both and asserts union *and* disjointness) rather than a shared module, which preserves
    the checks' purity as real rather than nominal.
  - Also closed: `Field.kind` had no member for typed filled values; `fields[key]` was singular over
    list-valued keys; a malformed frontmatter key (the SPEC's own `veto/constraint:`) vanished
    silently; `reference: []` was vacuously valid (an aspirational loop's escape hatch); the timescale
    ratio had no orientation; self-edges satisfied pairing and ownership; `summary.checks` ids were
    unfrozen while 53 is due to key on them; and four of ADR-010's `module:` citations pointed at
    import sites rather than defining modules.

### Default decisions taken at refine (non-critical; recorded rather than escalated)

- **No UI/designer path.** `SPEC §Scope`'s "one readable rendering" was taken as a deterministic text
  artifact, not a face — so no `DESIGN.md`, no mocks elicited, no `ui/` file in the milestone. The
  architect confirmed and recorded it as ADR-009 (Mermaid, chosen against the PRD's own PR-legibility
  test). A later face is additive over the frozen `--json` contract.
- **No `/aof:*` bundle wrapper** for `work:loops` (ADR-008) — a **conscious departure** from the
  standing house rule that a `work:*` command ships with its Claude-command wrapper. Grounds: the
  enforced parity gate is scoped to `work:insert-*` only; the closest kin (`work:validate`,
  `work:doctor`, `work:list`, `work:next`) ship without one; and no ACD phase consults the loop graph
  in 52, so a wrapper would be a door with nothing behind it. The discharge trigger is **named**: the
  milestone that first makes a phase consult the graph (53's Loop-Ready gate, or 55's groundedness
  gate on L3) ships the wrapper with the caller that justifies it. **Flagged for operator review** —
  this is the one place refine went against a recorded rule.
- **Pointer resolution deferred to 55** (ADR-003). 52 validates pointer *syntax* only; resolving a
  `module:`/`command:`/`config:` pointer against live data, and reporting it stale, needs provenance
  stamped at write time — which 52 cannot do, because it ships no writer. Recorded so 55 inherits it
  rather than re-litigating it. Accepted cost, named: a pointer can rot (a renamed symbol) and 52 will
  not notice.
- **`ceiling` added as a seventh loop-record field**, departing from the SPEC's six. RESEARCH showed
  cadence (how often it fires) and ceiling (when it stops) are different axes — the autonomous cascade
  has a bound and no rate; build-to-green has a rate and no bound. Collapsing them would either lose
  the uncapped fact or corrupt the input to the timescale check.
- **The registry declares 7 loops + 2 actors, not the PRD's 7.** `mesh-assignment-reclaim` is added
  (RESEARCH found a real control loop the PRD table missed — dual staleness gate, real actuator, a
  genuine 15s tick, and the only periodic loop on day one). `observe→tune` is **dropped**: its actuator
  does not exist, and RESEARCH's own consistency test ruled out `degrade.mjs`/`work-doctor.mjs` for
  exactly that reason. 62 declares it when `tune` exists.

- **ADR-012 (second closure round), same day.** Applying ADR-011's rulings to the 25 contracts surfaced
  a second wave — and, sharply, **a second instance of the same error**: ADR-011's own correction to the
  bijection gate was itself half-measured. The **route-reachability** leg fails too, because the gate
  asserts `routes.has("work loops-show")` (derived from the command **id**) against a table keyed
  `"work loops show"` (derived from `cli.route`). Only the **adapter** leg is free. The root cause is a
  latent assumption in a *shared* gate — that a `work:` command's id-suffix **is** its route words — and
  `work:loops-*` is the first `work:`-namespaced command to falsify it. 52/02 therefore fixes it
  **generally** (leg (b) derives from `command.cli.route`), so the gate covers multi-word routes for
  every future family rather than being patched for this one.
  - The blocking cross-story seams are closed: `loop-self-referential-edge` is attributed by edge type
    (`monitoring` → `pairing`, `target-setting` → `reference-ownership`), the five check ids are exported
    by the checks module alongside its codes, `ran` is derived by the **command** from `Model.present`,
    and the combined finding order is frozen.
  - The **24-code vocabulary was unchanged across both closure rounds** — after two passes, that is the
    signal it has settled.
  - PO ruling recorded in ADR-012 §6/F4: `optimizing: true` for `build-to-green`,
    `review-fix-rereview` and `autonomous-cascade` (loops that push a metric toward an extremum, and are
    therefore Goodhart-exposed); `false` for the four regulators and capture passes. Day-one consequence:
    **three `loop-unpaired-optimizer` findings**, none of the three carrying a `monitoring` edge — the
    PRD's own thesis ("none has a counter-metric") made computable on the first run.

- **ADR-013 (third and final closure round), same day.** Six items, all one-line closes; the vocabulary
  and the partition were unchanged, which is what "converged" looks like. The two worth remembering:
  - **The frozen finding order had two findings it could not place** — `loop-record-unparseable` (no node,
    so no `id` to sort by) and `loop-malformed-frontmatter-line` (a node, but no key position). Found
    **independently by two stories**, and sharply: the fixture that asserts byte-identity is the one
    fixture guaranteed to contain both. Ruled — unparseable first by `path`; malformed lines before their
    node's key-bearing findings, by line number; within a key, declared-entry order. Generalised from
    52/02's collision-suffix note: **every string comparison in this milestone is code-unit lexicographic,
    never locale collation** — a determinism leg that passes on one machine and fails on another is the
    worst failure available to this gate.
  - **The `module:` definition-form grep was narrowed, not widened.** QA proposed admitting a local
    `export { … }` manifest with no `from`; I objected that `src/command-core.mjs:293` re-exports a symbol
    it imported at `:27`, and verifying it turned up worse — `src/graphify.mjs:43` re-exports four symbols
    imported at `:41`, and was on the proposed admit-list. That widening would have shipped the
    importer-vs-definer defect **through the gate built to prevent it**. The rule is now: a manifest
    export counts only when the file **also declares** the symbol. Principle recorded — **export syntax is
    not evidence of definition, in any of its three forms.**
  - Also closed: an unusable `kind:` suspends every kind-*derived* check (one slip, one finding — not
    six); field lists are **not** deduplicated (an edge is a relation, a field list is an enumeration of
    distinct authorities, and deduping would silently rewrite a hand-authored record); a `#` in a `prose:`
    value is admitted verbatim (it is a sentinel path, not a pointer scheme).

### Open, and deliberately so

- The day-one registry will emit roughly a dozen `warn` findings on its first run — six unknown
  owners, two uncapped ceilings, a `prose:`-only count across four loops, and **zero timescale
  inversions with N incomparable pairs**. That is the deliverable working, not a defect: it is an
  addressable list of what aof does not know about its own machinery, and it is milestone 58's inbox.
- **OQ-1 — closed at the 52/03 build/review gate.** `actor:operator` declares only the pinned floor,
  `target-setting: [loop:autonomous-cascade]`. `src/bundle/commands/autonomous.md:3` supplies the
  operator-selected range and `:52` drives it until `work:next` reports done; inspection found no equally
  direct evidence that the operator sets another loop's reference. No extra edge was added to improve
  groundedness.
- **OQ-2 — closed at the 52/00 build/review gate.** Honesty findings are kind-independent once the
  field's own shape and grammar succeed: a node with an unreadable `kind` and `ceiling: unknown` emits
  `loop-ceiling-unknown` alongside the one `kind` error. Kind suspension prevents guesses about
  kind-derived required keys, admission and id schemes; it does not erase a separate declared gap that
  the loader can read without guessing. QA ratified this behavior with a kind-null fixture, and endpoint
  resolution continues to retain the node by its declared id.
- **Retro-worthy (raised by the architect, filed here):** the SPEC named six loop-record fields taken
  from a PRD sentence; the measured system needed seven. A PO-authored field list drawn from planning
  prose should be treated as provisional until RESEARCH has measured it.
- **Retro-worthy (the sharper one, from the two closure rounds):** the same claim — "the registry-derived
  bijection gate covers new commands for free" — was asserted in an ADR, corrected once, and found still
  wrong. Both errors came from reasoning about a shared gate's *intent* rather than reading its code. The
  lesson generalises past this milestone: **a "registry-derived, no edit needed" claim about an existing
  gate is a measurement, not an inference** — open the test. It was caught only because the Three Amigos
  ran a feasibility lens over the real seams; a contract authored from the ADRs alone would have shipped
  it, and 52/02 would have gone red on its first CI run.

## Feedback (for retro) — **archived at Accept, 2026-08-15**

<!-- The raw notes captured during the build have been triaged and distilled; they are archived here
     rather than restated. Nothing is lost: each lesson has a durable home, named below. -->

Fourteen notes were raised across the build (architect, developer, QA and observability). All were
triaged at `aof:verify` and graduated:

| what was raised | where it lives now |
|---|---|
| The milestone's behavioural evidence never landed as files — three stories accepted on fixtures that were real in a session and are not on disk | `RETROSPECTIVE.md` **R8**; `VERIFICATION.md` F-52-04-H (resolved by story 05); `TECH_DEBT.md` item 48 CLOSED, **its ratchet still open** |
| A task box ticked `[x]` with a RED assertion behind it (52/04's died-mid-review first attempt) | **R9** |
| A story green in its own focused runner and red in CI; and the author-then-register orphan window | **R10**; `TECH_DEBT.md` item 50 |
| `assert.equal(<literal>.length, N)` as a fake non-vacuity guard, which also made a real scan blind | **R11** (with F-52-04-D) |
| An exclusion whose pointer resolves BY NAME while the claim is computed by nothing — found only by mutation | **R11**; `VERIFICATION.md` F-52-05-E (fixed, ceiling ratcheted 65 → 64) |
| A ratchet scoped to where the problem was SEEN, not where the shape can OCCUR (m47 sweep, `test/arch/**` only) | **R12**; `TECH_DEBT.md` item 52 |
| A contract table contradicting its own preamble; and a `ran` row no non-empty registry can satisfy | **R13**; `TECH_DEBT.md` item 53 (F-52-05-A, F-52-05-B) |
| Two more uncovered boundary classes, flagged rather than silently covered | `TECH_DEBT.md` item 53 (F-52-05-F, F-52-05-G) |
| A citation slip in a contract table (ADR-013 §3 for what is ADR-011 §9) | Corrected in place at Accept — F-52-05-C |
| The SPEC's six loop-record fields vs the seven the measured system needed | **R3** |
| "Registry-derived, no edit needed" asserted twice about a shared gate and wrong both times | **R4** |
| A 19m28s stall inside the architecture-authoring run; 84% of output tokens in governance | **R5**; `observability/report.md` |
| The nine `acd-loop-*` gates carry **18** legs, not 19 — FF-5207's absent-registry leg was retired into `test/work-loops-commands.test.mjs` as its own note directed | Corrected in `## Verification` below and in `VERIFICATION.md` |

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — story 05 landed the six suites the 15 features never had (TECH_DEBT 48):
      `test/work-loops-record.test.mjs`, `work-loops-value`, `work-loops-checks`, `work-loops-commands`,
      `work-loops-registry-census`, and `work-loops-coverage-ledger` (the traceability checker), over the
      shared `test/support/loop-registry-fixture.mjs`. Coverage is **traced, not asserted**: 323 scenarios
      and 461 rows across 28 tables, each carrying a deciding assertion or a resolving exclusion.
      Re-run at `aof:verify` 2026-08-15: **139/139 cases green**, twice — before and after the two
      contract corrections applied at accept.
- [x] Fitness functions green — FF-5201…FF-5209, 18 assertions, `test/arch/acd-loop-*.test.mjs`
      (19 until 2026-08-15, when FF-5207's absent-registry leg was **retired** into
      `test/work-loops-commands.test.mjs` as its own self-declared note directed; the gate keeps its file
      name and its structural first leg, so FF-5209's nine-file roster is intact)
- [x] No `@manual` and no `@uat` lane — all 25 task features are `@executable` and the milestone ships no
      UI surface (ADR-009: the "one readable rendering" is a deterministic text artifact, not a face), so
      there is no human sign-off and no design-conformance review to hold. Confirmed at `aof:verify`:
      neither tag appears in any feature in this milestone. There is no `UAT.md` and the earlier box
      naming one was template residue.
