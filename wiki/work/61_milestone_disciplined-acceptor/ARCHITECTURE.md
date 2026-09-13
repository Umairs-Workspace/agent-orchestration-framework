---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 61 · The disciplined acceptor — Architecture

## Context this milestone inherits

Seven facts arrive from upstream items and are not re-litigated here.

**From 52 (done).** The loop registry is hand-authored markdown under `.aof/loops/`, installed from
`src/bundle/loops/`; edges are closed frontmatter keys declared outbound on the source node;
`src/work-loops-checks.mjs` is a **pure leaf that imports nothing** (52/ADR-001, -004, -007). 52's
delivered `00_frozen-vocabulary.feature:22` requires that *no twelfth set is exported* from
`src/work-loops.mjs` — a delivered criterion is immutable, so this milestone does not widen it.

**From 55 (done).** The frozen set is a **declaration** compiled to the enforcement boundary aof
already owns (55/ADR-004): five members, each declaring `enforcementPoint` + `aofManaged` + `rule`,
with `FROZEN_ENFORCEMENT_POINTS` closed at four spellings. A rule that does not compile is a
**refusal** (§4), and drift on a member is a coded **tamper** with a preserved escape hatch (§5). 55
decides *which* knobs may be tuned; this milestone enforces that line rather than redrawing it.

**From 57 (done).** Every optimizing loop is paired with a watcher declaring a **counter-metric**,
and `determinism:` splits a `counter` from a `judge`. `src/work-counters.mjs` is the shipped
deterministic counter leaf — arithmetic only, zero imports, writes nothing.

**From 58 (done).** `arbiter:speed-thoroughness-autonomy` declares `dwell: cycles:2` and
`parameter-tuning: [config:work.loop.reviewRounds, config:work.loop.buildNoProgressRounds,
config:work.autonomous.maxAttempts]`, and 58/FF-5806 binds each of those `config:` endpoints to a
`ceiling:` pointer on a loop that arbiter vetoes. **That edge is the tunable set.**

**From 59 (done).** `aof work audit` is a registered command whose cadence is `event:per-milestone`
and which is **declared, not scheduled** — 54/FF-5409 froze the five-row cost ladder as a delivered
criterion and 63 owns triggers (59/ADR-007 §1). Every sweep declares what it read against a floor,
and a sweep that read nothing is a finding rather than a pass (59/ADR-004 §1a);
`src/work-audit/reads.mjs` is the one home for that record and imports nothing.

**From 66 and 69 (done).** `src/acceptance-horizon.mjs` is the **one home** for what `done` means — a
zero-import leaf holding `ITEM_STATUS_EDGES`, `VALID_STATUS` and `isOpen`, with 66/FF-6602 refusing a
second predicate and a second copy of the five status words. `src/loop-bounds.mjs` is the one home
for `work.loop.*`, and 69/FF-6901 refuses it annexing `work.autonomous.maxAttempts`; 53/FF-5310 pins
that cap to four admitted resolution sites plus one declaration inspector.

**From 60 (done — the spike this milestone is sized on).** Four rulings bind hardest. **(a)** There
is **no observation series, anywhere, of anything** — every m55/57/59 instrument is pure recompute
and `sessionId` is null in 61 of 61 run records, which is why the m68 spend envelope has never been
populated. **(b)** No declared knob has an executed **CONSUMER**: both `work.loop.*` knobs are
resolved on live paths and thrown away, and `src/bundle/commands/continue.md` — the path that built
**every delivered item** — names no config key at all. **(c)** The rule is eight all-favourable
discordant pairs, because `1.5^7 = 17.09 < 20 <= 25.63 = 1.5^8`. **(d)** The evidence unit is a
**discordant pair**, not a run, and the tie rate — hence the whole budget, across a 10x spread — is a
function of a trial metric nobody had chosen.

---

## ADR-001: The rule is ONE object — the threshold, the e-value and the loss semantics ship together, or the number is arbitrary

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §6 settles the rule and the reason it is defensible: *"the fixed threshold and the
sequential test coincide at n=8"*, because a single loss pushes the earliest crossing out to 10-1 at
n=11. Shipping the number without the e-process it coincides with would leave an 8 that reads as a
preference. Shipping the e-process with no truncation at all would leave a rule that never
terminates and that nobody could budget.

**Decision.**

**1 — The commit condition is `E >= 1/alpha`, and NOTHING ELSE.** With `alpha = 0.05` and
`lambda = 0.5`: `E = 1.5^w * 0.5^l`, commit the first time `E >= 20`. The process is evaluated after
**every** pair and is truncated at a declared pair **budget `B`**. There is no separate
all-favourable requirement and no separate "evaluate at N" requirement: **`N = 8` and
"all-favourable" are the same fact about this arithmetic, not two rules.**

**1a — Why they are the same fact, and what the crossing lattice actually is.** Solving
`w*ln(1+lambda) - l*ln(1/(1-lambda)) >= ln(1/alpha)` for the smallest `w` at each `l` gives the
complete set of first-crossing records:

| losses | smallest crossing record | at n | attained E |
|--:|---|--:|--:|
| 0 | **8-0** | **8** | 25.63 |
| 1 | **10-1** | **11** | 28.83 |
| 2 | 11-2 | 13 | 21.62 |
| 3 | 13-3 | 16 | 24.33 |

`N = ceil(ln(1/alpha) / ln(1+lambda)) = 8` is the top row — *the earliest crossing any path can
reach*, which is why a run that commits at `n = 8` is necessarily all-favourable and why a 7-1 record
(reaching only 8.54) is not near-miss but a different row of this table. No path crosses at `n = 9`
or `n = 10`, which is SPIKE §Lane C's measured *"`B=8` and `B=10` are necessarily identical"*.

**2 — `N` and the multipliers are COMPUTED from `alpha` and `lambda`; `B` is DECLARED and frozen.** A
literal `8` in the engine is a number that survives a change to either input; `1.5` and `20` are
likewise derived — `1 + lambda` and `1 / alpha`. This is the structural form of SPIKE §Lane C's
caveat that lambda is attributed to a paper that could not be independently verified: *if the
attribution is wrong, N must be re-derived*. `B` is the one number here that is a **choice** rather
than a derivation, and it is a frozen member of the criterion (ADR-004 §4) for a precise reason:
**extending a budget mid-flight to reach for a crossing is optional stopping in the budget
dimension** — the same p-hack as moving the yardstick, one axis over. `B >= N` is checked at
construction.

**2a — The day-one budget is `B = 11`, and it is derived, not preferred.** It is the **smallest
budget at which a proposal that has lost a pair can still commit** — i.e. the smallest budget that
makes §3's wealth-carry operative instead of decorative. Its price is exactly computable and is
stated rather than waved at:

| budget | type-I under H0 | power at p1 = 0.70 |
|--:|--:|--:|
| `B = 8` | `2^-8` = **0.0039** (12.8x under alpha) | 0.058 |
| `B = 11` | `2^-7` = **0.0078** (6.4x under alpha) | **0.125** |
| unbounded | Ville-bounded at **0.05** | higher, unbounded cost |

Both `B = 11` figures are exact. Type-I: the 11-length paths with one loss number 11, of which 3
(loss in position 9, 10 or 11) already crossed at `n = 8`, leaving **8** first-crossing paths at
`2^-11` each — `8 * 2^-11 = 2^-8` — added to the `2^-8` from 8-0, giving `2^-7`. Power: `0.7^8` plus
`8 * 0.7^10 * 0.3`. **The second crossing doubles the type-I rate and slightly more than doubles the
power.** Doubling 0.0039 against a 0.05 ceiling is cheap; doubling power at aof's measured yields is
not, and SPIKE §5 is explicit that a structurally silent acceptor is its own hazard. The claim that
survives from the first draft is therefore **narrower and exact**: the truncated rule is more
conservative than the process it truncates — **6.4x more**, not 12.8x.

**3 — On a loss the run neither resets nor dies, and the recovery is REACHABLE.** Wealth carries as
`1.5^w * 0.5^l`. A hard reset would attain exactly `2^-8` and throw the Ville guarantee's whole point
away; killing on the first loss would drive the effective commit rate to ~0 and rebuild the off
switch SPIKE §5 names. Under §1 a losing proposal recovers by reaching **10-1 at n=11**, which is a
real commit path inside the day-one budget — that is the entire reason `B` is 11 rather than 8.

**3a — When recovery becomes unreachable, the surface says so by name.** A proposal is not killed by
a loss, but it can be killed by *arithmetic*: at `B = 11` a 5-2 record needs 11-2 at `n = 13`, and no
record reachable within the remaining budget crosses. That state is reported **`budget-exhausted`**,
naming the record that would have crossed and the budget that ran out (ADR-010 §2). It is computed
from the lattice in §1a, never asserted, and it is the one thing this milestone must not get wrong:
reporting such a proposal as `evidence-short` would be the machine lying about its own evidence.

**4 — A step is `+1` or `-1` on an integer, one knob at a time, never compound.** A proposal naming
two keys is refused with a code rather than silently split. `reviewRounds` spans `{1,2,3}`, so its
whole ladder is two steps wide and floor-to-ceiling costs 16 discordant pairs at the floor, and up
to 22 at the day-one budget.

**5 — A non-ordinal knob is not a step and is refused as one.** Model maps are discrete and
unordered; `+1` has no meaning on them. They stay a human diff, permanently, and the refusal is coded
`not-an-ordinal-knob` rather than pretending a range exists.

**6 — Report `N = 4` as *cannot commit under any test, ever*, and `N = 5..7` as *sufficient only
under a maximally aggressive bet*.** Both are SPIKE §6 verbatim, and both are surface text driven by
the same arithmetic rather than by a second table.

**CORRECTION (2026-08-30, raised at the Three Amigos pass on 61/02, where QA hit it while authoring
`01_a-loss-carries-rather-than-resets.feature`).** The first draft of §1 stated the commit condition
as a **conjunction** — `E >= 1/alpha`, *evaluated at N pairs*, *with the run all-favourable* — and §3
then promised recovery at 10-1 by n=11. Under that conjunction a 10-1 record can never commit, so the
recovery was unreachable by construction and the surface would have told the operator a path existed
that the rule could never grant. On a milestone whose subject is a machine that does not lie about
its own evidence, that is the defect, not a wording slip. **The error was mine and it was a category
error:** all-favourable-at-8 is a *description of the earliest crossing* (§1a's top row), and the
draft promoted it to an independent requirement. §1/§1a/§2/§2a/§3/§3a above are the corrected rule
and state it once. What changes for the contract: the commit predicate has **one** leg, not two; `B`
is a new frozen criterion member; `budget-exhausted` is a new reported state; the conservatism claim
is now **6.4x**, not 12.8x; and `FF-6101` is restated to verify the crossing lattice rather than a
typed conjunction.

**Alternatives considered.**

- *A bare fixed threshold with no e-value* — **rejected:** the number becomes arguable at 11pm, which
  is exactly what SPIKE §Ranking says the minimum evidence count exists to prevent.
- *Truncate at `N` — commit only on 8-0, full stop* — **rejected, and it was the first draft's own
  error:** after one loss no crossing is reachable, so the wealth-carry becomes decorative and the
  rule is *killing on the first loss with a delay* — which SPIKE §6 refuses by name, on the ground
  that it drives the effective commit rate to ~0 and rebuilds the off switch.
- *An UNBOUNDED e-process with no budget* — **rejected:** Ville keeps it valid, but it attains the
  full 0.05 rather than 0.0078, gives a proposal no terminal state at yields where a knob moves a
  handful of times per *year*, and leaves ADR-003 with no quantity to price a basket against.
- *Hard reset on a loss* — **rejected** on §1a's arithmetic: it attains `2^-8` and forfeits recovery.

**Invariant.** The commit predicate is `E >= 1/alpha` and has no second leg; the engine holds no
threshold, multiplier or `N` literal; `B` is declared, checked `>= N`, and frozen; a loss multiplies
rather than resets; a proposal with no crossing reachable inside `B` reports `budget-exhausted`
rather than `evidence-short`; a two-key proposal and a non-ordinal knob are each a coded refusal.
(Enforced by `FF-6101`.)

---

## ADR-002: The trial metric is `rounds-to-accept`, paired with `escapes-after-accept` — a declared pointer, swappable only at an epoch boundary

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §3: *"choosing the metric is therefore the first thing milestone 61 must do —
before it can budget anything"*, across a 10x spread. The spike prices three tie rates and
deliberately refuses to choose. It also warns that the retrospective 100% tie rate is a deduction
from history, not a measurable property of a future trial.

**Decision.**

**1 — The metric is `rounds-to-accept`: the number of agent rounds an item consumed between its first
`run.started` and its transition into `done`.** It is chosen because it is the one quantity **all
three admitted knobs move**: `reviewRounds` bounds review rounds, `buildNoProgressRounds` bounds
stalled build rounds, `maxAttempts` bounds retries. A metric only one knob moves makes the other two
structurally silent — the §5 hazard installed by choice.

**2 — Its paired counter-metric is `escapes-after-accept`** — `countFindingEscapes`
(`src/work-counters.mjs`, shipped 57/04, `determinism: counter`). Fewer rounds bought by accepting
worse work is not an improvement, and 57 already ships the deterministic counter that says so. A
criterion declaring a metric without a counter-metric is **refused at construction**.

**3 — The tie rate this implies, stated as an ASSUMPTION with its consequence.** `rounds-to-accept`
is integer-valued over a support wide enough to sit in SPIKE §3's fine-grained row: the measured
population is 119 `aof-qa` rounds, 76 `aof-architect` rounds and 104 developer task builds over 52
items. We adopt **50% ties**. At the evidence **floor** (`N = 8`) that is `ceil(8 / 0.5) = 16` raw
pairs — the row SPIKE §3 publishes and prices at **$180** (`aof-qa` round), **$730** (developer task
build) and **$1,192** (story build). **Those three figures price the floor, not the purchase:** what
an operator actually buys is the pair *budget* `B` (ADR-001 §2a), and ADR-003 §3 prices that. The
binary pass/fail alternative is rejected on its own price: 95.08% ties, **163** raw pairs at the
floor.

**4 — The assumption is scheduled for replacement, not carried.** SPIKE §Honest scope records that
`CV_w` is unmeasured and that no item has ever been replayed. The **first ruling the acceptor renders
records the observed tie rate**, and the declared rate is thereafter reported beside the observed one.
A declared rate that survives its own contradiction is the p-hack one level up.

**5 — The metric is a POINTER, not a name in the engine.** The criterion declares
`metric: module:src/work-counters.mjs#roundsToAccept` and
`counter: module:src/work-counters.mjs#countFindingEscapes`, resolved through a registry **derived
from callable resolvers** — 69/ADR-001's own rule for `LOOP_BOUND_CONFIG_RESOLVERS`, never a parallel
allow-list that can name a metric nobody computes. Swapping the metric is an edit to the criterion,
which is an epoch-boundary act by `actor:operator` (ADR-004) and resets the ledger (ADR-005).

**7 — `roundsToAccept` is ADDED to `src/work-counters.mjs`, beside the counter-metric it is paired
with.** 57/04's leaf is already the deterministic-counter home: arithmetic only, zero imports, writes
nothing, records handed in. Putting the trial metric anywhere else would open a second counters home
for a system whose whole subject is not having two of anything. The criterion holds the pointer as
data; resolution against the registry is the rule engine's, so the two land in the same story.

**6 — An UNMEASURABLE arm is neither a tie nor a favourable pair.** A tie is discarded by
construction; an unmeasurable pair is **refused and counted as unmeasurable**, because counting it as
a tie silently discards evidence and counting it as favourable fabricates it. At HEAD every arm is
unmeasurable — `sessionId` is null in 61 of 61 records — and the surface says exactly that.

**Alternatives considered.**

- *Binary pass/fail on the item build* — **rejected on price and on power**: 95.08% ties, 163 raw
  pairs, $7,438, and a harness-attributable failure floor of 4.92% that is a **lower** bound on cost.
- *Cost per accepted item (USD)* — **rejected as unmeasurable in principle at HEAD**: the whole spend
  envelope dead-ends on the null `sessionId`, so this metric would be permanently `unmeasurable` with
  no cheaper path to measurement than `rounds-to-accept` already has.
- *The review verdict* — **rejected as an unpaired judge**: SPIKE §Honest scope, *"pairing on it
  re-couples the acceptor to the maker unless the reviewer is independent of the change being
  scored"*. It stays admissible as a counter-metric under 57's independence computation, never as the
  trial metric.
- *A rubric or grade run as the trial* — **rejected by SPIKE §4**: on a fixed tree the grader returns
  the same answer under every harness configuration, so it cannot discriminate at all.

**Invariant.** The criterion's metric and counter-metric are pointers resolving to callable
resolvers; the engine spells no metric name; a criterion without a counter-metric is refused; an
unmeasurable arm is reported as such and never folded into ties. (Enforced by `FF-6102`.)

---

## ADR-003: One threshold, MANY baskets — the trial unit is declared per knob, and a knob priced above the budget reports rather than accrues

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §4: *"one evidence threshold cannot serve every knob: at n=20 raw pairs a
review-prompt change costs $225 and a dispatch-bound change $5,492, a 24.5x spread"* — and the record
gives no sizing rule, so 61 must author one.

**Decision.**

**1 — `N` is invariant at 8 and is NOT the thing that varies.** It is arithmetic over `alpha` and
`lambda` (ADR-001); making it per-knob would make the error guarantee per-knob, which is the
multiple-testing failure this milestone exists to refuse.

**2 — What varies is the BASKET, and it is computed:**

`basket(knob) = ceil(B / (1 - tieRate)) * 2 arms * meanUnitUsd(trialUnit(knob))`

The quantity purchased is the **budget** `B`, never the floor `N`: a trial must be funded for the
longest run it may legitimately take, and a commit at `n = 8` simply costs less than it was funded
for. Pricing on `N` would fund a trial that cannot reach its own second crossing — ADR-001's
corrected error, arriving through the budget.

**2a — The tie rate is a declared RATIONAL and the pair count is INTEGER arithmetic, because this
exact computation has already produced a wrong number once.** SPIKE §Corrections: *"`8/(1-0.90)` is
80 raw pairs, not 81. The first pass's 81 was an IEEE-754 artefact of `Math.ceil(8/0.1)`, in a
document about numeric discipline."* The artefact recurs at `B = 11`: `11 / 0.1` evaluates to
`110.00000000000001`, so `ceil` returns **111**. The rule: the criterion declares the tie rate as a
rational `n/d` with integer terms, and the pair count is `ceil(B * d / (d - n))` evaluated in integer
arithmetic — `11 * 10 / 1 = 110`, exactly. **No float division appears on the path from a declared
rate to a pair count.** That is what makes every row of §3 contractable, rather than only the rows
whose float happens to land clean; QA was right to omit the 90% row until this rule existed.

**3 — `trialUnit(knob)` is the SMALLEST measured unit whose outcome that knob can change**, declared
on the criterion beside the knob and priced from the spike's own table:

At `B = 11` and 50% ties the budget is `ceil(11 / 0.5) = 22` raw pairs:

| knob | trial unit | mean USD | basket at `B = 11`, 50% ties |
|---|---|--:|--:|
| `work.loop.reviewRounds` | `aof-qa` review round | 5.61 | **$247** |
| `work.loop.buildNoProgressRounds` | `aof-developer` task build | 22.82 | **$1,004** |
| `work.autonomous.maxAttempts` | milestone build | 137.30 | **$6,041** |

The spread across the three is **24.5x** — and it is a ratio of unit means, so it is invariant to `B`
and to the tie rate, which is why it reproduces the spike's independently measured 24.5x under any
budget. **That invariance is the consistency check; the dollar column is not.** `maxAttempts` takes the milestone build because SPIKE §4
measured that *"there is no unit below the milestone build that responds to an orchestration knob at
all"*. The mean is used, never the median, because a paired trial runs both arms (SPIKE §Conventions:
a reader taking the single-arm/median reading gets a figure ~4x low).

**4 — The criterion carries a budget ceiling, and a knob priced above it reports
`trial-unaffordable` and accrues NOTHING.** The day-one ceiling is **$1,500 per trial**, and it is
chosen for a **margin** rather than for a round number: it admits both agent-round-scale knobs *even
if the tie rate turns out 15 points worse than assumed* — at 65% ties the developer-unit basket is
`ceil(11 / 0.35) = 32` raw pairs, `32 x 2 x 22.82 = $1,460`, still inside it — while refusing the
milestone-unit knob by **4x** under any tie rate. A ceiling that flips a knob from admitted to
refused on a small move in an assumption ADR-002 §4 has already scheduled for replacement is a
ceiling that re-decides itself. It is a frozen member of the criterion (ADR-004) and moves only at a
boundary.

**6 — What may be PINNED from the spike's table, and what may not.** *(Confirmed at the Three Amigos
pass, where QA declined to freeze two figures.)* The formula in §2 is the authority; the spike's
published dollars illustrate it. They reproduce **exactly** on the 50% row — `16 x 2 x 5.61 =
$179.52`, `x 22.82 = $730.24`, `x 37.24 = $1,191.68`, i.e. $180 / $730 / $1,192 to the nearest dollar
— and only **to within about a dollar** on the 95.08% row: `163 x 2 x 5.61 = $1,828.86` against a
published **$1,830**, and `163 x 2 x 22.82 = $7,439.32` against a published **$7,438**. It misses in
*both* directions, so it is a rounding artefact of the source rather than a different computation.
**QA is right and its call is adopted here:** pin those rows in **raw pairs** only, pin dollars only
where the arithmetic reproduces, and never freeze into an acceptance criterion a figure that criterion
cannot re-derive from the formula it claims to follow.

**5 — The refusal is REPORTED, never silent.** An unaffordable knob is not dropped from the surface;
it is listed with its computed basket and the ceiling it exceeded, so the operator sees the price of
admitting it rather than discovering its absence.

**Alternatives considered.**

- *Scale `N` per knob (fewer pairs for cheap knobs)* — **rejected:** it buys affordability by
  weakening the guarantee exactly where evidence is cheapest to over-collect.
- *One flat budget with no per-knob unit* — **rejected:** it prices a review-prompt change at the
  milestone-build rate and makes the cheapest, most tractable knob look unaffordable.
- *Leave the basket undeclared and discover it at trial time* — **rejected:** SPIKE §3's whole point
  is that an unbudgeted trial is a 10x unknown, and 62's proposer would inherit it.

**Invariant.** Each admitted knob resolves a declared trial unit and a computed basket; no single
threshold constant is applied across knobs; a knob whose basket exceeds the criterion's budget
reports `trial-unaffordable` and contributes no pairs. (Enforced by `FF-6103`.)

---

## ADR-004: An epoch is one milestone; the boundary is any transition INTO `done`, keyed through the one lifecycle leaf

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §8 settles the unit and corrects its own first pass: key on `to === "done"`, not
on `from === "in-progress"`. `ITEM_STATUS_EDGES` admits `in-review -> done`, `verify.md` accepts from
either, and **3 of 4 spikes already took the other edge** — so the narrower predicate happens to work
on the 11 milestones that have closed, and would silently never close an epoch for a milestone parked
`in-review` before acceptance.

**Decision.**

**1 — One epoch is one milestone, and the boundary is any transition whose destination status is
`done`.** The payload already carries both ends — the destination is the field spelled **`status`**
and the origin `from` (`src/effects/item-transitions.mjs:46-52`), so the predicate needs no new data
and **is written against `status`, the name the payload actually uses** (N6). `from` is recorded in
the ruling for provenance and is **never** part of the predicate.

**1b — What OPENS an epoch, what identifies it, and what "at a boundary" means operationally.** The
close is the transition; everything else follows from it and from nothing else.

- **`epochId` is the ref of the milestone whose close ended the epoch.** A ruling is rendered at a
  boundary and scores the epoch that just ended, so the id always resolves and is never a guess.
- **An epoch OPENS at the previous close.** Its extent is the interval between two milestone-close
  transitions, both of which are facts already in the effects journal.
- **The criterion-revision window is open exactly while the ledger holds no ruling rendered after
  the most recent milestone close.** Once the acceptor has ruled in the new epoch, the criterion is
  frozen until the next close. That is the anti-p-hack rule stated operationally: **you may
  re-choose the yardstick before you start measuring, and never after.**

The reading this replaces would have been an off switch, and the measurement says so. Identifying
the open epoch with *the open milestones* fails immediately: `isOpen` admits **seven** milestones in
this repository today (one `in-progress`, six `not-started`), so the criterion would be frozen
permanently and "at a boundary" would be a **zero-width window** — SPIKE §5's structurally-silent
shape, installed in the epoch instead of in the threshold. The window defined above is open in this
repository right now, because no ruling has ever been rendered.

**2 — The predicate lives in `src/acceptance-horizon.mjs`, the zero-import leaf that already owns
what `done` means.** It is exported as `closesEpoch(status)`, takes the payload field of that name
(§1) and compares against the module's own `CLOSED_STATUS`, so no second `"done"` literal is created and 66/FF-6602's two legs — no second
horizon-shaped predicate, no second copy of the five status words — stay unweakened. **Nothing in the
acceptor spells a lifecycle literal.** Coupling: 11 dependents, **0 imports** (`aof graph impact`,
2026-08-30) — the cheapest place in the tree to add a lifecycle fact.

**3 — The acceptor's epoch EQUALS the auditor's cadence, and that is the load-bearing argument.**
`.aof/loops/instrument-audit.md:8` is `cadence: event:per-milestone`; an acceptor scoring on a
different clock is trusting instruments audited on another one (SPIKE §8). A `periodic:<n>d` cadence
*is* expressible in the grammar, and a *range* is refused outright: being a query chosen per
invocation, it is p-hacking by choice of window, one level up.

**4 — FOUR members are frozen within the epoch, carrying SIX quantities, and each is refused rather
than warned:**

1. the trial **metric** and its paired **counter-metric**;
2. **alpha, lambda, N and the pair budget `B`** — all four. N is a function of lambda and alpha, so
   freezing N without lambda lets it drift by re-choosing lambda (SPIKE §8); and `B` is frozen
   because extending a budget mid-flight to reach for a crossing is **optional stopping in the budget
   dimension**, the same p-hack as moving the yardstick, one axis over (ADR-001 §2);
3. the **tunable set** with its floors and ceilings (ADR-009), and the per-knob budget ceiling
   (ADR-003 §4);
4. the **frozen set** itself.

**5 — At the boundary and only there, `actor:operator` may revise them.** That actor is the
registry's sole exogenous contact with reality (`src/bundle/loops/operator.md`, `ground: exogenous`),
which is what keeps the root reference outside the loop — SPEC §Scope's permanent exclusion.

**6 — The criterion is a per-project record whose framework defaults live in code, read the way the
frozen set is read.** `readCriterion(projectDir)` returns `.aof/acceptor-criterion.jsonc` when
present and the bundled defaults otherwise — `readFrozenSet`'s exact ENOENT shape
(`src/frozen-set.mjs:42-58`). It is deliberately **not** a bundle asset: an asset installed by
`aof work update` would make an operator's boundary revision read as drift, and 55/ADR-004 §5 makes
drift on a frozen member a *tamper*. Defaults in code, revisions in the project, no third state.

**Alternatives considered.**

- *Key on `from === "in-progress"`* — **rejected** on SPIKE §8's measurement.
- *A calendar epoch (`periodic:30d`)* — **rejected:** nothing slower than `per-milestone` is
  *declared* anywhere in this tree, and 58/ADR-002 bans comparing the ordinal and duration axes.
- *A commit range* — **rejected:** a window chosen per invocation is the p-hack itself.
- *Ship the criterion as a bundle asset* — **rejected** on the drift/tamper collision above.

**Invariant.** The epoch boundary resolves through the one lifecycle leaf and keys on `to`; the
acceptor spells no status literal; the criterion's frozen member set is exactly the four above; the
acceptor's declared cadence equals the auditor's. (Enforced by `FF-6104`.)

---

## ADR-005: The enforcement point that cannot be routed around is the LEDGER'S OWN ARITHMETIC — the permission boundary and the writer refusal are the two layers above it

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §Outcome, blocking premise 3: *"nothing can refuse a mid-epoch criterion change"*.
The frozen set's `anchors` member denies `Edit/Write(.aof/loops/**)` at the **`permission denials`**
point — a `deny` rule in `.claude/settings.json`, which binds an **agent's tools and nothing else** —
and `.aof/aof.config.json`, where the knob values live, is in **no member at all**. *(N5: the spike,
and this ADR's first draft after it, called that point "agent tool scope"; the declaration says
`permission denials`, and the two are different members of a closed four-value enum. The substance —
it binds agents only — was right; the name was not.)* Without an
enforcement point the ledger accrues pairs spanning two values of the knob under test and commits on
evidence straddling the change: exactly the p-hack the epoch machinery exists to prevent.

The temptation is to answer with a permission. A permission cannot see `aof config set`, cannot see
the acceptor's own write, and cannot see a human in an editor. Any single-layer answer here is a
control that reports as enforced while being trivially bypassable — 55/ADR-004 §4's own indictment.

**Decision. Three layers, and each one's limit is stated rather than implied.**

**1 — The load-bearing layer is ARITHMETIC, not permission.** Every ruling records the **criterion
digest** it was rendered under. The accrual sums only the **maximal suffix of rulings sharing the
current digest**. A criterion that moves therefore resets the ledger to zero *by construction* —
there is no code path that adds a pair rendered under a different criterion, so a straddling commit
is not merely refused, it is unrepresentable. This works against an editor, a script, a merge and a
bypassed hook, because it does not depend on observing the write at all. It is also exactly SPIKE
§8's stated rule — *"if the criterion moves the evidence ledger resets to zero and the surface says
so by name"* — with the reset mechanised as the definition of the sum rather than as a separate
action somebody must remember to take.

**1a — The selector lives in the CRITERION's home, not the ledger's, and that placement is the
decision.** `rulingsUnderCurrentCriterion(rulings, digest)` — the pure function returning the maximal
trailing run of rulings sharing the current digest — is exported from
`src/work-acceptor/criterion.mjs`. **An enforcement point that lives in another module's file is an
enforcement point nobody owns**, and *which rulings were rendered under the criterion in force* is a
question about criterion identity, not about e-value arithmetic. It is a **suffix and not a filter**:
a criterion revised and later revised **back** to an earlier value does not resurrect the rulings
rendered under the first occurrence, because the evidence in between was gathered under a different
yardstick. A filter on digest equality would resurrect them — the subtle form of the straddling
commit this ADR exists to make unrepresentable.

**2 — The second layer is a coded WRITER refusal.** The criterion has one writer seam, and it refuses
a mid-epoch write with `criterion-frozen-in-epoch`, naming the open epoch and the boundary at which
the revision may be made. Its limit: it binds writes that come through the seam, and nothing else.

**3 — The third layer is a SIXTH frozen-set member, `acceptor-criterion`, at `permission denials`.**
It denies `Edit`/`Write` on `.aof/acceptor-criterion.jsonc` and `.aof/acceptor-ledger.jsonl` — the
`anchors` member's exact shape at the same declared point, so it compiles today with **zero new
code** and no widening of `FROZEN_ENFORCEMENT_POINTS`. Its limit, stated plainly: it stops an **agent**, and only an
agent. The CLI writes both files through its own process, exactly as `aof work update` writes
`.aof/loops/**` while agents are denied it.

**4 — The knob VALUES are deliberately NOT frozen, and are not protected by a permission.** A knob
move is what a commit *is*. What the machinery owes is that a move **ends the accrual that was
running on that knob**: the acceptor's own commit does so legitimately and starts the dwell, and an
out-of-band edit does so too — detected because the ruling records the knob's prior value alongside
the digest, so a value that changed under the ledger is reported by name rather than absorbed.

**5 — Why the criterion is its own FILE.** A path-shaped permission rule cannot name a subtree of
`aof.config.json`. Putting the criterion in its own file is what makes layer 3 expressible at all;
the knob values stay in `aof.config.json` because that is where every resolver reads them, and they
are covered by layer 1 instead. The two live apart for a reason, and this paragraph is that reason.

**Alternatives considered.**

- *A frozen-set member alone* — **rejected:** agent tool scope is one of four write paths, so the
  member would report as enforcement while three paths walked past it.
- *Deny `Edit(.aof/aof.config.json)` outright* — **rejected:** it would refuse every legitimate
  config edit in the repo to protect three keys, and still not bind the CLI.
- *A new `enforcementPoint` spelling ("the config writer")* — **rejected:** the writer refusal is
  layer 2, and expressing it as a frozen-set point would require a fifth compile target for one
  member. 55/ADR-004 §2's deferred fourth point is the precedent for not doing this.
- *Refuse the mid-epoch change and stop there* — **rejected:** it leaves the ledger trusting that no
  bypass ever happened, which is precisely the assumption a p-hacking system violates.

**Invariant.** Every ruling carries its criterion digest; the accrual sums only the maximal suffix
sharing the current digest; a mid-epoch criterion write through the seam is a coded refusal; the
sixth frozen-set member compiles to permission denials naming both acceptor paths; and a knob whose
value changed under an accruing ledger is reported by name. (Enforced by `FF-6105`.)

---

## ADR-006: The ledger accrues ACROSS epochs, is git-tracked beside the config it justifies, and refuses an incomplete ruling at construction

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §6 corrects its own first pass on both halves: *"The ledger accrues across epochs,
not within one: at a measured yield below one discordant pair per epoch, an epoch-scoped counter can
never exceed 1 and the acceptor is structurally unable to fire — the §5 hazard, built in."* And on
reversibility: *"half of it is already free"* — `.aof/aof.config.json`, `.aof/frozen-set.jsonc` and
all 17 `.aof/loops/*.md` are git-tracked, so `git revert` **is** the mechanism. What is missing is
the **why**, attached.

**Decision.**

**1 — Scope: across epochs, reset only by a criterion move.** ADR-005 §1 makes the reset arithmetic
rather than an action. An epoch-scoped counter is refused explicitly, by name, because it is the
shape that silently guarantees the acceptor never fires.

**2 — The ledger is `.aof/acceptor-ledger.jsonl`: git-tracked, append-only, authoritative.** It is
**not** added to `AOF_GITIGNORE_ENTRIES` — the memory index and the artifact-sync queue are ignored
because they are *derived and regenerable*, and this is neither. Being tracked is what makes the
`git revert` mechanism carry the evidence with the change, in one revertible unit.

**3 — The ruling record has a FROZEN key set, refused at construction when incomplete.** The keys are
exactly SPIKE §6's missing "why": `key`, `from`, `to`, `epochId`, `criterion` (the digest), the
`ledger` as W/L/T **in order**, the attained `evalue`, the `counterMetric` reading, **`dwell` and
`dwellFrom`** (ADR-010 §5 — the declaration as read plus the epoch it started at, never a computed
expiry), `provenance`, `verdict` and `refusals`. A record missing any of them is refused at
construction and again at ledger assembly rather than rendered blank — 59/ADR-004 §1a's
discipline for the ruling record. Unlike the ruling record, the **read** record is IMPORTED rather
than restated; §6 draws that line.

**4 — Three homes, split on what each is answerable for.** `src/work-acceptor/criterion.mjs` owns
**selection** — which rulings are in force (ADR-005 §1a). `src/work-acceptor/ledger.mjs` owns the
**arithmetic** — totals, W/L/T order, e-value, budget reachability, verdict — as a pure leaf that
imports nothing and reads no clock, taking `now` and the **already-selected** records as arguments
(57/FF-5705's shape). `src/work-acceptor/store.mjs` owns the **I/O** — both the surgical `work.*`
knob write and the ledger append (ADR-007 §2a) — reached only from the seam and its reactor. Composition happens at the command boundary, so no import edge is created
between the first two and the arithmetic leaf stays zero-import.

**4a — The arithmetic leaf never sees a digest, which is stronger than forbidding it to sum across
two.** It receives a list and totals the list. *Summing across two criteria* is therefore not a code
path that must be checked for and refused — it is **not expressible** in the module that does the
summing. No second module derives W/L/T or an e-value.

**5 — COUNTING HYGIENE has one home, and it derives rather than re-spells.** Anything counted off the
effects journal filters `itemDir` for fixtures — **3,848 of 3,926 `run.started` are test fixtures** —
and collapses `dispatch-worktrees/dispatch-NN-MM` into the parent, without which the two censuses
disagree (61 on-disk across 52 items vs 53 in the journal). The classification lives in
`src/work-acceptor/observations.mjs` and derives the dispatch case from `mesh-worktree.mjs`'s
exported `isUnderMeshDispatchWorktreesRoot` / `dispatchWorktreeSlug` rather than re-spelling the
literal — that module is the only place in `src/` that spells `dispatch-worktrees` today, and it
stays that way.

**6 — A census that filtered nothing is a FINDING, not a count — and the record shape is IMPORTED,
while the finding is not.** Every population the acceptor reads declares what it read against a
floor. `src/work-audit/reads.mjs` already owns that shape and imports nothing, so the acceptor
**imports `readRecord`, `sweepDeclarationProblems` and `SWEEP_BASES` from it** rather than restating
them: one shape, one home, 59/FF-5908's ratchet paid rather than re-opened. It does **not** import
`readFinding`, and the reason is precise: that constructor hardcodes `code: "audit-ran-on-nothing"`
(`reads.mjs:152-160`), which is the *auditor's* code. The acceptor builds its own finding, with its
own code `acceptor-ran-on-nothing`, from the same problems list — **so only the code string differs,
and the shape cannot drift.** At HEAD an empty census is the expected result, and it is a finding
rather than a silent zero.

**Alternatives considered.**

- *An epoch-scoped ledger* — **rejected** on SPIKE §6's measurement: it can never exceed 1.
- *Persist the ledger in the effects journal (`~/.aof/mesh/work/journal.sqlite`)* — **rejected:** it
  is per-node, outside the repo, ungovernable by `git revert`, and shares a store with the 3,848
  fixture events this ADR exists to filter out.
- *Persist under `wiki/work/`* — **rejected:** the evidence is about the harness, not about an item,
  and it must revert together with the config it justifies.

**Invariant.** The accrual crosses epochs; the ruling key set is frozen and refused at construction;
the arithmetic leaf imports nothing and reads no clock; no second module derives W/L/T; fixture and
dispatch classification has one home that derives from `mesh-worktree.mjs`; a sweep below its floor
is a finding. (Enforced by `FF-6106`, `FF-6107`.)

---

## ADR-007: `harness.ruled` is the ninth event — and this milestone closes the hole that made the vocabulary's own comment false

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §Outcome, blocking premise 2: none of the eight declared events
(`run.started`, `run.completed`, `feedback.recorded`, `item-status.changed`, `stream.reindexed`,
`assignment.reported`, `terminal.resume-refused`, `assignment.settled`) carries a config or harness
change, and `saveEditableResource` records no prior value, evidence or provenance. **61 must add an
event.** The spike also records that the mechanism is weaker than the policy: `appendEvent`
(`src/effects/journal.mjs:133`) validates only that a name is non-empty, so an undeclared name
appends silently and resolves to zero reactors — and `table.mjs:461`'s comment claiming *"appendEvent
refuses a name not declared here"* is **false at HEAD**.

**Decision.**

**1 — The event is `harness.ruled`, not `harness.changed`.** The fact recorded is *the acceptor
rendered a ruling on a proposal*; a committing ruling is the subset where the harness moved. Naming
it `changed` would leave **report-only — the permanent default (SPIKE §5) — with no event at all**,
so the ledger would be empty in exactly the state this system actually lives in. One name covers
both, and the payload's `verdict` distinguishes them.

**2 — One reactor, `stamp-evidence`, at locus `checkout`.** It appends the ruling to
`.aof/acceptor-ledger.jsonl` — a working-tree write, which is what `checkout` means. It is idempotent
by event id: the ledger line carries the event id and re-appending the same id is a no-op, mirroring
the journal's own `INSERT OR IGNORE` discipline. The **payload carries its own evidence** — the full
ruling record of ADR-006 §3 — so the reactor never re-derives a verdict, and a drain on another
process reproduces the identical line.

**2a — THE COMMIT PATH HAS A WRITER, and it is named here because nothing in `src/` writes
`work.*` today.** `src/config-editor.mjs` is not it: `saveEditableSections` writes a closed section
list (`mcpServers`/`hooks`/`projectDocs`/`workflows`/`settings`) and `baseConfig` (`:337-353`)
preserves `work` **verbatim**, with no path to modify it. That module's subject is editable
*resources*; widening it to knob values would blur it and would put a config-value writer behind four
dependents that have no business with one.

The writer is **`src/work-acceptor/store.mjs`** — the acceptor's single I/O home, holding **both**
writes: the surgical `work.*` knob write and the ledger append. One writer for both files is what
makes "the change and its record are one working-tree change" (FF-6113) a property rather than a
convention. Two rules bind it. **(a) The knob write is SURGICAL** — one key, every other key, its
order and the file's formatting preserved — because `.aof/aof.config.json` is co-authored and a
whole-file re-render is m43/ADR-002's named defect and 55/ADR-004's measured blast radius. **(b) It
is reached only from the seam**, never from a command or a face.

**3 — The seam is `src/effects/harness-transitions.mjs`**, alongside the five existing transition
seams, and it is added to `acd-effects-ledger`'s `APPEND_EVENT_ALLOWED` set. Facts precede
announcements, as everywhere else in this family: the knob write lands first, then the event, then
the drain. The ledger line stays the **reactor's** step rather than joining the fact, and the window
that opens between them is the one this machinery exists to close — the event carries the whole
ruling as its payload, so a crashed drain leaves a PENDING step another process completes to a
byte-identical line. What the seam may **not** do is return success with a knob written and no ledger
line: the drain is not optional on this path, and a failed drain is reported rather than swallowed.

**4 — 61 CLOSES the undeclared-name hole, and closes it in the VOCABULARY'S home rather than in the
journal.** `applicableReactors` (`src/effects/table.mjs:589`) refuses a name absent from the supplied
table with a coded error, instead of resolving to `[]`. The journal stays dumb storage that never
imports the vocabulary — the m42 d2 layering — so the fix makes the existing comment true without
inverting the design it describes. Blast radius, measured: all six append sites pass one of the
declared names, and no test imports `applicableReactors`, so the refusal has no standing caller to
break.

**Alternatives considered.**

- *Two events (`harness.tuned` + `criterion.revised`)* — **rejected:** their consequence is
  identical (a durable record beside the config), the applicability machinery already discriminates
  by predicate, and the fact is one fact — *the harness the accruing evidence was gathered under is
  no longer the harness that runs*.
- *Validate the name inside `appendEvent`* — **rejected:** it would make dumb storage import the
  vocabulary, inverting the one layering this family is built on.
- *Leave the false comment and note it in TECH_DEBT* — **rejected:** the comment describes a control
  this milestone is about to depend on, and the fix is one refusal in the module that owns the
  vocabulary.
- *Make the ruling a reactor on `item-status.changed`* — **rejected:** it would schedule the
  acceptor, and 59/ADR-007 §1 is explicit that cadence is declared here and triggers are 63's.

**Invariant.** `EFFECTS` gains exactly one name whose reactor carries a locus and is idempotent by
event id; the ledger is written only through that reactor; `applicableReactors` refuses an undeclared
name with a code; no `src/` module outside the admitted seam set calls `appendEvent`; and
`journal.mjs` still imports no vocabulary. (Enforced by `FF-6108`.)

---

## ADR-008: No executed CONSUMER, no proposal — the control EXTENDS `unconsumedCeilings`, and the tunable set is the registry's, never the acceptor's

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §7 is the highest-value control in the finding and corrects its own wording twice.
*"The wording must be 'no executed CONSUMER' — a resolved value that reaches a decision — never 'no
executed reader'"*: on the reader wording the check finds live readers for all three knobs via
`drive.mjs` and `mesh-worker-execution.mjs` and **refuses none of them**. And *"it must EXTEND an
existing control, not add a sibling"* — `test/arch/acd-progress-ledger-consumed.test.mjs:96-107`
already refuses a `config:` ceiling with no production reader outside its declaring home, and its own
header states this exact residue: *"it does not prove that reader is itself reachable from a
production entry point."* This is the **third recorded instance** of the species (F-6900, F-69-V7,
F-69-V8), and it wants a ratchet, not another one-off.

**Decision.**

**1 — The control EXTENDS `unconsumedCeilings` in its existing file.** No sibling. The red probe is
therefore the only evidence the new leg is armed, and the register says so.

**2 — Two legs, and their difference is deliberate.**

- **(a) Discriminating.** For every `config:` ceiling on every framework loop record, a production
  consumer must read the **resolved value at a decision site** outside the declaring home and outside
  the policy-composition site. This is the leg that catches the measured HEAD defect:
  `loopBoundsFromConfig` resolves both `work.loop.*` knobs (`src/loop-bounds.mjs:91-100`) on paths
  that demonstrably executed, and the sole consumer of `deadlinePolicy`
  (`src/agent-session-driver.mjs:1126-1163`) reads **only** `startToCloseMs`, `heartbeatMs` and
  `startupGraceMs`. Computed and thrown away is not consumed.
- **(b) Fail-closed.** The harness of record is declared. **While the declared harness is a prompt
  document that names no config key, every proposal is refused** with `harness-not-introspectable`.
  SPIKE §7 states the honest limit: for the prompt-driven harness the check is not statically
  decidable, so the implementable form *"is a switch rather than a discriminating control until knobs
  become readable from the prompt path"*. The switch's condition is **evaluated**, never hardcoded:
  it re-opens the moment `continue.md` names the key, which is SPIKE §Outcome item (iii) — *a few
  lines that converts the whole arc from unfalsifiable to testable*.

**3 — At HEAD this refuses all three knobs, and that is the correct answer.** SPIKE §7: for a knob
with no executed consumer the null is *exactly* true, so **100% of any commits it produces are
false**. The control's value is removing a whole class of proposals from the multiple-testing stream.

**4 — The TUNABLE SET is not a list this milestone writes.** It is
`arbiter:speed-thoroughness-autonomy`'s `parameter-tuning:` edge, read through `loadLoops`. 55 and 58
already decide membership, and 58/FF-5806 already requires each member to be cited as a `ceiling:` by
a loop that arbiter vetoes. **The acceptor holds no config-key literal for a tunable knob**; a key
absent from the edge is refused with a code. This is what makes SPEC §Scope's *"this milestone
enforces rather than redraws"* structural instead of aspirational.

**Alternatives considered.**

- *A sibling control* — **rejected** by SPIKE §Outcome verbatim, and by the species ratchet.
- *Word it on readers* — **rejected:** measured to refuse nothing.
- *Full call-graph reachability from every CLI entry point* — **rejected as undecidable here:** the
  harness that built every delivered item is a prompt, and no static walk crosses that boundary. The
  fail-closed switch is the honest form and says so on the surface.
- *Let the acceptor declare its own knob list* — **rejected:** a second home for the tunable set,
  and a redrawing of 55's line by the component that was told to enforce it.

**Invariant.** The ceiling-consumption guard is extended in place with a decision-site leg and a
fail-closed harness switch whose condition is evaluated; the acceptor spells no tunable config key;
the admitted set is resolved from the arbiter's `parameter-tuning:` edge and a key outside it is a
coded refusal. (Enforced by `FF-6109`, `FF-6110`.)

---

## ADR-009: The range lives in each bound's OWN resolver and a step is admissible when that resolver returns it unchanged — and a key that resolves to TWO bounds is not a knob

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §Outcome, blocking premise 1: *"'bounded step within declared floors and ceilings'
has no ceilings to declare"* — only `reviewRounds` is clamped, and *"an auto-applied +/-1 on an
unbounded knob is a ratchet that walks to infinity."* D-61-1 (STATE) settles scope: 55 decides which
knobs may be tuned, 61 declares the range each may move within.

**A measurement the spike did not take, and it changes the answer for one of the three.**
`work.autonomous.maxAttempts` resolves to **two different bounds**. At `src/commands/run-retry.mjs:33`
it is the **attempt ceiling** — how many times a run may be retried. At `src/commands/loop.mjs:706`
the same key becomes `cap`, the **per-(ref, phase) drive-cycle ceiling**: `:1266` refuses with
`cap-exhausted` when `cycle > resolved.cap`, and `:1751` documents `--cap` as *"override the
per-(ref, phase) drive ceiling"*. An attempt and a drive cycle are not the same quantity, are not
measured by the same histogram, and do not share a defensible range: `test/loop-command-probe.test.mjs:157-164`
already asserts `loopCommand.run({ cap: 5 })` returns `cap: 5`, which an attempt-derived ceiling of 4
would break.

**Decision.**

**1 — The range is CODE, in each bound's existing home, and the criterion CITES the resolver rather
than restating numbers.** A numeric range written into the criterion is a second home for the bound —
the species F-6900 / F-69-V7 / F-69-V8 indict — and the two copies drift.

**2 — Admissibility of a step is a PROBE, not a table:** a proposed value `p` is in range **iff**
`resolve(p) === p`. It needs no floors/ceilings table anywhere and makes blocking premise 1 concrete:
**without the clamps the probe admits infinity.** The probe needs a **value-shaped** resolver, and
`LOOP_BOUND_CONFIG_RESOLVERS` holds workspace-shaped ones, so `src/loop-bounds.mjs` also exports
**`LOOP_BOUND_VALUE_RESOLVERS`** — the same keys mapped to `resolveReviewRounds` /
`resolveBuildNoProgressRounds`, derived from the callables exactly as its sibling is, never a
parallel allow-list. Both maps live in the one home 69/ADR-001 gave `work.loop.*`.

**3 — ONE clamp lands, because one is all that is missing.**

| knob | floor | ceiling | derivation |
|---|--:|--:|---|
| `work.loop.reviewRounds` | 1 | **3** | already `MAX_REVIEW_ROUNDS`; unchanged, and the model the other is brought up to |
| `work.loop.buildNoProgressRounds` | 1 | **4** | worst-case no-progress spend is `maxStalls x (maxResets + 1)` = 4 x 3 = 12 rounds; at the $22.82 mean task build that is ~$274 — half the worst single build ever measured ($544.06), so the ceiling bounds no-progress waste below the most expensive *productive* build this repo has paid for |

The clamp is **one edit to one resolver** and it binds every door: `resolveBuildNoProgressRounds` is
the single funnel — `loop-progress.mjs:173` and `:189` both put `options.maxStalls` through it, and
the config path arrives the same way — so unlike the cap there is no second spelling to chase. The
floor is already enforced by `positiveInteger`.

**4 — `work.autonomous.maxAttempts` is REFUSED as a tunable knob, and the refusal is derived from
ADR-001 §4 rather than newly invented.** A step is *"one knob at a time, never compound"*. A +/-1 on
this key moves an attempt ceiling **and** a drive-cycle ceiling in one write, so **every** step on it
is compound by construction. It is refused `step-would-be-compound` (ADR-010 §2) — a refusal that,
unlike the two it already earns, no budget change and no instrumentation can lift.

That is the honest completion of D-61-1: 61 was asked to declare the range for each admitted knob,
and for this one the finding is that **no range is declarable, because the key is not one bound**.
Inventing a range would have been the p-hack this milestone exists to refuse, wearing a clamp. Note
what this does *not* do: 55's line is untouched — the key stays in the arbiter's `parameter-tuning:`
edge and stays proposable; 61 refuses to *commit* a step on it, which is the same authority ADR-003
§4 and ADR-008 §3 already exercise on the same key for two other reasons.

**4a — Consequences that follow, and one that is ledgered.** `resolveAttemptCeiling` is **not**
clamped and 61 does not touch `run-retry.mjs`, `loop.mjs`, `resume.mjs` or `run-start.mjs`; the
`cap: 5` probe stays green; 53/FF-5310's four-site record and its `?? 3` fallback shape are
untouched; and B1's second question — *is an explicit `input.X ??` override inside the ceiling?* —
does not arise, because the only clamped knob has no override door that bypasses its resolver.
**The conflation itself is debt, not scope:** *"one config key, `work.autonomous.maxAttempts`, is
read as two unrelated bounds — an attempt ceiling and a drive-cycle ceiling — so no range can be
declared for it and no proposer can step it; splitting it collides with CAP-MUT-07/08's closed
`work.autonomous.*` key set and 53/FF-5310's four-site record, which is why it is a milestone and not
a fix."* That entry is **owed in `wiki/work/TECH_DEBT.md`** and could not be written from this pass.

**5 — The acceptor never imports a resolver.** The probe is **injected** at the command boundary, so
`src/work-acceptor/*` stays pure and no acceptor module becomes a fifth resolution site under
53/FF-5310's classifier.

**Alternatives considered.**

- *Clamp `maxAttempts` anyway, at all four sites* — **rejected on measurement:** it caps a drive at 4
  rounds using an attempt histogram, and breaks a shipped assertion. The first draft of this ADR said
  *"clamping one of four is not a clamp"*; that is true only when the four resolve the same bound,
  and they do not.
- *Clamp only the attempt sites and leave `loop.mjs`* — **rejected:** it leaves one key with two
  ranges, which is the defect stated as a design.
- *Declare the ranges in the criterion record* — **rejected:** two homes for one bound.
- *Split the key inside 61* — **rejected as out of scope:** see §4a's debt entry.

**Invariant.** Each admitted knob's resolver clamps, so `resolve(ceiling + 1) !== ceiling + 1` and
`resolve(floor - 1) !== floor - 1`; the value-shaped resolvers are derived from the callables in the
one bounds home; a key that resolves to more than one bound is refused `step-would-be-compound`; and
53/FF-5310's reader set, its fallback literals and 69/FF-6901's annexation refusal are byte-intact.
(Enforced by `FF-6111`.)

---

## ADR-010: Report-only is the permanent default; SEVEN refusals are distinguishable and ALL are reported; dwell gates reversion and never gates harm

**Status:** Accepted
**Date:** 2026-08-30

**Context.** SPIKE §5: *"An acceptor that structurally never fires is not a discipline but an off
switch, and an off switch that blocks real improvements gets routed around."* A genuinely better
candidate winning 70% of discordant pairs commits **5.76% of the time at n=8, and identically at
n=10**. The surface must therefore distinguish *"4 rulings, threshold 8"* from *"this knob yields
under one discordant pair per epoch; the floor is eight epochs away"*.

**Decision.**

**1 — Report-only is the DEFAULT and the permanent steady state; commit is the exception.** SPIKE
§Ranking: report-only carries the most weight *by a distance*, being the only ingredient
unconditionally correct at every sample size including n=0 — PACE's measured harms (30–42% false,
10–33% actively harmful) are all *commits*, and report-only makes every one of them zero.

**2 — The refusal vocabulary is a frozen SEVEN-member set, and every applicable member is reported
in a frozen order — never only the first.**

| code | what it means |
|---|---|
| `not-admissible` | the knob has no executed consumer (ADR-008) — at HEAD, all three |
| `metric-unmeasurable` | no observation series exists to measure an arm (ADR-002 §6) — at HEAD, always |
| `trial-unaffordable` | the knob's computed basket exceeds the criterion's budget (ADR-003 §4) |
| `yield-bound` | this knob yields under one discordant pair per epoch; the floor is N epochs away |
| `evidence-short` | the ledger is accruing — *"4 rulings, threshold 8"* — the machinery working |
| `budget-exhausted` | no record reachable inside the remaining budget crosses (ADR-001 §3a) |
| `step-would-be-compound` | the key resolves to more than one bound, so no step on it is single (ADR-009 §4) — at HEAD, `maxAttempts` |

Collapsing them to the first would hide half the work needed to make the acceptor live: at HEAD a
knob is *both* inadmissible *and* unmeasurable, and those are two independent pieces of engineering.
`yield-bound` is the structural silence SPIKE §5 demands be told apart from `evidence-short`, and it
is computed — epochs-to-floor from the observed yield — never a phrase.

**2a — What the surface reports for a proposal that has LOST a pair and is still live.** Four things,
every one computed from ADR-001 §1a's lattice and none of them a phrase: the **record** (`w`-`l`),
the **attained `E`** against `1/alpha`, the **next record that would cross** and the `n` it falls at
(after one loss, 10-1 at n=11), and the **pairs remaining in the budget**. When the next crossing
falls outside the remaining budget the state is `budget-exhausted`, not `evidence-short`, and it
names the record that would have crossed. This clause is what keeps the rule and the face telling one
story: the surface promises a recovery exactly when the arithmetic can grant one.

**3 — The face declares NO `--strict` flag.** 59/FF-5911 holds the set of core commands declaring one
**closed**, so an eighth cannot ship without declaring which of the two policies it follows; and a
gate flag on an acceptor whose honest steady state is silence is the off-switch hazard inverted. The
command exits 0 unless it failed to run. `--json` is the stable contract SPEC §Scope requires, and
the human face renders from the same object rather than re-deriving one.

**4 — Reversibility: `git revert` is the mechanism, and the WHY travels with it.** SPIKE §6 —
`.aof/aof.config.json`, `.aof/frozen-set.jsonc` and all 17 `.aof/loops/*.md` are already tracked. A
committing ruling therefore writes the config change and its ledger line as **one working-tree
change**, so one revert takes both. Nothing new is built for reversal; what is built is the record
that makes a reversal legible six months later.

**5 — Dwell gates REVERSION, never harm; and because nothing counts its unit, the dwell is RECORDED
rather than converted.** `dwell: cycles:2` is declared (`.aof/loops/speed-thoroughness-autonomy.md:8`)
and is **read from that declaration, never spelled as a literal**. But *nothing in this system counts
a cycle of the receiving loop*, and ADR-011 §3 says this milestone schedules nothing — so a computed
`dwellExpiry` would be a **fabricated conversion from a cycle count to a clock**, which 52/ADR-006 §5
bans by name. The ruling therefore records `dwell` (the declaration as read) and `dwellFrom` (the
epoch id at which the change landed), and **the acceptor refuses to convert one into the other**.

Two paths exist and they are different code. `withdraw-on-harm` is driven by the counter-metric alone
and **no dwell value or comparison is reachable from it** — it is unaffected by any of the above.
`revert` is gated on the dwell being discharged, which today is **unknowable**, so it is refused
`dwell-uncounted`, naming the counter that does not exist. That is not a gap papered over: under
report-only-permanent no commit lands, so no dwell-gated revert is owed, while a harmful change is
still pulled immediately. **The asymmetry ADR-010 declares becomes operationally real rather than
decorative** — one path works today and the other says precisely why it cannot. SPIKE §Ranking is candid that dwell is *"closest to
ceremony today"* — it damps oscillation, which needs a high-frequency proposer, and at eight
discordant pairs per step a knob moves a handful of times per *year*. It is kept, and it is kept
small.

**Alternatives considered.**

- *Report only the first binding refusal* — **rejected** on §2: it hides independent work.
- *A `--strict` gate on the acceptor* — **rejected** on 59/FF-5911's closed set and on §1.
- *A bespoke reversal command* — **rejected:** git already reverts; the missing half was the why.
- *Symmetric dwell (gate the harm path too)* — **rejected** by SPIKE §6 verbatim: counter-metric
  degradation pulls the change immediately.

**Invariant.** The refusal set is frozen at seven members and every applicable one is reported in the
frozen order; no path reaches `commit` without an attained e-value `>= 1/alpha` (ADR-001 §1 — one
leg, not two), and a live proposal renders the four quantities of §2a; the face declares no
`--strict`; `--json` and the human face render one object; no dwell comparison is reachable from the harm path; the dwell value is read from the
registry. (Enforced by `FF-6112`, `FF-6113`.)

---

## ADR-011: What this milestone deliberately does NOT do

**Status:** Accepted
**Date:** 2026-08-30

1. **The observation-series prerequisite** (D-61-2, STATE) — `sessionId`, an append-only instrument
   log, and `continue.md` reading a config key are SPIKE §Outcome's *"prerequisite neither 61 nor 62
   owns"*. 61 ships the gate and the gate reports, honestly, that it cannot fire. What it does own is
   its **own** evidence ledger, without which the commit rule cannot exist.
2. **Proposals** — 62's. This is the gate; that walks up to it.
3. **Scheduling** — the cadence is declared and equals the auditor's (ADR-004 §3); the trigger is
   63's. 54/FF-5409's cost ladder is a delivered criterion and is not edited (59/ADR-007 §1).
4. **A node kind or a loop record** — an acceptor is a gate, not a control loop: no reference, no
   cadence of its own, nothing it optimizes. Widening `NODE_KINDS` for a non-participant would also
   collide with 52's delivered *"no twelfth set is exported"*.
5. **A root reference** — SPEC §Scope, permanently; `actor:operator` is the only revisor.
6. **Replay** — SPIKE §Lane B measured that a paired construction is not constructible today, and the
   one experiment worth buying (~$112) is recorded there, not scoped here.
7. **Any edit to `src/work-loops.mjs`** — the tunable set is read from the registry (ADR-008 §4).
8. **Splitting `work.autonomous.maxAttempts`** — ADR-009 §4a: refused here, ledgered as debt, and the
   TECH_DEBT entry is **owed** because this pass could write only `ARCHITECTURE.md`.

---

## ADR-012: The partition — seven stories, one sole writer per module and per contended test file, four stages

**Status:** Accepted
**Date:** 2026-08-30 *(re-authored at the developer's feasibility pass: the census lifts out of the
terminal story into stage 1, and four contended files the first draft did not name gain owners.)*

### 1 · The coupling this is drawn from

`aof graph build .` at **2026-08-30T11:51:20.352Z** (13,394 nodes / 32,666 edges, egress none), then
`aof graph impact` per boundary. Every file below was `present: true`; nothing is inferred from a
coverage gap.

- **`src/loop-bounds.mjs`** — **pure leaf, 0 imports**, 20 dependents (9 production). One clamp and
  one derived map, landing first and breaking nothing. The cap that *looked* like its sibling is not
  (ADR-009 §4), so `run-retry.mjs`, `loop.mjs`, `resume.mjs` and `run-start.mjs` leave this
  milestone's blast radius entirely — the single largest scope reduction of the re-author.
- **`src/acceptance-horizon.mjs`** — 11 dependents, **0 imports**. The epoch predicate, and nowhere
  else (ADR-004 §2).
- **`src/work-audit/reads.mjs`** — 7 dependents, **0 imports**. **Imported, never rewritten**
  (ADR-006 §6): a zero-import leaf is a safe dependency, and importing it is what keeps the read
  record at one home.
- **`src/effects/table.mjs`** — 16 dependents, 11 dependencies; `item-transitions.mjs` has 2
  dependents and is the seam the new one is modelled on. One story owns `src/effects/`.
- **`src/command-core.mjs`** — **god node: 139 dependents, 84 dependencies**, where a new command
  costs one import and one array entry. **One story owns it for the whole milestone** (59/ADR-008 §1,
  from 58): three stories appending to one array is merge friction wearing an independence claim.
- **`src/work-counters.mjs`** — 2 dependents, **0 imports**. The trial metric is **added** here beside
  its counter-metric (ADR-002 §7); the alternative was a second counters home.
- **`src/mesh-worktree.mjs`** — 35 dependents; the only module in `src/` spelling
  `dispatch-worktrees`. Read, never written (ADR-006 §5).
- **`src/work-acceptor/`** — a new directory with no dependents; each story owns its own leaf, as
  59/01 and 59/02 did inside `src/work-audit/`.

The cut follows that coupling, and the **census** is the clearest case: `observations.mjs` reads the
journal and classifies fixtures, with zero coupling to the rule, the ledger or the command surface.
It sat in the terminal story only because it arrived with the face; lifting it to stage 1 shortens
the critical path and costs nothing.

### 2 · Sole writers

| story | stage | sole writer of |
|---|--:|---|
| **61/00** the clamp | 1 | `src/loop-bounds.mjs` |
| **61/01** the epoch, the criterion and the selector | 1 | `src/acceptance-horizon.mjs`, `src/work-acceptor/criterion.mjs`, `src/bundle/frozen-set.jsonc`, `.aof/frozen-set.jsonc` |
| **61/02** the observation census | 1 | `src/work-acceptor/observations.mjs` |
| **61/03** no executed consumer, no proposal | 1 | `src/work-acceptor/admissibility.mjs` |
| **61/04** the rule and the ledger | 2 | `src/work-acceptor/rule.mjs`, `src/work-acceptor/ledger.mjs`, `src/work-counters.mjs` |
| **61/05** the event, the seam and the store | 3 | `src/effects/table.mjs`, `src/effects/harness-transitions.mjs`, `src/work-acceptor/store.mjs` |
| **61/06** the acceptor's face | 4 | `src/commands/acceptor.mjs`, `src/command-core.mjs` |

**Every contended test file has exactly one owner, and the first draft named too few.** The
feasibility pass found four that would have gone red in a story that did not own them:

| contended file | owner | why it is contended |
|---|---|---|
| `test/arch/acd-loop-cap-single-home.test.mjs` | 61/00 | the clamp extends it |
| `test/loop-bounds.test.mjs` | 61/00 | the clamped resolver |
| `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` | 61/01 | the epoch leg extends it |
| `test/frozen-set-compiled.test.mjs` | 61/01 | carries the member-id census literal |
| **`test/framework-stops-shipping-guard.test.mjs`** | **61/01** | **four exact censuses go red on a sixth member**: `REMAINING` (`:42`) is deepEqual'd at `:112` *and* `:201`, `:187` pins `compiled.installed` to four ids, and `:224-227` pins `compiled.permissions` to the two `anchors` rules. (`test/arch/acd-frozen-set-compiled.test.mjs` reads its census dynamically and needs no edit.) |
| `test/arch/acd-progress-ledger-consumed.test.mjs` | 61/03 | the admissibility predicate lands beside `unconsumedCeilings` |
| `test/arch/acd-effects-ledger.test.mjs` | 61/05 | `APPEND_EVENT_ALLOWED` gains the new seam |
| **`test/arch/acd-work-command-cli-bijection.test.mjs`** | **61/06** | **`argsFor(sub)` ends in `default: throw` (`:295`) over every registry-derived `work:*` subcommand, so registering `work:acceptor` throws until a `case "acceptor":` probe lands** |

`scripts/test.mjs` is the one **shared** file, as in every milestone: each story registers its own
suites — imported **and spread** — in its own labelled block.

### 3 · Ordering, and what may be built in parallel

**Stage 1 — 61/00 ‖ 61/01 ‖ 61/02 ‖ 61/03.** Four disjoint file sets with no edge between them.
**Stage 2 — 61/04.** After 61/01 (it consumes the criterion's digest, key set and ruling selection)
and after 61/00 (its range probe bounds nothing until the clamp exists). The edge runs one way only:
61/01 ships selection without arithmetic, 61/04 ships arithmetic over a list it is handed.
**Stage 3 — 61/05.** It persists the ruling record whose shape 61/04 freezes, and it writes the knob.
**Stage 4 — 61/06.** Terminal: it registers the command over the five lanes and renders the surface.
It depends on **61/00 directly** — its report prints each knob's admissible range through the probe —
so that edge is declared rather than left transitive through 61/04.

All seven may be **built** concurrently against the literals frozen in ADR-001 §1a, ADR-003 §3,
ADR-006 §3 and ADR-010 §2 — the arrangement 52, 55, 57, 58 and 59 each used. Only the *landing* order
is a chain.

### 4 · Codebase health

- **`src/` has 144 root-level `.mjs` siblings against 9 subdirectories.** This milestone adds seven
  modules and **zero root siblings** — all under a new `src/work-acceptor/`, the shape 59 used for
  `src/work-audit/`. The trend line moves the right way, which is why the directory is created up
  front rather than after the third sibling.
- **The root-sibling count is the Nth instance of a species and is ledgered, not fixed here.**
  TECH_DEBT item 63 already carries the same shape in `test/arch/` (*"361 flat siblings and one
  4,377-line registry"*). A `src/` ratchet is the natural N+1th control but is **outside this
  milestone's blast radius** — nothing in 61 writes a root sibling, so a gate landed here would
  police code this milestone does not touch. Recorded for the architect who does.
- **One config key read as two unrelated bounds** (ADR-009 §4a) is a real degradation inside the
  blast radius that does **not** fit: splitting it collides with a closed key set and a four-site
  record. It is routed to `TECH_DEBT.md` with its shape written out in ADR-009 §4a, and that entry
  is **owed** — this pass could write only `ARCHITECTURE.md`.
- **TECH_DEBT item 60** (a long prose line hangs `aof work doctor <ref>`) bounds how this document is
  written, not what it decides: every paragraph is wrapped, and the register's rows are long by
  design — item 60 measured 763-char table rows as safe and a 748-char *prose* line as fatal.

---

## ADR-013: TWO refusal vocabularies — the RULING LANE is a frozen EIGHT, and everything else is a construction refusal (supersedes ADR-010 §2 on membership and order only)

**Status:** Accepted
**Date:** 2026-08-30

**Supersedes:** ADR-010 §2 on **membership and order only**. ADR-010 §1, §2a, §3, §4 and §5 stand
untouched, and so do §2's two load-bearing rules: every applicable member is reported, and never
only the first. What changes is *which codes are members* and *what makes a code one*.

**Context.** The collision reached its **third** instance before a single line of 61/06 was written.
ADR-010 §2 froze a seven-member set; ADR-008 §2b/§4 then minted `harness-not-introspectable` and
`key-outside-declared-set`, ADR-009 §2 minted `outside-declared-range` / `no-declared-range`, and
61/04 shipped `not-an-ordinal-knob` and `trial-unit-undeclared`. Each mint was locally right and
none was checked against the frozen set, because nothing said what membership *was*. `FF-6112`
asserts equality with the seven, so 61/06 could not be built: its criteria require seven, the
shipped code reaches eight in the lane, and either reading needs a write outside 61/06's declared
`files:`. The orchestrator stopped the walk here rather than encode a claim one of the two
authorities calls wrong — 61/03's species, caught *before* the build instead of after it. The
precedent followed is `03/R3`, surfaced at recall: *a frozen breakdown seam becomes a recurring drag
once the consuming design outgrows it; extend it with a superseding ADR, never by bolting fields
on*. `66/ADR-008` is the shape — a closure round superseding named clauses and leaving the rest
byte-intact.

**Decision.**

**1 — The deciding test is the RULING LANE, not the word `refusals`.** The ruling lane is the
per-knob array the face renders as *why this knob did not move*. At HEAD it is exactly four sites:
`knobReport().refusals` (`rule.mjs`), `metricPopulation().refusals` (`rule.mjs`),
`evaluateRun().refusals` (`ledger.mjs`), and the array `src/commands/acceptor.mjs` composes from
them. A code in that lane is a **ruling refusal** and must be a member of §2's set. Every other
coded refusal in this milestone is a **construction refusal**: it means no ruling was produced at
all, so it can never be one of the reasons a ruling did not commit.

**1a — The correction this clause exists to make.** The 61/04 ruling stated the test as *"does the
code reach a `refusals` array"* and measured it against `knobReport` alone. That wording is **false
at HEAD in two further places**, both measured here: `src/work-acceptor/admissibility.mjs:587-610`
(`assessProposal`) and `:642` (`assessTunableSet`) each expose a `refusals` array carrying
`key-outside-declared-set` and `harness-not-introspectable`. Taken literally the test would force
those two into the frozen set and make it ten, contradicting the same ruling's *eight*. The lane
test above is what the ruling meant, and §1b is what makes it checkable.

**1b — The admissibility report is a GROUNDS array answering the PRIOR question, and
`not-admissible` is the one seam.** It carries refusal **objects**, not bare codes, sorted by its own
module-private `REFUSAL_ORDER` of three; it is asked before any evidence is read, priced or accrued,
which the object states on its own face (`evidenceRead`, `trialPriced`, `accruesTowardsCommit`, all
`false`). Of its three codes exactly one — `not-admissible` — crosses into the ruling lane, and it
crosses **as itself**: the face renders `not-admissible` into the lane and MAY render
`key-outside-declared-set` / `harness-not-introspectable` as detail beneath it, but may never lift
either into the lane. The same holds for `outside-declared-range` and `no-declared-range`
(`loop-bounds.mjs:158-159`), which answer *is this step inside the range* and reach no lane.

**2 — The ruling vocabulary is a frozen EIGHT-member set, in this frozen order.** Positions 1–7 are
ADR-010 §2's, unchanged and in the same order; the eighth is appended, so no ordering already
contracted moves.

| # | code | what it means |
|--:|---|---|
| 1 | `not-admissible` | the knob has no executed consumer (ADR-008) — at HEAD, all three |
| 2 | `metric-unmeasurable` | no observation series exists to measure an arm (ADR-002 §6) — at HEAD, always |
| 3 | `trial-unaffordable` | the knob's computed basket exceeds the criterion's budget (ADR-003 §4) |
| 4 | `yield-bound` | this knob yields under one discordant pair per epoch; the floor is N epochs away |
| 5 | `evidence-short` | the ledger is accruing — *"4 rulings, threshold 8"* — the machinery working |
| 6 | `budget-exhausted` | no record reachable inside the remaining budget crosses (ADR-001 §3a) |
| 7 | `step-would-be-compound` | the key resolves to more than one bound, so no step on it is single (ADR-009 §4) — at HEAD, `maxAttempts` |
| 8 | `not-an-ordinal-knob` | the knob's declared values have no ordering, so `+1` means nothing on it: a permanent human change (ADR-001 §5) |

**2a — Why `not-an-ordinal-knob` is ADMITTED.** It is a standing property the surface must say by
name — ADR-001 §5 requires exactly that — and the structural twin of position 7, which §2 already
admits on the identical ground (*no single step exists on this key*). Refusing it membership leaves
the face a permanent silence it cannot name: the off switch SPIKE §5 ranks as the central hazard.

**3 — The construction-refusal vocabulary is OPEN, per-module, and disjoint from §2.** Its codes
travel on a thrown error or on `readStep().code` — never in a lane. Its only discipline is that each
code is distinct and names its own part, so no frozen list is kept and no story is blocked by
another's mint. At HEAD it holds, measured: `metric-unresolvable`, `counter-metric-unresolvable`,
`counter-metric-missing`, `range-probe-missing`, `criterion-not-supplied`, `trial-unit-undeclared`,
`step-is-more-than-one-notch`, `no-step-proposed` (`rule.mjs`); `ruling-incomplete`,
`ledger-incomplete` (`ledger.mjs`); `criterion-frozen-in-epoch` and its five siblings
(`criterion.mjs`); the nine store codes (`store.mjs`); `harness-not-introspectable`,
`key-outside-declared-set`, `admissibility-ran-on-nothing` (`admissibility.mjs`);
`outside-declared-range`, `no-declared-range` (`loop-bounds.mjs`); `acceptor-ran-on-nothing`
(`observations.mjs`). **Disjointness runs both ways** — no construction code is a member and no
member is ever thrown — which is what makes "two vocabularies" checkable rather than described.
**One standing breach of §3's own discipline, measured:** `trial-unit-undeclared` names two subjects
— a malformed tie rate (thrown, `rule.mjs:258`) and a knob with no trial unit (`basket.refusal`,
`:308`). Both are out of the lane, so nothing here is blocked; splitting it is owed as debt.

**3a — `step-is-more-than-one-notch` and `no-step-proposed` stay OUT, and 61/06 may not render a
step code into the lane.** Both are outcomes of *reading a proposal*. A proposal that is not a
single step never becomes a ruling, so there is no ruling for either to be a reason about.

**4 — `trial-unit-undeclared` LEAVES `knobReport().refusals`; one line, and 61/06 owns it.** A knob
in the tunable set with no trial unit declared beside it is a **malformed criterion** — ADR-003 §3
puts the declaration on the criterion, not on the knob — not a knob's silence, so it is a
construction refusal under §3. It stays on `basket.refusal`, where it already is and where
`FF-6103`'s delivered assertions read it (`test/arch/acd-per-knob-sizing.test.mjs:166`), and the
face renders it from there as a malformed-criterion finding. The change is the single filter at
`src/work-acceptor/rule.mjs:517`; no delivered assertion reads `knobReport().refusals` for this code
— measured across the only two files that call `knobReport` — so nothing already green goes red.

**4a — The sole-writer amendment (supersedes ADR-012 §2 for this one line only).** `rule.mjs` is
61/04's module, but that line is **61/06's to write**: it exists only to make 61/06's lane
well-formed, 61/04 is already through review, transferring the whole module would be worse, and
leaving it unassigned is what blocked the build. 61/06's `files:` gains `src/work-acceptor/rule.mjs`
**scoped to `knobReport`'s refusal filter and its comment**; every other line stays 61/04's. An
exception with a named boundary, not a widening — §2's table stands for every other module and story.

**Alternatives considered.**

- *Hold the set at seven, `not-an-ordinal-knob` out of the lane* — **rejected:** a standing property
  the face must name (ADR-001 §5), whose twin at position 7 is already in.
- *Take "any array named `refusals`" literally and freeze ten* — **rejected** on §1b: it folds the
  prior question's grounds into the lane, which the 61/03 review already ruled against.
- *Admit `trial-unit-undeclared` as a ninth* — **rejected** on §4: it describes the criterion, and a
  lane mixing the two cannot be read as *why this knob did not move*.
- *Edit ADR-010 §2 in place* — **rejected** on `03/R3`: a superseding record, never an edit.
- *Give 61/04 a follow-up story for the one line* — **rejected:** a story for one filter, gating the
  terminal story that is its only consumer.

**Invariant.** The ruling lane's code set equals §2's eight, in §2's order, assembled from the
constants at their declaring modules rather than from one re-export; every applicable member is
reported and never only the first; no construction code appears in a lane and no member is ever
thrown; `not-admissible` is the only code crossing from the admissibility grounds array into the
lane. (Enforced by `FF-6112`.)

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 61 is open and is NOT admitted at accept — `aof work doctor 61`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered; that is 56's finding (26 suites, 117
     entries, dead for a month with the imports left behind) and 59/01's subject.

     THREE EXTEND A GUARD ALREADY IN SERVICE rather than adding a sibling: FF-6104 extends 66's
     single-horizon guard, FF-6109 adds a predicate BESIDE 69's ceiling-consumption guard in that
     guard's own file (the third recorded instance of the species — F-6900, F-69-V7, F-69-V8), and
     FF-6111 extends 53/69's cap single-home guard. For those the red probe is the ONLY evidence the
     change is armed.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "`aof work acceptor --json` lists a pending proposal with its evidence count", "a proposal on a
     knob with no consumer is refused and names the knob", "a criterion revised at a boundary resets
     the ledger and the report says so", "a committing ruling writes the config change and its
     evidence in one working-tree change", "a counter-metric degradation pulls a change before its
     dwell is discharged", "the report distinguishes `evidence-short` from `yield-bound`". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-6101 | **The rule is one object and its numbers are derived, never typed.** No literal equal to `N`, to `1 + lambda`, to `1 / alpha` or to `alpha` appears in the engine — every one of those quantities is obtained from the criterion, so a criterion carrying a different `lambda` moves them all; **`lambda` is refused at construction unless `0 < lambda < 1`**, because `lambda = 1` makes the loss multiplier `(1 - lambda)` zero and annihilates wealth on a loss — the hard reset §3 rejects, admitted through the parameter (N2); wealth on an unfavourable pair is multiplied by `(1 - lambda)` and there is **no code path that resets the ledger to zero or drops a proposal on a loss**; **the commit predicate has exactly ONE leg — `E >= 1/alpha` — and no second condition on the record shape is reachable**, so all-favourable is never spelled as a requirement anywhere in the engine; instead the control **derives the crossing lattice** from the shipped `alpha`/`lambda` and asserts it against ADR-001 §1a: earliest crossing 8-0 at n=8, **no** path crossing at n=9 or n=10, second 10-1 at n=11, third 11-2 at n=13 — so a change to `lambda` moves the lattice and the test rather than silently invalidating a typed 8; `B` is read from the criterion, refused at construction when `B < N`, and appears in no module as a literal; a proposal for which no record reachable inside the remaining budget crosses yields `budget-exhausted` and **never** `evidence-short` — planted at 5-2 with `B = 11`, the two states are not interchangeable; a proposal naming two keys is a coded refusal rather than being split; and a knob whose declared range is non-ordinal is refused `not-an-ordinal-knob`. The engine imports nothing and reads no clock. | `test/arch/acd-acceptor-rule-is-one-object.test.mjs` — **landed** (61/04) | ADR-001 |
| FF-6102 | **The trial metric is declared, resolvable and swappable, and the engine names none of it.** The criterion's `metric:` and `counter:` are pointers resolved through a registry **derived from callable resolvers**, never a parallel allow-list — a pointer naming a symbol that does not exist is refused at construction; a criterion carrying a metric and no counter-metric is refused; no module under `src/work-acceptor/` contains a metric name literal or a tie-rate literal; **the trial metric and the counter-metric resolve into the SAME leaf — `src/work-counters.mjs`, which still imports nothing and writes nothing — so no second deterministic-counter home exists in `src/`**; and an arm the metric cannot measure produces `unmeasurable` — counted in neither the tie total nor the favourable total, with no code path mapping it to either. | `test/arch/acd-trial-metric-declared.test.mjs` — **landed** (61/04) | ADR-002 |
| FF-6103 | **One threshold, many baskets — computed per knob, in integer arithmetic.** Every admitted knob resolves a declared `trialUnit` with a unit price and its basket is computed by the single expression in ADR-003 §2; no threshold or basket constant is applied across knobs; **the tie rate is a declared rational `n/d` with integer terms and the pair count is `ceil(B * d / (d - n))` in integer arithmetic — no float division is reachable on the path from a declared rate to a pair count**, and the planted 90% case returns 110 rather than the 111 an IEEE-754 `ceil(11 / 0.1)` yields (ADR-003 §2a; SPIKE §Corrections made the same mistake once already); the computed spread over the shipped criterion is asserted as a ratio of unit means, so it holds under any budget; and a knob whose basket exceeds the criterion's budget yields `trial-unaffordable` and contributes **zero** pairs, while still appearing on the surface with its basket and the ceiling it exceeded. | `test/arch/acd-per-knob-sizing.test.mjs` — **landed** (61/04) | ADR-003 |
| FF-6104 | **The epoch boundary keys on the payload's own field name, resolves through the one lifecycle leaf, and the acceptor spells no status word.** `closesEpoch` is exported from `src/acceptance-horizon.mjs` alone, compares against that module's own `CLOSED_STATUS`, and takes the destination status — **the field the payload actually spells, `status`, not `to`** (ADR-004 §1) — reading no `from`; the leaf still imports **nothing**; 66/FF-6602's two standing legs are re-asserted from this milestone's side — no second horizon-shaped predicate under `src/`, and the five status words have exactly one home; **no module under `src/work-acceptor/`, and not `src/commands/acceptor.mjs`, contains any of the five status literals**; the criterion-revision window is computed from the two record sources ADR-004 §1b names and is **not** derived from the set of open milestones — planted, seven open milestones leave the window open, so the off-switch reading fails CI; and the acceptor's declared cadence equals `.aof/loops/instrument-audit.md`'s, compared by reading both records. 66's single-horizon guard is **EXTENDED**, not joined by a sibling. | `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` *(extended)* — **landed** (61/01) | ADR-004 |
| FF-6105 | **The criterion is frozen within the epoch on three layers, and the arithmetic layer cannot be bypassed.** Every ruling record carries a `criterion` digest; **`rulingsUnderCurrentCriterion` is exported from `src/work-acceptor/criterion.mjs` and is the only module in `src/` that selects rulings by digest** (ADR-005 §1a), it returns the **maximal trailing run** sharing the current digest, and — the leg that makes it a suffix rather than a filter — over a ledger that moved to a second criterion and then **back** to the first, it returns only the trailing run and **not** the earlier rulings whose digest matches; the criterion's frozen member set equals ADR-004 §4's four members exactly, with `alpha`, `lambda`, `N` and `B` in one member so freezing three of four is not expressible; a mid-epoch write through the criterion seam is the coded refusal `criterion-frozen-in-epoch` naming the open epoch; the sixth frozen-set member `acceptor-criterion` compiles at `permission denials`, is `aofManaged`, names both acceptor paths for `Edit` and `Write`, and **every census that pins the member set agrees with the declaration** — the id/enforcement-point pairs, the installed ids and the compiled permission rules alike (55/FF-5505's cross-check, unweakened and now covering all four census sites); and a knob whose value changed under an accruing ledger is reported **by name**. | `test/arch/acd-criterion-frozen-in-epoch.test.mjs` — **landed** (61/01) | ADR-005 |
| FF-6106 | **The ledger accrues across epochs and refuses an incomplete ruling at construction.** No accrual is scoped to a single epoch — the epoch id is carried and reported but is not a filter on the sum; `RULING_KEYS` equals ADR-006 §3's frozen set (including `dwell` and `dwellFrom`, and **no** computed `dwellExpiry`), a record missing any key is refused at construction **and again at ledger assembly** rather than rendered blank, and the W/L/T sequence is stored **in order** with no code path that re-sorts it; `src/work-acceptor/ledger.mjs` imports **nothing**, holds no date or duration literal, and takes `now` on the call; **the arithmetic leaf never sees a digest — no `criterion`/digest identifier is read, compared or named anywhere in it — so summing across two criteria is not a path to be refused but a thing the module cannot express** (ADR-006 §4a; the selection half is 61/01's `FF-6105`); and no second module in `src/` derives W/L/T totals or an e-value. | `test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs` — **landed** (61/04) | ADR-006 §1–§4a |
| FF-6107 | **Counting off the effects journal is filtered and collapsed in ONE home, and the read record is IMPORTED rather than restated.** No module outside `src/work-acceptor/observations.mjs` classifies a fixture `itemDir` or a dispatch worktree; that module obtains the dispatch case from `src/mesh-worktree.mjs`'s exported predicate and slug rather than spelling `dispatch-worktrees`, which remains that module's only occurrence in `src/`; **the read record and the floor discipline are imported from `src/work-audit/reads.mjs` — `readRecord`, `sweepDeclarationProblems` and `SWEEP_BASES` — and the acceptor declares no second copy of either, so the shape has one home and cannot drift**; `readFinding` is deliberately **not** imported (its code is the auditor's) and the acceptor's finding differs from the audit's in the code string alone, asserted key-by-key; every population is emitted with a declared read record and a floor, driven from the lane registry so a lane added without a floor fails CI; and a count below its floor emits `acceptor-ran-on-nothing` naming the sweep, the root walked and the floor missed. | `test/arch/acd-observation-census-filtered.test.mjs` — **landed** (61/02) | ADR-006 §5, §6 |
| FF-6108 | **`harness.ruled` is a declared event; the harness write has ONE home; and an undeclared name is now refused instead of resolving to zero reactors.** `EFFECTS` gains exactly **one** name and no tenth; its reactor set is exactly one entry carrying a known locus and an async `apply`; **`src/work-acceptor/store.mjs` is the only module in `src/` that writes `.aof/acceptor-ledger.jsonl` or the `work.*` section of `.aof/aof.config.json`, the knob write is surgical — every other key, its order and the file's formatting survive a planted write — and the store is reached only from the seam**; re-appending the same event id yields a byte-identical ledger rather than a second line; `applicableReactors` **refuses** a name absent from the supplied table with a coded error, so `table.mjs`'s own comment is true at HEAD for the first time; every `appendEvent` call site in `src/` is in the admitted seam set, which gains exactly the new seam; `src/effects/journal.mjs` still imports no vocabulary; and the ledger path is **absent** from `AOF_GITIGNORE_ENTRIES`. | `test/arch/acd-harness-ruling-ledgered.test.mjs` — **landed** (61/05) | ADR-007 |
| FF-6109 | **A ceiling with no executed CONSUMER refuses the proposal, and the check is fail-closed while the harness is a prompt.** The F-69-V8 legs keep their `[]` semantics **unchanged** — a resolvable ceiling with a production reader outside its declaring home still passes, and the shipped legs at `:232`/`:240`/`:274`/`:285-288` are untouched — because the new rule ships as a **second exported predicate beside `unconsumedCeilings` in the same file**, never a sibling file and never a weakening: consumption and *decision-site* consumption are two questions, and the second is the residue that file's own header names. The new predicate reports a ceiling whose resolved value reaches no decision site outside the declaring home and outside the policy-composition site — the measured `deadlinePolicy` case, where both `work.loop.*` knobs are resolved and thrown away. **Its expected set is shrink-only, never a count**: the reported set is asserted to be a subset of the declared tunable set and non-empty at HEAD (a vacuous control is the failure this exists to prevent), and a knob given a decision-site consumer **drops out** — so the ratchet points at fixing the tree, not at freezing its defect. Plus the harness switch: while the declared harness is a prompt document naming no config key, every proposal is refused `harness-not-introspectable`, with the condition **evaluated over that document** rather than hardcoded, so it re-opens the moment the key is named. 69's ceiling-consumption guard gains a predicate rather than a fourth one-off. | `test/arch/acd-progress-ledger-consumed.test.mjs` *(extended in place)* — **landed** (61/03) | ADR-008 |
| FF-6110 | **The tunable set is the registry's, never the acceptor's.** No module under `src/work-acceptor/` and not `src/commands/acceptor.mjs` contains a `work.loop.*` or `work.autonomous.*` key literal in code (a quoted key inside a diagnostic message is excluded by the same code-only reading 69's guard already uses); the admitted set is resolved from `arbiter:speed-thoroughness-autonomy`'s `parameter-tuning:` edge through `loadLoops`; and a proposal naming a key outside that edge is a coded refusal. *(The "no acceptor module is a fifth cap resolver" leg is deliberately NOT restated here: `capProblems` in `test/arch/acd-loop-cap-single-home.test.mjs` already walks all of `src/` and would report any acceptor module that resolved the cap, and that classifier is module-private to 61/00's file — duplicating it to reach it from here would be the species this milestone indicts everywhere else.)* | `test/arch/acd-tunable-set-is-the-registry.test.mjs` — **landed** (61/03) | ADR-008 §4, ADR-009 §5 |
| FF-6111 | **The clamped knob is clamped at its one funnel, and a key that resolves to two bounds is refused rather than ranged.** For each admitted knob `resolve(ceiling + 1) !== ceiling + 1` and `resolve(floor - 1) !== floor - 1`, so ADR-009 §2's probe bounds something; `LOOP_BOUND_VALUE_RESOLVERS` is **derived from the callables** in `src/loop-bounds.mjs` and its key set equals `LOOP_BOUND_CONFIG_RESOLVERS`'s, so a value-shaped resolver cannot name a key its config-shaped sibling does not; no ceiling literal for a tunable knob exists outside its bound's home; **`work.autonomous.maxAttempts` is asserted to resolve to more than one bound and therefore to be refused `step-would-be-compound`** — the assertion reads the two call sites rather than a note, so the day the key stops meaning two things this control says so; and the pre-existing records are **byte-intact**: 53/FF-5310's four-site reader set, each site's `?? 3` fallback, and 69/FF-6901's refusal of `loop-bounds` annexing the cap. 53/69's cap single-home guard is **EXTENDED**. | `test/arch/acd-loop-cap-single-home.test.mjs` *(extended)* — **landed** (61/00) | ADR-009 |
| FF-6112 | **Report-only is the default, the ruling lane is a frozen eight, and the silences are distinguishable.** *(Restated at 61/06's refine on ADR-013, which supersedes ADR-010 §2 on membership and order.)* **(1)** The ruling vocabulary is a frozen **EIGHT**-member set in ADR-013 §2's order, asserted as **two independent statements**: the control restates §2's table, and the set under test is **assembled from the constants at their declaring modules** — `not-admissible` (`admissibility.mjs`), `metric-unmeasurable` / `trial-unaffordable` / `not-an-ordinal-knob` (`rule.mjs`), `evidence-short` / `budget-exhausted` (`ledger.mjs`), `step-would-be-compound` (`loop-bounds.mjs`) and `yield-bound` at 61/06's own home — so it must **not** require one module to export all eight (the leaves cannot import each other, ADR-006 §4; the set exists only at the composition boundary). **(2)** **Every code reaching the RULING LANE is a member** — behavioural over `knobReport`, `evaluateRun`, `metricPopulation` and the array `src/commands/acceptor.mjs` composes from them, plus a code-only sweep of `src/work-acceptor/` and `src/commands/acceptor.mjs`; **this leg fails at 61/04's HEAD on `knobReport`, which is the control's non-vacuity proof**, and it is cleared by ADR-013 §4's single filter at `rule.mjs:517` rather than by widening the set. **(3)** **Disjointness, both ways and at the seam:** no thrown code and no `readStep().code` is a member and no member is ever thrown — which is what makes "two vocabularies" checkable rather than asserted — and `not-admissible` is the **only** code crossing from the admissibility grounds array into the lane, with `key-outside-declared-set`, `harness-not-introspectable`, `outside-declared-range` and `no-declared-range` asserted absent from it (ADR-013 §1b; a grounds code may be rendered as detail beneath, never lifted into the lane). **(4)** **The frozen order, never only the first**, over a knob simultaneously `not-admissible`, `metric-unmeasurable` and `trial-unaffordable`, with the order independent of discovery order. Plus the surface legs ADR-010 keeps: `yield-bound` is computed from the observed yield (its epochs-to-floor derived from the ledger, not a phrase) and is never emitted for a knob merely short of evidence; **a live proposal that has lost a pair renders all four of ADR-010 §2a's quantities — record, attained `E`, the next crossing record with its `n`, and the pairs remaining — every one derived from the lattice rather than rendered as text, so the face cannot promise a recovery the rule would refuse**; no path reaches `commit` without FF-6101's single predicate; the acceptor command declares **no `strict` flag**, so 59/FF-5911's closed set is unchanged and asserted so from this side; and `--json`'s key set is frozen with the human face rendering from the same object rather than re-deriving one. | `test/arch/acd-report-only-is-the-default.test.mjs` — **landed** (61/06) | ADR-010 §1, §2a, §3; ADR-013 |
| FF-6113 | **Dwell gates reversion, never harm — and the dwell is recorded rather than converted.** Two paths exist and are distinct code: **no dwell value, expiry or comparison is reachable from the harm path**, which is driven by the counter-metric resolver alone; the dwell is read from the arbiter record's `dwell:` declaration and no dwell literal (`2`, `cycles:2`) appears in any acceptor module; **no code path converts a cycle count into a clock or an epoch count — there is no `dwellExpiry` anywhere — and a revert whose dwell cannot be shown discharged is refused `dwell-uncounted`, naming the counter that does not exist** (ADR-010 §5; 52/ADR-006 §5's ban on fabricated conversions); and the committing write and its ledger line reach disk through the one store (FF-6108), with the seam unable to return success having written the knob and not the record. | `test/arch/acd-dwell-gates-reversion-only.test.mjs` — **landed** (61/06) | ADR-010 §4, §5 |

---

## Story partition

Authored at refine and **re-authored at the developer's feasibility pass**, per ADR-012. The landing
order is **{61/00 ‖ 61/01 ‖ 61/02 ‖ 61/03} → 61/04 → 61/05 → 61/06** — four stages, four
stage-1 stories with no edge between them, and three ordering edges thereafter: the rule consumes the
criterion's digest, key set and selection; the event persists the ruling shape the rule freezes; and
the face registers the command over every lane.

- **61/00** — the clamp: `src/loop-bounds.mjs`
- **61/01** — the epoch, the frozen criterion and the ruling selector: `src/acceptance-horizon.mjs`,
  `src/work-acceptor/criterion.mjs`, the sixth frozen-set member
- **61/02** — the observation census: `src/work-acceptor/observations.mjs`
- **61/03** — no executed consumer, no proposal: `src/work-acceptor/admissibility.mjs`
- **61/04** — the rule and the ledger: `src/work-acceptor/{rule,ledger}.mjs`, `src/work-counters.mjs`
- **61/05** — the event, the seam and the store: `src/effects/{table,harness-transitions}.mjs`,
  `src/work-acceptor/store.mjs`
- **61/06** — the acceptor's face: `src/commands/acceptor.mjs`, `src/command-core.mjs`

### 61/00 · `00_story_the-clamp` — stage 1

**Subject.** The one bound that is missing an upper limit gets one at its single funnel, and the
value-shaped resolvers the admissibility probe needs are derived beside the config-shaped ones.

- **files:** `src/loop-bounds.mjs`, `test/arch/acd-loop-cap-single-home.test.mjs`,
  `test/loop-bounds.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-009`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-001`, `src/loop-bounds.mjs`,
  `src/loop-progress.mjs`, `src/commands/run-retry.mjs`, `src/commands/loop.mjs`,
  `test/arch/acd-loop-cap-single-home.test.mjs`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** —

### 61/01 · `01_story_the-epoch-and-the-frozen-criterion` — stage 1

**Subject.** An epoch is one milestone, its boundary is any transition into `done` resolved through
the one lifecycle leaf, and the four things frozen inside it are refused mid-epoch on three layers —
the digest, the writer, and a sixth frozen-set member — with the digest layer mechanised as the
maximal-suffix **selector** this story owns (ADR-005 §1a).

- **files:** `src/acceptance-horizon.mjs`, `src/work-acceptor/criterion.mjs`,
  `src/bundle/frozen-set.jsonc`, `.aof/frozen-set.jsonc`,
  `test/arch/acd-acceptance-horizon-single-predicate.test.mjs`,
  `test/arch/acd-criterion-frozen-in-epoch.test.mjs`, `test/frozen-set-compiled.test.mjs`,
  `test/framework-stops-shipping-guard.test.mjs`, `test/acceptor-criterion.test.mjs`,
  `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-004`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-005`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-004`,
  `src/acceptance-horizon.mjs`, `src/frozen-set.mjs`, `src/work.mjs`,
  `src/effects/item-transitions.mjs`, `.aof/frozen-set.jsonc`, `src/bundle/loops/operator.md`,
  `src/bundle/loops/instrument-audit.md`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** —

### 61/02 · `02_story_the-observation-census` — stage 1

**Subject.** Anything counted off the effects journal is filtered for fixtures and collapsed across
dispatch worktrees in one home, declares what it read against a floor in the shape the audit family
already owns, and reports a sweep that found nothing as a finding rather than a zero.

- **files:** `src/work-acceptor/observations.mjs`,
  `test/arch/acd-observation-census-filtered.test.mjs`, `test/acceptor-observations.test.mjs`,
  `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004`, `src/work-audit/reads.mjs`,
  `src/mesh-worktree.mjs`, `src/effects/journal.mjs`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** —

### 61/03 · `03_story_no-executed-consumer-no-proposal` — stage 1

**Subject.** A declared bound that resolves but reaches no decision refuses every proposal on it, and
the tunable set the acceptor may touch is the arbiter's `parameter-tuning:` edge rather than a list
this milestone writes.

- **files:** `src/work-acceptor/admissibility.mjs`,
  `test/arch/acd-progress-ledger-consumed.test.mjs`,
  `test/arch/acd-tunable-set-is-the-registry.test.mjs`, `test/acceptor-admissibility.test.mjs`,
  `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-008`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-009`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `test/arch/acd-progress-ledger-consumed.test.mjs`, `src/loop-bounds.mjs`,
  `src/agent-session-driver.mjs`, `src/bundle/loops/speed-thoroughness-autonomy.md`,
  `src/bundle/commands/continue.md`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** —

### 61/04 · `04_story_the-rule-and-the-ledger` — stage 2

**Subject.** One commit predicate — `E >= 1/alpha`, evaluated after every pair and truncated at a
declared budget, whose earliest crossing is the eight all-favourable pairs — over a ledger that
accrues across epochs, carries wealth on a loss, reports `budget-exhausted` when no crossing remains
reachable, and refuses an incomplete ruling at construction.

- **files:** `src/work-acceptor/rule.mjs`, `src/work-acceptor/ledger.mjs`, `src/work-counters.mjs`,
  `test/arch/acd-acceptor-rule-is-one-object.test.mjs`,
  `test/arch/acd-trial-metric-declared.test.mjs`, `test/arch/acd-per-knob-sizing.test.mjs`,
  `test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs`, `test/acceptor-rule.test.mjs`,
  `test/acceptor-ledger.test.mjs`, `test/work-counters.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-001`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-002`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-003`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `wiki/work/57_milestone_paired-loops/ARCHITECTURE.md#ADR-001`, `src/run-store.mjs`,
  `src/loop-bounds.mjs`,
  `wiki/work/61_milestone_disciplined-acceptor/stories/01_story_the-epoch-and-the-frozen-criterion/STORY.md`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** `61/00`, `61/01`

### 61/05 · `05_story_the-event-a-ruling-raises` — stage 3

**Subject.** The ninth event, its one reactor and the acceptor's single I/O home — a ruling and the
knob it moves are written beside each other in the effects ledger's own discipline — and the
undeclared-name hole that made `table.mjs`'s own comment false is closed in the vocabulary's home.

- **files:** `src/effects/table.mjs`, `src/effects/harness-transitions.mjs`,
  `src/work-acceptor/store.mjs`, `test/arch/acd-effects-ledger.test.mjs`,
  `test/arch/acd-harness-ruling-ledgered.test.mjs`, `test/harness-ruling-seam.test.mjs`,
  `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-007`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `src/effects/item-transitions.mjs`,
  `src/effects/run-transitions.mjs`, `src/effects/journal.mjs`, `src/config-editor.mjs`,
  `src/aof-gitignore.mjs`, `wiki/work/61_milestone_disciplined-acceptor/stories/04_story_the-rule-and-the-ledger/STORY.md`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** `61/04`

### 61/06 · `06_story_the-acceptors-face` — stage 4

**Subject.** One registered command over every lane, whose default and permanent answer is
report-only, which names every refusal that applies rather than the first, and which tells "four
rulings, threshold eight" apart from "this knob yields under one pair per epoch".

- **files:** `src/commands/acceptor.mjs`, `src/command-core.mjs`, `src/work-acceptor/rule.mjs`
  *(scoped to `knobReport`'s refusal filter — ADR-013 §4a)*, `src/effects/harness-transitions.mjs`
  *(scoped to the read-only ledger facade)*, `test/{command-core-contract,acceptor-command}.test.mjs`,
  `test/arch/acd-work-command-{cli-bijection,route-coverage}.test.mjs`,
  `test/arch/acd-{report-only-is-the-default,dwell-gates-reversion-only}.test.mjs`,
  `scripts/test.mjs`
- **reads:** `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-003`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-010`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-011`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012`,
  `wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-013`,
  `wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-002`, `src/commands/audit.mjs`,
  `src/command-core.mjs`, `test/arch/acd-work-command-{cli-bijection,route-coverage}.test.mjs`,
  `test/command-core-contract.test.mjs`, `src/effects/{harness-transitions,journal}.mjs`,
  `src/work-acceptor/{admissibility,criterion,ledger,observations,store}.mjs`,
  `src/loop-bounds.mjs`, `src/bundle/loops/speed-thoroughness-autonomy.md`,
  `wiki/work/61_milestone_disciplined-acceptor/stories/02_story_the-observation-census/STORY.md`,
  `wiki/work/61_milestone_disciplined-acceptor/stories/04_story_the-rule-and-the-ledger/STORY.md`,
  `wiki/work/61_milestone_disciplined-acceptor/stories/05_story_the-event-a-ruling-raises/STORY.md`, `wiki/work/60_spike_acceptor-discipline/SPIKE.md`
- **depends:** `61/00`, `61/01`, `61/02`, `61/03`, `61/04`, `61/05` *(61/03 added by the PO at
  refine: the face reports `not-admissible`, which is 61/03's output, and the edge was absent rather
  than transitive — §3's own rule that a real edge is declared rather than left implied.)*

**The shared-file rule, with the two measured closure exceptions.** `scripts/test.mjs` is the
append-only suite registry; 61/06 also owns ADR-013 §4a's one filter in `rule.mjs` and the read-only
ledger facade in 61/05's harness seam. `src/work-acceptor/` otherwise keeps one owner per module.
