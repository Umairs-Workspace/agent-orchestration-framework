# 70 · Warm start — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.

  AUTHORED, never a concatenation of the seven stories' outcomes. Every capability a story states
  whole is CITED as m70/NN, not repeated — the aggregation happens in the memory index, and a
  milestone that restates its stories writes one fact twice.
-->

## Delivered

### A phase spawn is handed its context by value — end to end, for the first time
The chain each story delivered in isolation now exists as one path: a compiled brief (`m70/00`) that
carries the phase's actual contract and architecture slice (`m70/05`, `m70/03`), launched behind a
deliberately shareable prefix (`m70/01`), crossing the PTY as one atomic input (`m70/06`), and landing
in a run record whose spend is read back as a per-phase cache ratio (`m70/02`). Before this milestone
the spawn brief was `{itemRef, worktreeCwd, task, command}`, every run record read `"brief": {}`, and
the prompt was `/aof:continue <ref>` — an instruction to go and rediscover the tree.

### The loop's economics are observable rather than inferred
`aof work observe <ref>` reports, per declared phase, the four token buckets, a priced cost, a
`cacheRead ÷ cacheCreate` ratio and a met/missed verdict against a configured target — and reports
`unmeasured` distinguishably from a warm phase that divided by nothing. Phase is read from
`brief.loop.phase`, never minted, so a run the loop shell did not mint reports as having no declared
phase instead of being silently pooled.

### The milestone's own thesis is falsifiable, and has been tested once
This is the state no single story delivers: the SPEC's baseline figures have a measured successor
taken through the production door (`m70/06`), so "warm start worked" is a claim that can be checked
rather than asserted. The first check does not confirm it — see Gaps — but the instrument exists, its
target is derived from a measurement, and the next check costs a run rather than a milestone.

### Four structural rules bind that did not exist before
`ARCHITECTURE.md` stays one artifact whose ADRs are addressable in place (`m70/03`, ADR-006); the
artifact budget refuses an accept rather than warning about it (`m70/03`, ADR-007); the reviewer is
structurally barred from resuming a build session (`m70/04`, ADR-008); and aof can never replace the
system prompt, which is the condition the cache flag's admissibility rests on (`m70/01`, ADR-004).

### The budget that refuses an accept was proved by refusing this milestone's own
ADR-007 is not a warning that was believed — it bound at this gate. Recording F-21's ADR-004 amendment
pushed `ARCHITECTURE.md` to 740 lines against its own 700-line budget, and the `→ done` transition
could not proceed until the document was compacted back to exactly 700 by giving up prose that had
stopped paying its way.

### Ten declared controls, each with a red probe that was observed failing
Every control in the register was planted against the live bytes, watched to fail with the message
quoted, and restored byte-identically. Seven of the ten **extend** a guard already in service, where
the red probe is the only evidence the extension is armed at all.

## Assumptions

- **The cache flag applies because aof appends its system prompt** — verified against the installed
  binary, and made structural by FF-7004 rather than left as a property of today's argv.
- **A phase is a separate process, so per-phase model and effort routing costs nothing cache-wise** —
  true of aof's spawn model specifically, not of a single long-lived session.
- **The reviewer is cold on purpose** — the largest remaining saving is deliberately unbanked, and
  `m70/04`'s control is what stops it being taken by accident.
- **One measured run is a datapoint** — every figure derived from the measurement carries n=1 (n=2 on
  the after side's per-agent rows), and the milestone's conclusions are bounded accordingly.

## Gaps

### Whether warm start paid for itself is still unanswered
- **Status:** open
- **Discharge condition:** a matched-workload per-agent before-and-after, taken in one repository on
  comparable work.
The milestone can now measure itself and has done so once; that measurement is confounded by workload
and repository and cannot settle the question. The objective — answering a 927,588-token spawn with a
~2,000-token brief — is delivered as mechanism and unproven as effect. `m70/06`'s Gaps carry the
detail; `m70/F-22` carries the human verdict that produced this entry.

### The saving is measured in a fixture repository, never in this one
- **Status:** open
- **Discharge condition:** a production milestone driven through `aof work loop` in this tree, leaving
  run records that carry `spend`.
No milestone in `wiki/work/` has a run record with a spend envelope: 67–70 were built by hand in
interactive sessions, which mint nothing. `m70/04`'s own "the saving is not measured anywhere" gap is
the same absence seen from the fix loop's side and remains open for the stronger reason that no
fix-against-build pair has been measured at all.

### The brief's quality is unmeasured, only its size
- **Status:** open
- **Discharge condition:** evidence that a phase given a brief performs better than one that
  rediscovers the tree — a resolution-rate or turn-count comparison, not a byte count.
Every measurement this milestone takes is of cost. That less context is also *better* is carried on
the SPEC's cited external results (SWE-agent, Chroma), not on anything observed here.

### The architecture register is condensed hardest at the phase that most needs it
- **Status:** open
- **Discharge condition:** a phase-aware budget share for the register at `refine`, or an accepted
  statement that a refine brief carries structural constraints by reference.
Median retention is 0.86 at `verify`, 0.60 at `continue` and **0.38** at `refine`. Nothing is dropped
or husked and no contract is breached. Recorded as `m70/F-20`.

### Two operator-facing config surfaces are undeclared and undocumented
- **Status:** open
- **Discharge condition:** `work.agents.session` and `work.observability` are declared in
  `schemas/aof.schema.json` and named in `README.md`, and a malformed value is reported by a
  diagnostic rather than being indistinguishable from an absent one.
Both keys are read in production and neither is validated anywhere; `aof project doctor` reports
`config-valid` regardless. Recorded as `m70/F-07` and `m70/F-09`.

### The repository's red test baseline is unowned, and it hid a real regression
- **Status:** open
- **Discharge condition:** the inherited failures have an owner and a ledger the runner diffs against,
  so a new red is distinguishable from an expected one without hand attribution.
**45 of this milestone's final 46 gate failures are inherited** from before the branch existed. Every
gate had to attribute them by hand in a detached worktree to find the ones that mattered — and F-13
is the case where a genuinely new violation hid inside an already-red control. Recorded as `m70/F-18`.
