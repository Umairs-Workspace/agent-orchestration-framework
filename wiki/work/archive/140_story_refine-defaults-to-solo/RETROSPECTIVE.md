---
doc: retrospective
updated: 2026-09-27
---
# 140 · Refine runs solo unless told otherwise — Retrospective

The story ran solo end to end, so the observability snapshot records no agent sessions. There were
two lessons.

## R1 — The refine blast-radius census counted literals, not the controls that pin behaviour

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** builder, at the review close
- **What happened:** Refine's census found 34 test files with a flagless `/aof:refine|continue` literal and said only the `test/loop/` drive assertions would break. FF-5303's `acd-phase-door-not-a-driver` also broke, because it pins a flagless dry-run drive through the CLI rather than as a literal the grep was keyed on.
- **Why:** The census grepped for the directive string. It did not ask which controls exercise the seam being changed (`aof work drive`) end to end.
- **Lesson:** When a story changes what a seam emits, count every test that drives that seam as well as every test that spells its old output. Grep `test/arch/` for the seam's verb (`work drive`, `--dry-run`) before declaring `files:`.
- **Refs:** VERIFICATION F-02

## R2 — A relocated template was reported as "no longer shipped", and its cleanup was handed back without the real reason

- **Kind:** misunderstanding · **Area:** process · **Stage:** build → verify · **Owner:** builder / verifier · **Raised by:** operator, at verify
- **What happened:** R06 kept one drift-warning after `--force`: `.aof/templates/work/milestone/OUTCOME.md`. The build recorded it as a template the bundle "no longer ships" and left it for the operator. Verify repeated that framing, and the operator rightly asked why, since an OUTCOME template does exist. It had moved to `shared/`, and R06 already had the current copy. Once the real cause was explained, deleting the stale file was a one-line approval.
- **Why:** The engine's refusal ("stale generated file was modified; not deleting") names only the old path. Neither session checked whether the bundle ships the same file name at another path.
- **Lesson:** Before reporting a stale generated file, look for its basename elsewhere in the bundle. If it has moved, say where to and that the old copy is dead, so the operator approves the delete on the real facts. A task whose contract says "drift-warning 0 in every repo" is not finished until that approval is asked for, with the correct reason.
- **Refs:** VERIFICATION F-04
