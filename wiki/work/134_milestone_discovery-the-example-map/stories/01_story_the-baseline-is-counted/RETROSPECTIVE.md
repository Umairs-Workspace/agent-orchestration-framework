---
doc: retrospective
updated: 2026-10-02
---
# 01 · The baseline is counted — Retrospective

## R1 — a contract cited a file no branch carried

- **Kind:** mistake · **Area:** planning · **Stage:** refine · **Owner:** product-owner
- **Raised by:** the 01 build (gate red at rung 1)

**What happened.** `reads:` named the origin research, which was untracked in the main checkout, so
a dispatch worktree could not resolve it and `validate 134/01` went red. It cleared only once
`9dc2397` committed the file.

**Lesson.** Before a contract cites a document, check `git ls-files` for it. An untracked citation
is invisible to every lane.

## R2 — a delivered milestone's archive move stales a counting contract

- **Kind:** near-miss · **Area:** planning · **Stage:** verify · **Owner:** product-owner
- **Raised by:** aof:verify 134

**What happened.** 133 was archived after 01's contract was written. The task's Examples folder,
seventeen `reads:` entries and R7's commands still named `wiki/work/133_…`, so R7's commands no
longer reproduced its numbers. They were repointed at accept (`0d0b8ea9`).

**Lesson.** A contract that counts over live milestones should cite them by ref (`aof work find`)
rather than by root path, or the next archive breaks it.
