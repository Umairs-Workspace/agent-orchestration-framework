---
doc: retrospective
updated: 2026-10-03
---
# 01 · A whole-item refine in one drive — Retrospective

## R1 — the retry of a whole-item refine lost `--autonomous`

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer
- **Raised by:** the independent reviewer

**What happened.** The engine decided `autonomous: true` for the break-down drive. A refine that
failed after it answered was re-entered by a second path that rebuilt the drive without
`--autonomous`, so the retry ran per-story. The decision and the re-entry now share
`isWholeItemCascade`.

**Why.** Two paths each derived "is this the cascade?" from the same inputs, and only one of them
was changed.

**Lesson.** When a new flag rides a decision, find every path that rebuilds that decision and route
them through one predicate.

## R2 — nothing tested the wire from the decision to the session

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer
- **Raised by:** the independent reviewer

**What happened.** The engine's decision and the drive's prompt composition were each tested, but no
case followed a `whole-item` decision to the composed prompt or to the child's `autonomous` lend.
Walk cases now assert both.

**Lesson.** A flag that crosses a seam needs one case that observes it on the far side.
