---
type: story
number: 01
slug: the-epoch-and-the-frozen-criterion
title: "The epoch and the frozen criterion — the yardstick cannot move while it is measuring"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-004, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-005, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-004, src/acceptance-horizon.mjs, src/frozen-set.mjs, src/work.mjs, src/effects/item-transitions.mjs, .aof/frozen-set.jsonc, src/bundle/loops/operator.md, src/bundle/loops/instrument-audit.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/acceptance-horizon.mjs, src/work-acceptor/criterion.mjs, src/bundle/frozen-set.jsonc, .aof/frozen-set.jsonc, test/arch/acd-acceptance-horizon-single-predicate.test.mjs, test/arch/acd-criterion-frozen-in-epoch.test.mjs, test/frozen-set-compiled.test.mjs, test/framework-stops-shipping-guard.test.mjs, test/acceptor-criterion.test.mjs, scripts/test.mjs]
---
# 01 · The epoch and the frozen criterion

## User story

As the operator who has to trust a verdict the machinery renders about its own harness,
I want the evaluation criterion frozen for the whole span it is scoring, revisable only at an epoch
boundary and only by me,
so that no proposal can be accepted by a yardstick that moved while it was being measured — the
p-hack one level up, where the number is honest and the ruler is not.

Two halves have to be right, and they fail in different ways. The **boundary** must be keyed on where
an item lands, not where it came from: every milestone that has reached `done` happened to arrive
from the same place, so the narrower predicate works today and would silently never close an epoch
for a milestone parked in review first — and three of four spikes already took the other edge. The
**criterion** must be genuinely unmovable mid-epoch, which no permission alone can deliver, because
the file a permission can name is not the only path to the value.

So the enforcement is layered, and the load-bearing layer is arithmetic rather than access control:
every ruling carries a digest of the criterion it was rendered under, and the accrual sums only the
run of rulings that share one digest. A criterion edited mid-epoch does not need to be caught; it
simply cannot be accrued across.

## Tasks

- [ ] `tasks/00_an-epoch-closes-on-the-way-into-done.feature` — the boundary keys on where the item lands, so an item accepted from review closes its epoch exactly as one accepted from build does
- [ ] `tasks/01_the-criterion-is-frozen-inside-its-epoch.feature` — every frozen quantity is refused mid-epoch rather than warned about, and the refusal names which one was touched
- [ ] `tasks/02_a-criterion-move-resets-the-ledger-by-name.feature` — evidence gathered under a superseded criterion does not count toward the new one, and an unchanged criterion is reported as unchanged rather than assumed
- [ ] `tasks/03_only-the-operator-revises-at-a-boundary.feature` — a revision away from a boundary is refused, a revision at one by the declared actor succeeds, and the guarding declaration lives where this system's other guards are declared

## Notes

- **The epoch equals the auditor's cadence, deliberately.** `ARCHITECTURE.md#ADR-004` §3: an acceptor
  whose epoch differs from the cadence of the loop auditing its instruments is trusting instruments
  audited on a different clock.
- **This story owns the sixth frozen-set member.** It is the only story that writes
  `.aof/frozen-set.jsonc` or its bundle source, per `ARCHITECTURE.md#ADR-005` §3.
- **The knob values are deliberately NOT frozen** and are not protected by a permission —
  `ARCHITECTURE.md#ADR-005` §4 states why. Do not widen the member to cover them.
- **Stage 1** — builds in parallel with 61/00, 61/02 and 61/03.
