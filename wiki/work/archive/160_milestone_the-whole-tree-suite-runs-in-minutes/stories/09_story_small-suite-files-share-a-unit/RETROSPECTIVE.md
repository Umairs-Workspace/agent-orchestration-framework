---
doc: retrospective
promotionFrom: 1
---
# 160/09 · Small suite files share a unit — retrospective

## R1 · The per-file account was first put inside a frozen function

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The first build printed `# file` lines from inside `runCases`. FF-5311's REG-MUT-11 digests
the harness's suite loop, so it went red. The shipped build wraps each case's `run` in the shard entry, and
`runCases` is byte-unchanged.

**Why:** The edit went to where the loop was, not where a change was allowed.

**Lesson:** Before editing `scripts/test-harness.mjs`, check which of its functions FF-5311 digests, and add
behaviour at the caller instead.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/09 — `runCases` is frozen).

## R2 · A file's recorded time left out its import

**Kind:** near-miss · **Area:** code · **Stage:** build (review) · **Owner:** developer · **Raised by:** developer (review) · **Promoted to:** none

**What happened:** A file's `# file` seconds started at its first case, so a file whose cost is its import was
recorded short and would have been packed too tightly in the next schedule. Review added the import time.

**Why:** The timer was placed around the cases, which is what a single-file unit's wall time never needed.

**Lesson:** When an account moves from per-process to per-file, check that every cost the process paid is still
charged to some file.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/09 review).
