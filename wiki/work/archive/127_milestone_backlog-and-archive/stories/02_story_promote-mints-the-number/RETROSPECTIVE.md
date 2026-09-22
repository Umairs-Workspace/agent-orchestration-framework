---
type: story
doc: retrospective
number: 02
slug: promote-mints-the-number
parent: 127
title: "Retrospective — promote mints the number"
created: 2026-09-17
updated: 2026-09-17
---
# 127/02 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced,
never restated (`../../VERIFICATION.md`).

## R1 — A control's own leg stored a fact about the tree

- **Kind:** defect · **Area:** controls · **Stage:** build · **Owner:** developer · **Raised by:** FF-11902 at the fix round

**What happened.** FF-12703 leg (d) asserted `importers.length === 2` over a set it walked out of
`src/` — the exact stored-census shape 119/ADR-003 §2 forbids, in the control landed to hold the
one-mint rule. The floor (≥ 1) and the per-member property (each importer is one of the two named)
already bound the count; the equality was dropped at the fix round (2026-09-16) and no production
code changed.

**Lesson.** A new control is written against the same rule it will be read by: floor the derived
set and name its members AMONG it; "today it finds the two" is a fact about the tree.

## R2 — A red probe as spelled has to reach the sweep

- **Kind:** contract · **Area:** verify · **Stage:** verify · **Owner:** product-owner · **Raised by:** `F-29`

**What happened.** Task 06's probe (a) pastes a line that reads a binding (`items`) at module top
level; the runner imports the module and dies on `ReferenceError` before the control's sweep runs —
the second time this species has been met (127/01's `F-02` was a duplicate binding). Probe (c)'s leg
names the count before the file, so the observed message differs from the scenario's wording.

**Lesson.** A probe scenario spells a mutation that PARSES and LOADS — inside a function body when
it reads a binding — and quotes the leg's first assertion, which is the message the verifier sees.
