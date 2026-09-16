---
type: story
number: 05
slug: behavioural-suites
title: "The behavioural suites — the loader, the checks and the three verbs, re-runnable"
parent: 52
status: done
owner: product-owner
depends: [52/00, 52/01, 52/02, 52/04]
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/05 · The behavioural suites

## User story

As the **maintainer who has to trust this milestone's acceptance**, I want the loader's sixteen-code
lane, the five structural checks and the three `work:loops` verbs covered by test suites that exist on
disk and run in CI, so that the milestone's "green" is a claim anyone can re-run — and so a behavioural
regression (a wrong directed ratio, a dropped honesty finding, a broken `--json` envelope) fails on the
diff that introduces it instead of shipping silently behind nine structural gates that were never
designed to catch it.

## Context

**This story exists because the evidence for three accepted stories is not on disk.** Found at 52/04's
structural review, measured, and recorded as `TECH_DEBT.md` item 48 / `VERIFICATION.md` finding
F-52-04-H:

| Commit | Story | `src/` shipped | `test/*.test.mjs` added |
|---|---|---|---|
| `8349026` | 52/00 · the loader | `src/work-loops.mjs`, 563 lines | none |
| `11e77d7` | 52/01 · the five checks | `src/work-loops-checks.mjs`, 380 lines | none |
| `a933ebc` | 52/02 · the three verbs | 4 files, 233 lines | none |

Between them those three stories carry **15 `@executable` task features and 323 scenarios**, mechanised
by nothing. The milestone's `VERIFICATION.md` records, per feature, *"Loader/model fixture … green"*,
*"Timescale fixture: exhaustive 6×6 matrix … green"*, *"Graph fixture … byte-identical fresh-process
Mermaid green"*. Those fixtures were real when they ran, in the build sessions, and were never landed as
registered suites — so today the claims cannot be re-run, which makes them unfalsifiable rather than
false.

The nine `test/arch/acd-loop-*.test.mjs` gates that 52/04 landed do **not** close this. They are
*structural* by construction, and 52/04's own STORY.md says so in terms: *"the observable behaviours —
'validate reports the unpaired build loop', 'show renders run-resilience's three actuators', 'an empty
repo prints no registry' — are the other stories' `.feature` scenarios and deliberately do not live
here."* That boundary was correct. What was missing is the other side of it.

This is TECH_DEBT item 5's species — *"the gate reads green-ish while not running"* — one layer up,
inside the milestone whose closing story exists to prevent exactly that. The stories being covered are
already **accepted and closed**; this story does not re-open them.

ADR references: the suites assert the ADR-authored behaviour of 00/01/02 as their `.feature` files
already state it. No ADR changes here — if a suite and an ADR disagree, that is a finding, not a
licence to edit either.

## Acceptance

- **Every one of the 15 `@executable` features of 52/00, 52/01 and 52/02 is mechanised by a suite that
  exists on disk and is registered in `scripts/test.mjs`** — the standard F-52-04-H showed was not met.
  Registration is explicit (imports + spreads), per the repo's explicit-runner invariant, and the
  suite-registration gate reports no new orphan.
- **Every suite is green, and green means re-runnable** — no narrative evidence, no
  fixture-that-lived-in-a-session. Each feature's `verifies →` pointer in `VERIFICATION.md` names a
  suite PATH, not a claim.
- **Coverage is traced scenario by scenario**, not asserted in aggregate: for each of the 323
  scenarios, either a deciding assertion, or an explicit, justified exclusion recorded in the story.
- **The suites are behavioural (black-box)** — they drive the exported loader, the five exported checks
  and the three registered commands through their public contracts. They do not re-assert 52/04's
  structural invariants (import surfaces, route triples, code-set freezing); a duplicated invariant is
  two homes for one rule and is itself a defect.
- **`src/` is not edited to make a suite pass.** If a suite goes red over shipped behaviour, that is a
  **finding against this story**, triaged like any other: the ADR + the `.feature` decide who is wrong.
  The three owning stories are closed, so a confirmed source defect is fixed here and recorded against
  the milestone — but never by quietly rewriting the scenario to match the code.
- **`VERIFICATION.md`'s story 00/01/02 sections are corrected** to point at the landed suites, replacing
  the narrative "fixture … green" evidence. The milestone's acceptance then rests on evidence that can
  be re-run.
- **The `@executable` suite box in `STATE.md` `## Verification` can be ticked honestly.**

## Tasks

<!-- Authored 2026-08-15 by `aof:refine 52/05` (Three Amigos: PO inline, `aof-qa` on the case matrices,
     `aof-developer` on feasibility). Six tasks, one suite file each plus a shared fixture helper.
     THE PARTITION AND WHY IT IS NOT THE OBVIOUS ONE. QA proposed cutting by feature-seam (six tasks,
     the two envelope features paired); the developer proposed cutting by module (four). The developer's
     measured duplication map decides it: the seams QA computed on RAW scenario counts move once the
     ~135-150 already-decided scenarios are removed. `00_frozen-vocabulary` contributes 3 net scenarios,
     not 26 — its thirteen fixture-free export reads are all FF-5203's — so QA's objection to pairing it
     with a heavy fixture dissolves. FF-5209 already drives the REAL `loopsValidateCommand.run()` for the
     combined loader-then-checks order with both mutation non-vacuity legs (that was the fix for
     F-52-04-E), so the claim QA said was "homeless or duplicated" has a home, and the two envelope
     features can be split by LANE — the loader's residue to task 00, the checks' to task 02, and the one
     genuinely command-shaped scenario (`the three ran cases, pinned at the seam`) to task 03. -->

- [x] [00 — the record suite: the loader over records on disk](tasks/00_loader-record-suite.feature) — `01_record-loader` + `00_frozen-vocabulary` + `04_schema-and-honesty-findings` (77 scenarios, ~49 net) → `test/work-loops-record.test.mjs`
- [x] [01 — the value suite: what one authored value becomes](tasks/01_loader-value-suite.feature) — `02_field-value-grammar` + `03_pointer-endpoint-syntax` (54, ~54 net) → `test/work-loops-value.test.mjs`
- [x] [02 — the checks suite: six pure algorithms over literal models](tasks/02_checks-suite.feature) — all six of 52/01 (115, ~80 net) → `test/work-loops-checks.test.mjs`
- [x] [03 — the command family suite: the three verbs as commands and as processes](tasks/03_command-family-suite.feature) — all four of 52/02 (77, ~38 net) → `test/work-loops-commands.test.mjs`
- [x] [04 — the registry census: 52/03's undecided residue](tasks/04_registry-census-suite.feature) — the refine-time ruling below → `test/work-loops-registry-census.test.mjs`
- [x] [05 — the coverage ledger and the corrected evidence](tasks/05_coverage-ledger-and-evidence.feature) — the traceability checker + registration + `VERIFICATION.md` → `test/work-loops-coverage-ledger.test.mjs`

Shared, and not a suite: `test/support/loop-registry-fixture.mjs` — the temp-workspace + record builders
tasks 00, 01 and 03 drive (measured at build: three importers; task 05 only names it as a path constant
and asserts it exists, since the ledger checks that it is correctly NOT swept as a suite). It lives under
`test/support/`, so the suite-registration gate correctly does not sweep it.

## Exclusions

<!-- Seeded at refine from the developer's measured duplication map; COMPLETED during build, where each
     entry is written into the owning suite's `coverage.excluded` and cross-checked against this table by
     the ledger checker's leg 7. A class ceiling is shrink-only. -->

**COMPLETED AT BUILD, 2026-08-15.** The refine-time seed estimated *"roughly 135–150 of the 323"*. The
measured answer is **57 of the 323** (plus 17 of the census's own 46, for **74** across the five suites) —
every class came in **under** its seeded ceiling, and the ceilings below are the shrink-only literals the
ledger checker's leg 6 enforces. The seed shrank for two reasons, both recorded where they happened:
`00_frozen-vocabulary`'s 31-row table has to be driven by a real parameterised test for the ledger to
trace it, so its record-driven scenarios are mechanised here whether or not they are listed as excluded
(listing them would have been false bookkeeping); and `03_registration-and-routing`'s seeded 4 went to
**0**, because its claims are all at the process boundary, which FF-5207 never drives.

| class | ceiling (shrink-only) | measured at build | seeded at refine |
|---|---|---|---|
| `structural-duplicate` | 64 | 64 | ~81 |
| `not-black-box` | 3 | 3 | 4 |
| `duplicate-claim` | 7 | 7 | ~10 |

Each entry carries a pointer that **resolves**: a `structural-duplicate` names a test one of the nine loop
fitness functions actually exports (looked up by importing the gate module, never transcribed); a
`duplicate-claim` names a title in some suite's `decided` set; a `not-black-box` names the decidable proxy
that IS driven. The gate pointers, by legend:

| | the exported fitness-function test the entry defers to |
|---|---|
| **G1** | `arch/52 FF-5203: all thirteen exported vocabularies equal the governing ADR literals` |
| **G2** | `arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering` |
| **G3** | `arch/52 FF-5209: loader total order is independent of directory order and fixed by a literal oracle` |
| **G4** | `arch/52 FF-5205: every check is model-in/findings-out and deterministic in-process and in a fresh process` |
| **G5** | `arch/52 FF-5206: the closed cadence cross-product compares only periodic loop-to-loop target-setting pairs` |
| **G6** | `arch/52 FF-5206: actor, dangling, extra-registry and self edges stay outside the timescale domain` |
| **G7** | `arch/52 FF-5205: checks are source-pure, parse no declared values, and the two lanes are transitively separate` |
| **G8** | `arch/52 FF-5208: Mermaid bytes, canonical order, glyphs and total collision-safe keys are frozen` |
| **G9** | `arch/52 FF-5204: the real nine-record registry parses without error and no loop is aspirational` |
| **G10** | `arch/52 FF-5204: every real pointer resolves to a registered command or a symbol declared in its named module` |

<!-- THE ENTRY TABLE. Generated from the five suites' `coverage.excluded` at build and cross-checked
     against them by the ledger checker's leg 7, on (class, feature, scenario). A row here that no suite
     carries — or a suite entry with no row here — fails that leg: the document cannot drift into
     decoration while the code moves. -->

| class | task | covered feature | scenario | ptr |
|---|---|---|---|---|
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the admitted key union is exactly the seventeen schema and edge keys | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | a "kind: loop" node admits sixteen keys, and "ground" is not one of them | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | a "kind: actor" node admits nine keys, and no control field is one of them | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the node kinds are exactly two | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the edge keys are exactly the five, and "veto" is the single token for veto/constraint | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the pointer schemes are exactly three, and there is no "doc:" scheme | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the sentinel tokens are exactly the three standalone tokens plus the "prose:" prefix | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the cadence kinds and duration units are closed | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the event triggers are exactly four | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the field kinds are exactly eleven — six of the honesty envelope and five typed | G1 |
| `structural-duplicate` | 00 record | `00_frozen-vocabulary` | the ground classes are exactly one in this milestone | G1 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | schema and reference-integrity violations are reported at severity error | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | declared gaps are reported at severity warn | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | every finding is exactly the four-key envelope | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | every finding path is a raw absolute, never relativised | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | a per-node finding is anchored at the node's own file | G3 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | every emitted code is a member of the loader's frozen set | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | every code the loader may emit is reachable | G2 |
| `structural-duplicate` | 00 record | `04_schema-and-honesty-findings` | the loader's findings arrive in a frozen order — by node id, then by schema key order | G3 |
| `structural-duplicate` | 02 checks | `00_scc-decomposition` | the decomposition is deterministic in a fresh process | G4 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | an event trigger opposite a clock is not comparable, never an inversion | G5 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | the same pair in the opposite direction is also not comparable | G5 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | `unknown` opposite a clock is not comparable | G5 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | when neither side is on a clock the message names both | G5 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | the check runs over target-setting edges ONLY — a data-feed edge produces nothing | G5 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | a target-setting edge from an actor produces nothing at all — an actor has no cadence by schema | G6 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | a target-setting edge TO an actor produces nothing at all | G6 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | a target-setting edge to an extra-registry endpoint produces nothing | G6 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | a target-setting edge to an endpoint with no declaring record produces nothing | G6 |
| `structural-duplicate` | 02 checks | `04_timescale-comparability` | a self-declared target-setting edge is OUT OF DOMAIN — the check emits nothing | G6 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | every finding carries exactly the four envelope keys | G2 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | severity is only ever `warn` or `error` | G2 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | `path` is a raw absolute in its on-disk OS form | G2 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | every emitted code is a member of the exported frozen set | G2 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | the exported set is the CHECKS lane only — the loader's codes have another home | G2 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | the exported set cannot be mutated by a consumer | G1 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | the five checks are identified by their frozen ids | G4 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | the same literal model yields byte-identical findings on repeated invocation | G4 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | the same literal model yields byte-identical findings in a fresh process | G4 |
| `structural-duplicate` | 02 checks | `05_frozen-finding-codes` | no check reads a clock | G7 |
| `structural-duplicate` | 03 commands | `01_loops-validate` | the finding order is the frozen contract order, not an artefact of the order the lanes ran | G2 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | byte-identical output across repeated calls in one process | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | the edge type is the link label | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | node shape differs by kind, so a loop and an actor are visually distinct | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | the three node glyphs are the frozen literals of the contract | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | a node key is the id with EVERY character outside [A-Za-z0-9_] replaced by "_" | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | a `module:` endpoint renders — its "/", "." and "#" are mangled too, and it is NOT dropped | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | every node key in the diagram is renderable and unique | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | an edge line is the frozen arrow form | G8 |
| `structural-duplicate` | 03 commands | `02_loops-graph-mermaid` | a dangling endpoint still renders, and is not silently dropped | G8 |
| `structural-duplicate` | 04 census | `00_actor-nodes` | neither actor node carries the loop-only control fields | G9 |
| `structural-duplicate` | 04 census | `01_acd-phase-loops` | the autonomous cascade declares a registered command and a config key | G10 |
| `structural-duplicate` | 04 census | `01_acd-phase-loops` | no ACD phase loop declares `unknown` for a machinery field, or an empty list for anything | G9 |
| `structural-duplicate` | 04 census | `02_engineered-controller-loops` | the dual staleness gate declares the AND, not merely its two operands | G10 |
| `structural-duplicate` | 04 census | `02_engineered-controller-loops` | the ingest actuator is authored as a module pointer or prose, never as a command that is not registered | G10 |
| `structural-duplicate` | 04 census | `02_engineered-controller-loops` | every pointer these three records declare names a real, correctly located authority | G10 |
| `structural-duplicate` | 04 census | `03_declared-edges` | every declared edge key is one of the five closed types | G9 |
| `structural-duplicate` | 04 census | `03_declared-edges` | every intra-registry endpoint resolves to a declared record | G9 |
| `structural-duplicate` | 04 census | `03_declared-edges` | an edge key a record declares carries at least one endpoint | G9 |
| `structural-duplicate` | 04 census | `03_declared-edges` | no record carries a `depends:` key | G9 |
| `structural-duplicate` | 04 census | `04_registry-loads-clean` | every node's id equals its filename stem | G9 |
| `structural-duplicate` | 04 census | `04_registry-loads-clean` | all nine records load with zero error-severity findings | G9 |
| `structural-duplicate` | 04 census | `04_registry-loads-clean` | no record declares a machinery field, a ceiling or an edge as an empty list | G9 |
| `structural-duplicate` | 04 census | `04_registry-loads-clean` | every key each record declares is admitted for that record's kind | G9 |
| `not-black-box` | 04 census | `00_actor-nodes` | every target-setting edge the operator declares is defended in its prose body | the edge census over the loaded model |
| `not-black-box` | 04 census | `02_engineered-controller-loops` | the run-resilience record restates none of the machinery it points at | the field-authority census: every machinery field is a pointer, no ceiling a restated number |
| `not-black-box` | 04 census | `03_declared-edges` | every declared edge is defended in the declaring record's prose body | the edge census over the loaded model |
| `duplicate-claim` | 01 value | `02_field-value-grammar` | id, kind and title are node-level and never appear among the fields | a node is exactly id, kind, title, path, fields and edges |
| `duplicate-claim` | 02 checks | `04_timescale-comparability` | duration units resolve and compare across ms, s, m, h and d | duration units resolve and compare across ms, s, m, h and d |
| `duplicate-claim` | 02 checks | `05_frozen-finding-codes` | a per-node finding anchors at the node's own file | an optimizing loop with no inbound monitoring edge is unpaired |
| `duplicate-claim` | 02 checks | `05_frozen-finding-codes` | a whole-graph finding anchors at the loops directory | whole-graph verdicts anchor at the loops directory |
| `duplicate-claim` | 02 checks | `05_frozen-finding-codes` | a per-edge finding anchors at the declaring node's file | every edge finding anchors at the declaring node, never at the endpoint and never at the directory |
| `duplicate-claim` | 02 checks | `05_frozen-finding-codes` | `loop-self-referential-edge` is attributed by EDGE TYPE, so the counter is deterministic | one self-referential finding per offending edge, and the loop still carries both inbound verdicts |
| `duplicate-claim` | 02 checks | `05_frozen-finding-codes` | the three `ran` cases, pinned at the seam | the three `ran` cases, pinned at the seam |

**Eight near misses that must NOT be excluded**, each a place where the arch fixture is one discriminator
short of the scenario: the unparseable lane's case folding (`README.md`/`draft.md`, not `a-`/`z-`);
within-key authored order vs raw-text order; the in-process determinism repeat; one node carrying BOTH
self-edge types; the duration-unit ladder; non-periodic self-edges; `graph`'s two-process CLI byte
identity; and the absent-registry path, which is a **migration** rather than an exclusion —
`acd-loop-command-route-only.test.mjs` lines 51-68 declare that leg *"the one to retire"* once a
behavioural suite covers it, and task 03 is that suite.

## Notes

**Out of scope.** Story 52/03's five features are documentation contracts over the nine day-one
records, and FF-5204 (`test/arch/acd-loop-records-parse.test.mjs`) already drives the real registry —
zero error findings, the nine-node roster, id-equals-stem, and pointer resolution against defining
modules and registered commands. Whether its residue (the exact edge census, the three unpaired
optimizers, the warning bounds) needs its own coverage is a **refine-time** question; do not assume
either answer here.

> **RULED IN at refine, 2026-08-15 — task 04.** Measured, not assumed. FF-5204 filters findings to
> `severity === "error"` and asserts `nodes.length >= 9` (a floor, deliberately). Both choices were
> right, and together they leave the WARN lane and the ROSTER undecided. Decisively: **no gate anywhere
> runs a structural check over the real registry** — FF-5205, FF-5206 and FF-5209 all drive hand-built
> literal models — so the milestone's headline claim, *three declared optimizers, all unpaired, because
> the registry declares no monitoring edge at all*, is computed by nothing on disk. That is F-52-04-H's
> own species one story over. Measured residue: the named nine-id roster; six `loop-owner-unknown` with
> `verify-triage-accept` excluded; two `loop-ceiling-uncapped`; zero `loop-ceiling-unknown`; the 3/4
> optimizing split; exactly **two** declared edges in the whole registry, both `target-setting`, and zero
> of the other four types; one `ground:` bearer (`operator.md`); one periodic cadence; zero
> self-referential edges; and — a gap in FF-5204's own strongest leg — `prose:` paths, which it never
> resolves though it resolves every `command:` and `module:` pointer. Scope: **one suite, ~200-280
> lines**, pinning what ADR-010/ADR-012 §6/RESEARCH measured and bounding what merely follows the roster.
> 52/03's prose-body `<path>:<line>` citation clauses stay **out** — the loader discards the body, and
> asserting a line number reddens the suite on every unrelated source edit.

**The 461 rows the acceptance criterion does not reach** (measured at refine). The fifteen features
contain **no `Scenario Outline` at all** — every `Examples:` block is attached to the feature. So the
tables and their 461 data rows are not scenarios, and a ledger honest to the letter of *"each of the 323
scenarios"* would trace none of them, while most of the discrimination lives there (76 rows in
`02_field-value-grammar`, 48 in `04_timescale-comparability`, 41 in `03_pointer-endpoint-syntax`, 30 in
`01_loops-validate`). Task 05's ledger therefore traces rows at **table granularity with the row count
parsed from the feature and cross-checked against a literal** — one assertion per table, closing 461 rows.

> **CORRECTED AT BUILD, 2026-08-15 — the table count is 28, not 24.** The refine-time figure of *"24
> tables"* (repeated in `05_coverage-ledger-and-evidence.feature`) is a miscount, measured twice at build:
> once by parsing the fifteen features directly, and once by summing the five suites' `coverage.tables`,
> which agree at **28 tables / 461 rows**. The two load-bearing numbers — **323 scenarios and 461 rows** —
> are exact and unchanged, which is why this is a correction to the prose rather than a change of scope:
> the acceptance criterion is read as "323 scenarios **and** 461 rows", and 461 is reached only if every
> table is traced. The ledger's non-vacuity leg pins **28**. The
acceptance criterion is read as "323 scenarios **and** 461 rows", not narrowed to fit.

**Two registration traps, both confirmed at the source** — `test/arch/acd-loop-finding-envelope.test.mjs`
lines 358 and 384. Its roster leg deep-equals the on-disk `test/arch/acd-loop-*.test.mjs` list against a
literal nine, so **a tenth file so named reds an accepted gate**; and it asserts the m52/story-04 import
block terminates immediately after its ninth import, with no `...acdLoop` spread following the ninth. All
six suites therefore live in `test/` without the `acd-loop-` prefix, take their own labelled
`// milestone 52 / story 05` block, and export aliases that do not begin `acdLoop`.

**Three contract notes the build must not rediscover as mystery reds.**
1. **`00_frozen-vocabulary`'s *"no twelfth set is exported"* needs a reading, not a fix.** The loader
   exports **twelve** frozen collections: the eleven vocabularies plus `LOADER_FINDING_CODES`, a frozen
   **Array** that `04_schema-and-honesty-findings` requires to exist. `Array.isArray` is the
   discriminator — the claim is about the frozen vocabulary *sets*. Recorded rather than resolved by
   whoever writes the assertion; it is a reading question, not a defect.
2. **`02_unpaired-and-unowned`'s scenario at lines 141-146 is under-specified and reds on a literal
   reading.** `checkReferenceOwnership` reports `loop-unowned-reference` for every `kind: loop` node with
   no inbound `target-setting` from another node, so its final clause cannot hold as written. Its own
   Examples row at line 208 supplies the missing third-party inbound edge. Completing an under-specified
   Given from the feature's own case table is reading the feature whole — it is **not** licence to
   rewrite a scenario to match the code. The same trap runs through all 23 rows of that table: every
   assertion is scoped by node id or path, never by array length.
3. **The cwd trap.** All three verbs relativise through `path.relative(process.cwd(), value)`, which in
   process resolves against the test runner's cwd (and `process.chdir` is unsafe — the runner is one
   sequential process), and on Windows returns an **absolute** path when the fixture lands on another
   drive. Every relativisation case asserts `path.resolve(cwd, printed) === source`, never a literal.

**Two loose ends raised against the milestone, not this story.** (i) FF-5205's
`localeCompare|Intl.Collator` sweep covers `src/work-loops-checks.mjs` only — `src/work-loops.mjs` is
swept by nothing, while `04_schema-and-honesty-findings` claims *"no comparison anywhere in the load is
made by a locale-aware collation"*. Task 00 decides the behavioural proxy; the source half has no home.
(ii) `acd-loop-command-route-only.test.mjs` lines 51-68 carry a self-declared retirement note for their
absent-registry leg; task 03 covers it, so that leg is retired there — the gate keeps its file name and
first leg, leaving FF-5209's nine-file roster intact.

**Sizing, stated honestly.** 323 scenarios is real work, comparable to 52/04, and it is the cost of the
milestone having deferred it. It is not a tidy-up and should not be scheduled as one.

> Measured at refine: **7 new files** (six suites + the fixture helper), **~4,500-6,000 lines**, against
> house comparables of 824 (`command-core-contract`), 937 (`work-validate`) and 845 (`graph-command-core`).
> The one runtime cost centre is process spawns — budget **~35**, which is why task 03 splits its subjects
> and decides every result-shape claim in process.

**The ratchet that prevents a repeat** lives outside this story and is the more valuable half:
`aof:verify` should require an executable evidence pointer — a suite path that exists on disk and is
registered — for every `@executable` feature it accepts, so a story whose features cite no runnable
suite cannot reach `done`. That check would have caught this at story 00's accept gate rather than four
stories later. Recorded in `TECH_DEBT.md` item 48; it belongs to the aof product, not to milestone 52.
