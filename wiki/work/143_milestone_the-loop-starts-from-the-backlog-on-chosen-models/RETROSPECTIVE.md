---
doc: retrospective
updated: 2026-10-03
---
# 143 · The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — Retrospective

## R1 — every new control file was declared into a directory at its ceiling

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect
- **Raised by:** the developer, at 143/00's build

**What happened.** The refine declared three new fitness-function files and new test suites in
`test/loop` (63/63), `test/arch/loop` (66/66) and `test/arch/session`, all already at their
`acd-source-directory-budget` ceiling. Each build hit the budget and folded its cases into the suite
sharing the subject: FF-14301 into `acd-loop-scope-guard`, FF-14302 into
`acd-loop-concurrency-single-home`, FF-14303 into `acd-agent-model-source-map`. That left the
ARCHITECTURE table, the `files:` lists and three scenarios naming files that never existed.

**Why.** The refine wrote paths by subject and never read the budget rows. The same refine-time
check is already a lesson from an earlier milestone, and it recurred here on all four stories.

**Lesson.** Before declaring a new file, refine reads its directory's budget row. If the directory
is at its ceiling, the new case goes into an existing suite on the same subject, and the contract
names that suite.

**Refs:** F-143-02; ARCHITECTURE `## Fitness functions` (the folded-in notes).

## R2 — the loop shell's bound rose in two stories of one milestone

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect
- **Raised by:** the developers at 143/01 and 143/03

**What happened.** 143/00 tightened `commands/loop.mjs`'s line bound to 2131. 143/01 raised it to
2161 and 143/03 to 2177, each with a stated reason, because `packages/work-loop/src` is at its file
budget and the shell cannot be split without a new file. TECH_DEBT 92 owns the split, and every loop
feature makes it larger.

**Why.** Every raise was the cheapest correct move inside its story. Taken together they are the
debt the bound exists to stop.

**Lesson.** When two stories in one milestone raise the same bound, the split is the next loop
item's first task, not a ledger entry.

**Refs:** TECH_DEBT 92; `test/loop/loop-command-wave.test.mjs`.
