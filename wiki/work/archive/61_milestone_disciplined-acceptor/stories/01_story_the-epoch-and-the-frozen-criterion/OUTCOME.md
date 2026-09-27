# 01 · The epoch and the frozen criterion — Outcome

## Delivered

### An epoch is one milestone, and its boundary is any transition INTO `done`
`closesEpoch` is exported from `src/acceptance-horizon.mjs` alone, compares against that module's own
`CLOSED_STATUS`, and takes the destination status the payload actually spells — `status`, the field
`item-status.changed` carries, not `to`, the name the lifecycle table uses and no payload carries. A
milestone parked in review before acceptance closes its epoch exactly as one accepted from build does.

### A criterion that moved mid-epoch cannot be accrued across, and does not need to be caught
Every ruling carries a digest of the criterion it was rendered under, and
`rulingsUnderCurrentCriterion` — the only module in `src/` that selects rulings by digest — returns
the **maximal trailing run** sharing the current digest. It is a suffix, never a filter, so a
criterion revised and revised back resurrects nothing. Evidence gathered under a superseded criterion
is not refused; it is not summable.

### The criterion is the frozen set's sixth member, revisable only by the operator and only at a boundary
A write through the criterion seam away from a boundary is a coded refusal that names the open epoch
and writes nothing. The member compiles at permission denials, is `aofManaged`, and names both
acceptor paths for Edit and Write; all four sites that pin the member set agree with the declaration.

### A knob value that moved is reported by name rather than mistaken for a criterion move
A knob whose value changed under an accruing ledger is named in the report, so the two kinds of
movement under a running trial read differently.

## Assumptions

- **The knob VALUES are deliberately not frozen and not protected by a permission** — the member
  covers the criterion (alpha, lambda, N, B and the declared pointers) and nothing else. The freeze
  is not widened to cover what the criterion scores.
- **The acceptor spells no lifecycle word of its own** — `done`'s meaning has exactly one home, and
  the acceptor cannot acquire a second opinion about it.
- **The declared epoch equals the auditing loop's cadence**, read from both records: an acceptor
  whose epoch differs from the cadence of the loop auditing its instruments is trusting instruments
  audited on a different clock.
