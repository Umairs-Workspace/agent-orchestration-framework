# 61 · The disciplined acceptor — Outcome

<!-- AUTHORED at the milestone level, never concatenated from the stories'. Each story's OUTCOME.md
     states its own capabilities and the index unions them, so a capability stated whole by one story
     is CITED here rather than repeated. What follows is what is true of the SYSTEM that no single
     story's outcome says on its own. -->

## Delivered

### aof has an acceptor, and applied to itself today it refuses everything and says why
Every lane a harness-change proposal must clear is in service: a range each step stays inside
(`m61/00`), an epoch whose criterion cannot be accrued across (`m61/01`), a census that declares what
it filtered (`m61/02`), an admissibility check worded on consumers (`m61/03`), one derived commit
condition over a ledger that accrues (`m61/04`), the ruling recorded beside the value it moves
(`m61/05`), and one command that renders all of it (`m61/06`). Run against this repository, it admits
three knobs and refuses all three — each for at least two independent reasons — and reports the
reasons with what would remove them. That is the deliverable: not a system that tunes itself, but one
that can state precisely why it will not, in terms an operator can act on.

### The threshold is unarguable because it is nowhere written down
No number in this machinery is a preference anyone can revisit at eleven at night. The commit level,
the bet, the earliest crossing and every later crossing record are arithmetic over the criterion's own
inputs, and the controls forbid any literal equal to them appearing in the engine (`m61/01`,
`m61/04`). Revising an input moves the whole lattice; a criterion that would make the rule trivial is
refused at construction. The one quantity that is chosen rather than derived — the budget — is frozen
inside the epoch it is scoring, so extending it mid-flight to reach a crossing is the same p-hack as
moving the yardstick, one axis over, and is refused as one.

### Report-only is structural, not a default that could drift
The property holds across the whole milestone rather than at any one point in it: the command
declares no strictness flag and no board route serves it (`m61/06`), its only mutating form takes an
explicit named request, the evidence that request is weighed against is read from the ruling store
rather than accepted from the caller, and the event the machinery raises is named for the **ruling**
rather than the change — so the overwhelming majority of its work, every honest refusal, leaves a
record (`m61/05`). "The acceptor did nothing" is its steady state and is reachable by no other path.

### Three enforcement layers, and the load-bearing one is not access control
A permission boundary (the criterion as the frozen set's sixth member), a writer refusal at the
criterion seam, and beneath both the ledger's own arithmetic. The first two can be walked past by
anything able to write a file. The third cannot be walked past by anything, because the leaf that sums
evidence never sees a criterion digest: summing across two criteria is not a path it refuses, it is
not a sentence it can express (`m61/01`, `m61/04`). A criterion edited mid-epoch does not have to be
caught.

### The instruments the gate trusts are bounded by what this system can actually see
Two milestone-level facts sit beneath every verdict. The evidence journal has no fixture boundary and
no workspace identity, so every population the acceptor counts is filtered, folded and declared
against a floor, and a sweep that found nothing says so rather than returning a confident zero
(`m61/02`). And what may be proposed at all is read from the loop registry's own declaration, never
from a list this machinery keeps — so widening the tunable set is an edit to the registry, and the
acceptor holds no knob key anywhere in its code (`m61/03`).

### The acceptor is a gate, and nothing in the graph can point at it
It is deliberately not a control loop: no node kind, no loop record, no reference of its own, no
cadence it sets, nothing it optimizes. Its epoch equals the cadence of the audit loop that checks its
instruments, which is a decision rather than a coincidence — an acceptor whose epoch differs from that
cadence is trusting instruments audited on a different clock. And no proposal may author or revise
what "better" means: `actor:operator` is the only revisor, permanently.

### Thirteen declared controls, every one of them observed failing
The milestone applied its own thesis to its own gates. Each of `FF-6101`…`FF-6113` was run green, then
run again with the invariant it guards deliberately broken, and the failure message recorded in
`VERIFICATION.md`. Four of the thirteen extend a guard that was already in service, where the probe is
the only evidence the extension is armed at all. Two of the probes are evidence in the other
direction: `FF-6102` and `FF-6110` stayed green when the metric name and the knob key were planted as
strings, which is exactly the line those controls draw — a pointer is data an operator edits, and a
key quoted in a diagnostic is not a claim of membership.

### The gate was applied to this milestone's own last story, and it refused it
`61/06` reached acceptance built, green, and marked `in-review` by a hand-edit — a claim of review
nobody had earned. The record refused it (`D-61-3`), the review then ran, and it found a Blocker a
green suite could not: the reporting face preferred a pair sequence carried on its **caller's**
proposal to the one accrued in the ledger, so an explicit commit could be granted on fabricated
evidence — the one enforcement point this milestone says cannot be routed around, routed around
through the command's own input. The story's own test drove that path and asserted success, which is
why the suite agreed with the defect. Fixed, locked by a regression, and red-probed.

## Assumptions

- **The harness of record is a prompt, and a prompt names no configuration key** — so the consumption
  check cannot discriminate and is fail-closed for every knob. The gate is honest about which
  condition it fell back on, and re-opens the moment that document names a key.
- **One epoch is one milestone, and its boundary is any transition into `done`** — keyed on where an
  item lands, never on where it came from.
- **The declared tie rate is scheduled for replacement rather than carried**: the first ruling records
  the observed rate and the declared one is reported beside it thereafter.
- **Nothing here schedules, proposes, or replays.** The cadence is declared and the trigger is 63's;
  proposal generation is 62's; the paired construction a replay would need was measured as not
  constructible today.

## Gaps

### Nothing produces the observations the gate weighs
- **Status:** open
- **Discharge condition:** `sessionId`, an append-only instrument log, and the harness document naming
  a configuration key — the observation-series prerequisite `ARCHITECTURE.md#ADR-011` §1 assigns to
  neither 61 nor 62.

The gate is complete and can rule; there is no series for it to rule on. Every arm is unmeasurable at
HEAD and the machinery reports that rather than substituting a number it can compute (`m61/04`), and
the yield reading that separates a structurally silent knob from a short ledger has no producer
either, so that lane cannot fire on a real run (`m61/06`).

### One of the three admitted knobs can never be committed, whatever the evidence says
- **Status:** open
- **Discharge condition:** `work.autonomous.maxAttempts` ceasing to resolve to two unrelated bounds —
  ledgered as `TECH_DEBT` item 76, a milestone rather than a rename.

Stated whole at `m61/00`. The knob stays proposable and is refused on every step, which is the honest
answer rather than a range invented so that the machinery would have one.

### The command accepts proposals that nothing in this system produces
- **Status:** open
- **Discharge condition:** milestone 62, which is what walks up to this gate.

`work:acceptor` takes a proposal set and rules on it; there is no proposer. Every reported knob today
is a declared tunable with no pending step, which is why the report's steady state is a list of
refusals rather than a list of verdicts.

### A construction refusal still names two subjects under one code
- **Status:** open
- **Discharge condition:** a second construction code minted for the malformed tie rate, leaving
  `trial-unit-undeclared` naming the knob's missing unit — `TECH_DEBT` item 77.

Found by this milestone's own reasoning about its own vocabulary (`ADR-013` §3) and left standing
because the fix belongs to a module whose sole writer is another story. It degrades a diagnostic, not
a decision: both subjects are construction refusals, so neither reaches the ruling lane.
