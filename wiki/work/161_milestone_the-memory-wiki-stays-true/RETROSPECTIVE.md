---
doc: retrospective
promotionFrom: 1
---
# 161 · The compiled wiki stays true — retrospective

## R1 · Two lanes grading the whole tree at once outran a deadline sized for one

**Kind:** blocker · **Area:** process (grade) · **Stage:** build · **Owner:** loop · **Raised by:** operator (the halted `aof work loop 161`) · **Promoted to:** none

**What happened:** Wave 1 dispatched 161/01 and 161/02 together, and each lane's grade ran the
whole-tree rubric. Measured alone (the baseline at 6eabd80), that suite takes about 27 minutes.
161/02's grade ran from about 16:53 to 17:22 and passed. 161/01's started at 17:04, overlapped it
for roughly 18 minutes, and was killed at exactly 30:00. The loop halted on `grade-indeterminate`
(`runner-timeout`, 0 cases). The grade it lost was the only run that would have selected the
package-boundary suite, so a real red (F-01) waited until verify.

**Why:** The grade deadline is `min(startToCloseMs, heartbeatMs)`, which is 30 minutes here
(`packages/contracts/src/loop-bounds.mjs`). That leaves about 3 minutes of headroom for one
uncontended run. Lane concurrency multiplies the load on the host, but the deadline does not change.

**Lesson:** Size the grade deadline to the measured suite time under the wave's concurrency, not
the idle time. When a wave grades the whole tree, check the measured suite time against the
deadline before dispatching more than one lane. A `runner-timeout` with zero cases means the gate
produced no evidence, not that it passed; rerun the grade before reading the lane as green.

**Refs:** VERIFICATION.md, Verification evidence and F-01; the loop-diag log
`loop-diag.161.2026-10-14T16-12-40-101Z.log`; 81/00 (the deadline derivation).
