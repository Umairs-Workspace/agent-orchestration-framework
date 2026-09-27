---
type: story
doc: retrospective
number: 04
parent: 131
slug: the-answer-reaches-the-session
title: "Retrospective — the answer reaches the session"
created: 2026-09-25
updated: 2026-09-25
---
# 131/04 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — `return promise` inside `try` escapes the `catch`

- **Kind:** defect-found · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** task 01's `invalid-body` Outline rows

The three phase doors in `board-ui.mjs` did `return handlePhaseDoor(…)` inside `handleWorkApi`'s
`try` without `await`. A body-reader rejection escaped the catch as an unhandled rejection and took
the board server down. This had been true before 04 for any malformed JSON sent to a door. Walking
every Outline row, rather than a representative few, is what reached it. The fix is `return await`.

**Lesson.** In an async function, a promise returned from inside `try` is returned with `await`, or
its rejection bypasses the `catch`. Outline rows that feed malformed input to every write route
find this class, so they are walked in full.

**Refs:** STATE `(developer + review, build 04)` (1).

## R2 — The derive tool cannot see a data hop or an HTTP contract

- **Kind:** process · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** the PO and the developer at 04's refine, and review at build

04's `files:` missed three readers. The first was the control router, which rebuilds the resume DOWN
frame key by key. The second was two suites that POST feedback with no `Origin`. The third was
FF-12603's fixed character windows over `board-ui.mjs`. None is import coupling, so the graph
proposal could not name any of them.

**Lesson.** For a change to a wire frame, a route's admission or a pinned file, refine reads the
frame's hops, the route's callers in `test/` and the pin readers by hand. It does not trust the
derived set.

**Refs:** STATE `(PO, refine 04)`, `(developer + review, build 04)` (2); `m131/F-131-08` for the
security note that review raised.
