# 58 · Supervising loops — Outcome

<!--
  AUTHORED AT THE MILESTONE LEVEL, never a concatenation of the four stories'. The aggregation
  happens in the INDEX — `aof work memory ingest` unions every item's records into one recall
  surface — so a milestone that restates its stories' capabilities writes one fact twice and every
  later recall has to dedupe it. What follows is what is true ACROSS the four, with a citation
  where a story states a capability whole.
-->

## Delivered

### The loop graph has an ABOVE, and it is queryable
Before this milestone the registry was a flat set of loops with edges between peers; "who may change
this loop's target" had no answer a command could give. It now does, at every declared loop, through
one edge kind (`target-setting`) whose admissible sources are frozen at three — a slower loop, an
actor, or a `frozen-rule` anchor. The hierarchy ACD always had as documents is now an edge set the
checks walk and the face renders. The seven day-one edges are `m58/01/the seven ownership edges`; the
vocabulary that admits them is `m58/00/every declared loop has a named owner`.

### Three of milestone 52's six checks stopped describing and started refusing
`reference-ownership`, `actuator-arbitration` and `timescale` are the checks 52 shipped that had
nothing to decide over: no ownership edges existed, no arbiter kind existed, and six of seven loops
have no clock. All three now gate at `error` severity — `m58/02/the structural codes stop the run` —
and the reason they can is that 58/01's records gave them something true to be true about. A check
that reports and a check that refuses are different artifacts, and this milestone is where three
crossed over.

### The ordering that made the gate safe to switch on
The promotion to `error` waited for the records: measured over this repository's own registry, the
sequence is **39 findings → 36 after 58/01 → 32 after 58/02, 0 errors throughout**. Promoting first
would have delivered fifteen error-severity findings through `aof:validate`'s hard loop lane for work
that was merely unfinished. A gate that arrives red for unfinished work is a gate somebody switches
off, and this milestone's own ordering edge is the reason this one arrives green.

### Supervision is computed from records, never self-declared
No node kind admits a key by which a node asserts its own supervision, layer authority or arbitration
— no `supervised-by`, no `arbitrated-by`, no `independence` — and the checks module that decides all
of it still imports nothing. Every supervision fact in this system is derived from what records
declare about their own fields, which is what makes the graph auditable rather than aspirational.

### A node kind that records a trade-off and cannot act on it
`arbiter` is the fifth kind, and the load-bearing part is an absence: it admits no `actuator`, no
`measurement`, no `cadence` and no `ground`, so a node resolving a conflict between loops has no
vocabulary in which to say it also pulls one of the actuators it arbitrates. The refusal costs no new
code — the loader's existing `loop-key-not-admitted-for-kind` fires — and no new finding code.
Enforced end to end: `m58/00/an arbiter has no vocabulary`, cleared only on an arbiter by
`m58/02/only an arbiter clears a shared actuator`, and visible as its own glyph by
`m58/03/every declared kind renders as its own shape`.

### The registry's citations are now read by something
The registry's entire value is that an authored edge declares itself authored and a discovered one
cites the artifact it was read from. Until this milestone closed, **nothing read those citations** —
52/ADR-013 had routed prose-body line citations out of its census as `not-black-box` — and twelve of
fifteen defining-line claims were wrong, by up to 355 lines, with two records inside one diff giving
different lines for the same export. `FF-5810` now asserts in-range and defining-line over
`src/bundle/loops/**` on every build. This is a milestone-level fact rather than 58/01's, because the
gap it closes predates 58 and spans every record 52, 55 and 57 shipped.

### Four kinds of failure this milestone had to survive, and did
Six architecture defects found at contract-authoring, five partition defects found by the developer
sweep, one false acceptance criterion refused by QA, and two blocker findings at the verify gate. All
ruled or repaired before accept, each minuted at the § it amends. The count is the outcome: a
milestone that declares ten controls and seven ADRs generates defects at a rate its own review stages
have to be able to absorb, and this one measured that they can.

## Assumptions

- **The human owns the root reference** — this milestone makes the chain of ownership BELOW that
  explicit and says nothing about what is worth controlling at all. `actor:operator` is where the
  chain terminates, and it is exogenous by construction rather than by argument.
- **Ownership, layer and arbitration are declared facts checked for consistency, not proved** — a
  layer is cross-checked against its cadence's scope rank where one exists, an `owner:` must match the
  edge, and an arbiter's `priority` must be a permutation of its own veto set. What none of that
  establishes is that the declared hierarchy is the RIGHT one; it establishes that it is coherent and
  that changing it is visible.
- **Nothing in this milestone executes an adjustment** — `priority` and `dwell` state what must hold
  when milestone 62's proposer and 61's acceptor exist. The trade-off is recorded as an owned decision,
  which is strictly less than it being enforced, and deliberately so: deferring the policy into the
  proposer is where policy stops being reviewable.
- **The whole hierarchy rests on 52's loader staying a pure leaf** — the ratio is a frozen literal, the
  layer→rank map has one home, and neither can be reached by configuration, because the module that
  would read a config key is the one defined by importing nothing.

## Gaps

### The dead-band the SPEC scoped was not built
- **Status:** open
- **Discharge condition:** the three prerequisites in 58/ADR-004 §5 exist — the last being milestone
  62's proposer — at which point competing adjustments have commensurable magnitudes to compare.
- The SPEC scoped ordering, dwell time **and** a dead-band. Ordering shipped as the arbiter's
  `priority`, dwell as a declared `dwell`; the dead-band did not, because the loops sharing these
  actuators control incommensurable quantities — scenarios green, open findings, items reaching done —
  and a single magnitude threshold across them would be the fabricated conversion 52/ADR-006 already
  refused for cadence. **This is a departure from the SPEC's stated scope and is recorded as one**; an
  empty field nobody could interpret is not honesty. No `dead-band` key exists in any admitted set and
  `FF-5801` asserts its absence, so it cannot arrive unannounced.

### The supervision hierarchy is one milestone old and has never been revised
- **Status:** open
- **Discharge condition:** a target is revised through the cycle that owns it, and the revision leaves
  a trace the registry can show — the first real exercise of what this milestone built.
- Every edge here was authored or discovered at one sitting and nothing has yet changed a reference
  through the hierarchy the milestone declares. The structure is checked; the *cycle* is untested.

### `ARCHITECTURE.md` is 1,140 lines against a 700-line budget
- **Status:** open
- **Discharge condition:** `TECH_DEBT` item 55 — a milestone `ARCHITECTURE.md` gains a compaction path.
- Seven ADRs, ten declared controls and six recorded amendments, in an append-only immutable-ADR
  record that `aof work doctor` reports at 63% over budget with nowhere to route it. The milestone
  that declared the most controls is the one that exposed the missing compaction path.
