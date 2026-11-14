---
doc: retrospective
---
# 192/01 · A practice ships a variant of a template — retrospective

Written at the milestone's close (2026-11-14). At its accept the story was judged to add no lesson
of its own: impacted selection widening to the full suite, and the one FF-7706 load timeout, are
already on record. One lesson from its build was not on record, and it is kept here.

## R1 · An optional file read answers null, never a bare catch

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The build first read a template variant's file inside a `catch` that swallowed
the error. The `m42-item-3` control, which holds silent catches at a baseline, went red on it, and
the read was rewritten to answer `null` when the file is absent.

**Why:** A missing variant file is an expected case, and the quickest way to express "expected" is
an empty catch. That is the shape the control exists to refuse.

**Lesson:** When a read may legitimately find nothing, return `null` on the one error that means
"absent" and let every other error through.
