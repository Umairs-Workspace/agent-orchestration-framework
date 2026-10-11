---
doc: retrospective
updated: 2026-10-06
---
# 04 · The readiness gate — Retrospective

## R1 — refined on one tree, built on another

- **Kind:** blocker (process) · **Area:** contract (planning) · **Stage:** build (continue) · **Owner:** architect
- **Raised by:** the 04 build

**What happened.** 04 was refined before 142 and built after it. Every `src/` path in the contract
had moved, and the declared write set missed the composition layer 142 introduced: the core
bindings, `assemble.mjs`, the work package's `exports` and two tests that pinned the doctor's shape.

**Lesson.** When the tree has restructured since refine, re-derive the write set from the import
graph before building, not from the contract's paths.

## R2 — a sweep that selects by name cannot select a tree-wide scan

- **Kind:** near-miss · **Area:** process (testing) · **Stage:** build · **Owner:** developer
- **Raised by:** 134/05's sweep

**What happened.** The importer sweep picked suites by the symbols they name. The kernel-ports purity
check, the runtime audit and the Plan 09 case ledger name none, so 04 shipped three reds that only
a whole-directory run of `test/bundle` and `test/command` found.

**Lesson.** A sweep adds the whole-directory scans (`test/bundle`, `test/command`) to whatever it
selects by name.
