---
doc: retrospective
promotionFrom: 1
---
# 156 · One loop selects an assistant per phase — retrospective

## R1 · A live acceptance loop measures the loop's machinery, not just the story

**Kind:** mistake · **Area:** process (loop) · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** Accepting task 02 needed one live mixed loop. Phase selection was right on
every run, yet the loop halted three times and its milestone verify ran four 1–2 hour gate
runs, none green: a grade timeout under a concurrent loop (F-1), a resumed lane built in a
directory git had unregistered (F-2), verify killed while waiting on its own gate (F-3), and
host-load timeouts recorded as red (F-4).

**Why:** Scripted transport tests prove orchestration on an idle fixture. Wall-clock bounds,
Windows directory removal and session environment inheritance appear only on a real host
shared with other loops.

**Lesson:** Read a live loop's halts at the source (diag log, run records, transcripts) before
attributing them to the story under test, and fix the machinery inline. Run the acceptance loop
on a quiet host, and never start other test runs while a whole-tree gate is in flight.

**Refs:** VERIFICATION.md, Findings F-1..F-4 and the 2026-10-12 live loop runs; m129/F-70.
