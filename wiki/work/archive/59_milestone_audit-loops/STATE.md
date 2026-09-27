---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.

  COMPACTED 2026-08-30 at Accept. The `## Feedback (for retro)` section — sixteen build and review
  reports across five stories, roughly 490 lines — has been ARCHIVED: every lesson in it graduated to
  `RETROSPECTIVE.md` (R1–R16), every defect to `VERIFICATION.md` `## Findings`, and every durable
  decision to an ADR in `ARCHITECTURE.md`. What remains below is the closure record and the decisions
  a later reader needs without reading the milestone's diary.
-->
# 59 · The audit loop — State

## Progress

**CLOSED 2026-08-30.** Five stories, twenty-two task contracts, eleven declared fitness functions.
Broken down and fully contracted 2026-08-29 (`aof:refine 59 --autonomous`); landing order
**{00 ‖ 01} → {02 ‖ 03} → 04**, which held.

- [x] **00 · the-auditor-kind** — accepted 2026-08-29. 5 tasks, 129/129. Sole writer of `src/work-loops.mjs`.
- [x] **01 · the-instrument-census** — accepted 2026-08-29. 4 tasks, 49/49. Sole writer of `src/work-audit/{census,spawn}.mjs` and the registration gate.
- [x] **02 · evidence-re-run** — accepted 2026-08-30. 4 tasks, 58/58.
- [x] **03 · staleness-silence-and-the-prune** — accepted 2026-08-30. 4 tasks, 93/93.
- [x] **04 · the-audit-face** — accepted 2026-08-30. 5 tasks, 87/87 — the fifth task is the `@bug` contract for D-59-3, raised and fixed at the verify gate.

**The close.** Verify ran in three stages: 59/00 and 59/01 on 2026-08-29; 59/02, 59/03 and the probe
sweep on 2026-08-30; then 59/04 and the milestone once two blockers the gate found were fixed inline.
All eleven controls resolve, are green, and were each observed RED under a probe applied to the
working tree and reverted. Full assembled suite **7,492 / 7,493** (one named exclusion,
`global-work-propagation`, which binds the live daemon's port; the single failure adjudicated as a
load artifact — D-59-7). `aof work validate 59` PASS; `aof work doctor 59` clean at error severity.

## Notes & decisions in flight

<!-- COMPACTED. The refine-time default decisions are kept because each names an ADR a later reader
     may want to argue with, and because two of them are places the milestone knowingly delivers less
     than its own SPEC implies. The mid-build blow-by-blow is archived. -->

Shattered 2026-08-13 from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken together
as one arc.

### The default decisions taken at refine, and how they held

1. **`aof work audit` is this milestone's command; milestone 77 extends it** (ADR-002 §2/§4). Held.
   77 adds lanes to one home rather than a second command being born; the lane registry and the
   finding envelope it inherits are frozen by a control for that reason.
2. **58 added to `depends:`** — the reporting rule is only computable over `target-setting` edges.
   Held; the addressing is computed from those edges and asserted over the shipped registry.
3. **A sixth node kind rather than a flag on an existing one** (ADR-001). Held, and it earned its
   keep: a loop admits an `actuator`, so a flag would have given the auditor a vocabulary for acting.
4. **Anchor freshness is a hand-declared `checked:` date, not a derived one** (ADR-005 §3). Held, for
   the measured reason: no run record in this tree carries the anchor id it read, so the stronger
   join has no left-hand side. Still the known next step.
5. **Mutation tiers 3–5 deferred; 0–2 ship** (ADR-003 §1). Held. Spike 56 warned 4 and 5 are gated on
   agent turns, which nothing has measured, and scheduling them on the compute figure is the error the
   spike names.
6. **The cost ladder is NOT touched** (ADR-007 §1). Held, and it is the one place the milestone
   delivers less than the word "cadenced" implies: the audit is *declared* cadenced and *runnable on
   demand*, and the trigger that honours the cadence is milestone 63's.

### The refine-time measurements the partition rested on

- **27 imported bindings in `scripts/test.mjs` never spread** at HEAD on 2026-08-29 (26 suites plus
  `pathToFileURL`) — spike 56's headline finding still live a month on. Closed by 59/01, which also
  found a second population of six the census's first run surfaced.
- `aof graph build .` — 13,031 nodes / 31,815 edges at 2026-08-29T08:40:09Z. ADR-008 §1's coupling
  numbers are from that build.

### The three "still open" questions from refine, answered

- **Where the twenty-six re-armed suites land red.** Answered: two had rotted red while dead
  (`mesh-node-identity`, `mesh-registry-store-seam`) and both were repaired rather than ledgered.
- **Whether `work.audit.anchorStaleDays` default 90 is right.** Still unmeasured. The first real audit
  run reports three anchors read against it and none stale, which is consistent with 90 being
  uncontroversial and is not evidence that it is correct.
- **How this milestone's roles were played.** Refine ran the architect, PO, QA and developer passes
  **inline in the main session** rather than spawning them, despite `work.agents.mode: "orchestrated"`.
  The build and review lanes did run as separate agents, and they are what caught R6, R7 and R8 — the
  three most expensive structural defects — which is the strongest available argument that the refine
  pass was the weaker one for having been inline.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — every story's lane, and the milestone gate at **7,492/7,493**. 22 task contracts. See `VERIFICATION.md` `## Verification evidence`.
- [x] Fitness functions green — **11** declared, all landed, all green, all observed red under probe. Register: `VERIFICATION.md` `## Fitness functions`.
- [x] Findings triaged — 7 recorded, 3 closed (D-59-1, D-59-3, D-59-6), 4 open non-blockers carried to the backlog (D-59-2, D-59-4, D-59-5, D-59-7).
- **No `@manual` and no `@uat` lane.** Every scenario authored is `@executable`: the milestone's whole
  subject is deterministic machinery over files, records and child processes, and a lane that asked a
  human to confirm an audit would be the agent-as-judge arrangement ADR-007 §3 puts out of scope.
  There is therefore no `UAT.md`, and nobody was pestered for a sign-off that would add nothing.

## Feedback (for retro)

<!-- ARCHIVED at Accept, 2026-08-30. This section carried sixteen build and review reports across the
     five stories. Every lesson in it is now an `R<n>` in `RETROSPECTIVE.md`; nothing was dropped in
     the compaction, and the mapping is stated here so a later reader can find where a note went. -->

Archived — the lessons graduated to `RETROSPECTIVE.md`:

- The stale work-cache that blocked the milestone at the door → **R1**; the worktree publish that
  overwrote the control's rows → **R2**.
- The `files:` / `reads:` declaration failures, reported by four stories → **R3** (literal-set and
  registry-derived gates), **R4** (a discovered write set), **R5** (reads = contracts, not imports).
- The review lanes' structural catches → **R6** (a freeze stated as a directory, and its recurrence in
  a text-classifying sweep), **R7** (a character-keyed refusal), **R8** (a control pointed where its
  two variables never meet).
- The vacuous control found at the 59/03 merge → **R9**, and spike **82**.
- The two defects the milestone gate found in this milestone's own delivery → **R10**; the
  load-sensitive suites inside that gate → **R11**.
- The `--strict` reuse claimed wholesale → **R12**; the `in-review` / `done` loop boundary → **R13**;
  the three wrong shell measurements of one fact → **R14**; the mid-build numbers quoted as results →
  **R15**; the sole-writer crossing taken at verify → **R16**.

Open follow-ups live where they can be acted on, not here: `VERIFICATION.md` `## Findings` (D-59-2,
D-59-4, D-59-5, D-59-7), `TECH_DEBT.md` (items 69, 71, 74, 75), spike **82**, and the `## Gaps`
sections of this milestone's `OUTCOME.md` and its stories'.
