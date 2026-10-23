---
doc: retrospective
promotionFrom: 1
---
# 168/02 · A prototype draws its diagrams — retrospective

## R1 · A later story paid for an earlier story's missed censuses and install lock

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (build) · **Promoted to:** none · **Recurs:** 168/01/R1

**What happened:** 02 changes the bundle's shipped `manifest.json` again, so it ran the bundle
censuses and found two that 01's new `/aof:prototype` command had turned red. It also found that
FF-12405 leg 9 holds `.aof/aof.lock.json` to the shipped manifest, so `aof work update` had to run
in this checkout, which moved the lock and the apply journal under `.aof/`.

**Why:** 01's `files:` named one of the four bundle-command censuses, and the waves ordered 02
after 01 only because of the shared manifest. As a result, 02's lane was the first to run 01's
missing censuses.

**Lesson:** A story that changes a shipped bundle file runs every bundle census, and runs
`aof work update` for the install lock, before it is reviewed. The `.aof/` lock and journal are then
committed by hand, because the loop's lane reconcile drops `.aof/`.

**Refs:** ../../STATE.md Feedback (continue 02); ../../VERIFICATION.md F-01.
