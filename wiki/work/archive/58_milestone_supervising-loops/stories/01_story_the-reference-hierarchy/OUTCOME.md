# 01 · The reference hierarchy and the arbiter — Outcome

## Delivered

### Every declared loop has a named owner for its reference
All seven `kind: loop` records in `src/bundle/loops/` carry an inbound `target-setting` edge, and
`loop-unowned-reference` reports zero over the installed registry where it reported five on the day
this story opened. Revising a loop's target is now a cycle with a named owner rather than an edit
somebody makes.

### The seven ownership edges, and what each one is
`actor:operator` sets the references of `loop:autonomous-cascade`, `loop:mesh-assignment-reclaim`,
`loop:retrospective-memory-ingest` and `arbiter:speed-thoroughness-autonomy`; `actor:product-owner`
sets `loop:verify-triage-accept`'s; `loop:autonomous-cascade` sets those of `loop:build-to-green` and
`loop:review-fix-rereview` — the slower loop above the faster one, which is the structural move the
milestone exists to make; and `anchor:run-lifecycle-policy` sets `loop:run-resilience`'s.

### An authored edge says in its own record that it was authored
Every record declaring an edge this milestone decided states so in its own body and offers **no**
citation for the relation it decided, while separating out the discovered fact underneath it. Every
record declaring an edge the repository already stated names the artifact it was read from. Which kind
an edge is can be answered by reading one record, without opening another file.

### The one reference no cycle revises is carried by an anchor
`anchor:run-lifecycle-policy` has `ground: frozen-rule` and `observes:
module:src/run-store.mjs#isLegalTransition`, so the authority behind `loop:run-resilience`'s reference
is a thing that resolves rather than a sentence written into a loop record to fill a gap. It is the
first `frozen-rule` anchor the registry carries.

### Every loop declares the timescale it runs at
Seven declared layers — one `governance`, two `management`, four `operational` — each corroborated by
its cadence's scope rank, with at most one uncorroborated and that one named and defended in its own
record. This is what made 52's timescale check able to decide anything: six of the seven loops have no
clock, so before the layer axis the check had nothing to compare.

### One arbiter owns the standing speed-versus-thoroughness-versus-autonomy trade-off
`arbiter:speed-thoroughness-autonomy` resolves the named conflict, vetoes all four contenders for the
three shared agent actuators, declares a `priority` that is a permutation of exactly that veto set, and
a `dwell`. Every `config:` endpoint of its `parameter-tuning` is cited as a `ceiling:` pointer by one
of the loops it vetoes. `loop-shared-actuator-unarbitrated` reports zero where it reported three.

### The records ship as bundle assets and land in a project
All 16 loop records are registered in `src/bundle/manifest.json`, and `aof work update` installs them:
`.aof/loops/` holds 16 records byte-identical to `src/bundle/loops/`, with 16 matching entries in
`.aof/aof.lock.json`. A record that lives only in the source tree is in no project's registry, and the
gate 58/02 turns on reads the installed copy.

### Every citation a shipped record writes resolves
59 in-repo path citations are in range, and every `` `<symbol>` at `<module>:<line>` `` claim names the
line that symbol is actually exported on — asserted by `FF-5810` over `src/bundle/loops/**` on both
legs, each probed red. The registry's value is that an authored edge is honest and a discovered one
cites; a citation nothing checked was the half that had already rotted.

## Assumptions

- **Five of the seven edges could not be discovered, only authored** — `RESEARCH §Q1` looked and found
  no artifact in this repository that sets those references, and three of them would trace to roles
  with no `actor:` node at all. The alternative to authoring them was inventing citations or minting
  role actors nobody consults. Each authored edge declaring itself authored is the only honesty
  available when the alternative is a fabricated line number.
- **`owner:` and the target-setting edge are different claims** — `owner:` names who is accountable for
  a loop, the edge names who sets its reference. Where a record declares both, `FF-5806` requires the
  actor named by `owner:` to declare the matching edge, so the two can never silently disagree.
- **The installed copies are written by `aof work update`, never by hand** — `.aof/loops/**` is a denied
  Edit/Write path in this repo's settings, so a hand edit is refused at the tool boundary rather than
  caught at review.
- **The arbiter's `priority` and `dwell` are declared, not executed** — nothing in milestone 58 commits
  an adjustment, so both state what must hold when a proposer exists (58/ADR-004 §1/§4). The knobs it
  names are real and its veto set is checked; what nobody does yet is act on the order.

## Gaps

### Sixteen citations resolve in range but describe something else
- **Status:** open
- **Discharge condition:** each is re-read against the line it names and either corrected or removed —
  reviewer work, because no cheap control decides it.
- `FF-5810`'s two predicates are in-range and defining-line, both computable without reading a line's
  CONTENT. That is deliberate: 52/ADR-013 routed content assertions out of the census as
  `not-black-box` because a guard asserting what a line SAYS reddens on every unrelated source edit. So
  `autonomous.md:14` being a blank line, `verify.md`'s cited range describing the wrong step, and
  `run-store.mjs:344-362` being a timezone helper rather than the frozen run-record shape all sit
  outside the guard. Two of the sixteen were written by this story. Recorded as `F-58-01-2`, deferred to
  `TECH_DEBT` item 68.

### The layer of one loop stands on its record's narrative alone
- **Status:** open
- **Discharge condition:** the loop gains a cadence carrying a scope ordinal, or a second independent
  corroboration for a declared layer is found.
- Where a cadence carries a scope ordinal the declared layer is cross-checked against it
  (`loop-layer-contradicts-cadence`), so a loop cannot declare itself slow to dodge an inversion. Where
  the cadence is a clock there is no ordinal to check against. `FF-5806` permits at most one such
  uncorroborated layer and names it, which bounds the exposure rather than removing it.
