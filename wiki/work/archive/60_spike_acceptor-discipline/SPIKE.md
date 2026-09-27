---
type: spike
number: 60
slug: acceptor-discipline
title: "Acceptor discipline at aof's sample sizes — what rule may commit a harness change?"
status: done
owner: architect
created: 2026-08-13
updated: 2026-08-30
depends: []
timebox: 2d
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  SPIKE.md — the record doc for a de-risk spike. Answers ONE question:
  is the unknown resolved, and what did we find?
  A spike is a TOP-LEVEL DRIVER that groups no stories and carries no behavioural contract — no
  tasks/, no .feature. Its whole deliverable is a RECORDED FINDING; the code it produces (if any) is
  a throwaway prototype, never shipped as-is. "Done" = ## Finding is filled and the unknown is
  resolved (aof:verify checks exactly this). It gates the stream: 61 waits on it.
-->
# 60 · Acceptor discipline at aof's sample sizes

## Question

**At aof's sample sizes — a handful of heterogeneous runs per milestone, not thousands of graded
trials — can a harness-change proposal be accepted by a statistically valid rule, or must the acceptor
be a fixed evidence threshold with dwell and reversibility? What is the smallest defensible rule?**

The published result this spike exists to apply is unambiguous about the *problem*: in self-evolving
agent systems the weak point is the **acceptor**, and the ubiquitous "keep it if the score went up" is
uncontrolled adaptive multiple testing — the system p-hacks itself, committing 30–42% false and 10–33%
harmful edits when a genuine improvement is hidden among noisy proposals. The published *solution* is a
sequential, anytime-valid test that commits only on decisive evidence. What is unknown is whether that
solution transfers to aof.

Why it may not, and what the finding must resolve:

1. **Sample size.** Anytime-valid testing assumes a stream of comparable trials. aof produces a few
   runs per milestone, each on different work. Is there any unit of comparison with enough instances —
   per-task runs, per-attempt retries, per-story builds — or is the population structurally too small?
2. **Heterogeneity.** Two aof runs are not two draws from one distribution; the work differs. Is there
   a paired-comparison construction (incumbent vs candidate on the *same* items, replayed) that makes
   trials comparable, and what does replaying cost?
3. **What the fallback rule is, exactly.** If no statistically valid test fits, the substitute must
   still beat "the number went up": a minimum evidence count, a bounded step within declared floors and
   ceilings, a dwell period before reversion, full reversibility with evidence recorded alongside the
   change, and report-only until the threshold is genuinely met. This spike settles which of those
   carry the weight, and what the numbers are.
4. **Epoch boundaries.** A self-improving system pressed against a fixed evaluator is an optimizer
   whose incentive is to game the evaluator; the answer is a criterion frozen *within* an epoch and
   revisable only at its boundary. What is an epoch in aof's terms — a milestone, a range, a calendar
   period?

## Timebox

- Box: `2d` — stop and record the best-available finding at the boundary; a timebox extension requires
  explicit re-scoping. "A valid sequential test does not fit at these sample sizes, and here is the
  defensible fixed rule instead" is a complete and useful finding.

## Investigation

Three lanes ran concurrently against this repo at `a60850cf` (`aof work dispatch --list --json`
reported `bound: 3`), followed by an orchestrator re-measurement and two independent review passes
that re-derived every load-bearing figure. Lanes were read-only; the effects journal was copied to
scratch before querying and the live store was never written.

**Corrections from the review passes are folded in below and marked.** Several first-pass numbers
were wrong, and — as in spike 56 — one was wrong by a mechanism this spike exists to indict: a
retrospective rate was used to size a prospective trial, and a correction the document itself
mandated was not applied to the section two above it.

### Conventions, stated because the first pass left them implicit

- **Basket pricing** is `raw pairs x 2 arms x MEAN unit USD`. The mean, not the median — they differ
  2x for milestone builds ($137.30 vs $68.42) — and two arms because a paired trial runs incumbent
  and candidate. A reader taking the obvious single-arm/median reading gets a figure ~4x low.
- **"Active hours"** are agent-busy hours with idle gaps discounted, not wall-clock. The discount
  threshold was never stated by the reconstructing lane and **could not be re-derived at review**:
  wall-clock agrees for `aof-qa` (0.26 h) and `aof-architect` (0.32 h) but not for `aof-developer`
  (0.58 claimed vs 0.71 wall) or milestone builds (3.33 claimed vs 4.23 median wall). **Treat every
  hours figure in this record as approximate; the USD figures are exact.**
- **Discordant pair** = a replayed item where incumbent and candidate give different outcomes. Ties
  are discarded by construction, so the tie rate multiplies the basket.

### What the question assumed, and what is actually there

| | as framed in the Question | measured at HEAD |
|---|---|---|
| the acceptor's evidence unit | "a handful of heterogeneous runs per milestone" | **a discordant pair**, not a run |
| runs available | few | **61 lifetime**, 52 items |
| observations an instrument has recorded | assumed to be a stream | **1 — "now" — forever.** No instrument persists anything |
| retries (the natural paired arm) | `maxAttempts: 3` | **`{1:57, 2:4}`** — the ceiling has never been approached |
| knobs the acceptor would arbitrate | assumed live | **three declared, none with an executed consumer** |

### Lane A — the population

`grep -rn "writeFile|appendFile|mkdir|writeFileSync|appendFileSync"` over
`src/commands/{counters,grade,ratchet,audit}.mjs`, `src/work-audit/` and `src/commands/loops-*.mjs`
returns **zero matches**, as does a search for `sqlite`/`.json`/`.jsonl` in the same set. Every
milestone-55/57/59 instrument recomputes a snapshot from the work tree and git. **A sequential test
consumes a sequence; aof stores none.**

The effects journal holds 8,576 events, but `run.started` is **3,926 of which 3,848 are test
fixtures** (`itemDir` under `Temp/aof-cli-*`). Any count over this journal that does not filter on
`itemDir` measures the test suite rather than the work — a trap that also inflates
`feedback.recorded` (166 → 55 real) and `assignment.settled` (328 → 83 real, of which 32 belong to
the standing mesh test-bed workspace `52294b307214c27d`).

**Corrected at review — the two censuses diverge, and the first pass reported only one of them.**
Applying this record's own dispatch-collapse rule, aof's real `run.started` count is **53, not 48**,
because five arrivals on **2026-08-23** were written under `dispatch-worktrees/dispatch-70-06`. Those
five wrote their run records *inside the worktree*, so the on-disk census (**61 records across 52
items, last write 2026-08-16**) and the journal census (**53, last arrival 2026-08-23**) genuinely
disagree. That divergence is the fragmentation argument made concrete, and the first pass committed
the very error its own corrections section names.

Of the 61 on-disk records: `sessionId` populated **0**, `costUsd` **0**, `tokens` **0**, `model`
**0**, `brief` empty in **58**. Outcomes 49 done / 9 failed / 2 cancelled, plus one stale `running`
from 2026-08-08.

### Lane B — replay, and what a trial costs

**A paired incumbent-vs-candidate construction is not constructible today, and the reason is wiring
rather than cost.** Three independent blocks:

1. **The instrumented harness is not the one aof runs on.** Two build paths exist — the code-owned
   loop (`src/agent-session-driver.mjs`, which compiles a deterministic brief, captures the session
   id and settles spend) and the prompt-driven orchestrator (`src/bundle/commands/continue.md`).
   **Every delivered item was built by the second**, which is why the milestone-68 spend envelope
   (`SPEND_ENVELOPE_KEYS`, `src/run-store.mjs`) is fully specified and **never once populated**. The
   whole ingest pipeline exists and dead-ends on one field: `completeRun` calls
   `settleSpendFromTranscript`, which returns `{stamped:false, reason:"no-session-id"}`
   (`src/run-spend-ingest.mjs:231-234`) because `record.sessionId` is null in 61 of 61 records.
   **Writing that one field turns the entire envelope on.**
2. **The pre-build tree was never committed.** `git rev-list --count --all` → **191 commits** for
   **247 stories** (`find wiki/work -name STORY.md`); commit subjects matching `^NN/MM ` → **13**,
   covering 5 stories, all from milestone 59. For the rest, the contract-present/code-absent state a
   replay would check out **does not exist in history**.
3. **No replay verb, no harness identity, no trial record.** `aof work resume` re-mints a run record
   and re-executes nothing; the run-record key set has no harness or config field.

Cost, reconstructed by hand from the transcript tree (**161 top-level session files; the subagent
data actually read lives under `<session>/subagents/`, 493 files / 534 MB**) because the telemetry
path is dead, priced with aof's own `price-table-2026-08-v1`. **Independently re-derived at review
and confirmed:**

| unit | n | median USD | mean | CV | median active h |
|---|--:|--:|--:|--:|--:|
| `aof-qa` review round | 119 | 5.15 | 5.61 | 0.55 | 0.26 |
| `aof-architect` review round | 76 | 8.38 | 11.46 | 0.81 | 0.32 |
| `aof-developer` task build | 104 | 16.33 | 22.82 | 0.94 | 0.58 |
| story build | 10 | 23.46 | 37.24 | 1.07 | 0.64 |
| milestone build | 26 | 68.42 | **137.30** | 1.18 | 3.33 |

Worst single build measured, reproduced to the cent at review: milestone 49 — 28 subagents,
1.24 B tokens, **$544.06**, 7.76 h wall.

**Corrected at review — the concurrency figure was wrong, and it was the feasibility half of the
argument.** The first pass reported an effective concurrency of **1.03**, computed over a population
dominated by single-subagent segments where concurrency is ≤1 by construction. Re-measured over the
21 `/aof:continue` segments with ≥3 subagents: **median 1.68** by busy-window and **1.37** by segment
wall; over the six segments with ≥12 agents, **2.01**. The record's own headline example refutes the
original figure — milestone 49 ran **27.78 agent-hours in a 7.55 h busy window = 3.68x** — and simple
arithmetic condemns it independently: 1.03x across 28 subagents in 7.76 h would require each to
average **17 minutes**, against this table's own 35-minute median task build. **USD figures are
unaffected — concurrency does not change spend — but every elapsed-time figure below falls by roughly
40%, and by about half at the large fan-outs.**

**Within-item variance is unmeasured and unmeasurable from history — no item has ever been
replayed.** The nearest pairs are confounded and are weaker evidence than the first pass implied:
`47/04` ran **$15.29 first (0 subagents) then $88.10 (4 subagents)** — a 5.76x ratio in the
*opposite* direction to a carry-over story, and across different fan-outs; `53/00` orchestrated
$29.39 vs `--solo` $5.63 (5.22x) is a deliberate mode change, not a replay.

### Lane C — what the valid tests actually demand

PACE is **paired by construction** and its evidence unit is a **discordant pair**. The floor is
arithmetic, derived twice to agreeing precision. *Combinatorial*: n discordant pairs give 2^n
equally-likely sign patterns under H0, so a level-α region exists only when `2^-n <= 0.05`, i.e.
`n >= log2(20) = 4.3219` → **n = 5**; `2^-4 = 0.0625 > 0.05`, so **four perfect wins can never
reject under any test.** *Ville*: crossing needs `ln 20 = 2.9957` nats and a binary observation
yields at most `ln 2 = 0.6931`, giving the same 4.32 → 5. PACE as shipped (λ=0.5, commit at
`E >= 1/α = 20`) floors higher: `1.5^7 = 17.086 < 20 <= 25.629 = 1.5^8` → **8**, and all-favourable
is **forced** rather than an extra strictness, since a 7-1 record reaches only 8.54.

**Anytime-validity buys the right to peek without inflating error; it does not reduce the evidence a
decision needs.** Head-to-head at budget 37, p1=0.70, α=0.05: fixed-n exact sign test **0.807**
power, e-process at PACE's λ **0.619** — **18.8 points of power surrendered** for the right to stop
early. PACE's "~18% lower evaluation cost" is a saving on evaluations already budgeted at n=40, not a
smaller bar.

Power at reachable n, recomputed exactly at review by dynamic programming rather than simulation.
**`B=8` and `B=10` are necessarily identical** — with λ=0.5 the next crossing after 8-0 is 10-1 at
n=11, so no path crosses at n=9 or n=10, and the first pass's `0.056 → 0.059` growth was a
simulation artefact:

| p1 | B=5 | B=8 | B=10 | B=20 | B=40 |
|---|--:|--:|--:|--:|--:|
| 0.60 | 0.000 | 0.017 | 0.017 | 0.107 | 0.228 |
| 0.70 | 0.000 | **0.0576** | **0.0576** | 0.346 | 0.677 |
| 1.00 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 |

**A caveat the consumer must carry: the two cited papers could not be independently verified.** PACE
and The Red Queen Gödel Machine are cited in `PRD-graph-engineering.md` without arXiv ids; ids
obtained during the investigation appear in no other repo file and could not be re-checked at review.
Nothing in the operative rule below depends on them — every floor is re-derived from first
principles here — but **λ=0.5 is attributed to PACE**, so if that attribution is wrong, N=8 must be
re-derived from whatever λ is chosen.

### Corrections the review passes forced

- **The denominator was scoped to the wrong thing, and this is the one piece of good news.** aof is
  the harness for **every repo it drives**, so a trial of the harness is a run anywhere. Fleet-wide
  the review-verdict stream is **n=108 at 56.1/wk**, not 52 at 27.1/wk — a **2.08x** larger supply.
  But the other fleet repo bounces at **32.1%** against aof's **17.3%**, a 14.8 point gap, so pooling demands
  stratification: **heterogeneity reappears at fleet level rather than being dissolved by the larger
  n.**
- **Dispatch worktrees register as separate `workspaceRoot`s**, fragmenting the measured stream by
  **15%** (8 of 52 aof verdicts). Collapsing them is what reconciles a first-pass n=44 with the
  correct n=52 — and the same rule, applied consistently, is what corrects Lane A above.
- **The effects vocabulary is eight events, not seven** (`src/effects/table.mjs:466-577`):
  `run.started`, `run.completed`, `feedback.recorded`, `item-status.changed`, `stream.reindexed`,
  `assignment.reported`, `terminal.resume-refused`, `assignment.settled`. Seven is the count
  *observed in the journal* — `terminal.resume-refused` has never fired. The substantive conclusion
  is unaffected: none of the eight carries a config or harness change.
- **`8/(1-0.90)` is 80 raw pairs, not 81.** The first pass's 81 was an IEEE-754 artefact of
  `Math.ceil(8/0.1)`, in a document about numeric discipline.

## Finding

**No. At aof's sample sizes a sequential, anytime-valid test cannot be run — but that is not the
binding constraint, and the Question's framing understates the problem by one whole level. The
acceptor does not lack a valid test; it lacks an evidence stream, and the knobs it was commissioned
to arbitrate have no executed consumer. The smallest defensible rule is a fixed threshold of eight
all-favourable discordant pairs — and the reason it is defensible is that at that n it IS the
anytime-valid test, not a substitute for one.**

**1. There is no observation series, anywhere, of anything.** Not "too few" — zero. Every m55/57/59
instrument is pure recompute (**0 persistence calls**), so each has exactly one observation, "now",
in perpetuity. The run record — the join key every other population hangs off — is at **61 lifetime
across 52 items**, and carries `sessionId` in 0 of 61, `costUsd` in 0 of 61. That simultaneously
zeroes the transcript telemetry that would otherwise be the densest stream, because attribution is a
join on the session id that is never written. **Any acceptor built before this is fixed has nothing
to read.** This is an engineering gap, not a law about aof's scale, and it is the cheapest thing on
this page to close.

**2. No declared tunable knob has an executed CONSUMER — and the distinction is the whole control.**
`.aof/loops/speed-thoroughness-autonomy.md:10` declares `parameter-tuning:
[config:work.loop.reviewRounds, config:work.loop.buildNoProgressRounds,
config:work.autonomous.maxAttempts]`.

**Corrected at review, and this correction is load-bearing.** The first pass said the first two are
"read only by `src/commands/loop.mjs`". That is false: `loopBoundsFromConfig` resolves both
unconditionally (`src/loop-bounds.mjs:91-100`) and is called from `src/commands/drive.mjs:229` and
`src/mesh-worker-execution.mjs:1697,2238` — the dispatch path, which demonstrably executed (5
`run.started` under `dispatch-70-06`). `src/loop-progress.mjs:167` resolves one again.

**The inertness conclusion survives, for a better reason.** The sole consumer of `deadlinePolicy`
(`src/agent-session-driver.mjs:1126-1163`) reads **only** `startToCloseMs`, `heartbeatMs` and
`startupGraceMs`. Both knobs are computed on live paths and **thrown away**. The path that built
every delivered item, `src/bundle/commands/continue.md`, hard-codes the round policy in prose
("*Three rounds is the hard cap*") and names no config key at all. The third knob is inert by
measurement: the attempt histogram is **`{1:57, 2:4}`**, maximum ever 2 against a ceiling of 3, so
moving that ceiling to 2 or 4 changes **zero of 61 runs** — though a step to 1 *would* change 4, so
the claim holds only within the ±1 neighbourhood this rule proposes.

*Milestone 61 is scoped to build a gate for three knobs, none of which any executed code path acts
on.*

**3. The evidence floor is arithmetic; the basket size is NOT, because the trial metric is
undecided.** Five discordant pairs is an information-theoretic floor binding every test in the
family. PACE as shipped floors at eight. But ties are discarded, so the tie rate multiplies the
basket — **and the tie rate is a function of a metric this record does not choose and §8 explicitly
freezes to 61.**

**Corrected at review: the first pass priced one basket as though the metric were settled, using a
retrospective rate to size a prospective trial.** The two are different quantities:

- **Retrospectively**, the declared knobs changed nothing about what already happened — a 100% tie
  rate. That is a deduction from history, not a measurable property of a future trial.
- **Prospectively**, the tie rate depends entirely on the outcome measure. On a binary pass/fail
  metric with a harness-attributable failure floor of **4.92%** (3 `agent_error` of 61 runs; counting
  all 9 failures instead gives 14.75%, and the classification rule was never stated), independence
  puts discordance near `2p(1-p)` — ties of roughly 90-95%. On a finer-grained or continuous metric,
  discordance is far higher and the basket far smaller.

The honest statement is therefore a **range with its assumption named**, priced at `raw pairs x 2
arms x mean USD`:

| tie rate | raw pairs for 8 discordant | `aof-qa` round | `aof-developer` task | story build |
|---|--:|--:|--:|--:|
| 50% (fine-grained metric) | 16 | $180 | $730 | $1,192 |
| 90% | 80 | $898 | $3,651 | $5,958 |
| **95.08%** (binary pass/fail, harness-attributable only) | **163** | **$1,830** | **$7,438** | **$12,141** |

**That is a 10x spread driven entirely by a choice nobody has made yet, and choosing the metric is
therefore the first thing milestone 61 must do — before it can budget anything.** The 4.92% figure is
a **floor on ties and hence a lower bound on cost**, not a worst case: the first pass labelled it a
"measured ceiling" in one place and an "estimated ceiling" in another, and a reader budgeting below
$7,438 on the binary metric would be reading it backwards.

**Even at the cheapest end the sample-size problem is not bought out.** At a 50% tie rate the
developer-unit basket is $730 but still 16 replays of a machine that cannot replay; at the binary
metric it is **$7,438 and ~130 active hours** (revised down from 220 by the concurrency correction),
against a mesh at **10% lifetime assignment success with zero successes on this repository**.

**4. The grader is free and deterministic; the trial is expensive and stochastic — the exact inverse
of what a cheap paired design needs.** `aof work validate 59` runs in ~0.6 s, `doctor` ~1.6 s,
`audit 59` ~10.4 s (scoped; unscoped is ~57 s), and the declared rubric `node scripts/test-rubric.mjs`
exits 0 in ~102 s over TAP 1..1358 (reported, not re-run at review — it is the full suite). On a
fixed tree every one of them returns the same answer under every harness configuration, so **none can
serve as the trial**. Meanwhile there is **no unit below the milestone build ($137.30 mean) that
responds to an orchestration knob at all**, so one evidence threshold cannot serve every knob: at
n=20 raw pairs a review-prompt change costs $225 and a dispatch-bound change $5,492, a **24.5x
spread**.

**5. At aof's n, a valid test is not a weak test — it is a silent one, and that is its own hazard.**
A genuinely better candidate winning 70% of discordant pairs commits **5.76% of the time at n=8, and
identically at n=10**. An acceptor that structurally never fires is not a discipline but an off
switch, and an off switch that blocks real improvements gets routed around — which is PACE's own
failure mode re-entering by the back door. **Report-only must therefore be named as the honest steady
state rather than presented as a waiting room**, and the surface must distinguish *"4 rulings,
threshold 8"* from *"this knob yields under one discordant pair per epoch; the floor is eight epochs
away"*.

**6. The rule, and why it is defensible rather than chosen.** At λ=0.5 an unbroken run of 8
favourable discordant pairs gives `1.5^8 = 25.63 >= 20 = 1/α`, an exact p of `2^-8 = 0.0039`. The
fixed threshold and the sequential test **coincide at n=8**: `{commit by n=8}` and `{all 8
favourable}` are the same event, because a single loss pushes the earliest crossing out to 10-1 at
n=11. The restriction does not loosen the error guarantee — Ville bounds the unbounded e-process at
≤ 0.05 while the truncated rule attains 0.0039 — so the rule is *more* conservative than the test it
restricts, which is precisely what stops it being "the number went up" wearing a lab coat. Report
N=4 as *cannot commit under any test, ever*, and N=5–7 as *sufficient only under a maximally
aggressive bet*.

- **Minimum evidence** — **8 all-favourable discordant pairs.** All-favourable is forced by the
  arithmetic, not chosen.
- **The ledger's scope and its loss semantics** — **corrected at review; the first pass left both
  undecided and they are the first thing an implementer needs.** The ledger accrues **across epochs,
  not within one**: at a measured yield below one discordant pair per epoch, an epoch-scoped counter
  can never exceed 1 and the acceptor is structurally unable to fire — the §5 hazard, built in. It
  carries forward while the criterion is unchanged, and **resets to zero when the criterion moves**
  (§8). On an unfavourable pair the run does **not** reset and the proposal is **not** killed: wealth
  carries as `1.5^w x 0.5^l`, which keeps the Ville guarantee intact and leaves a losing proposal able
  to recover at 10-1 by n=11. A hard reset would attain exactly `2^-8`; killing on first loss would
  drive the effective rate to ~0 and re-create the off switch.
- **Bounded step** — **±1 on the integer, one knob at a time, never compound.** `reviewRounds` spans
  `{1,2,3}`, so its whole ladder is two steps wide and floor-to-ceiling costs 16 discordant pairs.
  Model maps are discrete and unordered: **not steps**, human diff only.
- **Dwell** — **2 cycles of the receiving loop**, already declared (`dwell: cycles:2`,
  `.aof/loops/speed-thoroughness-autonomy.md:8`). The load-bearing half is the **asymmetry: dwell
  gates reversion, never revert-on-harm** — counter-metric degradation pulls the change immediately.
- **Reversibility** — **half of it is already free**: `.aof/aof.config.json`, `.aof/frozen-set.jsonc`
  and all 17 `.aof/loops/*.md` are git-tracked, so `git revert` *is* the mechanism. What is missing
  is the *why*, attached: key, prior and new value, epoch id, the W/L/T ledger in order, attained
  e-value, counter-metric reading, dwell expiry, provenance.
- **Report-only** — **the default and permanent state; commit is the exception.**

**Ranking, since the Question asks which ingredients carry the weight:** **report-only >> minimum
evidence count >> bounded step > reversibility > dwell.** Report-only carries the most by a
distance, because it is the only ingredient **unconditionally correct at every sample size including
n=0**: PACE's measured harms — 30–42% false, 10–33% harmful — are all *commits*, and report-only
makes every one of them zero. It is also the only ingredient that *generates* the data needed to know
whether the others will ever fire. The minimum evidence count ranks second because it is the only
number with an **external** anchor: `1.5^7 = 17.09 < 20 <= 25.63 = 1.5^8` cannot be argued down at
11pm. **Dwell is closest to ceremony today** and should be kept without being mistaken for the safety
the threshold provides: it damps oscillation, which needs a high-frequency proposer, and at eight
discordant pairs per step a knob moves a handful of times per *year*.

**7. The highest-value control is nearly free, half of it already shipped, and the first pass worded
it so that it would refuse nothing.** For a knob with no executed consumer the null is *exactly*
true, so **100% of any commits it produces are false** — the control's value is removing a whole
class of proposals from the multiple-testing stream PACE exists to indict. (The first pass claimed
such a knob leaks at 5% per proposal. That is wrong twice: under this record's own 8-pair rule the
per-proposal rate is `2^-8 = 0.39%`, and under a deterministic grader an inert knob ties with
probability 1 and never fires at all. The rate depends on the metric; the control's value does not.)

**The wording must be "no executed CONSUMER" — a resolved value that reaches a decision — never "no
executed reader".** As the first pass worded it the check finds live readers for all three knobs via
`drive.mjs` and `mesh-worker-execution.mjs` and **refuses none of them**. On the corrected wording it
refuses all three at HEAD.

**And it must EXTEND an existing control, not add a sibling.** `test/arch/acd-progress-ledger-consumed.test.mjs:96-107`
(`unconsumedCeilings`, shipped 69/06) already refuses any `config:` ceiling with no production reader
outside its declaring home, and its own header states the exact residue: *"it does not prove that
reader is itself reachable from a production entry point."* That residue is this finding. Note the
honest limit: for the prompt-driven harness the check is not statically decidable — `continue.md`
names no config key — so the implementable form is fail-closed (*while `continue.md` is the harness,
refuse every proposal*), which is a switch rather than a discriminating control until knobs become
readable from the prompt path.

**8. An epoch is one milestone, and the boundary is any transition INTO `done`.** The governance
loops already tick there — `.aof/loops/instrument-audit.md:8` and `retrospective-memory-ingest.md:10`
are both `cadence: event:per-milestone` — and **the acceptor's epoch must equal the auditor's cadence
or the acceptor is trusting instruments audited on a different clock.** That, not scarcity of slower
units, is the load-bearing argument: `EVENT_TRIGGERS` is a closed four-value set topping out at
`per-milestone`, but the cadence grammar does admit `periodic:<n>d` (`src/work-loops.mjs:426-430`),
so "nothing slower is expressible" would be false — nothing slower is *declared* (the only periodic
cadence in the tree is `periodic:15s`), and 58/ADR-002 bans comparing the two axes anyway. A *range*
fails the Red Queen requirement outright, being a query chosen per invocation — p-hacking by choice
of window, one level up.

**Corrected at review: key the boundary on `to === "done"`, not on `from === "in-progress"`.** All 11
milestones that reached `done` took `in-progress → done`, so the narrower predicate happens to work
today — but `ITEM_STATUS_EDGES` admits `in-review → done`, `verify.md` accepts from either, and **3
of 4 spikes already took the other edge.** A milestone parked `in-review` before acceptance would
never close its epoch. The payload carries `from` regardless
(`src/effects/item-transitions.mjs:47-54`).

Within an epoch **five** things are refused, not warned: the metric definition and its paired
counter-metric; **α, N and λ** (N is a function of λ and α — freezing N without λ lets N drift by
re-choosing λ); the tunable set with its floors and ceilings; and the frozen set. At the boundary and
only there, `actor:operator` may revise them. **If the criterion moves the evidence ledger resets to
zero and the surface says so by name**; if it did not move, the ledger carries forward and the record
must state that it was unchanged rather than assume it.

**Honest scope.** Beyond the corrections above, the following are **not** measured and must not be
read as though they were. The within-item variance `CV_w` that every basket size assumes is
**unmeasured** — no item has ever been replayed, and the two nearest pairs differ by 5.2–5.8x across
different fan-outs and modes. The **trial metric is unchosen**, and with it the tie rate, the basket
and every cost figure (a 10x spread). The **failure-classification rule** behind 4.92% is a choice
between 3/61 and 9/61 that moves the basket 3x. **"Active hours" has no stated idle threshold** and
did not re-derive at review. The 100% tie claim is a **deduction from history**, not an observation,
and for `maxAttempts` holds only within ±1. The fleet-level pooling is **arithmetic on 13.5 days** of
a stream whose emitter shipped 2026-08-16. The two cited papers **could not be independently
verified**, and λ=0.5 rests on one of them. And the review verdict — the only stream where a
threshold is reachable in weeks rather than never — is rendered by an agent reviewer, so it is a
*judgement*, not an independent measurement, and pairing on it re-couples the acceptor to the maker
unless the reviewer is independent of the change being scored.

## Outcome / Next

The unknown is **resolved**, and the answer redirects its consumer rather than merely unblocking it.

**61 (disciplined acceptor) — the gate is settled, but three of its scoped premises are false at HEAD
and one conflicts with its own SPEC.**

- **The rule**: eight all-favourable discordant pairs, ledger accruing across epochs and resetting
  only when the criterion moves, wealth carried as `1.5^w x 0.5^l` on a loss, ±1 single-knob steps,
  dwell 2 cycles of the receiving loop with revert-on-harm bypassing dwell, `git revert` plus an
  attached evidence record, report-only as the permanent default. Ship the threshold and the e-value
  together — they are one rule, and saying so is what makes the number defensible.
- **Choose the trial metric FIRST.** Everything downstream — tie rate, basket size, cost, cadence —
  is undetermined until it is fixed, across a 10x range. This is 61's first task, not a detail.
- **Blocking premise 1: "bounded step within declared floors and ceilings" has no ceilings to
  declare.** Only `reviewRounds` is clamped. `resolveBuildNoProgressRounds` is missing only an upper
  bound (`positiveInteger` already rejects non-integers and ≤ 0); `resolveAttemptCeiling` has
  neither. An auto-applied ±1 on an unbounded knob is a ratchet that walks to infinity — the DGM
  result on a slower clock. **This conflicts with 61's own SPEC**, which puts "what may be tuned at
  all" out of scope and delegates it to milestone 55 (now `done`). Resolve deliberately: either amend
  that out-of-scope clause, or land the clamps as a separate chore before 61 starts. It must not be
  left to be discovered at build time.
- **Blocking premise 2: there is no event to record a harness change.** None of the eight declared
  events fits, and `saveEditableResource` (`src/config-editor.mjs`) records no prior value, evidence
  or provenance. **61 must add an event.** Note the mechanism is weaker than the policy:
  `appendEvent` validates only that a name is non-empty, so an undeclared name appends silently and
  resolves to zero reactors — `table.mjs`'s comment claiming it refuses undeclared names is false at
  HEAD.
- **Blocking premise 3, which this spike's first pass also missed: nothing can refuse a mid-epoch
  criterion change.** The frozen set's `anchors` member denies `Edit/Write(.aof/loops/**)` at *agent
  tool scope only*, and **`.aof/aof.config.json` — where the knob values live — is in no member at
  all.** Without an enforcement point, a knob edited mid-epoch lets the ledger accrue pairs across
  two different values of the knob under test, and the commit fires on evidence spanning the change:
  exactly the p-hack the epoch machinery exists to prevent.
- **Extend `unconsumedCeilings` with entry-point reachability** rather than adding a sibling control,
  and word it on *consumers*, not readers. This is the third recorded instance of "a declared bound
  resolves but nothing consumes it" (F-6900, F-69-V7, F-69-V8) — it wants a ratchet, not another
  one-off.
- **Filter before counting.** Anything 61 counts off the effects journal must filter `itemDir` for
  fixtures and collapse `dispatch-worktrees/dispatch-NN-MM` into the parent. This spike's own first
  pass got that wrong.
- **Do not size one threshold for every knob** — the measured spread is 24.5x — and note the record
  gives no per-knob sizing rule; 61 must author one.

**62 (self-improvement loop) — its auto-apply path is bounded to approximately nothing, and should
be told so plainly.** With no knob carrying an executed consumer, no persisted observation series and
no chosen trial metric, 62's proposal generator may ship, but **auto-apply has no knob it can
legitimately move at HEAD**. The honest sequencing is: instrumentation first, then a live knob, then
auto-apply.

**The prerequisite neither 61 nor 62 owns, and which gates both.** *Nothing in this arc works until
an instrument writes an observation down.* The cheapest closure, in order: (i) populate `sessionId`
on the path that actually builds items — the entire m68 spend envelope is already built and
dead-ends on that one null field; (ii) give one instrument an append-only observation log so a series
exists at all; (iii) make **one** knob live by having `continue.md` read `work.loop.reviewRounds`
instead of hard-coding the policy in prose. Item (iii) is a few lines and it converts the whole arc
from unfalsifiable to testable.

**The one experiment worth buying now.** Three cold replays of a single story, approximately **$112
and 2–3 hours**, to measure the within-item variance `CV_w` that every number in this spike assumes.
Until that exists, every basket size here rests on an unmeasured variance.

**Recorded, not taken** (a spike's deliverable is the finding). These are TECH_DEBT candidates, not
61 scope:

- **`aof work observe` has reported 0 agents for its entire lifetime**, not since a date in August:
  attribution joins on `sessionId`, which is null in 61 of 61 records spanning 2026-07-12 → 2026-08-16.
  A shipped, accepted instrument that has never measured anything. This is **not** milestone 59's
  obligation — 59's delivered census subject is test-suite registration, not production instrument
  output — and TECH_DEBT item 38 is the established precedent for the species.
- **The effects journal has no fixture boundary.** 3,848 of 3,926 `run.started` events are test
  fixtures sharing a store with production facts, and `assignment.settled` is 245 synthetic of 328. A
  `workspaceRoot`-null or fixture-tagged partition would remove the trap at the writer.
- **Dispatch worktrees register as separate `workspaceRoot`s**, fragmenting per-workspace counts by
  15% on the measured stream.
- **A stray nested `wiki/work/wiki/work/` directory** holds duplicate copies of stories 85 and 86,
  which is why a `_story_` directory count returns 249 against 247 real `STORY.md` files.
- **The mesh is not a capacity multiplier today**: 50 assignments lifetime, 5 done, **3 for this
  workspace all failed** on 2026-07-24, both workers last seen 19 and 34 days ago.
