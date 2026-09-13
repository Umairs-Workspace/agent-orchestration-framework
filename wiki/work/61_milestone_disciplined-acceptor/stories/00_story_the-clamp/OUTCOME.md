# 00 · The clamp — Outcome

## Delivered

### Every steppable knob resolves inside a declared range
`work.loop.buildNoProgressRounds` resolves through a ceiling as well as a floor at its single funnel,
`resolveBuildNoProgressRounds` in `src/loop-bounds.mjs`, so a value past either end comes back inside
whichever door supplied it — both stall paths and the config path arrive through that one resolver.

### Admissibility is the resolver's own answer, and there is no second table to disagree with it
A proposed step is in range exactly when the knob's own resolver returns it unchanged.
`LOOP_BOUND_VALUE_RESOLVERS` is derived from the callables in `src/loop-bounds.mjs` rather than
declared beside them, so a range this machinery believes in and a range the system enforces cannot
diverge.

### A key that resolves to TWO bounds is refused as a step rather than given an invented range
`work.autonomous.maxAttempts` resolves to an attempt ceiling and a per-phase drive-cycle ceiling —
counted from its own call sites, measured in different units, exhausted by different events. Every
step on it is refused by name with `step-would-be-compound`, and no range is manufactured for it. The
key stays proposable: the refusal is about committing, not about proposing.

## Assumptions

- **The attempt cap's four resolution sites stay where they are** — the clamp does not annex the
  attempt cap into the bounds home, and 69/FF-6901 and 53/FF-5310 are left byte-intact. That is a
  constraint the delivery holds to, not an accident of it.
- **`step-would-be-compound` is derived from the one-knob-one-notch rule**, so it is the one refusal
  in the vocabulary that no budget increase and no instrumentation can ever lift.

## Gaps

### `work.autonomous.maxAttempts` has no declarable range
- **Status:** open
- **Discharge condition:** the key ceases to resolve to more than one bound — the conflation split
  into two keys carrying their own units. Ledgered as `TECH_DEBT` item 76; splitting it collides with
  a closed key set and a four-site record, which is why it is a milestone and not a rename.

One of the three admitted knobs is permanently un-steppable while the conflation stands. It is
admitted to the tunable set, proposable, and refused on every step.
