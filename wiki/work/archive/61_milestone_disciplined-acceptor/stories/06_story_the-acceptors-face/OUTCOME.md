# 06 · The acceptor's face — Outcome

## Delivered

### One registered command shows every proposal, its evidence, its verdict and every reason it did not commit
`work:acceptor` is a member of the same registry every other work command is registered in, reachable
as `aof work acceptor`, and it renders the five lanes rather than recomputing them: the range each
step must stay inside, the epoch's criterion, the census as it was counted, the admissibility answer,
and the rule with its ledger. The machine-readable face is the canonical report object itself — the
human face is a rendering of that same object, so neither derives a number the other does not carry.

### Report-only is the default, and it is permanent rather than a state that drifts
A bare run reports and moves nothing; crossing the level changes what the report says about
eligibility and changes nothing about what the command does. Committing is reached only by naming a
key explicitly, and an explicit commit on an ineligible proposal is refused carrying every reason.
The command declares no strictness flag at all, and its exit status is a fact about whether it could
run — never about what it found.

### The evidence a report reads is the ledger's, and a caller cannot hand in its own
A proposal names a key and a step and says nothing about how much evidence stands behind it. Every
pair the commit predicate weighs is read from the ruling store and passes through the criterion-digest
suffix on the way in, so evidence recorded under a superseded criterion accrues nothing toward the
current one. `input` is caller input; the ledger is read at the composition root.

### Every applicable refusal is reported, in a frozen order, each naming what would remove it
The ruling lane is the eight-member vocabulary assembled from the constants at their declaring
modules, and the reported codes are the declared order filtered to the knob's own set — an ordering no
discovery order satisfies by accident. A refusal matching no member is refused with a code rather than
rendered as free text. Refusals raised while a ruling was being built never enter the lane: they are
reported in their own right, and the admissibility grounds travel as detail beneath `not-admissible`
rather than as members of it.

### A structural silence reads differently from a short ledger, and both distances are computed
A knob accruing toward its threshold states its standing, the threshold and the rulings still needed;
a knob whose observed yield cannot reach the floor states the epochs that yield would need; a proposal
that can reach no crossing record inside its budget is named `budget-exhausted` and is offered no
distance at all. The numbers move when their inputs move — a rising yield shortens the distance with
no message edited — and a report in which every knob is yield-bound says so as one statement.

### Dwell is recorded as declared and is unreachable from the response to harm
The settling period is read from the arbiter that governs these loops and recorded exactly as declared,
with the landing epoch beside it and no date, duration or expiry derived from either. An operator's
reversion is refused naming the counter that would have to exist to show the period discharged. A
counter-metric degradation withdraws the change at once on a path that reads no dwell value, and no
option the command offers delays or waives it.

## Assumptions

- **The face reports; it does not schedule and it does not propose.** Generating proposals is
  milestone 62's, and the trigger is 63's.
- **The census is rendered as `m61/02` counted it**, including what it excluded — the face states no
  population figure the census did not carry, because two derivations of one population are two
  populations.
- **The command cannot reach the ruling store directly.** It reads the ledger through the read-only
  `readHarnessRulings` facade on the seam that already owns that access, so `FF-6108`'s
  one-writer/one-reader boundary holds with the face on the outside of it.
- **One scoped write into `m61/04`'s module** — the single filter in `knobReport` that keeps
  `trial-unit-undeclared` out of the ruling lane. It is the milestone's one exception to ADR-012 §2's
  sole-writer table, and it is bounded in ADR-013 §4a rather than left to the build.
- **No board affordance exists for this verb**, deliberately: its only mutating form requires an
  explicit request, and a served route would be a second surface for that act.

## Gaps

### The observed yield has no producer, so the structural-silence lane cannot fire on a real run
- **Status:** open
- **Discharge condition:** an instrument writing the per-knob discordant-pair rate the yield reading
  needs — part of the observation-series prerequisite `ARCHITECTURE.md#ADR-011` §1 assigns to neither
  61 nor 62.

The yield-bound lane is complete and exercised, but it reads the yield from its input and nothing in
the command computes one. On a real run no yield is supplied, so a knob that may be structurally
silent renders on the accruing branch instead. The contract does not define a third rendering for an
unknown yield, so the machinery neither states nor conceals it — recorded here rather than resolved
by inventing a silence the contract never named.
