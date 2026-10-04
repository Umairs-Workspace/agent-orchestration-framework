---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 136 · Discovery questions in the loop — State

## Progress

- [x] broken down at refine, 2026-10-03: two stories in one wave (ARCHITECTURE ADR-003)
- [x] 01 a loop answer anchors the example — built and reviewed 2026-10-03 (solo), in-review
- [x] 02 a driven refine asks through the loop — built and reviewed 2026-10-03 (solo), in-review
- [x] 03 a pending ask is read from the hook — added and built at verify 2026-10-03/04, after the
  live run on the test-bed timed out twice in front of a question the loop never saw (ADR-004)
- [x] accepted 2026-10-04 at `aof:verify 136`: all three stories done, the live run green

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the third of three drivers. It is
  kept apart from 134 so that interactive discovery ships without waiting for 131.
- **Small by design.** If 131's refine shows its ask path already carries everything this needs, 136
  may reduce to one story. Refine decides that, not this framing.
- **Refined 2026-10-03 (`aof:refine 136 --autonomous`, solo).** 131 already carries a driven
  `AskUserQuestion` to the operator, waits in that lane and resumes the session with the answer;
  the missing link is that the answer never reaches 134's collector. Two stories, not one: the
  reader (code) and the ask (prose) have no shared file. Default decisions taken, all technical:
  - one token per ask in a driven session, so a cascade asks its questions one after another
    (ADR-002 §2);
  - a question carrying two tokens anchors neither (ADR-001 §2);
  - the ask's answer is read where 131 wrote it and never stamped a second time (ADR-001 §4).
- **SPEC drift, noted not edited.** The SPEC puts answering from Discord out of scope because 131
  deferred it; 131 later shipped answer-by-reply (131/09–12). Whether that answer may confirm an
  example is asked as 136/01 Q1, not assumed.
- **136/01 Q1 answered 2026-10-03 by the operator at the end review: all three channels count**
  (terminal, board, an allowlisted Discord reply). ADR-001 §5 records it; E6 and E7 are `stated Q1`.
- **Graph:** built 2026-10-03T17:18:10Z, code only, no egress. `refine.md` is not covered (prose).
- **Continued 2026-10-03 (`aof:continue 136`, solo by the operator's choice).** Built on a local
  branch `136-discovery-questions-in-the-loop` stacked on `134-discovery-example-map` (136 depends
  on 134, which is not on main yet). One wave, both stories inline, review lenses played in this
  session; no Blocker in either story, so one round each.

## Verification

- [x] `@executable` suite green — story lanes, the importer sweeps and the whole-tree gate at
  `0aec7fcd` (red only on accepted drivers left at the root; REGRESSION.md)
- [x] `@manual` signed off: one live loop-driven discovery question, answered — 2026-10-04 on the
  test-bed (08/00 Q1, answered `… inside max`, anchored; VERIFICATION evidence)

## Feedback (for retro) — archived 2026-10-04

Graduated into `RETROSPECTIVE.md` (milestone R1-R3) and the stories' own `RETROSPECTIVE.md` (01 R1-R2,
03 R1-R2; 02 surfaced nothing beyond 135/R1, which 01/R2 cites). The FF-11903 note became F-136-01,
02's lock omission is 01/R2's pattern, and the FF-13601 probe note is the red probe in
VERIFICATION. The blow-by-blow is in git history (`bc85bcba`).
