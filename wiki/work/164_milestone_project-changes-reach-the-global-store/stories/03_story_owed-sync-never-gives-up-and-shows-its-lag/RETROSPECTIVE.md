---
doc: retrospective
promotionFrom: 1
---
# 164/03 · Owed sync never gives up and shows its lag — retrospective

## R1 · A backoff changed two delivered timings, and an operator retry would have waited behind it

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** control (`acd-publish-on-mutate-ledgered`) · **Promoted to:** none

**What happened:** Adding a backoff to until-done publishes changed two delivered timings: 164/00
E5 and 34's `global-work-propagation/03` had retried a failed publish on the very next pass. Their
contracts state no interval, so only their tests changed. The control then showed that the lane
cleanup and `doctor --converge` (the operator retrying now) would also have waited out the backoff.

**Why:** A retry policy was added at the dispatcher, where every caller shares it, without listing
which callers are automatic and which are an explicit retry.

**Lesson:** A retry policy names its callers in two groups: automatic passes, which wait, and
explicit retries, which do not (`drainEffects({ backoff: false })`). Delivered tests that pin "the
next pass" are re-read against the contract's stated interval before being changed.

**Refs:** ../../STATE.md build close (164/03).
