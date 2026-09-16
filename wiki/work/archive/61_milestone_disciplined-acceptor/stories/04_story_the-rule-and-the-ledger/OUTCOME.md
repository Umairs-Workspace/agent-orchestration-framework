# 04 · The rule and the ledger — Outcome

## Delivered

### The commit rule is ONE object, and its numbers are derived rather than typed
No literal equal to `N`, to `1 + lambda`, to `1 / alpha` or to `alpha` appears in the engine — every
one of those quantities is obtained from the criterion, so a criterion carrying a different `lambda`
moves the whole crossing lattice rather than leaving a typed number standing. The commit predicate
has exactly one leg; "all favourable" is spelled nowhere. `lambda` is refused at construction outside
`(0, 1)`, so the hard reset cannot arrive through the parameter.

### A loss carries rather than resets, and "spent" reads differently from "short"
An unfavourable pair multiplies the wealth by `(1 - lambda)`; no path resets the ledger or drops a
proposal. A losing proposal that can still reach a crossing is reported recoverable, and one that
cannot is `budget-exhausted` — which is never reported as evidence-short. `B` is read from the
criterion and refused below `N`.

### The trial metric is a declared pointer, and an unmeasurable arm is neither a tie nor a win
Metric and counter-metric are pointers resolved through a registry **derived from callable
resolvers**, so a pointer naming a symbol that does not exist is refused at construction and a
criterion carrying a metric and no counter-metric is refused outright. Both pointers resolve into the
same zero-import deterministic-counter leaf, and no second counters home exists in `src/`. An
unmeasurable arm is counted in neither total: no path maps it to a tie or to a favourable pair. At
HEAD every arm is unmeasurable, and the machinery reports that rather than concealing it.

### One threshold, many baskets — computed per knob, in integer arithmetic
Every admitted knob resolves a declared `trialUnit` with a unit price, and its basket is the single
declared expression, recomputed independently per knob; no threshold or basket constant is applied
across knobs. The pair count is `ceil(B * d / (d - n))` over a declared rational with integer terms,
so the 90% case returns 110 raw pairs and not the 111 the float path gives. A knob priced above the
budget is `trial-unaffordable`: it accrues zero pairs and stays on the surface carrying its price and
the ceiling it exceeded.

### A step is one knob and one notch
A proposal naming two knobs is a coded refusal rather than a split, and a knob whose values carry no
order is refused as a step by name.

### The ledger accrues ACROSS epochs and refuses an incomplete ruling at construction
The epoch id is carried and reported but is not a filter on the sum. `RULING_KEYS` is a frozen set
carrying `dwell` and `dwellFrom` and **no** computed `dwellExpiry`; a record missing any key is
refused at construction and again at assembly. The W/L/T sequence is stored in the order it arrived
and no code path re-sorts it.

### The arithmetic is blind by construction, not by rule
The engine and the summing leaf import nothing, read no clock, and take `now` on the call. The
summing leaf never sees a criterion digest, so summing across two criteria is not a path that has to
be refused there — it is not expressible there.

## Assumptions

- **The declared tie rate is scheduled for replacement, not carried.** The first ruling records the
  observed rate, and the declared one is reported beside it thereafter.
- **"The acceptor reports" in this story means the report OBJECT the rule engine returns, not a
  command.** Read as the object, the story is self-contained; `m61/06` renders it.
- **`roundsToAccept` sits beside its counter-metric in the existing deterministic-counter leaf**,
  which is arithmetic only — zero imports, writes nothing, records handed in — and stays that way.

## Gaps

### Every arm is unmeasurable at HEAD, so the rule can rule and never commit
- **Status:** open
- **Discharge condition:** an instrument writing the series the declared metric pointer reads — the
  observation-series prerequisite (`sessionId`, an append-only instrument log, and the harness
  document naming a config key) that `ARCHITECTURE.md#ADR-011` §1 assigns to neither 61 nor 62.

The commit rule, its evidence ledger and its arithmetic are complete and exercised. What they score
does not exist yet, and the machinery says so rather than substituting a number it can compute.
