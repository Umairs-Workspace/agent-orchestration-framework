---
type: story
number: 03
slug: the-contract-integrity-ratchet
title: "The contract-integrity ratchet — the build loop's counter-metric, and a refusal when it has no baseline"
parent: 57
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The contract-integrity ratchet

## User story

As the operator of a build loop whose metric is *scenarios green* and whose actuator is an agent that
can edit the scenario,
I want a number, produced by code and not by a model, that says whether the acceptance criteria got
smaller while the code was being made to pass,
so that the loop's most obvious cheat — move the contract to fit the implementation — stops being
invisible, and stops depending on whether a reviewer happened to look.

Spike 56 settled what this counter is and, just as usefully, what it is not. Coverage-delta was
built, measured and **rejected**: 87% of arch tests execute zero production code, and the one story
measured scored 100% changed-line coverage over sixteen lines of frozen constants. A judge was
refused on the structural argument. What survives is a ratchet over the contract itself: did the
executable scenario count fall, did a closed invariant get relaxed, did a marker appear that skips a
test that used to run.

56 was equally clear about the limit, and this story inherits it as a design constraint rather than a
disclaimer: **the ratchet detects movement, not guilt.** It cannot separate legitimate repair from
gaming, and 56 established that no cheap signal can. What it can do is separate *an acceptance
criterion got smaller* from *a test changed* — 93.9% of production commits versus 8.5%, an eleven-fold
reduction — and route the disposition to a node the optimizer does not control.

## Tasks

- [x] `tasks/00_the-base-commit-or-nothing.feature` — the base commit is the commit at which the item went in-progress, and an unresolvable one is a refusal rather than a guess
- [x] `tasks/01_the-contract-may-not-shrink.feature` — leg (a): the executable scenario count may not fall, counting Examples rows as the criteria they are
- [x] `tasks/02_a-closed-set-may-not-be-opened.feature` — leg (b) and its compensating-assertion exemption, with an honest third answer for what the rule cannot classify
- [x] `tasks/03_a-skipped-test-is-a-fire.feature` — leg (c): a skip, only or todo marker added to a test that already existed
- [x] `tasks/04_discharge-by-pre-existing-authority.feature` — a fired leg clears only against an ADR that existed before the work started, and never against the weakened artifact's own comment
- [x] `tasks/05_the-citation-must-be-pre-existing-and-owned.feature` — `@bug` / `F-57-03-1`: the citation is read at the base commit and must name the owning item, so the comment written with the weakening is never an input and a bare id never clears

## Notes

- **The refusal in task 00 is the story's spine, not an edge case.** ADR-004 §4. A counter that
  invents its own baseline is worse than no counter, because it reports a number. Shallow clone,
  unborn ref, a record never committed at `in-progress` — all yield a coded refusal and **no legs
  computed**. There is no fallback to `HEAD~1`.
- **Leg (d) is a leg, not a footnote.** ADR-004 §1. 56's review found that both of the sharpest
  instances of leg (b) added a compensating assertion in the same hunk, so leg (b) without (d) fires
  on every legitimate count-to-bijection conversion. It is computable from the diff the counter
  already reads, with no model and without reading any justification comment.
- **Discharge is scoped three ways and all three matter.** ADR-004 §5: the ADR id **cited by the
  weakened artifact**, resolved in the **owning item's** `ARCHITECTURE.md`, **at the base commit**.
  56's review measured that the rule reads false repo-wide and would clear virtually every weakening
  if left unscoped.
- **The ratchet never reads the justification comment inside the weakened artifact.** That comment is
  the optimizer's own output. A watcher that reads it is re-coupled to the maker — which is the exact
  failure this milestone exists to close, reappearing one level down.
- **Three answers, not two.** `fired` / `discharged` / `unclassified`. ADR-004 §2: anything the
  closed-set rule cannot classify is reported as unclassified and counted as neither. A silent pass
  on an unparseable assertion is how a ratchet quietly stops ratcheting.
- **No precision claim ships in the output.** ADR-004 §7. 56 measured ~89% file-level over **n=8
  commits from a single milestone**, not covering the compensating-assertion shape, and said to treat
  it as indicative rather than as a rate. The command does not restate it as one.
- **The module is pure and the git reads live at the face.** `FF-5705`. Everything arrives as a
  parameter — the diff, the two trees' feature texts, the owning item's ADR register at the base
  commit. This is 53/ADR-007's injected-observation shape, already in service.
- **Both files are new, so this story has zero merge surface.** ADR-007 §7. It imports 57/02's
  widened parser and `executableScenariosOf` and edits neither.
