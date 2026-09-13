# 62 · The self-improvement loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.

  AUTHORED, NEVER A CONCATENATION. Each capability below is true AT THE MILESTONE LEVEL and is stated
  by no single story's outcome alone; where a story states a capability whole it is CITED, because the
  aggregation happens in the index (`aof work memory ingest`) and a restatement would make every recall
  dedupe one fact.
-->

## Delivered

### The hill-climbing loop is closed
The raw material aof accumulates about itself — retrospective lessons, run lineage, observability
readings — now has a consumer. `aof work tune` is the first path from that material to a named harness
change, and the loop that was open at exactly the point where it would close is closed at that point.

### The pass says something about this repository, and says it completely
Run over its own corpus at accept, `aof work tune` emits **63 proposals**, both lanes populated
(62 advisory, 1 tunable on `work.loop.reviewRounds`), **every** proposal carrying at least two distinct
resolved source documents and a measured distance, at exit 0. This is the one property no suite over
fixtures could establish, and it is a standing condition rather than a recorded figure: the control
re-derives it from the corpus as it stands on every run.

### The proposer ships with no acceptance rule of its own
62 was sequenced after 61 and holds no second opinion about when a change may be believed: the tunable
lane's verdict is obtained by invoking `work:acceptor` and by no other means (`m62/04`), and no module
in the family carries 61's ruling vocabulary, thresholds or arithmetic. The configuration the
self-evolving-agent literature measures failing — a proposer that can also decide — is not reachable
here, and is not reachable by falling back either: a registry that refuses the acceptor makes the lane
report a construction failure rather than compute its own verdict.

### What stands between a proposal and a commit is measured, not asserted
Across the whole emitted set the answer is 5 distinct obstacles, and the largest is a fact about this
harness rather than about the loop: **3 tunable knobs are declared on the arbiter's tuning edge, and 0
of them reach a decision site** — every one is resolved and then discarded, or composed into an object
nobody reads. The tuner's first honest finding is that this repository's declared knobs are not yet
wired to anything that decides.

### The generated half is separated from the applied half by a locked level
Proposals are data at every point in the arc. No path applies one, the only write in the arc stays 61's
store, and the L2 diff is rendered for a human to accept (`m62/04`). What ships is a proposer whose
output must still earn its commit.

### Nine controls that have each been observed failing
Every structural invariant this milestone declares is enforced by a control that has been broken, run,
seen red for its stated reason, and reverted — recorded per control in `VERIFICATION.md`. Two of those
probes found defects no green run had, which is the only evidence the register is armed rather than
merely populated.

## Assumptions

- **The corpus is this repository's own** — floors of 196 lesson sections, 30 run records and 3
  observation readings are calibrated to a tree of this size and history; a fresh repository clears no
  floor and every lane reports `tune-ran-on-nothing` rather than a clean result.
- **The advisory lane is where almost everything lands today** — 62 of 63 proposals are advisory,
  because the arbiter declares three tunable keys and the corpus's recurring classes are mostly about
  story sizing. The tunable lane is non-empty but thin, and that ratio is a fact about the current
  tuning edge rather than about the proposer.

## Gaps

### No auto-apply, and no L3
- **Status:** open
- **Discharge condition:** L3 is unlocked and an application path exists that goes through 61's
  acceptor, stays outside 55's frozen set, logs every application to the run store, and is reversible.
SPEC scoped auto-apply in; the milestone ships without it, deliberately and not by omission. Cited
whole at `m62/04`.

### No consumer for any tunable knob
- **Status:** open
- **Discharge condition:** an admitted knob has a resolved value that reaches a decision site.
The distance report measures 3 knobs examined and 0 consumed at HEAD, so **no proposal this milestone
can emit is currently capable of reaching a commit** even with a human accepting it. The proposer is
complete and its subject is not yet wired. This is owned outside this milestone and is reported by the
tuner itself on every run rather than being recorded only here.

### Run attribution is absent, so one prerequisite limb cannot be measured
- **Status:** open
- **Discharge condition:** accepted items exist whose consumed runs carry attribution.
`roundsToAccept` reports `accepted-items-absent` over 61 examined run records with 0 attributed, so
limb (b) reports `unknown` — the question could not be asked — rather than a number. Milestone 61
recorded the same join failing from the other side.
