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
# 58 · Supervising loops — Verification

<!--
  OPENED AT REFINE (2026-08-28), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept decision
  to write — and an empty "None" placeholder is not information. Those three sections are authored by
  `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eight controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 58` reports as
  `verification-register-missing`. Every row's red-probe cell holds the frozen placeholder, which
  reads as a MISSING probe — the honest state at refine, and the state each row leaves the moment its
  arch-test lands and is observed failing.

  FOUR OF THE EIGHT EXTEND A GUARD ALREADY IN SERVICE — FF-5802 (52's timescale-comparability guard),
  FF-5803 (52's finding-envelope guard), FF-5804 (52's purity guard) and FF-5807 (52's vocabulary
  guard). Their cited files resolve today, so `control-unresolved` will never fire for them and the
  red probe is the ONLY evidence the extension is armed. An extension never observed failing is
  indistinguishable from one never written, so each of those four probes must show the NEW leg going
  red while its host legs stay green.

  THREE PROBES CARRY AN OBLIGATION THE OTHERS DO NOT:
  · FF-5801's ADDITIVE leg. Widening an enum is trivially green against new records, so the probe
    must show the guard failing when a record milestone 52, 55 or 57 delivered stops parsing — that
    is the leg protecting the fourteen installed files.
  · FF-5802's REGRESSION leg. The layer axis claims to be additive over the cadence axis, so the
    probe must show the guard failing when the no-layer cross-product moves — not merely when a new
    layer rule is wrong.
  · FF-5806 asserts a CLEAN registry, and a guard that passes because it looked at nothing is the
    failure mode 56 documented at scale. Its probe must show it going red when a shipped loop's
    ownership edge is removed, and its non-vacuity leg must show the census itself was walked.
-->

## Fitness functions

<!-- THE RED-PROBE REGISTER. This block CITES: every row resolves to a declaration in the sibling
     `ARCHITECTURE.md` `## Fitness functions` register and declares nothing of its own. Each row
     writes its id ALONE in the first cell, the positional form both registers share.

     The `red probe` cell records what was changed to make the control fail, and the message
     observed. A control must fail when the invariant it guards is broken, so the probe is that
     assertion's positive control. A guard whose passing state is "found nothing" is
     indistinguishable from a broken one by every signal except a red probe.

     An untouched placeholder cell is a MISSING red probe rather than a recorded one, and a control
     whose file has not landed is declared `pending` in `ARCHITECTURE.md`. What clears a `pending`
     is landing the file or dropping the declaration, never re-marking it `pending`.

     FF-5809 WAS ADDED DURING THE REFINE, not at its start, and the reason belongs with it: the
  developer sweep found that three suites assert "every record already on disk still parses exactly
  as it did" over a HAND-LISTED subset of the registry that excludes the record their own new
  endpoint resolves to. That claim is only meaningful over a subset closed under the endpoints its
  members declare. 55 and 57 each paid this by hand; 58 is the third, which is the ratchet threshold.

  OWNERSHIP AT REFINE: 58/00 carries FF-5801, FF-5802, FF-5807 and FF-5809; 58/01 carries FF-5806;
     58/02 carries FF-5803, FF-5804 and FF-5805; 58/03 carries FF-5808. FF-5802's two halves land
     with different stories — the loader half with 58/00, the check half with 58/02 — so the row is
     probed twice and the second probe records which legs the first could not reach. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-5801 | `test/arch/acd-arbiter-taxonomy-additive.test.mjs` | **PASS** — 5/5 | **The ADDITIVE leg, probed on the corpus it protects.** `NODE_KINDS` narrowed from five frozen literals to four in `src/work-loops.mjs:102` — the fifth kind REPLACING the fourth instead of widening past it, which is the exact non-additive slip this control exists to refuse. RED on three legs. The vocabulary leg named the deletion (*five frozen literals, the fifth appended* — `- 'watcher'`), and the leg that matters here went red on **57's frozen signature over the fourteen pre-58 records**: `each reports the same finding codes, in the same counts, as it did before the widening` — `+ 'autonomous-cascade-watcher.md:loop-bad-value:?'`, `+ 'build-to-green-watcher.md:loop-bad-value:?'`, `+ 'review-fix-rereview-watcher.md:loop-bad-value:?'`. Three records milestone 57 delivered stop parsing, named individually rather than as a count. The `resolves`/`counter` parity leg went red too, which is the one-branch ruling reporting itself. Restored byte-exactly (sha256 `2bfa7b2f…`); re-run 5/5 green. |
| FF-5802 | `test/arch/acd-loop-timescale-comparability.test.mjs` *(extended)* | **PASS** — 3/3, the 58 leg among them (58/00 + 58/02) | **Probe 2 of 2, the REGRESSION leg the first could not reach.** `MIN_SEPARATION_RATIO` 3 → 2 in `src/work-loops-checks.mjs:102` — a pure CADENCE-axis move, no layer touched, so it perturbs the no-layer cross-product itself rather than a new layer rule. RED: `arch/58 FF-5802: … an edge inverted on both axes is reported once on each — + actual - expected [ 'loop-layer-inversion', -'loop-timescale-inversion' ]`. Both 52 host legs (`the closed cadence cross-product…`, `actor, dangling, extra-registry and self edges…`) stayed GREEN, which is the extension-armed shape this register demands. Restored byte-exactly; re-run green. |
| FF-5803 | `test/arch/acd-loop-finding-envelope.test.mjs` *(extended)* | **PASS** — 4/4 | Removed `"loop-layer-undeclared"` from `GATING_CODES` (`src/work-loops-checks.mjs:93`) — a demotion of one of this milestone's own promoted codes. RED on two legs: `arch/57 FF-5703: the frozen gating set alone controls check severity and only the face owns exit` and `arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering`, each on a deep-equal of the code set. The extension is armed rather than inherited: the suite asserts `GATING_CODES.size === 13` and names `loop-unowned-reference`, `loop-layer-undeclared` and `loop-layer-contradicts-cadence` by literal (`:406-416`), so 57's five-member assertion is superseded, not merely re-run. Restored byte-exactly; re-run green. |
| FF-5804 | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* | **PASS** — 5/5 | Prepended `import { readFileSync } from "node:fs";` to `src/work-loops-checks.mjs` — the one thing the leaf is defined by not doing. RED on four legs across three milestones, the 58 one among them: `arch/58 FF-5804: supervision is computed rather than self-declared, and the checks leaf still imports nothing` — *the checks leaf still has zero imports*; plus `arch/52 FF-5205`, `arch/55 FF-5503` and `arch/57 FF-5702`. The zero-import leg is a stricter statement than the enumerated-module regexes it sits beside, and it is the one this story extends. Restored byte-exactly; re-run green. |
| FF-5805 | `test/arch/acd-arbiter-records-the-tradeoff.test.mjs` | **PASS** — 3/3 | Replaced the entitlement test `if (covering.some((node) => node.kind === "arbiter")) continue;` with `if (covering.length > 0) continue;` (`src/work-loops-checks.mjs:644`) — restoring exactly the pre-58 behaviour where any non-contending node that vetoes every contender clears the actuator. RED: `arch/58 FF-5805: a shared actuator clears only on a non-contending node whose KIND is arbiter` — *actor: a non-contending node of this kind does not clear the shared actuator, 0 !== 1*. The other two legs (priority permutation; `isGraphNode` over `NODE_KINDS`) stayed green, so the probe reached the entitlement clause alone. Restored byte-exactly; re-run green. |
| FF-5806 | `test/arch/acd-day-one-supervision-complete.test.mjs` | **PASS** — 7/7 | **A shipped loop’s ownership edge removed, and the census proved non-vacuous by naming the loop.** `target-setting: [loop:build-to-green, loop:review-fix-rereview]` → `[loop:review-fix-rereview]` in `src/bundle/loops/autonomous-cascade.md:15`. RED on three legs. The census leg: `loop:build-to-green: exactly one node sets its reference, found [] — 0 !== 1` — it walked every declared loop and named the one that lost its edge, so the guard is not passing because it looked at nothing. The layer-separation leg enumerated what survived (`the two loop-to-loop edges this milestone authored, both management -> operational`, `- 'loop:autonomous-cascade -> loop:build-to-green'`). And the gating leg produced the real finding: `loop-unowned-reference — loop:build-to-green has no inbound target-setting edge from another node`, severity `error`. Restored byte-exactly (sha256 `aae8f0f0…`); re-run 7/7 green. |
| FF-5807 | `test/arch/acd-loop-vocabulary-closed.test.mjs` *(extended)* | **PASS** — 2/2 | **The extension alone, on a guard already in service.** `COMPOSED_CHECK_IDS`’ members reordered — `reference-ownership` and `actuator-arbitration` swapped in `src/work-doctor-loop-ready.mjs:17-18` — a same-membership, different-order drift, which is the weakest form of the divergence and therefore the honest probe. RED: `arch/52 FF-5203: all thirteen exported vocabularies equal the governing ADR literals` — *the six check ids have one authority; work-doctor-loop-ready’s copy must not drift from it*, on a deep-equal that printed the two ids transposed. The host 52 legs in the same assertion (the thirteen vocabularies, the precedence-selected finding) stayed green, so the probe reached the new leg and only it. Restored byte-exactly (sha256 `dcd5627a…`); re-run 2/2 green. |
| FF-5808 | `test/arch/acd-loop-graph-kind-legible.test.mjs` | **PASS** — 4/4 | **Probed with the defeater the control was written against, and leg (a) stayed GREEN.** `KIND_SHAPES`’ `arbiter` entry given the undeclared-endpoint glyph — `['{"', '"}']` → `['[/"', '"/]']` in `src/commands/loops-graph.mjs:37`. RED on leg (b): `arch/58 FF-5808 (b): no declared kind borrows the shape an endpoint nobody declares is given` — *arbiter: a declared kind may not be drawn as an endpoint no record declares — that is the collision this control repairs*; and on the determinism leg, which printed the swap. **Leg (a) did not fail** — five kinds still carried five distinct shapes, because the borrowed glyph is not any other kind’s. That is the register’s own condition demonstrated rather than argued: cardinality alone is satisfied by the exact collision this control exists to catch, and the second leg is what makes the guard real. Restored byte-exactly (sha256 `a4aa2b72…`); re-run 4/4 green. |
| FF-5809 | `test/arch/acd-registry-fixture-closed.test.mjs` | **PASS** — 3/3 | **The closure step disabled, and the guard’s own non-vacuity leg caught it first.** The transitive enqueue short-circuited in `test/support/registry-fixture.mjs:116` (`if (target && …)` → `if (false && target && …)`), leaving a helper that copies exactly what it is handed. RED on two legs: `the helper closes a seed set under the endpoints its members declare` — *at least one shipped record names another, so the closure is exercised and not vacuous*; and `no fixture the helper builds reports a dangling endpoint` — `loop-graph-dangling-endpoint — Endpoint does not name a declared node: loop:autonomous-cascade` on `autonomous-cascade-watcher.md`, which is precisely the hand-listed-subset defect 55 and 57 each paid by hand. Restored byte-exactly (sha256 `fb8b3a6f…`); re-run 3/3 green. |
| FF-5810 | `test/arch/acd-day-one-supervision-complete.test.mjs` *(extended)* | **PASS** — 8/8, the 58 leg among them | **Two probes, one per leg, because the control has two and one would arm only half of it.** **A — the DEFINING-LINE leg, in its weakest form.** `isLegalTransition` re-cited from `src/run-store.mjs:281` to `:280` in `run-resilience.md` — off by ONE, not by the +175 the real defect carried, because a probe that only fires on a large delta says nothing about a small one. RED: *every cited defining line is the symbol’s own export line* — `+ 'run-resilience.md: \`isLegalTransition\` cited at src/run-store.mjs:280, export is at :281'`. **B — the IN-RANGE leg**, which the first probe leaves untouched: one range end pushed past EOF (`src/run-store.mjs:344-362` → `344-99999`). RED: *every cited path exists and every cited line is within it* — `+ 'run-resilience.md: src/run-store.mjs:344-99999 past EOF (1120 lines)'`. Both restored byte-exactly against a sha256 taken before (`818c7dc7…`); re-run 8/8 green. **The non-vacuity legs are the third guard and they earned their place at this gate**: a mangled `\b` in the symbol pattern made the predicate match nothing, and `non-vacuous: 0 defining-line claims examined` refused the suite rather than reporting a clean registry — the exact “passes because it looked at nothing” failure this register exists to catch, caught on the control written to catch it. |

## Verification evidence

<!-- 58/02, verified 2026-08-29. The story is all `@executable` — six task features, no `@manual`
     scenario and no `@uat`, and the milestone declares no UI surface — so the human lane and the
     design-conformance lane do not apply and are not written. Scoped to the STORY: its own suites,
     the fitness functions it carries, and the two repo-wide ratchets its own review recorded as red.
     The full suite runs once, at the milestone gate. -->

**The story's lane: 104 tests, 0 failures.** Run as a focused test-array import (the full suite binds
`:4182`, which the live control daemon holds), each test under its own `AOF_GLOBAL_HOME`.

| lane | tests | result | verifies → |
|---|---|---|---|
| `test/work-loops-checks.test.mjs` | 32 | green | `tasks/00`, `tasks/01`, `tasks/02`, `tasks/03` — the four axis/crossing/entitlement/sources Examples tables |
| `test/work-loops-commands.test.mjs` | 26 | green | `tasks/04` — the promoted severities as the two command faces project them |
| `test/work-loops-registry-census.test.mjs` | 15 | green | `tasks/04` — the census over the shipped registry under the new severities |
| `test/watcher-independence-gate.test.mjs` | 7 | green | `tasks/04` (severity frozen by code, face-only exit) + the story's traceability leg |
| `test/arch/acd-loop-timescale-comparability.test.mjs` | 3 | green | `FF-5802`, `tasks/00` |
| `test/arch/acd-loop-finding-envelope.test.mjs` | 4 | green | `FF-5803`, `tasks/04` |
| `test/arch/acd-loop-checks-pure.test.mjs` | 5 | green | `FF-5804` |
| `test/arch/acd-arbiter-records-the-tradeoff.test.mjs` | 3 | green | `FF-5805`, `tasks/02`, `tasks/05` |
| `test/arch/acd-loop-vocabulary-closed.test.mjs` | 2 | green | `FF-5807` (58/00's, re-run because this story edits the codes it counts) |
| `test/arch/acd-day-one-supervision-complete.test.mjs` | 7 | green | `FF-5806` — 58/01's records read through 58/02's promoted severities |

**Every scenario is traced to a named authority, and the trace is itself a control.** The story's six
features carry **61 scenarios and 18 Examples blocks / 128 rows**, and
`watcher-independence/traceability 58/02's six features map to five named authorities, and every one of
them resolves` binds each block to a test BY NAME, resolves that name against the array that exports
it, and parses `scenarios` and `rows` from the feature on disk — so a scenario added, deleted or moved
reddens the leg rather than going quietly undriven. Its non-vacuity leg asserts the map spans **five
distinct authorities**, so it cannot be satisfied by pointing everything at one suite. No scenario in
this story is covered only by inference.

**The gate was measured on the real registry, not on fixtures.** `aof work loops validate` over this
repository's installed `.aof/loops/`: **0 errors, 32 warnings**, exit 0. The three lanes this story
promotes to error — `reference-ownership`, `actuator-arbitration`, `timescale` — each `ran: true` with
**0 findings**. The ordering edge ADR-007 §5 names therefore held: promoting after 58/01's records
landed produces no red, where promoting before it would have delivered fifteen error-severity findings
for work that was merely unfinished.

**The timescale check now decides, and the pass is not vacuous.** The registry it decides over carries
7 loops, **7 declared layers** (1 governance / 2 management / 4 operational) and **5 records bearing
`target-setting` edges** — so there are real edges on the ordinal axis and the check walks them. Before
this story it had reported nothing since the day it shipped, because six of the seven loops have no
clock (`RESEARCH §Q2`) and the clock was the only axis it could read.

**`isGraphNode` now admits `arbiter`, which is what 58/01's review said only this story could fix.**
Measured through the delivered code: `actuator-arbitration` reports **0** where 58/01's review measured
**3**, and the grounding movements ADR-001 §5 predicted arrived with it — `loop-graph-ungrounded-component`
and `loop-graph-grounded-exogenous-only` now name `arbiter:speed-thoroughness-autonomy` as a component
the traversal can see. The four `@executable` criteria 58/01 could not satisfy are satisfied here.

**The two repo-wide ratchets this story's own review recorded as red are green.**
`test/arch/acd-test-suite-registration.test.mjs` (4/4) — including `F-47-04-ARCH-2`, the positional-slice
ledger that `acd-arbiter-records-the-tradeoff.test.mjs` tripped and that was repaired to `raw.split(":")`
— and `test/arch/acd-loop-suite-registration.test.mjs` (12/12), including `ACCEPT-02`, the milestone-53
digest ceiling over `acd-loop-finding-envelope.test.mjs` whose residue this story advances.


<!-- 58/00, 58/01 and 58/03, verified 2026-08-29 at the milestone gate. The milestone declares no UI
     surface and no `@uat` scenario anywhere in its seventeen features, so the design-conformance lane
     and the human lane do not apply and are not written. Exactly ONE `@manual` scenario set exists —
     58/01 `tasks/01` — and it was executed by a spawned `aof-developer` reporting evidence only; its
     two failing scenarios are re-confirmed below from the source rather than from the agent's account,
     and are logged as findings. -->

**58/00 — the story's lane: 100 tests, 0 failures.** Focused test-array import, each test under its own
`AOF_GLOBAL_HOME`.

| lane | tests | result | verifies → |
|---|---|---|---|
| `test/work-loops-record.test.mjs` | 42 | green | `tasks/00`, `tasks/01`, `tasks/02` — kind vocabulary, per-kind key admission, the four-keys-by-kind table |
| `test/work-loops-value.test.mjs` | 36 | green | `tasks/01`, `tasks/03` — the `resolves`/`dwell`/`layer` field grammars |
| `test/arch/acd-arbiter-taxonomy-additive.test.mjs` | 5 | green | `FF-5801`, `tasks/00`, `tasks/01`, `tasks/02` |
| `test/arch/acd-registry-fixture-closed.test.mjs` | 3 | green | `FF-5809` |
| `test/arch/acd-loop-vocabulary-closed.test.mjs` | 2 | green | `FF-5807` |
| `test/arch/acd-registry-framework-owned.test.mjs` | 4 | green | `tasks/00` — the framework's ownership of the shipped registry |
| `test/arch/acd-anchor-taxonomy-additive.test.mjs` | 3 | green | the 55 corpus the widening must not disturb |
| `test/arch/acd-watcher-taxonomy-additive.test.mjs` | 1 | green | the 57 corpus the widening must not disturb |
| `test/watcher-node.test.mjs` | 4 | green | the 57 kind, re-run because this story edits the enum it belongs to |

**58/01 — the story's `@executable` lane: 16 tests, 0 failures**, plus the registry measured directly.

| lane | tests | result | verifies → |
|---|---|---|---|
| `test/arch/acd-day-one-supervision-complete.test.mjs` | 7 | green | `FF-5806`, `tasks/00`, `tasks/02`, `tasks/03` |
| `test/work-loops-home-and-delivery.test.mjs` | 9 | green | `tasks/04` — the records are bundle assets and land through `aof work update` |

**58/03 — the story's lane: 30 tests, 0 failures.**

| lane | tests | result | verifies → |
|---|---|---|---|
| `test/loops-supervision-face.test.mjs` | 24 | green | `tasks/00` (13 scenarios + outline), `tasks/01` (11 scenarios + two outlines) |
| `test/arch/acd-loop-graph-kind-legible.test.mjs` | 4 | green | `FF-5808`, `tasks/01` |
| `test/arch/acd-loop-render-deterministic.test.mjs` | 2 | green | `tasks/01`'s untouched-fallback row — the suite this story `reads:` and must not move |

**Every declared control is now armed, and five of the ten were probed at this gate.** `FF-5801`,
`FF-5806`, `FF-5807`, `FF-5808` and `FF-5809` each carry a red probe recorded above: a real mutation of
shipped source, the observed message quoted, the file restored byte-exactly against a sha256 taken
before the mutation, and the suite re-run green. `FF-5802`–`FF-5805` were probed at 58/02's gate.
`FF-5810` has no probe because it has no implementation — `F-58-1`.

**The gate turns on green over the real registry, and the numbers the milestone predicted are the
numbers it produced.** `aof work loops validate` over this repository's installed `.aof/loops/`:
**0 errors, 32 warnings, exit 0** — the exact accept criterion STATE recorded at refine (39 → 36 after
58/01 → 32 after 58/02). Zero `loop-unowned-reference` (was 5), zero `loop-shared-actuator-unarbitrated`
(was 3), zero findings from the timescale lane. The 32 that remain are 12 `loop-field-prose-only`, 6
`loop-owner-unknown`, 6 `loop-graph-grounded-exogenous-only`, 4 `loop-graph-ungrounded-component` and 4
`loop-anchor-absent` — every one of them a `warn` this milestone never claimed to clear.

**The grounding movement ADR-005 §6b predicted is visible by name, not by total.**
`loop:verify-triage-accept` now reports as a `loop-graph-grounded-exogenous-only` component, where the
interim state had it at `self-referential` — the worst verdict in the taxonomy — because its only path
to ground runs operator → arbiter → veto and the arbiter was not yet in the traversal.
`arbiter:speed-thoroughness-autonomy` appears as a component the traversal can see. A named verdict
flipping is the evidence here rather than a total, because a total is consistent with several wrong
worlds.

**The registry ships and installs, byte-for-byte.** All 16 records in `src/bundle/loops/` are present
in `.aof/loops/` and every one compares identical; the bundle manifest registers 16 loop assets and
`.aof/aof.lock.json` carries 16 matching entries. 58/01 `tasks/04` exists because 57/05 was declined
for shipping records that were never installed, and the gate 58/02 turns on reads the installed copy.

**The face was exercised against the live registry, not only against fixtures.**
`aof work loops show --id loop:build-to-green` returns `loop:build-to-green · loop · Build executable
work to green · layer operational · reference set by loop:autonomous-cascade`, and `aof work loops
graph` renders all five declared kinds in five distinct glyphs — `["…"]`, `(["…"])`, `(("…"))`,
`{{"…"}}`, `{"…"}` — with `[/"…"/]` still carrying the `config:` endpoints it carried before.

**58/01's `@manual` lane: 6 of 8 scenarios PASS, 2 FAIL.** Executed by a spawned `aof-developer` over
the ten records in the story's `files:`; the two failures re-confirmed here from the source. PASS: an
authored edge declares itself authored (`operator.md:27`, `:36`, `:43`; `autonomous-cascade.md:44`;
`run-lifecycle-policy.md:14-15`); a discovered edge names its artifact; the reference no cycle revises
is carried by `anchor:run-lifecycle-policy` with `ground: frozen-rule`; that anchor's authority resolves
(`observes: module:src/run-store.mjs#isLegalTransition` → `src/run-store.mjs:281`, the exact `export`
line); and no authored edge offers a citation for the relation it decided. The Scenario Outline's seven
rows resolve one-for-one against the seven parsed `target-setting` edges, all `resolved: true`. FAIL:
*"no authority introduced by this story fails to resolve"* and Outline row 2 — `F-58-01-1` and
`F-58-01-3`.

## Findings

<!-- The register. The `id` ALONE in the first cell, allocated HERE by the single writer at the moment
     of landing — never read-then-allocated, because a stale read looks exactly like a fresh one. -->

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| F-58-02-1 | **`tasks/04`'s scenario *"a preference and an honest cannot-decide never stop the run"* has no satisfying registry — the contract is wrong and the code is right.** Confirmed independently at this gate, from the source rather than from the review's account: `loop-timescale-not-comparable` is emitted only when `!bothPeriodic && !bothLayered` (`src/work-loops-checks.mjs:756-768`), `checkTimescale` walks `kind: loop` nodes alone (`:702`), and `checkReferenceOwnership` emits `loop-layer-undeclared` for **every** loop whose layer rank is not a number (`:568-571`) — a code `GATING_CODES` promotes to `error`. So the scenario's second "only new finding" cannot be produced without producing a third that gates, and QA measured the registry the Given describes at `error 2 / warn 23`, exit 1, against a Then reading *"the run reports no errors"*. The feature **contradicts its own Examples table**, which lists `loop-layer-undeclared` at `error` eight lines below. | contract-defect | non-blocker (re-triaged from the review's **blocker** — see the ruling) | **PO ruling, given at this gate.** The delivered system is correct and the criterion describes a state the design deliberately makes unreachable; there is no in-story fix, because a delivered acceptance criterion is immutable and the reviewers routed this to the PO for a ruling rather than to the developer for a repair. The decidable half IS mechanised — both codes resolve to `warn`, neither is in `GATING_CODES`, neither contributes to `summary.error`, and the face-only exit leg is untouched. This is the **fifth instance of a species this repository has already ruled on**: `TECH_DEBT` item 53, *"ruled contract corrections — the wording is wrong, the code is right"*, whose own generalisation is *"an Examples table that contradicts its own preamble is two contracts, and the implementation follows the prose"*. Item 53's precedent is followed exactly: record the ruling, mechanise what is decidable, do not edit the closed contract. **The correction owed:** re-word the Given so it admits the gating third, at the item that next touches this contract | `58` (milestone gate, to file against `TECH_DEBT` item 53 — its one home for this species) | ruled 2026-08-29 |
| F-58-02-2 | **The story's `files:` frontmatter understated its write set by two, and both were forced.** `test/arch/acd-loop-suite-registration.test.mjs` (`ACCEPT-02`'s digest ceiling over `acd-loop-finding-envelope.test.mjs`, which this story legitimately edits) and `test/support/l3-gate-fixture.mjs` are modified in the tree and named in neither the frontmatter's ten files nor ADR-007 §3's table. This is the fourth of five partition failures on record for milestone 58. | record-drift | non-blocker | **corrected at this gate** — both paths added to `STORY.md`'s `files:`, making the declaration true rather than aspirational. The architect's proposed ratchet (a control comparing a story's declared `files:` against the paths its diff actually touches) is the recurrence fix and is the milestone's to route | `58` (architect) | closed 2026-08-29 |
| F-58-02-3 | **Four controls this story carries stood marked `pending` in `ARCHITECTURE.md` after their files had landed and gone green.** `FF-5802`, `FF-5803`, `FF-5804` and `FF-5805`. A stale `pending` is not cosmetic: it downgrades `aof work doctor`'s `control-unresolved` to `warn`, and a warn-only doctor result does not fail `aof:validate` — so a control whose file was later deleted would report as a warning rather than an error. | record-drift | non-blocker (accept rule) | **closed by the files having landed**, and the markers dropped at this gate — never re-marked `pending`, which is the one move that does not clear it. `aof work doctor 58/02` reports no `control-unresolved` at either severity | `58/02` | closed 2026-08-29 |
| F-58-02-4 | **Three test-local layer→rank maps restate `operational 0 / management 1 / governance 2` as a literal, unbound to the loader's private `LAYER_RANKS`.** In `test/work-loops-checks.test.mjs`, `test/arch/acd-loop-finding-envelope.test.mjs` and `test/arch/acd-arbiter-records-the-tradeoff.test.mjs`. Forced rather than careless: `FF-5802` requires the ordering to have exactly one home (`src/work-loops.mjs`), so a fixture cannot import the map it imitates. QA measured the drift exposure and it is largely covered — inverting the loader's map turns 13 suites red, `FF-5806`'s gate over the real shipped registry among them, so a divergence cannot survive to a green tree. | residual | non-blocker | defer. The residual is legibility, not coverage, and the obvious repair is the weaker claim: lifting the map into a shared test helper would make three fixtures agree with **each other** rather than with the loader. `acd-loop-timescale-comparability`'s `FF-5802` leg already asserts the loader's three literals against its own copy, which is the one real binding | backlog | open |
| F-58-02-5 | **`src/work-loops-checks.mjs` is 380 → 771 lines, +103% across two milestones, and the ruling that keeps it correct forbids the decomposition that would fix it.** 52/ADR-007's zero-import leaf property — the thing `FF-5804` exists to hold — means the module cannot be split into a leaf plus helpers without acquiring the one import it is defined by not having. Raised by the architect at this story's review. **Not a new species:** `TECH_DEBT` item 61 records exactly this shape for `phase-brief.mjs` (*"zero-import purity guard forbids the only decomposition that would fix its size"*, 432 → 1,067 lines in one story). Two instances now. | codebase-health | non-blocker | defer to the milestone gate, to be filed as a **second instance on item 61's one home** rather than as a sibling entry — the constraint, not the file, is the subject. Filed there alongside the architect's other two ledger corrections (`F-58-02-6`), which must be re-measured together | `58` (architect) | open |
| F-58-02-6 | **Two `TECH_DEBT` ledger entries are stale as of this story, and a third goes stale when 58/03 lands.** Item **64** records `test/work-loops-checks.test.mjs` at 2,116 lines; actual is 2,558. Item **66** gains a third home — this story's coverage ledger now lives in `test/watcher-independence-gate.test.mjs` (257 → 430 lines), outside the `work-loops-*` family entirely, a consequence of ADR-007 §3b assigning the traceability leg by file ownership rather than by subject. Item **65**'s per-kind builder counts are separately flagged by 58/03's review as needing re-measuring at accept. | ledger-drift | non-blocker | defer to the **milestone** gate deliberately, not filed here. Three of the four numbers move again as 58/01 and 58/03 land, so filing them story-by-story would half-file a set that must be re-measured as one. This finding is the route, so it is not lost | `58` (architect) | open |

| F-58-01-1 | **`tasks/01`'s scenario *"no authority introduced by this story fails to resolve"* FAILS: twelve of fifteen `` `<symbol>` at `<module>:<line>` `` claims name a line the symbol is not defined on, across three records this story edits.** Re-confirmed at this gate from the source rather than from the evidence agent's account: `src/run-store.mjs` defines `isLegalTransition` at `:281`, `isRetryable` at `:303`, `shouldRetry` at `:316`, `readRuns` at `:637`, `retryReadiness` at `:428` and `isStale` at `:1022` — while `run-resilience.md:20-33` cites `:106`, `:128`, `:141`, `:451`, `:253` and `:667` respectively, deltas of +175 to +355. `mesh-assignment-reclaim.md` is off by +25 to +355 on four claims and `retrospective-memory-ingest.md:25` by +53. **The milestone contradicts itself inside its own diff:** `run-resilience.md:22` puts `isLegalTransition` at `run-store.mjs:106` while the record this story CREATED, `run-lifecycle-policy.md:26`, correctly puts it at `:281`. The in-range leg is clean — 59/59, and the three out-of-range `src/bundle/commands/autonomous.md` citations the structural review found (lines 49-81 of a 47-line file) are genuinely fixed. | contract-failure | **blocker** | **New `@bug` (+ `@finding-F-58-01-1`) task scenario and fix, back to `aof:continue`.** Not ruled away as a wording defect, and the distinction from `F-58-02-1` is the whole point: that criterion described a state the design makes unreachable, this one describes a state the records could satisfy today and do not. The milestone's own declared integrity trap is *"a citation the repository does not supply is never manufactured"* — a citation naming the wrong line is a manufactured citation, and this is the milestone whose value proposition is that an authored edge is honest and a discovered one cites. `TECH_DEBT` item 68 recorded nine of these on the premise that *"58/01 fixes the one it introduced and the rest are this entry"*, with `FF-5810` as the standing fix; `FF-5810` did not land (`F-58-1`), so that premise no longer holds and the debt has no catcher. **The fix and the control land together** — correcting the lines by hand without the guard is how they rotted the first time | `58/01` (product owner, at this gate) | **closed 2026-08-29** |
| F-58-01-2 | **Sixteen citations resolve in-range but name unrelated prose, and TWO of them were written by this story.** `run-resilience.md:47` cites `src/run-store.mjs:344-362` as the frozen run-record shape; that range is a timezone-offset helper (`dtf.formatToParts` / `Date.UTC`). `autonomous-cascade.md:24` and `:45` cite `src/work-loop.mjs:596-611` as dispatching *refine, continue and verify*; the `continue` branch is at 616-639, outside the cited range. The other fourteen are inherited — `autonomous.md:14` is a blank line in a file that never mentions `work.autonomous.maxAttempts`; `build-to-green.md:22` cites a parked-item sweep for the build phase; `verify.md:92` is cited three times for the PO triage step that lives at `:112-113`. | citation-drift | non-blocker | Defer to `TECH_DEBT` item 68, the one home for this species, widened at this gate to record that its nine measured instances are a subset. **Deliberately NOT folded into `F-58-01-1`'s repair:** `FF-5810`'s two predicates are in-range and defining-line, both computable without reading a line's CONTENT — which is exactly why 52 routed content assertions out of its census as `not-black-box`, since a guard asserting what a line SAYS reddens on every unrelated source edit. This finding is the residue no cheap control catches, and saying so is more honest than declaring a control that would rot | backlog (item 68) | open |
| F-58-01-3 | **`tasks/01`'s Scenario Outline row 2 FAILS on both halves of its Then.** The row requires the record declaring `actor:product-owner → loop:verify-triage-accept` to say the edge was `discovered` and to name *"the triage step the verify command assigns to the product owner"*. `src/bundle/loops/product-owner.md` writes neither *"discovered"* nor *"authored"* anywhere — the classification is reachable only by inferring it from `:18-19`'s *"no further cited relation"* — and the artifact it names, `src/bundle/commands/verify.md:92`, is twenty lines stale: that line reads `done. That is the intended trade, not an oversight.`, while the triage step is at `:112-113`. Confirmed at the source. | contract-failure | **blocker** | Folded into `F-58-01-1`'s return trip — same feature, same repair, one `@bug` scenario. The record is 52-era and sits in this story's `reads:` rather than its `files:`, which is the reason it was missed and is not a defence: the story authored a criterion that reaches it, so the write set was drawn one record too small. The fix is the word `DISCOVERED` in the same shape the other four records use, plus the corrected line | `58/01` (product owner, at this gate) | **closed 2026-08-29** |
| F-58-1 | **`FF-5810` is declared in `ARCHITECTURE.md` and does not exist.** No leg enforcing it exists anywhere — `grep -rn "FF-5810" test/ src/` returns zero hits — and its cited host suite `test/arch/acd-day-one-supervision-complete.test.mjs` carries seven legs, all `FF-5806`. It was added to the register DURING 58/01's review, never reached `VERIFICATION.md`'s register at all, and is absent from the ownership line that assigns every other control to a story. Because the cited FILE resolves, `aof work doctor 58` reports **no** `control-unresolved` at either severity and `aof:validate 58` is PASS — the extension blind spot this register's preamble names for four controls, arriving on a fifth that has no red probe to compensate. | control-undelivered | **blocker** (accept rule) | **Ruled: the declaration STANDS and is assigned an owner — it is not dropped.** The accept rule offers two doors, landing the file or dropping the declaration, and dropping is wrong here because `TECH_DEBT` item 68 names `FF-5810` as its own standing fix: dropping it would leave nine measured wrong citations with a ledger entry pointing at a control nobody is building. `FF-5810` is assigned to `F-58-01-1`'s return trip and lands with the citation repair, with a red probe recorded here before the milestone accepts. It stays `pending` in `ARCHITECTURE.md` and now carries a row in the register above, so its state is legible in the one document that reads the controls. **Discharged at this gate rather than deferred**: the control was written, both its legs probed red, and the marker dropped to **landed** — the citations and their guard landed together, which is the one ordering that stops them rotting again | `58/01` (product owner, at this gate) | **closed 2026-08-29** |
| F-58-2 | **`STATE.md`'s `## Progress` table is stale on three of four stories and its `## Verification` checklist on all three items.** The table reads 58/00 `in-review`, 58/01 `in-progress`, 58/02 `in-progress (UNREVIEWED — interrupted run)`, 58/03 `not-started`; the frontmatter it rolls up reads `in-review`, `in-review`, **`done`** and `in-review`. The `## Verification` boxes are all unticked including *"`@manual` signed off — see `UAT.md`"*, which points at a file this milestone has never had and never needed — it declares no `@uat` scenario anywhere in its seventeen features. | record-drift | non-blocker | **Corrected at this gate.** The roll-up is a convenience view over the frontmatter and drifts whenever a status moves without someone re-reading it; the pointer to a non-existent `UAT.md` is a scaffold line that should have been deleted at refine once the milestone was found to have no human lane | `58` | closed 2026-08-29 |
| F-58-3 | **Four controls stood marked `pending` in `ARCHITECTURE.md` after their files had landed and gone green** — `FF-5801`, `FF-5807`, `FF-5808` and `FF-5809`. Same species as `F-58-02-3`, which closed four of the same kind at the previous gate; that makes eight of the ten declared controls in this one milestone carrying a stale marker to their accept gate. | record-drift | non-blocker (accept rule) | **Closed by the files having landed**, markers dropped at this gate and replaced with `**landed** (58/NN)` — never re-marked `pending`, which is the one move that does not clear it. The recurrence is not carelessness: a marker is written at refine by the architect and cleared at accept by the product owner, and nothing between those two moments reads it. Routed as the recurrence question rather than as eight corrections | `58` (architect) | closed 2026-08-29 |
| F-58-4 | **The three `TECH_DEBT` re-measurements `F-58-02-6` deferred to this gate, taken over the completed milestone.** Item **64** records `test/work-loops-checks.test.mjs` at 2,116 lines; actual **2,563** (+21%). Item **66** records `test/work-loops-value.test.mjs` at 2,245 lines, still exact, and gains its predicted third home — `test/watcher-independence-gate.test.mjs` at 430 lines, outside the `work-loops-*` family, a consequence of ADR-007 §3b assigning the traceability leg by file ownership rather than by subject; its sibling `test/work-loops-record.test.mjs` is 1,839. Item **65**'s per-kind builder census re-measured across `test/`: an anchor record builder in **10** files, a watcher builder in **8**, an arbiter builder in **6** — up from the 4 / 6 / 3 measured at 58/00's review, with 58/03's `test/loops-supervision-face.test.mjs` authoring all three. | ledger-drift | non-blocker | Filed against items 64, 65 and 66 as re-measurements on their existing homes rather than as new entries — the subject is the growth mechanism, not the number. `F-58-02-5`'s zero-import-forbids-decomposition instance is filed as the second instance on item **61** (`src/work-loops-checks.mjs` at 774 lines, 380 → 774 across two milestones), and `F-58-02-1`'s ruled contract correction as the fifth instance on item **53** | `58` (architect) | open |

## Accept decision

### 58/00 · The supervision vocabulary — **ACCEPTED** 2026-08-29

- **Scenarios green, scoped to the story.** 100 tests, 0 failures across its two behavioural suites and
  the seven arch gates it touches, including the 55 and 57 corpora the widening must not disturb.
- **Its four controls are armed.** `FF-5801`, `FF-5807` and `FF-5809` carry red probes recorded above;
  `FF-5802`'s loader half was probed with 58/02's check half. `FF-5801`'s probe is the one that matters
  for a vocabulary story: narrowing `NODE_KINDS` from five literals to four reddened 57's frozen
  signature over the fourteen pre-58 records, naming three of them individually — which is the additive
  claim failing on the corpus it protects rather than on a fresh fixture.
- **`aof work validate 58/00`** PASS; **`aof work doctor 58/00`** reports no `control-unresolved` at
  either severity.
- **No blocker finding is open.** Its gap — the per-kind builder written once per suite — is
  `TECH_DEBT` item 65, re-measured at this gate.

### 58/01 · The reference hierarchy and the arbiter — **ACCEPTED** 2026-08-29

Accepted on a second pass. **The first pass declined it**, and the record of why is the point:

- **Its `@manual` contract failed two scenarios.** *"No authority introduced by this story fails to
  resolve"* and Outline row 2. Twelve of fifteen `` `<symbol>` at `<module>:<line>` `` claims named a
  line the symbol is not defined on, deltas +1 to +355, and the milestone contradicted itself inside
  one diff — `run-resilience.md` put `isLegalTransition` at `run-store.mjs:106` while the record this
  story CREATED put it correctly at `:281`.
- **`FF-5810` was declared in `ARCHITECTURE.md` and implemented nowhere.** Because its cited file
  resolved, `aof work doctor` reported no `control-unresolved` and `aof:validate` was PASS — the
  extension blind spot, on a control with no probe to compensate.
- **Both were repaired at this gate and the repair is why it now accepts.** Thirteen citations
  corrected across four records; `product-owner.md` now states `DISCOVERED` in the shape its four
  siblings use and cites `verify.md:112-113` rather than a line twenty short of it; `FF-5810` written,
  both legs probed red, marker dropped to **landed**. **The citations and their guard landed together**
  — correcting the lines by hand without the guard is exactly how they rotted the first time, and
  `TECH_DEBT` item 68 had named that control as its own standing fix.
- **The story's write set was one record too small**, which is why `product-owner.md` was missed: the
  story authored a criterion reaching a record its `files:` did not name. Corrected here — the fifth
  partition failure on record for this milestone, and the second of the *understated write set* species
  after `F-58-02-2`.
- **Scenarios green.** 16 `@executable` tests plus the 8-leg `FF-5806`/`FF-5810` suite, and the
  registry measured directly: 16 records shipped and installed byte-identical, 16 manifest assets, 16
  lock entries.
- **`aof work validate 58/01`** PASS; **doctor** reports no `control-unresolved` at either severity.
- **No blocker finding is open.** `F-58-01-2` — sixteen citations that resolve in range but describe
  something else — is a non-blocker deferred to `TECH_DEBT` item 68, deliberately unguarded, because a
  control asserting what a line SAYS is the one 52 refused on grounds that still hold.

### 58/03 · The supervision face — **ACCEPTED** 2026-08-29

- **Scenarios green, scoped to the story.** 30 tests, 0 failures across its own suite, its glyph gate,
  and the deterministic-render suite it `reads:` and must not move.
- **`FF-5808` is armed, and its probe demonstrated the defeater rather than arguing it.** Handing
  `arbiter` the undeclared-endpoint glyph reddened leg (b) while leg (a) stayed **green** — five kinds,
  five distinct shapes, and an arbiter drawn as a dangling reference. That is precisely the collision
  cardinality alone cannot see, and it is why the control has two legs.
- **Measured through the delivered commands, not only through fixtures.** `aof work loops show --id
  loop:build-to-green` returns `… · layer operational · reference set by loop:autonomous-cascade`, and
  `aof work loops graph` renders all five kinds in five distinct glyphs with the `config:` fallback
  untouched.
- **`aof work validate 58/03`** PASS; **doctor** reports no `control-unresolved` at either severity.
- **No blocker finding is open.**

### 58 · Supervising loops — **ACCEPTED** 2026-08-29

All four stories are `done`. The close criteria, each checked rather than assumed:

- **The full suite runs once, here, and it is green.** 7,048 unit tests 0 failures (23.1 min), the
  131-scenario integration lane 0 failures, `cargo test` 85 passed. **Five genuine failures were found
  and fixed at this gate** — two where a fixture read this repo's live `.claude/settings.json` and
  projected out aof-marked *hooks* but not bundle-owned *permissions*, so the suite failed on the merge
  being right; three asserting `validate` reports zero findings straight after `insert-story`, written
  before `validate` began deliberately reporting an unauthored scaffold contract. None was caused by
  milestone 58, and finding them is what the milestone gate is for.
- **Every one of the ten declared controls is armed.** Ten rows, ten red probes, each a real mutation
  of shipped source with the observed message recorded, each restored byte-exactly against a sha256
  taken before, each re-run green. Four are EXTENSIONS of a guard already in service and each probe
  shows the **new** leg going red while the host legs stay green.
- **The gate this milestone builds turns on green over the real registry.** `aof work loops validate`
  over the installed `.aof/loops/`: **0 errors, 32 warnings**, exit 0 — the exact number recorded at
  refine as the accept criterion (39 → 36 after 58/01 → 32 after 58/02). Ownership, arbitration and
  timescale each ran and reported nothing, over 7 declared layers and 7 `target-setting` edges.
- **Non-vacuously.** The registry carries real edges on the ordinal axis, and the movement ADR-005 §6b
  predicted is visible BY NAME: `loop:verify-triage-accept` reports as `grounded-exogenous-only` where
  the interim had it `self-referential`, and `arbiter:speed-thoroughness-autonomy` is a component the
  traversal can see. A named verdict flipping is evidence; a total is consistent with several wrong
  worlds.
- **`aof:validate 58`** PASS. **`aof work doctor 58`** reports **no `control-unresolved` at either
  severity**, which is the accept rule applied rather than assumed — the marker changes what doctor
  prints, never whether the control exists.
- **No blocker finding is open.** Thirteen findings: three ruled or closed at 58/02's gate, three
  closed here (`F-58-01-1`, `F-58-01-3`, `F-58-1` — every one of them a blocker, every one repaired
  rather than re-triaged), two record-drift corrections closed here, and five non-blockers routed to
  `TECH_DEBT` items 53, 61, 64, 65, 66 and 68 or to the backlog.

**What the milestone delivered is a hierarchy where there was a pile.** Milestone 52 shipped six checks
and left them describing the graph; 55 and 57 widened the vocabulary; this is where the graph acquires
an *above*. The load-bearing choices, in the order they matter: the layer axis is **additive over** the
cadence axis rather than a replacement, so one authority asserts both the old behaviour and the new;
the arbiter **cannot act**, enforced by the absence of four keys rather than by a rule anyone has to
remember; and five of the seven ownership edges are **authored and say so**, because a fabricated
citation is not honesty at any length.

That last one is also where the milestone failed its own standard and had to be sent back. The
registry's whole claim is that a discovered edge cites the artifact it was read from — and twelve of its
citations pointed at the wrong line, in records nothing had ever checked. It accepts now because the
citations were corrected AND the control that reads them landed with the correction, which is the only
version of this repair that does not rot.

### 58/02 · Layer separation, arbitration and the gate — **ACCEPTED** 2026-08-29

The close criteria, each checked rather than assumed:

- **Scenarios green, scoped to the story.** 104 tests, 0 failures across the story's four behavioural
  suites and the six fitness functions it touches. All 61 scenarios and 128 Examples rows trace to a
  named, resolving authority, and the trace is a control with its own non-vacuity leg — not a table in
  a document. The full suite is the milestone gate's, not this story's.
- **Every control this story carries is armed, not merely present.** Four red probes, one per
  `FF-58NN`, each a real mutation of shipped source with the observed message recorded in the register
  above, each restored byte-exactly and re-run green. Three of the four are EXTENSIONS of a guard
  already in service, and each probe shows the **new** leg going red — the register's own condition for
  distinguishing an extension that is armed from one that was never written.
- **The gate this story exists to build was measured on the real registry.** 0 errors over the
  installed `.aof/loops/`, with the three promoted lanes each running and reporting nothing — and
  non-vacuously, over 7 declared layers and 5 records carrying `target-setting` edges.
- **`aof work validate 58/02`** — PASS. **`aof work doctor 58/02`** reports no `control-unresolved` at
  either severity; its two warns (`numbering-gap`, `rubric-join-unchecked`) are stream- and
  config-level and predate this story.
- **No blocker finding is open against 58/02.** `F-58-02-1` — the review's blocker — is re-triaged to a
  ruled contract defect on the PO's own authority, which is the ruling the reviewers asked for and did
  not have. The grounds are that the code is correct, the criterion is unreachable, the `.feature` is
  immutable, and this repository has already ruled on four instances of the same species under
  `TECH_DEBT` item 53. `F-58-02-2` and `F-58-02-3` were corrected at this gate; the remaining three are
  non-blockers routed to the milestone gate or the backlog.

What the story delivered is a decision where there was a report. Milestone 52 shipped six checks and
left them describing the graph; this is where three of them start refusing it. The load-bearing choice
is that the layer axis is **additive over** the cadence axis rather than a replacement for it —
`FF-5802` extends 52's own comparability guard instead of standing a sibling beside it, so the old
behaviour and the new one are asserted by one authority and the compatibility claim cannot rot into two
documents disagreeing. The second is ordering: the promotion waited for 58/01's records, and the
measured result is a gate that turns on green. A gate that arrives with fifteen red findings for
unfinished work is a gate somebody switches off.
