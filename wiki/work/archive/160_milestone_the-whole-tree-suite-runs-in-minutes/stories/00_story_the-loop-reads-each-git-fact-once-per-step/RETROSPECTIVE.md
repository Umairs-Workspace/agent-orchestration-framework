---
doc: retrospective
promotionFrom: 1
---
# 160/00 · The loop reads each git fact once per step — retrospective

## R1 · An edit to an audited file moved the runtime audit, which the write set did not declare

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The story edited `packages/execution/src/worktrees.mjs` and the wave's bindings. Each reviewed
site in `scripts/workspace-runtime-audit.json` is keyed on its file's digest, so the edit re-keyed the audit, and
`workspace-boundaries/all actual owners` went red until it was updated. The audit was not in `files:`. The read
set also missed `packages/mesh/src/worktrees.mjs` (the commit runner rule) and
`test/loop/loop-command-reconcile.test.mjs` (it pins the narration's full sha). Stories 02, 03, 04 and 05 met
the same audit the same way.

**Why:** Refine drew the write set from the behaviour's modules. It did not list the controls keyed on those
files' bytes.

**Lesson:** When a story edits a file the runtime audit reviews, `files:` declares
`scripts/workspace-runtime-audit.json` too. Refine finds those files by grepping the audit for each declared path.

**Refs:** ../../STATE.md `## Feedback (for retro)` (the 160/00 and 160/04, 160/02 and 160/03 write sets).
