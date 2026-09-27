# 124 · The edges aof does not draw — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The declared graph is measured, and the instrument says how much of it it read
The `depends:` graph is checked for whether an edge is witnessed, not only whether it resolves,
and the check states its own denominator every run — `m124/00` delivers the lane, the one-home
predicate it rests on and the class ratchet that keeps it advisory. What is new at the milestone
level is the posture: an aof instrument over this stream now reports the share of its subject it
could not evaluate (182 of 230 edges) in the same breath as its findings.

### Two of the three return paths reach their node; the third is dropped with a trigger
Cap exhaustion hands a unit back to the plan that produced it and the range keeps running
(`m124/01`); the outermost splitter recalls memory before it cuts (`m124/02`). The SCOPE line on the
correction return is not built: `ARCHITECTURE.md#ADR-004` records that its grounding premise was
false and that the correction cycle has completed 0 times in 90 run records, and states the command
whose non-zero answer reopens it.

### The parallel wave and the census read one coverage rule
`src/story-contract.mjs` is the single home for what a story declares and what covers what; the
wave (`src/ready-wave.mjs`) and the census lane (`src/work/doctor-depends.mjs`) both call it and
neither carries a second rule (`m124/00`).

### The fitness lane and the citation sweep read the tree as it is
`scripts/test-rubric.mjs` sweeps `test/arch/**` recursively (`m124/00`), and FF-11903's citation
sweep reads authored documents only — an item's `runs/` and `observability/` subtrees are excluded,
because they persist the instruments' own output and had jammed the ratchet at a count no document
repair could lower (`m124/F-01`). Its shrink-only ceiling stands at 47, re-measured at accept.

## Assumptions

- **The census's domain is story→story** — `reads:`/`files:` exist on `STORY.md` alone; every other
  edge is counted and named as unreadable, never inferred.
- **`work:loop` scopes to a driver or a range** — a derived plan ref always shares its unit's driver
  number, so the out-of-scope halt is reachable only by a direct call with a disagreeing parent.
- **The rename map is prospective and squash-blind** — a move squash-merged with a rewrite below
  git's 50% similarity is recorded as delete-plus-add, and no reader of the map can see it
  (`m124/F-03`).

## Gaps

### The SCOPE line on the correction return
- **Status:** open
- **Discharge condition:** the command in `ARCHITECTURE.md#ADR-004` reports the correction cycle
  completing at least once in a recorded run, so a change to that path is attempt-evidenced.
Nothing bounds a correction to the failing unit; the seam is `composeFixInput` in
`src/commands/drive.mjs`, and no run record has ever carried a completed correction brief.

### The engine's own cycle cap
- **Status:** open
- **Discharge condition:** `TECH_DEBT.md` item 91 — see `m124/01`'s gap of the same name.
The pure decider is told no cycle on the `nextDecision` path; the shell's counter is the cap that fires.

### Fictional paths in the citation sweep
- **Status:** open
- **Discharge condition:** a ruling that lets an authored document cite a path that never existed —
  a fixture, a counterexample, a proposed module — without it counting as a stale citation.
FF-11903 cannot separate the two; this milestone's own architecture cites a retired-module
counterexample that is one of the 47 (`m124/F-02`).

### Five accepted registers cite pre-move control paths
- **Status:** discharged
- **Discharge condition:** the six `enforced by` cells in milestones 52, 53, 70, 71 and 72 resolve.
Discharged at this milestone's accept by re-pointing the six cells to the moved controls; FF-6607b
and the doctor's `control-unresolved` are clean over them. The rename map itself is still
squash-blind — see Assumptions and `m124/F-03`.
