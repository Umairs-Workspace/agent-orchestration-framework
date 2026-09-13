---
type: story
number: 04
slug: the-rule-and-the-ledger
title: "The rule and the ledger — one commit condition, derived rather than typed, accruing across epochs"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: [61/00, 61/01]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-001, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-002, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-003, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, wiki/work/57_milestone_paired-loops/ARCHITECTURE.md#ADR-001, src/run-store.mjs, src/loop-bounds.mjs, wiki/work/61_milestone_disciplined-acceptor/stories/01_story_the-epoch-and-the-frozen-criterion/STORY.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/work-acceptor/rule.mjs, src/work-acceptor/ledger.mjs, src/work-counters.mjs, test/arch/acd-acceptor-rule-is-one-object.test.mjs, test/arch/acd-trial-metric-declared.test.mjs, test/arch/acd-per-knob-sizing.test.mjs, test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs, test/acceptor-rule.test.mjs, test/acceptor-ledger.test.mjs, test/work-counters.test.mjs, scripts/test.mjs]
---
# 04 · The rule and the ledger

## User story

As the operator who will be asked to believe that a harness change earned its place,
I want the commit rule and the evidence behind it to be one derived object — a threshold that is
arithmetic over its own inputs, a wealth process that carries a loss rather than forgetting it, and a
ledger that accrues across epochs and refuses an incomplete record,
so that the threshold cannot be argued down at eleven at night, and so that the answer changes when
its inputs change instead of surviving them.

The rule's whole defensibility is that there is only one condition. Eight favourable pairs is not a
second rule bolted onto the sequential test; it is the **earliest crossing that test can reach**, and
saying so is what stops the number reading as a preference. An engine that types the number rather
than deriving the crossings from its own inputs has broken that, silently, the first time either
input is revised — which is why what gets shipped is the derivation, not the eight.

What does have to be chosen, rather than derived, is how long the process may run before it is
truncated. That budget is declared and frozen, because extending it mid-flight to reach for a
crossing is the same p-hack as moving the yardstick — one axis over.

The same discipline decides the metric. What is being compared has to be declared as a pointer rather
than named inside the engine, paired with a counter-metric that refuses an improvement bought by
accepting worse work, and honest about arms it cannot measure: an unmeasurable arm is neither a tie
nor a favourable pair, because calling it a tie discards evidence and calling it favourable
fabricates it. At HEAD every arm is unmeasurable, and this story is what makes the machinery say so.

## Tasks

- [ ] `tasks/00_the-threshold-and-the-e-value-are-one-object.feature` — the commit level, the bet and every crossing record are derived from the criterion's own inputs, so revising an input moves the whole lattice rather than leaving a typed number standing
- [ ] `tasks/01_a-loss-carries-rather-than-resets.feature` — an unfavourable pair neither resets the run nor kills the proposal, a losing proposal that can still reach a crossing is reported as recoverable, and one that cannot is reported as spent rather than merely short
- [ ] `tasks/02_a-step-is-one-knob-and-one-notch.feature` — a proposal naming two knobs is refused rather than split, and a knob with no ordering is refused as a step by name
- [ ] `tasks/03_the-trial-metric-is-declared-not-named.feature` — the metric and its counter-metric are declared pointers that must resolve, a criterion without a counter-metric is refused, and an unmeasurable arm is reported as unmeasurable rather than folded into ties
- [ ] `tasks/04_the-basket-is-computed-per-knob.feature` — each admitted knob declares the smallest unit its change can move, its basket is computed from that, and a knob priced above the budget reports its price and accrues nothing
- [ ] `tasks/05_the-ledger-accrues-across-epochs.feature` — evidence carries forward while the criterion stands, an incomplete ruling is refused at construction, and the ledger's own arithmetic is what makes evidence spanning a criterion change unaccruable

## Notes

- **The trial metric is `rounds-to-accept`, paired with `escapes-after-accept`** —
  `ARCHITECTURE.md#ADR-002`. It is chosen because it is the one quantity all three admitted knobs
  move; a metric only one knob moves makes the other two structurally silent.
- **`roundsToAccept` is added beside its counter-metric** in the existing deterministic-counter leaf,
  never in a second counters home (`ARCHITECTURE.md#ADR-002` §7). That leaf is arithmetic only — zero
  imports, writes nothing, records handed in — and stays that way.
- **The declared tie rate is scheduled for replacement, not carried.** The first ruling records the
  observed rate, and the declared one is reported beside it thereafter
  (`ARCHITECTURE.md#ADR-002` §4). A declared rate that survives its own contradiction is the same
  p-hack this milestone refuses, one level up.
- **"The acceptor reports" in this story's tasks means the REPORT OBJECT, not the command.** Raised
  by the developer's feasibility pass. Several scenarios here — a losing proposal's recovery, an
  unordered knob reported as a human change, an unmeasurable population, an unaffordable knob's
  price — are worded "when the acceptor reports", and 61/06's tasks use the identical phrase for the
  CLI. Read as the object the rule engine returns, this story is self-contained and builds in stage
  2; read as the command it would be unbuildable until stage 4. It is the object. 61/06 renders it.

- **Arithmetic and I/O are split, and the arithmetic is blind on purpose.** `rule.mjs` and
  `ledger.mjs` compute; 61/01 owns which rulings are selected; 61/05's store persists
  (`ARCHITECTURE.md#ADR-006` §4, §4a). The summing leaf never sees a criterion digest, so summing
  across two criteria is not a path to be refused — it is not expressible here. Nothing in this
  story reads a file or a clock.
