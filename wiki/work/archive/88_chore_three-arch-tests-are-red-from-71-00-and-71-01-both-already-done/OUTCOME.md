# 88 · Three arch tests are red from 71/00 and 71/01, both already done — Outcome

## Delivered

### The four controls 71/00 and 71/01 moved out from under are green at their new subjects
`acd-cache-read-surface-boundary`, `acd-registry-fixture-closed` (FF-5809),
`acd-progress-ledger-consumed` (FF-6109) and the `61/03 task 02` outline row in
[acceptor-admissibility.test.mjs](test/acceptor-admissibility.test.mjs) pass with no gate deleted,
relaxed or carved out — the cache-read pin resolves at
[promotion.mjs](src/work-promote/promotion.mjs)'s `appendPosition()` where 71/01's engine extraction
took it, and every arch test file is classified into one of FF-5809's four lanes.

### Two of the four now derive their subject from the tree instead of pinning a snapshot of it
FF-6109's harness leg reads its refused/considered partition off the harness document's own text, and
the `61/03 task 02` row asserts the harness ground applies *iff* the harness of record does not name
the key — so the next config key `commands/continue.md` names moves sides with nothing edited, rather
than reddening a control that was only ever recording how many knobs the prompt happened to name.

## Assumptions

- **The four are green as measured on this checkout, which carries story 86's uncommitted work** —
  `node scripts/test.mjs --only` over the four files: 53/53, exit 0, re-measured at accept.

## Gaps

### A wholly green `test/arch` tree
- **Status:** open
- **Discharge condition:** the seven remaining reds are closed by their owning items, and the two with
  no owner acquire one.
The `test/arch` tree runs 1711/1718 with seven reds, none in this chore's subject: FF-5308 is chore
[111](wiki/work/111_chore_ff-5308-necessity-leg-is-red-because-story-86-paid-item-49s-fail-open-half/CHORE.md),
FF-5905 is chore [106](wiki/work/106_chore_ff-5905-s-doctor-lane-module-list-is-red-on-a-clean-tree-and-66-s-fold-the-family-ratchet-has-been-passed-twice-unfolded/CHORE.md),
FF-7106 is milestone 96 via chore [89](wiki/work/89_chore_ff-7106-is-declared-in-milestone-71-s-fitness-register-but-owned-by-no-story/CHORE.md),
and `acd-chore-dod-checklist` is chore 97's own record; the remaining three —
`acd-command-layer-imports-downward` ×2 and `acd-observe-snapshots-append-only` (FF-6807), all from the
78/79/81 loop-execution-record commit at HEAD — are named in no open item.

### The promotion idempotence key admits the same defect twice
- **Status:** open
- **Discharge condition:** a re-promotion of an already-scheduled defect is refused, or the duplicates
  are closed and the key is left as designed.
Chores 91, 92, 93 and 107 each schedule work this chore has discharged, because the key is
`(reviewed ref + finding title)` — the same defect raised under a different title, or at a different
review, promotes again.
