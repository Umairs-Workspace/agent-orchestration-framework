---
type: story
doc: retrospective
number: 05
parent: 126
slug: the-warning-has-one-home
title: "Retrospective — the warning has one home"
created: 2026-09-10
updated: 2026-09-10
---
# 126/05 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A SUBTRACTION still moves everything pinned to the location it subtracted

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** product-owner · **Raised by:** four delivered controls, at build

**What happened.** Folding two copies of one `resolveSqlite` body onto a single leaf removes code and
adds no capability — at the tree level it is the smallest change this milestone contains. It
nonetheless moved four things that had been pinned to the old location: a control that pinned the
dynamic `node:sqlite` import to `src/global-work-store.mjs`, a frozen import list on
`src/effects/journal.mjs`, an assignment-sink reach ceiling that counts NODES, and a line ratchet
that had to be paid by trimming a comment. None of the four was in the story's declared `files:`.

**Why.** A write set is derived from where the new code will LIVE. A move's blast radius is where
the old code lived — every frozen set, byte-pin, reach ceiling and line ratchet that names the
departure point. Those two are different questions, and refine only ever asks the first.

**Lesson.** For a story that MOVES a symbol rather than adding one, enumerate the controls that name
its OLD home and declare them, because the wave planner trusts `files:` and a concurrent lane would
otherwise write the same ratchet without having declared it. This is the fourth measurement of the
same gap in one milestone — `F-05`, `F-07`, `F-15` and now `F-17` — which makes it a property of the
declaration rather than of any one refine. **Refs:** `@finding-F-17`, `ARCHITECTURE.md#ADR-008`.

## R2 — A suppression sweep's `test/` exclusion is load-bearing, and it means the behavioural suite must BUILD its child's environment

- **Kind:** blocker · **Area:** testing · **Stage:** build · **Owner:** architect · **Raised by:** the builder, at the contract beat

**What happened.** Sixty files under `test/` set `NODE_NO_WARNINGS` on the CLI children they spawn,
and three also pass `--no-warnings`. Every CLI integration test in this repository is therefore blind
to the `node:sqlite` warning BY CONSTRUCTION: revert the leaf entirely and not one of them goes red.

**Why.** The sweep deliberately excludes `test/`, because a harness suppressing its own child's
warnings is a legitimate choice. The consequence is that the tree's biggest population of
real-process runs cannot witness the thing the story delivers, and a suite that inherited its
environment would have proved nothing while looking like a live check.

**Lesson.** When a control's swept roots exclude a tree, ask what that tree was doing in the excluded
region before concluding the exclusion is free. Here the answer decided the test design: the
real-runtime leg and the stderr scenario each run in a child whose environment the suite BUILDS
rather than inherits. Whether those 63 files' flags are now retirable is a separate question and is
recorded rather than answered. **Refs:** `@finding-F-20`, `ARCHITECTURE.md#ADR-008`.

## R3 — A directory budget row that asks for a family gets another root sibling until the move is its own item

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** the shrink-only directory ratchet

**What happened.** `src/` gained `sqlite-runtime.mjs` as a root sibling, and the budget row's stated
want — a family directory — was declined for the second time in this milestone (`126/02` declined
`src/loop/` on the same grounds). `global-work-store.mjs` has 109 dependents; re-pointing them is the
whole of the work, and none of it is this story's subject.

**Why.** The refusal is right and the row is right, and they are answering different questions: the
ratchet asks whether the tree is drifting, and the story asks what its own blast radius is. Both
answers are correct at once, which is why the refusal has to be written down rather than merely
taken.

**Lesson.** Record the refusal in the budget table itself, with the dependent count that justifies
it, so the next story to meet the row reads a decision somebody took rather than a drift nobody
noticed. Two refusals in one milestone name the item that should exist. **Refs:** `@finding-F-18`.
