---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Scaffolded at refine (2026-09-13) so the fitness register exists for story 05's red probes; every
  row below reads pending with an em-dash probe (129's convention) until its control lands and is observed failing.
-->
# 130 · Stop a running loop — Verification

## Verification evidence

<!-- One entry per lane that ran, per story as each lands. For each `@manual` scenario record the
     PROCEDURE, the RESULT and a `verifies →` pointer at the scenario it discharges. -->

## Fitness functions

<!-- THE RED-PROBE REGISTER. Every row CITES a declaration in the sibling `ARCHITECTURE.md`
     `## Fitness functions` register and declares nothing of its own. The `red probe` cell records what
     was changed to make the control fail, and the message observed; an untouched placeholder cell is a
     MISSING red probe, never a recorded one. Story 05 lands the files and records the probes. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13001 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | pending (130/05) | — |
| FF-13002 | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` | pending (130/05) | — |
| FF-13003 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | pending (130/05) | — |
| FF-13004 | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` | pending (130/05) | — |
| FF-13005 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` | pending (130/05) | — |
| FF-13006 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` | pending (130/05) | — |
| FF-13007 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` (node leg) + `app/desktop/crates/core/src/supervision.rs` (cargo) | pending (130/05 node leg; 130/04 cargo half) | — |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|

## Accept decision

<!-- Written at `aof:verify 130`. -->
