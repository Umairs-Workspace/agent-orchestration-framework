---
doc: retrospective
promotionFrom: 1
---
# 160/05 · The runner enforces the budget, and a timeout is not-finished — retrospective

## R1 · The stop path was proven only on children that close when killed

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** Every pool case drove fake children that emit `close` the moment they are killed. At the real
10-minute budget, one killed unit had started a process that outlived it and held its output open, so `close`
never came. The runner was still alive when the gate's 12-minute deadline killed it, and the row named no unit
(F-01). A real-process case reproduced it (60.1 s, exactly the descendant's lifetime), and a bounded drain
fixed it.

**Why:** A fake child models the killed process, not the process tree behind it. `close` waits on the whole tree.

**Lesson:** A kill or stop path is tested at least once over a real process whose descendant outlives it.
The fake-child cases cover the bookkeeping only.

**Refs:** ../../VERIFICATION.md F-01; `tasks/01_the-sharded-gate-is-held-to-its-budget.feature` `@finding-F-01`.

## R2 · `unref` on the pool's timers ended the suite silently

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** With the pool's timers `unref`'d, the event loop drained under fake children and the suite
stopped with no summary line. The exit code did not show it. The original runner never unref'd its unit timer,
so the `unref` was removed.

**Why:** A pool waiting on fake children has nothing else holding the event loop open.

**Lesson:** Judge a suite run by its `# executed` line, never by its exit code alone.

**Refs:** ../../STATE.md `## Notes & decisions in flight` (160/05 — `unref`).

## R3 · The verify prose has a second copy the write set missed

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The story changed the verify command's gate paragraph.
`packages/core/assets/variants/codex/workflow.md` carries its own copy of that paragraph, and
`.aof/aof.lock.json` moves with any render. Neither was declared.

**Why:** Refine listed the tracked renders of `verify.md` but not the variant files that restate its prose.

**Lesson:** A story that changes bundle prose greps `packages/core/assets/variants/` for the changed sentence and
declares every hit, plus the lock.

**Refs:** ../../STATE.md `## Notes & decisions in flight` (160/05 — the declared write set).
