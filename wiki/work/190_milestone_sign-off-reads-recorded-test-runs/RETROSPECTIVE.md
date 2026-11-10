---
doc: retrospective
promotionFrom: 1
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`, two in each of the five. This document carries what running the milestone taught.

## R1 · A red PR run was carried across three milestones' verifies

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** PR #25's `test` workflow was red at `55f24c9f`, `4ff7fba6` and `08348819`, on five controls 190 never touched: FF-5301, 131/08, FF-9603 and FF-7106. 188's and 190's verifies each named these reds as "pre-existing", and moved on. Each fix was a census row or a declaration, minutes of work, and every one of them blocked 190's gate anyway.

**Why:** "Not this item's" was treated as "not this session's". But the accept door reads a whole-tree row, so a red the branch carries is the item's blocker whoever wrote it.

**Lesson:** At a milestone verify, read the branch's last CI run first. A red there is cleared, or routed by name, before the gate is asked for. It is never relabelled "pre-existing" twice.

**Refs:** VERIFICATION `## Regression gate (the milestone)`; m188 VERIFICATION second pass.

## R2 · The gate's machine was a decision this repo had already made

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** The verify asked the operator whether to run the gate elsewhere or override it, though 160/ADR-014 §6 already answers that: push `gate/<ref>` and `gate.yml` runs the unchanged command on a clean runner. Run that way, the gate took 15.7 min, green.

**Lesson:** When a door needs a run this machine cannot host, look for the repo's recorded answer (here `gate.yml`) before asking the operator for one.

**Refs:** 160/ADR-014 §6; VERIFICATION `## Regression gate (the milestone)`.

## R3 · Adoption of an opt-in key is part of the milestone that adds it

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** operator · **Promoted to:** none

**What happened:** 190 added `work.test.*` keys whose absence keeps the old behaviour, and refine never asked how an existing project would learn they exist. The operator caught it at verify, and 190/04 was added to deliver discovery and adoption.

**Lesson:** Already recorded as a standing rule. This milestone is its second instance.

**Refs:** STATE Feedback (operator, 190/04); 190/04/R1.
