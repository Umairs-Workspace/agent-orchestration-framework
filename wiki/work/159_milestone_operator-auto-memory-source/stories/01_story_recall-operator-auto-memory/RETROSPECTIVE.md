---
doc: retrospective
updated: 2026-10-12
---
# 01 · Recall the operator's local auto-memory — Retrospective

## R1 — the declared `files:` missed two files the build had to write

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner
- **Raised by:** the 01 build

**What happened.** `files:` omitted `packages/knowledge/src/memory.mjs` (config validation and backend
resolution) and `packages/knowledge/package.json` (the export-map entry). The build wrote both, so a
sibling story declaring either would not have been held apart.

**Lesson.** When a story adds a module, trace its wiring edges (export map, config validation, backend
resolver) before freezing `files:` — the new leaf is rarely the only file the change touches.

## R2 — a dispatch worktree silently tested main's code

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer
- **Raised by:** the 01 build

**What happened.** A dispatch worktree has no `node_modules`, so bare imports resolved to the main
checkout's workspace links and the build checks ran main's code, not the lane's.

**Lesson.** Run `node scripts/prepare-worktree.mjs` before any build check in a lane, and treat a green
result from an unprepared worktree as unproven.

## R3 — the integration runner cannot expand Scenario Outlines

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer
- **Raised by:** the 01 build

**What happened.** The task features' Outlines were not expanded by the runner, so every row was written
out by hand as one of 45 scenarios in `memory-auto-source.feature`; two injected-failure cases run the
indexer in process.

**Lesson.** A contract authored with Outlines needs the runner to expand them, or the refine should say
up front that each row becomes an explicit scenario; hand expansion is where a row gets lost.
