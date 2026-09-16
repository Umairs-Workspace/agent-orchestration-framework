---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 61 · The disciplined acceptor — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

**All seven stories are `done` and the milestone was accepted 2026-08-31.** Landing order was
**{61/00 || 61/01 || 61/02 || 61/03} -> 61/04 -> 61/05 -> 61/06** (ARCHITECTURE.md
ADR-012), repartitioned from six stories to seven at refine after the feasibility pass.

| story | stage | status | subject |
|---|--:|---|---|
| 61/00 | 1 | done | the clamp — one ceiling lands; the two-bound key is refused, not invented |
| 61/01 | 1 | done | the epoch, the frozen criterion, and the ruling selector |
| 61/02 | 1 | done | the observation census — a count that says what it filtered |
| 61/03 | 1 | done | no executed consumer, no proposal |
| 61/04 | 2 | done | the rule and the ledger — one commit condition, derived |
| 61/05 | 3 | done | the event a ruling raises, its seam and its store |
| 61/06 | 4 | done | the acceptor's face — report-only, every applicable refusal reported |

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken
  together as one arc.
- **Refined 2026-08-30** (`aof:refine 61 --autonomous`). Spike 60 is `done` and its finding is this
  milestone's input; 55, 57 and 59 are all `done`. Memory recall returned an empty block. The
  codebase graph was rebuilt clean (13,394 nodes / 32,666 edges, egress none, 2026-08-30T11:51:20Z)
  and every story boundary below is drawn on `aof graph impact` coupling.

### Default decisions taken at refine (documented, reversible)

- **D-61-1 — declaring floors and ceilings for the three admitted knobs is IN scope**, and no
  separate chore is raised. Spike 60 flags this as a conflict with this SPEC's own out-of-scope
  clause ("what may be tuned at all — 55's frozen set draws that line"). The reading taken: 55
  decides *which* knobs may be tuned; 61 declares the *range* each may move within, because
  "bounded step within declared floors/ceilings" is already an in-scope bullet and a step cannot be
  bounded against a ceiling that does not exist. 55's line is enforced here, not redrawn. Reversible
  — if the operator disagrees, the clamps lift out into their own chore and the story that carries
  them is dropped.
- **D-61-2 — 61 does not own the observation-series prerequisite.** Populating `sessionId`,
  giving an instrument an append-only observation log, and making `continue.md` read
  `work.loop.reviewRounds` are named in spike 60 as "the prerequisite neither 61 nor 62 owns". This
  milestone ships the gate and the gate reports, honestly, that it cannot fire. What 61 does own is
  its **own** evidence ledger — the record of rulings, accruing across epochs — because the commit
  rule cannot exist without one. Report-only is the permanent steady state, not a waiting room
  (spike 60 §5), and the surface must distinguish "4 rulings, threshold 8" from "this knob yields
  under one discordant pair per epoch".

### Amendments made during the same refine session

- **D-61-1 AMENDED — the range was declarable for two knobs, not three.** The decision stands as
  taken (declaring floors and ceilings is 61's scope, and 55's line is enforced rather than redrawn),
  but the developer's feasibility pass changed its outcome. `work.autonomous.maxAttempts` resolves to
  **two unrelated bounds** — an attempt ceiling (`src/commands/run-retry.mjs:33`) and a per-(ref,
  phase) drive-cycle ceiling (`src/commands/loop.mjs:706`) — in different units, exhausted by
  different events. A one-notch step moves both at once, which ADR-001 §4 already forbids as
  compound, so **no range is declarable for it** and inventing one would have been this milestone's
  own p-hack wearing a clamp. It is refused `step-would-be-compound`, it stays proposable, and the
  conflation is ledgered as **TECH_DEBT item 76** rather than repaired here. Only one clamp actually
  lands: `work.loop.buildNoProgressRounds`.
- **ADR-001's commit predicate was corrected mid-session.** The first draft made commit a conjunction
  (`E >= 1/alpha` at `N` pairs **and** all-favourable) while also promising a losing proposal could
  recover at 10-1 — which the conjunction made unreachable. The Three Amigos pass on the rule story
  caught it. Resolved by making the predicate **one leg**: commit the first time `E >= 1/alpha`,
  evaluated after every pair, truncated at a declared and frozen pair budget `B` (day-one 11).
  "Eight all-favourable" is the earliest crossing, not a second rule. The correction is priced in the
  ADR: type-I doubles from `2^-8` to `2^-7`, so the rule is 6.4x more conservative than the process
  it truncates rather than 12.8x.
- **Repartitioned six stories to seven.** The observation census was lifted out of the terminal face
  story into its own stage-1 story: it reads the effects journal and is coupled to neither the rule,
  the ledger nor the command surface, so sitting behind all three put stage-1 work on the critical
  path for nothing.
- **`work.doctor.budgets.architecture` raised 1200 -> 1400.** The corrections above added roughly 105
  lines of derivation and alternatives; the architect compacted about 40 and reported that cutting
  the remaining 67 meant deleting substance the contracts cite directly.

### Still open, and deliberately so

- **The instruments have nothing to write to.** Every m55/57/59 instrument is pure recompute (0
  persistence calls) and the run record carries `sessionId` in 0 of 61. The acceptor ships anyway
  and says so; closing it is a separate piece of work that gates 62's auto-apply, not this
  milestone's contract.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — 7,863 / 7,863 unit + 131 / 131 integration (`VERIFICATION.md` § Verification evidence)
- [x] Fitness functions green — 13 / 13, each also observed failing under a deliberate break (`VERIFICATION.md` § Fitness functions)
- [x] `@manual` signed off — **not applicable**: all 26 task scenarios in this milestone are `@executable`, and there is no `@manual` and no `@uat` lane, so no `UAT.md` was raised

## Closure record (compacted at Accept, 2026-08-31)

**Accepted 2026-08-31** — all seven stories and the milestone, through `aof work status`. The accept
decision, the evidence and the findings register live in `VERIFICATION.md`; what the milestone now
delivers lives in `OUTCOME.md` and in each story's; the process lessons live in `RETROSPECTIVE.md`
(`R1`–`R7`), and were folded into recall by `aof work memory ingest`.

**The blow-by-blow feedback lane has been archived.** It ran to roughly 770 lines across
`61/00`–`61/06` and every lesson in it has graduated: seven into `RETROSPECTIVE.md`, the durable
decisions into `ARCHITECTURE.md`'s ADRs (ADR-013 supersedes ADR-010 §2 on membership and order),
the two deferred defects into `TECH_DEBT.md` (item 76, the `maxAttempts` conflation; item 77, the
two-subject construction code), and the review findings into `VERIFICATION.md`'s register. Nothing
that was only in the lane is only lost — the git history carries it whole, and the pointers above
carry what a later reader needs.

**Two findings stay open by decision** — `D-61-5` (ledgered as `TECH_DEBT` item 77) and `D-61-7` (the
observed yield has no producer, stated as a declared gap on `OUTCOME.md`). Both are non-blockers, and
both are recorded where a later reader meets them as declared state rather than as a surprise.

**Carried forward to 62.** The gate is complete and can rule; nothing produces the observations it
weighs. `D-61-2` above stands unchanged as the reason, and the milestone's `OUTCOME.md` § Gaps states
the discharge condition. 62 is what walks up to this gate; 63 is what triggers it.
