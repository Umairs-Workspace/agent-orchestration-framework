---
doc: verification
---
# 52 · Loop registry & the loop graph — Verification

## Verification evidence

### Story 00 · The loop model & loader — **ACCEPTED**

Contract: five `@executable` task features; no `@manual`, `@uat`, UI, or design-conformance lane.

<!-- EVIDENCE CORRECTED 2026-08-15 by story 52/05 (F-52-04-H). Every line below now names a suite PATH
     that exists on disk and is registered in `scripts/test.mjs`, replacing the narrative "fixture …
     green" claims that could not be re-run. Where a scenario is decided by a structural gate instead,
     the split is stated rather than absorbed, so a reader can see which instrument owns which claim.
     This corrects the EVIDENCE for an accepted story; it does not reopen it. -->

- **`test/work-loops-record.test.mjs`** — 15 of 26 scenarios and the 31-row table; the remaining 11 are
  decided by FF-5203 (`acd-loop-vocabulary-closed.test.mjs`), which set-equals all thirteen exported
  vocabularies against the ADR literals.
  `verifies → stories/00_story_loop-model-and-loader/tasks/00_frozen-vocabulary.feature`
- **`test/work-loops-record.test.mjs`** — all 32 scenarios and all 3 tables (35 rows); nothing deferred.
  `verifies → stories/00_story_loop-model-and-loader/tasks/01_record-loader.feature`
- **`test/work-loops-value.test.mjs`** — 24 of 25 scenarios and the 76-row table; the remaining 1 is the
  node-shape claim owned by `test/work-loops-record.test.mjs`.
  `verifies → stories/00_story_loop-model-and-loader/tasks/02_field-value-grammar.feature`
- **`test/work-loops-value.test.mjs`** — all 29 scenarios and the 41-row table, including ADR-003's
  syntax-only promise proved **differentially** (load, create the cited referents, load again, assert the
  two loads byte-identical — the only assertion shape that can prove nothing outside `loops/` was read).
  `verifies → stories/00_story_loop-model-and-loader/tasks/03_pointer-endpoint-syntax.feature`
- **`test/work-loops-record.test.mjs`** — 11 of 19 scenarios and all 3 tables (38 rows); the remaining 8
  are decided by FF-5209 (`acd-loop-finding-envelope.test.mjs`), which owns the 24-code lane/severity
  table, the four-key envelope and the loader's literal total-order oracle.
  `verifies → stories/00_story_loop-model-and-loader/tasks/04_schema-and-honesty-findings.feature`
- Craft: `node --check src/work-loops.mjs` passed; `node scripts/supply-chain-audit.mjs` passed.
- Focused gate: `aof work validate 52/00 --json` returned `[]`.
- Structural review: `aof-architect` → **CONFORMS**. Behavioural review: `aof-qa` → **CONFORMS**.

The mandatory near-miss recall shaped the actual-seam check, frozen-vocabulary isolation and
deterministic/non-mutating model probes. The broad unit runner reached 45 green tests before the live
service already bound to `127.0.0.1:4182`; the focused story fixtures and scoped gates do not use that
port and completed green.

## Findings

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-52-00-A | contract | blocker | `prose:` was absent from the exact sentinel export and malformed reserved-prefix values on `controlled` fell through as phrases. | Fix within the locked grammar; no feature change. | 52/00 | resolved — exact vocabulary and bad-value probes green |
| F-52-00-B | code | blocker | The first Set subclass resisted `.add()` but could be widened through `Set.prototype.add.call`, after which a novel kind crashed admission. | Replace the real Set internal slot with an inaccessible read-only Set-like backing store. | 52/00 | resolved — direct/intrinsic mutation probes green and novel kind degrades to kind-null |

## Gate

- Validity lane: `aof work validate 52/00 --json` → **PASS** (`[]`).
- Agent-only layer: every executable feature maps to the passing focused fixture evidence above; no
  manual/UAT/sign-off lineage exists; litmus clean for this model/loader contract.
- Health lane: `aof work doctor 52/00 --json` → healthy, 0 errors, one advisory pre-existing
  `numbering-gap` warning for missing top-level numbers 29, 30, 31 and 42.

## Accept decision

**Story 52/00 accepted.** All five executable task contracts are green, both review findings are
resolved and re-reviewed, the hard validation gate passes, and no blocker remains open.

### Story 01 · The five structural checks — **ACCEPTED**

Contract: six `@executable` task features; no `@manual`, `@uat`, UI, or design-conformance lane.

<!-- EVIDENCE CORRECTED 2026-08-15 by story 52/05 (F-52-04-H) — suite paths, not narrative fixtures. -->

- **`test/work-loops-checks.test.mjs`** — 16 of 17 scenarios and the 12-row table; the remaining 1
  (fresh-process determinism) is FF-5205's.
  `verifies → stories/01_story_structural-checks/tasks/00_scc-decomposition.feature`
- **`test/work-loops-checks.test.mjs`** — all 14 scenarios and the 9-row table; nothing deferred.
  `verifies → stories/01_story_structural-checks/tasks/01_groundedness-check.feature`
- **`test/work-loops-checks.test.mjs`** — all 22 scenarios and all 23 table rows, every assertion scoped
  by node id or path rather than by findings-array length.
  `verifies → stories/01_story_structural-checks/tasks/02_unpaired-and-unowned.feature`
- **`test/work-loops-checks.test.mjs`** — all 19 scenarios and the 16-row table; nothing deferred.
  `verifies → stories/01_story_structural-checks/tasks/03_shared-actuator-arbitration.feature`
- **`test/work-loops-checks.test.mjs`** — 10 of 21 scenarios and both tables (61 rows, the 48-row
  cross-product included, which adds the per-row anchor assertion FF-5206 does not make); 10 scenarios
  are FF-5206's, and the duration-unit ladder is decided by **`test/work-loops-value.test.mjs`**, since
  resolving `periodic:15m` → 900000 is a loader claim no check-lane fixture can decide.
  `verifies → stories/01_story_structural-checks/tasks/04_timescale-comparability.feature`
- **`test/work-loops-checks.test.mjs`** — 7 of 22 scenarios and both tables (11 rows); 10 are decided by
  FF-5209/FF-5205/FF-5203, 4 are anchor claims owned by this suite's own check scenarios, and *"the three
  `ran` cases, pinned at the seam"* is decided by **`test/work-loops-commands.test.mjs`**, because `ran`
  is the command's composition of the loader's `present` with the five checks and no check can decide it.
  `verifies → stories/01_story_structural-checks/tasks/05_frozen-finding-codes.feature`
- Craft: `node --check src/work-loops-checks.mjs` passed; source purity scan and
  `node scripts/supply-chain-audit.mjs` passed.
- Focused gate: `aof work validate 52/01 --json` returned `[]`.
- Structural review: `aof-architect` → **CONFORMS**. Behavioural review: `aof-qa` → **CONFORMS**.

The mandatory near-miss recall directed attention to exact fitness vocabulary, split ownership and
immutable exported contracts. The broad unit runner again reached 45 green tests before the unrelated
live service bound to `127.0.0.1:4182`; no focused story check uses that port.

## Story 01 gate

- Validity lane: `aof work validate 52/01 --json` → **PASS** (`[]`).
- Agent-only layer: every executable feature maps to the passing focused evidence above; no
  manual/UAT/sign-off lineage exists; litmus clean for the pure-checks contract.
- Reviews: architecture and behavioural verdicts are both **CONFORMS**, with no open findings.

## Story 01 accept decision

**Story 52/01 accepted.** All six executable task contracts are green, the exact vocabulary and five
algorithms are independently reviewed, the hard validation gate passes, and no blocker remains open.

### Story 02 · The `work loops` command family — **ACCEPTED**

Contract: four `@executable` task features; no `@manual`, `@uat`, UI, or design-conformance lane.

<!-- EVIDENCE CORRECTED 2026-08-15 by story 52/05 (F-52-04-H) — suite paths, not narrative fixtures.
     This suite drives two subjects deliberately: a claim about the RESULT is decided in process through
     `command.run(input, {workspace:{workDir}})` (the seam milestone 53 composes through); a claim about
     the PROCESS — exit code, one JSON document on stdout, cwd relativisation, cross-process byte
     identity — is decided by a real spawn. 34 spawns against a ~35 budget. -->

- **`test/work-loops-commands.test.mjs`** — all 23 scenarios and both tables (23 rows); nothing deferred.
  `verifies → stories/02_story_work-loops-command-family/tasks/00_loops-show.feature`
- **`test/work-loops-commands.test.mjs`** — 16 of 17 scenarios and all 3 tables (39 rows); the remaining
  1 (frozen cross-lane finding order) is FF-5209's, which drives the real `loopsValidateCommand.run()`.
  One row of the `ran` table is unsatisfiable as written — see F-52-05-A below.
  `verifies → stories/02_story_work-loops-command-family/tasks/01_loops-validate.feature`
- **`test/work-loops-commands.test.mjs`** — 14 of 23 scenarios and all 3 tables (23 rows); the remaining
  9 are FF-5208's, which freezes the Mermaid bytes, glyphs, key mangling and canonical order.
  `verifies → stories/02_story_work-loops-command-family/tasks/02_loops-graph-mermaid.feature`
- **`test/work-loops-commands.test.mjs`** — all 14 scenarios and all 3 tables (23 rows), the 12-row argv
  table driven at the process boundary. FF-5207's own absent-registry leg was **retired** into this suite
  as its self-declared note directed, leaving that gate its file name and its structural first leg.
  `verifies → stories/02_story_work-loops-command-family/tasks/03_registration-and-routing.feature`
- Shared gate: the adapter and route-reachability legs pass; all three loop routes pass direct spawn and
  parse probes. The all-command spawn sweep was inconclusive before reaching them because an unrelated
  existing `work continue 03/01` child timed out in the review host.
- Craft: all five edited JavaScript files pass `node --check`; `node scripts/supply-chain-audit.mjs`
  passed; `aof work validate 52/02 --json` returned `[]`.
- Structural review: `aof-architect` → **CONFORMS**. Behavioural review: `aof-qa` → **CONFORMS**.

The first nested-cwd probe exposed that workspace discovery is exact-cwd unless `--config` is supplied.
The contract was corrected to exercise the existing universal selector rather than adding three local
workspace authorities or silently widening every command's discovery semantics.

## Story 02 findings

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-52-02-A | contract | blocker | The refined nested-cwd scenarios assumed automatic ancestor config discovery, but the shared loader checks only the exact cwd. | Preserve current CLI behavior and the story partition; use the existing explicit `--config` selector in those scenarios. | 52/02 | resolved — real nested probes pass for all three verbs |

## Story 02 gate

- Validity lane: `aof work validate 52/02 --json` → **PASS** (`[]`).
- Agent-only layer: all four executable features map to passing focused evidence; no manual/UAT/sign-off
  lineage exists; litmus clean after the explicit-config contract correction.
- Reviews: architecture and behavioural verdicts are both **CONFORMS**, with no open findings.

## Story 02 accept decision

**Story 52/02 accepted.** All four executable task contracts are green, the command and route surfaces
are independently reviewed, the hard validation gate passes, and no blocker remains open.

### Story 03 · The day-one registry — **ACCEPTED**

Contract: five `@executable` documentation/task features; no `@manual`, `@uat`, UI, or design lane.

- Actor fixture: exact operator/product-owner records, sole exogenous ground, actor admission rules,
  product-owner's closed edge and OQ-1's evidenced floor-only operator edge green.
  `verifies → stories/03_story_the-day-one-registry/tasks/00_actor-nodes.feature`
- ACD-loop fixture: four records carry honest prose/pointer authorities, exact owner/ceiling/cadence
  values, narrowest agent actuators and three optimizer justifications green.
  `verifies → stories/03_story_the-day-one-registry/tasks/01_acd-phase-loops.feature`
- Engineered-loop fixture: run lifecycle, dual-staleness and memory-ingest records point at defining
  exports/registered commands without restating machinery; sole periodic loop facts green.
  `verifies → stories/03_story_the-day-one-registry/tasks/02_engineered-controller-loops.feature`
- Edge fixture: exactly two cited actor target-setting edges; no empty, duplicate, self, dangling,
  fabricated monitoring/veto or parameter-tuning relation green.
  `verifies → stories/03_story_the-day-one-registry/tasks/03_declared-edges.feature`
- Registry fixture: exact 7-loop/2-actor roster, zero errors, six unknown owners, two uncapped ceilings,
  three unpaired optimizers, honest warning bounds and zero timescale findings green.
  `verifies → stories/03_story_the-day-one-registry/tasks/04_registry-loads-clean.feature`
- Pointer audit: every module symbol is defined in the named module and every command id is registered;
  the nonexistent `work:memory-ingest` pointer is absent.
- Craft: `aof work validate 52/03 --json` returned `[]`; supply-chain audit passed.
- Structural review: `aof-architect` → **CONFORMS**. Behavioural review: `aof-qa` → **CONFORMS**.

During review, an unescaped `>` in a `cmd.exe` grep pattern redirected output into
`run-resilience.md`, briefly truncating it. The developer restored the captured record as the sole
writer; two final read-only passes each produced nine nodes/zero errors, and the file's SHA-256 remained
`c1ef0513e09062ab268d8d69296d0a5127f5840f195d264b1dd9ee38e3a59a66`.

## Story 03 findings

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-52-03-A | process | blocker | A supposedly read-only QA grep contained an unescaped `>` under `cmd.exe` and truncated `run-resilience.md`; simultaneous restores briefly duplicated it. | Stop checker writes, assign one restoring writer, normalize from captured content, then re-run persistent-state checks with before/after hash. | 52/03 | resolved — one record, stable hash, two 9-node/0-error passes |

## Story 03 gate

- Validity lane: `aof work validate 52/03 --json` → **PASS** (`[]`).
- Agent-only layer: all five executable documentation contracts map to the passing real-registry
  evidence; no manual/UAT/sign-off lineage exists; all citations and pointers reviewed.
- Reviews: architecture and behavioural verdicts are both **CONFORMS** on the restored persistent state.

## Story 03 accept decision

**Story 52/03 accepted.** All five executable task contracts are green, the exact nine-record content
and its citations are independently reviewed, the hard validation gate passes, and no blocker remains.

---

### Story 04 · The fitness functions — **ACCEPTED**

Contract: five `@executable` task features; no `@manual`, `@uat`, UI, or design-conformance lane.

Verified on a **resumed** run: the first attempt (`20260814T202905256Z-0000`) died mid-review, leaving
an orphaned `running` run, all five task boxes ticked, and a RED assertion behind them. Reclaimed via
`work:run-start` → `20260814T210208584Z-0001`.

**Executable evidence — every claim below is a command that was run in this session, not a narrative.**
The nine suites are registered in `scripts/test.mjs` (m52 block) and were exercised through a focused
runner that imports them and applies the runner's own per-test hermetic `AOF_GLOBAL_HOME`; the full
suite is not runnable on this node (`global-work-propagation.test.mjs` binds `:4182`, held by the live
control daemon).

- `test/arch/acd-loop-registry-not-an-item-type.test.mjs` + `acd-loop-module-import-boundary.test.mjs`
  (FF-5201, FF-5202) — 4 assertions green.
  `verifies → stories/04_story_the-fitness-functions/tasks/00_boundary-guards.feature`
- `acd-loop-vocabulary-closed.test.mjs` + `acd-loop-records-parse.test.mjs` (FF-5203, FF-5204) — 4
  assertions green.
  `verifies → stories/04_story_the-fitness-functions/tasks/01_vocabulary-and-records.feature`
- `acd-loop-checks-pure.test.mjs` + `acd-loop-timescale-comparability.test.mjs` +
  `acd-loop-render-deterministic.test.mjs` (FF-5205, FF-5206, FF-5208) — 6 assertions green.
  `verifies → stories/04_story_the-fitness-functions/tasks/02_purity-and-determinism.feature`
- `acd-loop-command-route-only.test.mjs` (FF-5207) — 2 assertions green.
  `verifies → stories/04_story_the-fitness-functions/tasks/03_command-surface.feature`
- `acd-loop-finding-envelope.test.mjs` (FF-5209) — 3 assertions green.
  `verifies → stories/04_story_the-fitness-functions/tasks/04_finding-envelope.feature`
- **Repo-wide gates the story touches, run directly** — `test/arch/acd-test-suite-registration.test.mjs`
  → 4/4 green (it was **RED** at baseline; see F-52-04-A), and
  `test/arch/acd-work-command-cli-bijection.test.mjs` → 4/4 green (the story claims all three of its
  legs pass for the three new verbs; verified rather than asserted).
- Ownership: `git diff` confirms **no** change to `src/`, `ui/`, `scripts/test-unit.mjs`, or any
  pre-existing test — the story's partition row holds. `scripts/test.mjs` carries only the nine imports
  + nine spreads; every other `+` line in it is concurrent milestone-50 work.
- Structural review: `aof-architect` → **FAIL** at first pass (1 blocker, 3 majors), **all resolved**.
  Behavioural review: `aof-qa` → **PASS-WITH-FINDINGS** (2 majors, 13 minors), **all resolved**.

**Mutation-tested, not merely green.** QA planted 49 mutations; 43 reddened the gate before any fix.
Each fix below was re-verified by re-planting the mutation it exists to catch, then restoring the tree
byte-for-byte (SHA-256 checked; `git diff` empty on every target).

## Story 04 findings

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-52-04-A | correctness | blocker | The story's own `acd-loop-timescale-comparability.test.mjs:57` used `raw.slice(0, raw.indexOf(":"))`, tripping the m47 positional-slice ratchet (ledgered for 0). `acd-test-suite-registration` was RED on this tree, so the story's "all nine land green" acceptance was false at the repo level. | Use `raw.split(":", 1)[0]` — identical value on every fixture. No ledger entry: an entry is a permission, and this needed none. | 52/04 | resolved — that gate is 4/4 green |
| F-52-04-B | correctness | major | Two assertions in `acd-loop-finding-envelope.test.mjs` were RED and one could never have passed on any tree: the same-code ordering leg expected *path* order while its own message said "node-`id` order" (ADR-013 §1 says node `id`, and `src/work-loops.mjs:528-531` implements it), and the whole-graph anchor leg compared the *check* oracle's paths against the *loader* fixture's temp directory — two unrelated fixtures. | Correct both to the ADR: `["bad.md", "bad-two.md"]` (the pair whose id order and path order deliberately disagree), and compare against the check model's own `source`. | 52/04 | resolved — ratified by the architect against ADR-011 §7 / ADR-013 §1 |
| F-52-04-C | correctness | major | A second home for the repo-wide test-orphan invariant, with its own hardcoded `["test/work-observe.test.mjs"]` baseline, duplicating what `acd-test-suite-registration` owns. Converting that documented-debt file would have reddened a *loop* gate for an unrelated reason. | Delete the duplicated leg; keep the story-scoped half (disk-derived nine-file list, exact import/spread block, `test-unit.mjs` exclusion). | 52/04 | resolved |
| F-52-04-D | correctness | major | `loopModules` was a five-element literal asserted against itself (`assert.equal(loopModules.length, 5)` cannot fail) — and **both** FF-5201's write-tripwire and FF-5202's import-boundary iterate that list, so a sixth loop module would be scanned by neither gate. | Discover from disk (`src/work-loops*.mjs` + `src/commands/loops-*.mjs`), `deepEqual` against the expected five, iterate the discovered list. | 52/04 | resolved — a planted sixth module now reddens both gates |
| F-52-04-E | correctness | major | The frozen cross-lane finding ORDER was asserted only against the test's own concatenation, never the command's — so reversing `CHECK_IDS` inside `loops-validate`, or emitting the check lane first, left all nine green, while the feature says "concatenated the way the command concatenates them". | Drive the real `loopsValidateCommand.run()` over the same fixture and assert its order. (Deviation: compared against the fixture-derived equivalent, since the synthetic check models fire codes the fixture cannot; two `notDeepEqual` non-vacuity legs prove the fixture distinguishes both mutations.) | 52/04 | resolved — both mutations now RED |
| F-52-04-F | correctness | major | The loader's cadence normalisation — the premise FF-5205's purity argument rests on ("the checks receive `{kind, ms}`, so they parse nothing") — was unasserted: `UNIT_MS.s = 1`, or dropping `ms` entirely, left all nine green while `checkTimescale` would silently compute `NaN < 3 === false` and emit nothing. | Assert `Number.isSafeInteger(ms) && ms > 0` for every real periodic node, plus one exact pin (`loop:mesh-assignment-reclaim` → `15000`). | 52/04 | resolved — both mutations now RED |
| F-52-04-G | coverage | minor | Fifteen unasserted `And` clauses across the five features: a dead `loop-id-mismatch` scheme branch, the malformed-line blank/`#` skip rules, a spelling-coupled `cli.mjs` ladder grep (`sub === 'loops'` slipped through), block-local "exactly once" registration, missing `monitoring: []` / bad-`module:` / actor-record fixtures, the loader-exports-check-vocabulary negative, `ui/dist` + `node_modules` in the source sweeps, a positionally-aimed board-union match, an exact `nodes.length === 9` pin, the OS-native path clause, and two self-satisfying or mislabelled legs. | Close each with one assertion or one fixture row; relabel the two legs to what they actually prove. | 52/04 | resolved — all 15 applied |
| F-52-04-H | process | blocker | **Milestone-level, not 52/04's authorship.** Stories 00/01/02 shipped 1,176 lines of `src/` and zero test suites; their 15 `@executable` features (323 scenarios) are mechanised by nothing on disk, while this document records per-feature *"fixture … green"* for each. | Route out of this story — its ownership row forbids the files and it is a milestone-close decision. Recorded in `TECH_DEBT.md` item 48 and `STATE.md` `## Feedback (for retro)`. | 52 (milestone) | **routed — story 52/05 added 2026-08-15 to land the suites; still blocks milestone acceptance until it is done** |

## Story 04 gate

- Validity lane: `aof work validate 52/04` → **PASS** (`52/04 is well-formed.`).
- Executable lane: 19/19 assertions green across the nine suites; the two shared repo gates 4/4 and 4/4.
- Agent-only layer: all five executable contracts map to a suite that exists on disk **and** is
  registered in `scripts/test.mjs` — the standard F-52-04-H shows was not met for 00/01/02.
- Reviews: architect **FAIL → resolved**, QA **PASS-WITH-FINDINGS → resolved**; every finding above is
  either fixed-and-mutation-verified or routed out with a named home.

## Story 04 accept decision

**Story 52/04 accepted.** All five executable task contracts are green and re-runnable, the blocker it
introduced into a shared repo gate is fixed, the six structural/behavioural majors are fixed and each
verified by the mutation it exists to catch, and no finding owned by this story remains open. F-52-04-H
is recorded against the milestone, not this story.

---

### Story 05 · The behavioural suites — **ACCEPTED**

Contract: six `@executable` task features; no `@manual`, `@uat`, UI, or design-conformance lane. The
evidence corrections above are this story's deliverable, so its own accept decision is written at
`aof:verify`. Coverage is traced by `test/work-loops-coverage-ledger.test.mjs` rather than asserted in
prose: 323 scenarios and 461 rows across 28 tables, each with a deciding assertion or a resolving
exclusion.

**Run at `aof:verify`, 2026-08-15 — the numbers below are this session's measured run, not the build
session's.** A focused runner imported the six suites and the eleven gates and applied the shared
runner's own per-test hermetic `AOF_GLOBAL_HOME` (the full suite is not runnable on this node —
`global-work-propagation.test.mjs` binds `:4182`, held by the live control daemon). Re-run after the two
contract corrections applied below, and green both times.

| task feature | the suite it landed | cases | green at verify | its own contract is mechanised by |
|---|---|---|---|---|
| `00_loader-record-suite` | `test/work-loops-record.test.mjs` | 35 | 35/35 | `loops-record/00 …` meta-case (public-loader subject + non-vacuous fixtures) |
| `01_loader-value-suite` | `test/work-loops-value.test.mjs` | 27 | 27/27 | `loops-value/05 …` meta-case (Field/Endpoint subject, positive controls, identity resolution) |
| `02_checks-suite` | `test/work-loops-checks.test.mjs` | 27 | 27/27 | `loops-checks/05 …` meta-case (every negative controlled, every assertion id-scoped) |
| `03_command-family-suite` | `test/work-loops-commands.test.mjs` | 26 | 26/26 | `loops-commands/05 …` meta-case (the spawn/in-process split, 34 spawns ledgered) |
| `04_registry-census-suite` | `test/work-loops-registry-census.test.mjs` | 15 | 15/15 | `loops-census/04 the census pins the thesis and bounds the incidental` |
| `05_coverage-ledger-and-evidence` | `test/work-loops-coverage-ledger.test.mjs` | 9 | 9/9 | its own nine legs, each proved non-vacuous by a planted defect |

**139 behavioural cases, 0 failures.** The `02_checks-suite` row reads **27**, not the 26 the story's
build-time table recorded — F-52-05-E's fix moved one scenario from `excluded` to `decided` and added the
case that decides it, so the count moved with it. Counted at verify by running them.

**The gate lane, re-run at the same time — 26 assertions, 0 failures.** The nine `test/arch/acd-loop-*`
fitness functions carry **18** legs (2·2·2·2·2·2·1·2·3, the `1` being FF-5207 after its absent-registry
leg was retired into `test/work-loops-commands.test.mjs`), and the two shared repo gates the milestone
touches — `acd-test-suite-registration` (the orphan + m47 positional-slice ratchet) and
`acd-work-command-cli-bijection` — are 4/4 and 4/4. Both shared gates are green **on this tree**, which
is the claim 52/04's own retro note says a focused run does not give you for free.

Shared and not a suite: `test/support/loop-registry-fixture.mjs`. Registered in `scripts/test.mjs` by
explicit import **and** spread (TECH_DEBT item 50: the orphan gate keys on the runner's text, so an
imported-but-never-spread suite would read green there while never running).

**Stated deliberately: story 05's own 91 scenarios are NOT scenario-traced by the ledger** — it audits
the 15 covered features plus the census's 5, which is the coverage the story exists to produce. Each of
the six is mechanised by the meta-case named above, and the ledger is itself proved non-vacuous by
planted defects rather than by a second ledger auditing the auditor. Recording the boundary here is the
point: an untraced instrument is exactly F-52-04-H's shape at one further remove, and it is carried
knowingly rather than discovered later.

## Story 05 findings — **as raised at build**; the triage ruling is the table after this one

Four contract defects, **none a source defect**. In every case the suite drove the shipped behaviour and
recorded the disagreement; no `.feature` was rewritten to match the code and no `src/` line was edited.
The `status` column below is the status **as the build left it**; every row is ruled at
`## Story 05 triage` below, and none is left open unruled.

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-52-05-A | contract | major | `01_loops-validate.feature`'s `ran` table row 3 — *"3 well-formed records, nothing to report → every entry `{ran:true, findings:0}`"* — **cannot be satisfied by any non-empty registry**. `checkGrounding` (`src/work-loops-checks.mjs:185-199`) maps EVERY strongly-connected component to a finding, grounded or ungrounded; there is no silent branch. Measured on the cleanest registry the vocabulary permits: loader lane 0, four checks 0, grounding 3. | The code matches ADR-005's per-component verdict and the census's 2-grounded/7-ungrounded split, so the **row is wrong, not the check**. The row is driven for what is decidable (loader lane silent, every check ran, the four checks the row is about report zero). | 52/02 contract | open — awaiting a ruling on the row's wording |
| F-52-05-B | contract | minor | `02_field-value-grammar.feature:249` and `:253` print `measurement \| unknown` and `actuator \| unknown` against `loop-bad-value`; the loader emits `loop-expected-list`. The same table's preamble (`:225`) fixes *"evaluation stops at the FIRST gate that fails"*, and its own `reference \| module:…#isRetryable` row (`:244`) maps a bare scalar on a list key to `loop-expected-list`. | The loader is right: the shape gate is reached first. The stated finding is the verdict for the bracketed `[unknown]` form. Both forms are driven and annotated `conflict`. | 52/00 contract | open |
| F-52-05-C | contract | minor | `05_story_behavioural-suites/tasks/04_registry-census-suite.feature:135` gives the authority for the `loop-self-referential-edge` claim as *"ADR-013 §3's independence rule"*. ADR-013 §3 (`ARCHITECTURE.md:1760`) is the **definition test** — *"declared here, never exported here"*; the independence rule is **ADR-011 §9** (`ARCHITECTURE.md:1169`). | Citation only — no measured value moved; all 18 refine-time census values re-measured identically. The census ledger names ADR-011 §9. | 52/05 own contract | open |
| F-52-05-D | contract | minor | `STORY.md` and `05_coverage-ledger-and-evidence.feature:22,44` both say *"461 rows across 24 tables"*. Measured **four** times — by parsing the fifteen features, by summing the five suites' `coverage.tables`, and independently by the architect's and QA's own parsers — the answer is **28 tables / 461 rows**. Root cause (architect): two divergent Gherkin parsers in the tree, one anchoring `/^\s*Examples:\s*$/` (strict → 21 tables/415 rows) and one `/^\s*Examples:/` (permissive → 28/461); 52/02 titles its tables. | The two load-bearing numbers (323 scenarios, 461 rows) are exact; only the table count was wrong. `STORY.md` corrected in place; the ledger's non-vacuity leg pins 28; the divergent parsers are given one home. | 52/05 own contract | **open (feature text)** — `STORY.md` and the code corrected; `05_coverage-ledger-and-evidence.feature` still reads 24 and is the behavioural contract, so the wording is the PO's to rule on |
| F-52-05-E | coverage | major | The `code` component of the frozen `(path, code, message)` finding order, stated at `05_frozen-finding-codes.feature:104`, was decided by **neither** instrument: the checks suite ledgered it `structural-duplicate → FF-5209`, and FF-5209 does not catch it either — both write a self-consistent assertion over a fixture where code-order and message-order never disagree. Proven observable by QA mutation C11 (dropping the `code` tiebreak from `compareFindings`, `src/work-loops-checks.mjs:79-83`) surviving all six suites AND all nine gates. | **This story's own species** — an exclusion whose pointer resolves *by name* while the claim is computed by nothing, which is precisely what F-52-04-H was. Fixed here: a fixture whose grounded component's least member sorts after an ungrounded one's, the scenario moved from `excluded` to `decided`, and the `structural-duplicate` ceiling ratcheted down. | 52/05 | resolved at review |
| F-52-05-F | contract | minor | Three boundary classes are absent from the accepted features' case tables and therefore from every suite, each demonstrated by a surviving mutation: `periodic:0s` (the `amount > 0` guard, `src/work-loops.mjs:241`) loads as a clock with `ms: 0`, which would divide by zero in `checkTimescale`; the `Number.isSafeInteger(ms)` overflow guard has no row anywhere; and `module:abc` with no `#` parses as `{operand:"ab", symbol:"abc"}` (`:199`). | Case-design gaps in `02_field-value-grammar.feature:255-260`, not source defects — the shipped guards are correct and the mutations only prove nothing *asserts* them. Rows proposed by QA. **Flagged, not fixed:** adding assertions for behaviour no feature states would put the suite ahead of its contract, which the ledger's set-equality forbids. | 52/00 contract | open |
| F-52-05-G | contract | minor | Two more uncovered classes, same shape: `controlled: module:foo` — a reserved prefix that fails its own grammar — falls through to `phrase` instead of `loop-bad-value` (`02_field-value-grammar.feature:229-238` has six `controlled` rows, none of them this); and `--id` exact-vs-substring matching is stated by neither `00_loops-show.feature:151-165` nor the suite, so `--id loop:a` matching `loop:ab` would go unnoticed (`src/commands/loops-show.mjs:21`). | Same triage as F-52-05-F: contract gaps in accepted stories, flagged rather than silently covered. Fixtures proposed by QA (`loop:a` beside `loop:ab`; a `controlled \| module:foo` row). | 52/00 + 52/02 contracts | open |

## Story 05 triage

**PO ruling, inline (`work.agents.productOwner: "inline"`), 2026-08-15.** Every one of the seven is a
**contract** finding — six against `.feature` text, one against an instrument — and **not one is a source
defect**: the loader, the five checks and the three verbs behaved as ADR-specified under 139 behavioural
cases. **No finding is a blocker**, so none routes back through `aof:continue`, and milestone acceptance
is not held by any of them.

The split that decides each row is *whose contract it is*. A finding against **story 05's own** features
is corrected here, at the gate that accepts story 05. A finding against an **already-accepted** story's
contract (52/00, 52/02) is **ruled here and its edit deferred** — rewriting a closed story's acceptance
criteria at its successor's accept gate is the "quietly rewriting the scenario to match the code" that
this story's own acceptance forbids, and it is not needed for safety: the disagreement is already driven
**both ways** on disk, so nothing about it is unfalsifiable.

| id | ruling | action taken at verify | status |
|---|---|---|---|
| F-52-05-A | **The row is wrong, the check is right.** `checkGrounding` emitting one verdict per strongly-connected component is ADR-005 as written, and it is the same behaviour the day-one census pins (2 grounded / 7 ungrounded). No non-empty registry can produce the row's all-zero result. | Ruled, edit **deferred** to `TECH_DEBT.md` item 53 — 52/02's contract, and the suite already drives the row for everything that IS decidable. | **ruled — correction deferred (TECH_DEBT 53)** |
| F-52-05-B | **The loader is right, the two cells are wrong.** The table's own preamble fixes the precedence (*"evaluation stops at the FIRST gate that fails"*) and its own `reference \| module:…#isRetryable` row applies it; a bare scalar on a list key never reaches the value grammar, so `loop-expected-list` is the only verdict available. | Ruled, edit **deferred** to item 53 — 52/00's contract; both readings are driven and annotated in `test/work-loops-value.test.mjs`. | **ruled — correction deferred (TECH_DEBT 53)** |
| F-52-05-C | **Citation only** — the independence rule is ADR-011 §9, not ADR-013 §3 (which is the definition test). No measured value moves. | **Corrected in place** at verify: `tasks/04_registry-census-suite.feature` now cites ADR-011 §9, matching the census suite. Story 05's own file. | **resolved** |
| F-52-05-D | **28 tables, not 24** — measured four independent ways, all agreeing. The two load-bearing numbers (323 scenarios, 461 rows) were always exact. | **Corrected in place** at verify: the three remaining `24`s in `tasks/05_coverage-ledger-and-evidence.feature` (`:18`, `:22`, `:44`) now read `28`, with the correction stated in the feature. `STORY.md` and the ledger already read 28. Story 05's own file. | **resolved** |
| F-52-05-E | **The instrument was the defect, and it was this story's own species.** A pointer that resolves by name proves spelling, not coverage. | Fixed at review with a discriminating fixture; the scenario moved `excluded` → `decided` and the `structural-duplicate` ceiling ratcheted 65 → 64. Re-verified green here (the checks suite is 27 cases, one more than the build-time table recorded). | **resolved** |
| F-52-05-F | **The guards are correct and nothing asserts them.** Three boundary classes (`periodic:0s`, the `Number.isSafeInteger(ms)` overflow guard, `module:abc` with no `#`) are absent from 52/00's case tables, so they are absent from the suite by set-equality — adding the assertions without the rows would put the suite ahead of its contract. | Ruled, **deferred** to item 53 as a case-design gap against 52/00's contract: the rows come first, the assertions follow them. | **ruled — deferred (TECH_DEBT 53)** |
| F-52-05-G | Same shape as F. `controlled: module:foo` falling through to `phrase`, and `--id` exact-vs-substring, are each stated by no feature. | Ruled, **deferred** to item 53 against 52/00's and 52/02's contracts. QA's fixtures are recorded there so the work is mechanical when it is picked up. | **ruled — deferred (TECH_DEBT 53)** |

**F-52-04-H — the milestone-level blocker — is RESOLVED by this story.** It was the one open blocker
against milestone 52. Its close condition was named in its own routing: *"story 52/05 added 2026-08-15 to
land the suites; still blocks milestone acceptance until it is done"*. Measured at this gate: all fifteen
`@executable` features of 52/00, 52/01 and 52/02 now carry a `verifies →` line naming a suite path that
**exists on disk and is imported and spread in `scripts/test.mjs`**, and that correspondence is itself
re-derived on every run by `test/work-loops-coverage-ledger.test.mjs` leg 9 rather than trusted from this
document. `TECH_DEBT.md` item 48 is CLOSED against the landed suites; **its ratchet stays open** — making
`aof:verify` itself require an executable evidence pointer belongs to the aof product, not to this
milestone, and closing the item does not close it.

## Story 05 gate

- Validity lane: `aof work validate 52/05 --json` → **PASS** (`[]`).
- Executable lane: **139/139** behavioural cases green across the six suites, re-run after the two
  in-place contract corrections; **26/26** gate assertions green (18 loop fitness-function legs + the two
  shared repo gates at 4/4 and 4/4), so the tree's shared ratchets are green, not just the story's own.
- Agent-only layer: every one of the story's six `@executable` features maps to a suite that exists on
  disk **and** is registered — and, uniquely in this milestone, that mapping is mechanised rather than
  asserted. Litmus clean: the suites drive the exported loader, the five exported checks and the three
  registered commands through their public contracts, and re-assert none of 52/04's structural
  invariants.
- Health lane: `aof work doctor 52 --json` → **healthy, 0 errors**, 3 advisory warnings after this
  accept's `updated:` bumps cleared the `mtime-ahead-of-updated` one: a pre-existing `numbering-gap`
  (top-level numbers 29/30/31/42 missing) and two `doc-over-budget` advisories, on `ARCHITECTURE.md`
  (2016 lines) and this story's `STORY.md` (332 lines).
- Reviews: `aof-architect` and `aof-qa` both reviewed at build; the architect's finding became TECH_DEBT
  item 52 (ratchet scoped to a file, not a species) and QA's mutation pass produced F-52-05-E. No review
  finding is open.

## Story 05 accept decision

**Story 52/05 accepted.** All six executable task contracts are green and re-runnable, the two findings
against its own contract are corrected in place, the five against other stories' contracts are ruled and
routed with a named home, and no blocker remains open. Its deliverable — the evidence for 52/00, 52/01
and 52/02 — is on disk, registered, and traced by an instrument that re-derives the traceability on every
run.

---

## Milestone gate

- Validity lane: `aof work validate 52 --json` → **PASS** (`[]`).
- Stories: **all six done** — 00, 01, 02, 03 and 04 accepted 2026-08-14; 05 accepted here.
- Executable lane, whole milestone: **165 assertions green, 0 failures** — 139 behavioural cases across
  the six suites plus 26 gate assertions, all run in this session under per-test hermetic
  `AOF_GLOBAL_HOME`. The full suite is not runnable on this node (`global-work-propagation.test.mjs`
  binds `:4182`, held by the live control daemon), so the focused runner imports the suites the way
  `scripts/test.mjs` does; the two shared repo gates were run against this tree for exactly the reason
  52/04's retro note gives.
- Lanes not in scope: there is **no `@manual` and no `@uat` scenario anywhere in this milestone** — all
  25 task features are `@executable` — and no UI surface, so no human sign-off and no design-conformance
  review apply. `STATE.md`'s `## Verification` third box (*"`@manual` signed off — see `UAT.md`"*) was
  template residue for a lane this milestone never had; it is corrected at compaction rather than left
  as a permanently unticked box.
- Findings: **11 raised across the milestone; 0 open blockers.** Seven resolved (F-52-00-A/B, F-52-02-A,
  F-52-03-A, F-52-05-C/D/E), one resolved by the story that was created for it (F-52-04-H), and four
  ruled with their edits deferred to `TECH_DEBT.md` item 53 (F-52-05-A/B/F/G) — every one of those four a
  `.feature` wording or case-design gap in an already-accepted story, none a source defect.

## Milestone accept decision

**Milestone 52 accepted, 2026-08-15.** aof's improvement machinery is now a declared, traversable,
checkable artifact: nine records (seven loops, two actors) that load with zero errors, five structural
pathologies computed as algorithms over the declared graph, three registered `work:loops` verbs with
frozen `--json` contracts, a deterministic Mermaid rendering, nine fitness functions holding the
structure, and six behavioural suites holding the behaviour. The milestone's headline claim — *three
declared optimizers, all unpaired, because the registry declares no monitoring edge at all* — is
computed on the real registry by `test/work-loops-registry-census.test.mjs`, not asserted in prose.

The milestone is accepted on evidence that can be re-run, which was in doubt for a day and is the reason
story 05 exists. It ships with the day-one warnings intact by design: six unknown owners, two uncapped
ceilings, three unpaired optimizers, and two declared edges in the whole registry. That is the
deliverable working — the addressable list of what aof does not know about its own machinery, and
milestone 58's inbox.
