---
type: story
doc: retrospective
number: 05
parent: 131
slug: the-board-shows-the-question-and-takes-the-answer
title: "Retrospective — the board shows the question and takes the answer"
created: 2026-09-25
updated: 2026-09-25
---
# 131/05 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A render finds what a green suite cannot: the card would never have tracked its answer

- **Kind:** defect-found · **Area:** ui · **Stage:** build · **Owner:** developer · **Raised by:** task 04's `@manual` render

Every `@executable` case was green, but the render showed a product gap. The board re-fetched its
list only while an item was executing or a resync was watching. A lane's run record lives in its
worktree, so the primary's probe never sees it, and a shown card would never have left with its
ask. `Board.tsx`, outside `files:`, now arms the silent poll while a row carries an ask. The same
render also caught a heading that wrapped at 1280. Both were fixed and re-rendered in the story.

**Lesson.** A UI story's render is a behavioural check as well as a visual one. Drive the state
change end to end (answer, then poll, then the receipt leaves), not only the static frames, because
the refresh policy lives outside the component.

**Refs:** `m131/F-131-09` (the quiet-board half, left open).

## R2 — A diff-range scenario needs a commit plan at refine

- **Kind:** process · **Area:** contract · **Stage:** verify · **Owner:** product-owner · **Raised by:** the verify gate

Two scenarios read `git diff` "from the story's base to its last commit". The milestone was built
solo in a shared tree with nothing committed, so the story held `in-review` through the first
verify. It was accepted only after 131 was committed in ranges, with 05's range isolated by
building each commit in the index (`F-131-07`). The pin file's range also carries task 03's own
contracted lift, so "only the digest literal and its comment" had to be read against the contract.

**Lesson.** A scenario that reads a commit range names, at refine, who commits the story and when,
and its expected diff counts every line the story's own tasks require. Otherwise the scenario
contradicts its sibling task.

**Refs:** `m131/F-131-07`; VERIFICATION §131/05 "At the accept".
