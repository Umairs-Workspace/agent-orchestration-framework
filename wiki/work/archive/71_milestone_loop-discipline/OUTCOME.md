# 71 · Loop discipline — one review round, and findings become work items — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `SPEC.md` is.

  AUTHORED, NOT CONCATENATED (39/ADR-006): the aggregation happens in the INDEX, where
  `aof work memory ingest` unions every item's records into one recall surface. What follows is what
  is true AT THE MILESTONE LEVEL; where a story states a capability whole it is CITED, not repeated.
-->

## Delivered

### Every loop in the ACD prompt layer now terminates, and says so where an agent reads it
Before this milestone the build step had a written terminator and the review step had none — no round
cap, no re-review bound, no exit criterion. Both halves now terminate in the shipped assets and in
their fifteen rendered runtime copies: build stops on green-or-no-progress (`m71/00`), review runs one
round by default with a named-Blocker second and a hard third (`m71/02`), the free gate ladder runs
before any reviewer is spawned and again after every fix round, and a red ladder consumes no round.
The prompt layer and the runtime speak the same bounds in the same words.

### A bound stated anywhere in the bundle names its home, and equals it — enforced across the whole bundle
This is the milestone-level property no single story holds: FF-7101 reads every asset under
`src/bundle/`, resolves every `work.loop.*` key it names through `LOOP_BOUND_VALUE_RESOLVERS`, and
binds every stated value to that bound's own answer — to the exported **clamp** where a clamp
identifier stands in the same sentence, and to the config key otherwise. A numeral that names no key
and no clamp is out of reach by construction, and the control asserts that it is. Combined with 69's
`acd-loop-cap-single-home` over `src/**`, there is now no home for a loop bound in this repository
that some control does not read.

### The loop's creation authority is bounded, and the bound is structural rather than numeric
An uncapped round loop became a capped one with a queue behind it. The loop creates exactly one item
type (`chore`), in exactly one place (top level, invisible to the walk that created it), appending
after the highest number and shifting nothing, idempotent per finding — see `m71/01` for the verb, the
router and the engine. **It is in live use, and that is the milestone-level fact:** three chores in
this stream now carry a `**Promoted from review finding:**` back-reference — **88** and **90** from
build/review closes, and **89** from this milestone's own gate. Before this milestone, `grep -rl
"Promoted from review finding" wiki/work/*/CHORE.md` answered nothing.

### The milestone's own gate was refused by a rule this milestone wrote, and the queue is what cleared it
71's first gate pass failed its own accept rule: `ARCHITECTURE.md` declared **FF-7106** and the
four-story partition gave it no owner, so a declared control did not resolve. The declaration was kept
rather than dropped — chore 89's Definition of Done cited the register as its specification — and the
chore was executed to `done`, landing the control, whereupon the second pass cleared. The loop closed
on itself: a finding the cap stopped chasing became a named work item, which was worked, which cleared
the gate that raised it.

### The design lane can no longer burn spawns on a surface it cannot render
`m71/03` states the precondition and the skip; the milestone-level fact is that this repository is
itself the unconfigurable case — `.aof/aof.config.json` carries no `work.ui` key — and the lane now
costs one recorded `INCONCLUSIVE` instead of three breakpoints × N surfaces of failed invocations plus
two agent spawns. The cached-Chromium path that lived in seven records and no prompt is now the only
render the bundle names, and 07's `npx playwright` clause is superseded in 71's own contract with 07's
delivered `.feature` files untouched.

### Six declared controls, six resolving, seventeen planted defects
The register is fully discharged: FF-7101, FF-7102, FF-7103, FF-7104, FF-7105 and FF-7106 each resolve
to a registered file and each carries a red probe in `VERIFICATION.md` recording what was changed to
make it fail and the message observed — seventeen plants in all, every one run in a fresh process and
reverted with sha256 proven equal before and after. `aof work doctor 71` reports no
`control-unresolved` at either severity.

## Assumptions

- **The prompt layer instructs; it does not enforce.** Every bound this milestone lands is a sentence
  an agent reads. The controls prove the sentences are present, consistent with `src/loop-bounds.mjs`,
  and in the right order; only a live run proves an agent obeys them. Enforcing the bounds in code —
  timeouts, reapers, slots, budgets — is milestone 69's half of the same contract and stays there.
- **The round cap's value is 69's decision.** 71 speaks `work.loop.reviewRounds` and
  `MAX_REVIEW_ROUNDS`; it neither invents nor moves them.
- **The rendered runtime copies are kept in step by FF-7106 only for stories that DECLARE the member.**
  A story that edits a bundle member without declaring it in `files:` is outside the control's reach.
- **The promotable population is throttled by 83's reporting bar, not by a numeric budget** — the loop
  imposes no cap on how many chores a review may create.

## Gaps

### The saving this milestone exists to produce is stated and unmeasured
- **Status:** open
- **Discharge condition:** one milestone driven through the loop door, so `aof work observe <ref>`
  attributes its agent runs — then the lane overlap, the absent fan-out on a wave of one, round two's
  one-lens cost and the absence of a contract re-application agent are read off that record, and the
  1h03m the SPEC quantifies is either recovered or is not.

`aof work observe 71` reports **0 agent runs across 0 sessions, 408 unattributed**; 72 reports the
same. Six of the milestone's nine `@manual` scenarios wait on that record
(`VERIFICATION.md` F-71-B, F-71-G).

### The render produces a frame whose soundness nobody records
- **Status:** open
- **Discharge condition:** the render step establishes the layout viewport (CDP
  `Emulation.setDeviceMetricsOverride`, not `--window-size`), waits for settle, records
  `scrollWidth == innerWidth` and a PNG `IEND` per capture, and hands that record to the designer with
  the screenshot; FF-7102 leg (a) then asserts the soundness record rather than the flag.

Measured live at this gate against a real surface: the 390 frame was unjudgeable and the 768 frame was
captured mid-settle and nearly earned a false Blocker. `m47/F-47-V-21` is the specification
(`VERIFICATION.md` F-71-F).

### Four reds inherited by this milestone's own accepted stories are queued, not fixed
- **Status:** open
- **Discharge condition:** chore **88** run to `done` — the moved `defaultAt()` pin re-pointed, the new
  control file classified into a lane, FF-6109's assertion updated to the reality its own comment
  anticipated, and the fourth test outside `test/arch/` that shares that cause.

71/00's and 71/01's changes reddened four tests in stories that were already accepted; all four are
discharged by a checklist against existing code (`VERIFICATION.md` F-71-H).
