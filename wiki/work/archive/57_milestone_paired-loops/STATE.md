---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 57 · Paired loops — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

| story | status | contract |
|---|---|---|
| 57/00 the watcher node | done | accepted 2026-08-27 — 207 tests green, FF-5701 armed on five probes |
| 57/01 independence and the gate | done | accepted 2026-08-28 — 99 tests green, FF-5702 and FF-5703 each armed on four probes |
| 57/02 Examples rows in the parser | done | accepted 2026-08-27 — the widening measured against real pre-story bytes over 803 files, FF-5704 armed on four probes |
| 57/03 the contract-integrity ratchet | done | accepted 2026-08-28 — six task contracts green, FF-5705 armed on six probes (plus four for the gate's amendment) |
| 57/04 escape and intervention counters | done | accepted 2026-08-28 — both counters read records already on disk and refuse a zero they never measured |
| 57/05 the pairing table | done | accepted 2026-08-28 on its second pass, FF-5707 and FF-5708 armed on five and ten probes |
| **57 milestone** | **done** | **accepted 2026-08-28 on its second gate pass** — full suite 7,066 / 42, none of the 42 attributable here; eight declared controls landed and red-probed across 49 probes |

## Notes & decisions in flight

<!-- Compacted at accept (2026-08-28). The durable decisions live in ARCHITECTURE.md's seven ADRs and
     the lessons in RETROSPECTIVE.md; the delivered state is in OUTCOME.md. What remains below is the
     shape of the milestone as it ran — the two facts a later reader needs that no other document
     states, and nothing else. The build-by-build narrative is archived. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`; **refined
  2026-08-27** into seven ADRs, eight declared controls, six stories and twenty task features, under
  `--autonomous`, with nothing blocked.

- **The measurement that opened and closed the milestone, unchanged in method.** At refine,
  `aof work loops validate` reported 39 findings, all `warn`, three of them `loop-unpaired-optimizer`
  (`loop:build-to-green`, `loop:review-fix-rereview`, `loop:autonomous-cascade`); the other four loops
  declare `optimizing: false` and were out of scope by their own declaration. At accept the same
  command over the same registry reports 39 warnings, **0 errors, exit 0, and zero unpaired
  optimizers**. Same count, different composition — the three unpaired lines are gone and three
  inherited honesty warnings on the new watcher records stand in their place.

- **The one ordering edge held, and it was real.** ADR-007 §6 put 57/05 before 57/01's gate turned on,
  because all three optimizing loops were unpaired and a gate arriving first would have turned the tree
  red for work that was merely unfinished. 57/05 was declined on its first pass for shipping the
  watcher records without installing them — which would have made 57/01's gate land red on a tree the
  ordering edge existed to keep green.

- **Two default decisions that shaped the delivery, both recorded in ADRs and both still true.** The
  gate lives on `work:loops validate`'s exit code plus a step in `aof:validate`, editing neither
  `src/work.mjs` (262 dependents) nor `src/work-doctor.mjs` — the named cost is that an operator
  running only `aof work doctor` is not stopped, carried into OUTCOME.md as a gap. And the two
  non-build counters are readers over records milestone 20 already writes, so this milestone adds no
  instrument and writes nothing new to disk.

- **Boundaries were drawn on measured coupling.** `aof graph impact` over a graph built at refine
  (12,651 nodes, 30,994 edges) supplied every number in ADR-007's partition table. No two stories wrote
  the same file, and no merge conflict arose.

## Feedback (for retro)

<!-- ARCHIVED 2026-08-28 at accept. Every entry graduated: the five build-time notes were triaged into
     ARCHITECTURE (FF-5703's corrected sentence), into the story contracts they named, or into
     RETROSPECTIVE.md; the three gate-time notes became R1, R2 and R3 there. The section is left in
     place, empty, because its absence would read as "no feedback was raised" rather than "it has been
     carried". -->

_Archived at accept — see `RETROSPECTIVE.md` (R1–R5)._
- 57/ADR-007 declared 'the milestone's single ordering edge' but carried a second, unnamed one: the watcher kind (57/00) had to land before the pairing-table records (57/05), because a record declaring a kind the schema does not admit is loop-unknown-key. A partition that names one edge and has two is how a story starts against a schema that is not there yet. Found at 58's refine, which has the same schema-records-gate shape and names both edges in its own ADR-007 §5. — Raised by: architect

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — every story's own lane green; the full lane run twice at the gate, 7,066 pass / 42 fail with an identical failure set, and none of the 42 attributable to this milestone (`VERIFICATION.md` attributes each)
- [x] Fitness functions green — all 8 declared controls landed, none carrying `pending`, each red-probed: FF-5701 (5), FF-5702 (4), FF-5703 (4), FF-5704 (4), FF-5705 (6+4), FF-5706 (7), FF-5707 (5), FF-5708 (10)
- [x] `@manual` signed off — no `@manual` and no `@uat` lane exists in this milestone's contracts; all 22 scenarios are `@executable` and there is no DESIGN surface
