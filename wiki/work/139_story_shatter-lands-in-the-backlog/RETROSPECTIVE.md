---
type: story
doc: retrospective
number: 139
slug: shatter-lands-in-the-backlog
title: "Retrospective — shatter lands its drivers in the backlog"
created: 2026-09-27
updated: 2026-09-27
---
# 139 · Retrospective

Lessons from building and accepting the story. Findings are **referenced**, never restated: they live
in `VERIFICATION.md`.

## R1 — A story whose thesis is "a slug is never read as a number" reintroduced that exact misreading in its own fix

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** structural review (round 1, `aof:continue 139 --solo`)

The story's subject is one all-digit predicate, `isDependNumber`, so that `10x-faster` is never read
as item 10. The per-entry rewriter it moved into `src/work.mjs` then decided whether to keep a
zero-pad width with its own regex on the raw entry, `/^0\d/`. That regex did not go through the
predicate. A slug starting `0<digit>` (`007-bond`) therefore took the number path, and promoting it
wrote `[00000012]`. The structural lens caught it, and it was reproduced, fixed and pinned by a
regression case (VERIFICATION `## Build-time review`, "The round-1 Blocker").

**Why.** The predicate replaced the shape tests that callers had already named, such as `parseInt`
and promote's `/^\d+$/`. The width rule was a new shape test written inside the moved code, so no
census of the old callers could find it. Width is a property of a number only, but the test asked
only what the entry started with.

**Lesson.** When a story centralises a classification ("is this a number?"), grep the story's OWN
diff for every regex or parse that answers that question, not only the callers that existed before
it. Anything the diff adds that is shaped like the old test must read through the new predicate, or
the story re-ships its own bug.

**Refs:** `139/00 a zero-led slug is rewired to the minted ref, never padded to the slug's width`;
`src/work.mjs` `rewriteRefEntry`.
