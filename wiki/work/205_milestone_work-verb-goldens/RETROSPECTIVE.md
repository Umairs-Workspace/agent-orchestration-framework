---
doc: retrospective
promotionFrom: 1
---
# 205 · What the aof work verbs print and change in a work stream is held to baselines over a fixture stream — retrospective

The story-level lessons live with each story: 205/00 R1 and 205/03 R1. Stories 01 and 02 surfaced
none. The lesson here is what running the milestone taught.

## R1 · Reds recorded as "the stream's, not ours" at one gate blocked the next milestone's build

**Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** product-owner (continue) · **Promoted to:** none

**What happened:** 204's verify sorted 60 gate reds as inherited. It said they "belong in a chore of their own", and no chore was filed. When 205/00's impacted run widened to the whole tree, three of them failed it again: the bundle descriptor, `codex-ownership`'s retained-lane cases and the source-directory budget. The build stopped. Telling 205's failures from the stream's took a run on clean commit `2fa9bdd7` and a reopened build. 205 then fixed those three in its gate repair.

**Why:** An inherited red was recorded in the accept decision and the STATE closure record. Neither is a work item, so `aof work next` never surfaced it.

**Lesson:** When verify accepts over a red it attributes to the stream, it files that red as a backlog chore in the same session. A red that lives only in an accept decision becomes the next milestone's blocker.

**Refs:** m204 VERIFICATION "Accept decision"; ./STATE.md "Closure record" (gate repair); 205/00 R1.
