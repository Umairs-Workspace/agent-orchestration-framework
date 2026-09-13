---
type: story
number: 03
slug: the-ask
title: "The Ask"
parent: 66
depends: []
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-16
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The Ask

## User story

As an agent or author working an ACD item,
I want ACD to *ask* me for the declaration form, the red probe, the runnable path and an unnumbered
finding — in the templates and prompts I already read,
so that the new refusals arrive as a rule I was given rather than a surprise at `validate` I have to
guess my way out of.

<!-- ADR-007: a check with no ask is a trap. ACD's gates are met by agents reading `src/bundle/`
     prompts and templates; a refusal no prompt asks for arrives as a surprise and the agent's
     recovery is to guess. That is finding §1b's shape seen from the other side — a cure prescribed in
     a retrospective, called "one command", which nobody ran. -->

## Tasks

- [x] `tasks/00_verification-gains-a-shipped-template.feature` — ACD ships
      `src/bundle/templates/milestone/VERIFICATION.md` with four frozen headings and a fitness
      register whose columns are `id | enforced by | result | red probe`
- [x] `tasks/01_the-architecture-template-asks-for-a-runnable-path.feature` — the fitness table gains
      an `id` column and the intended-path/`pending` convention, and `refine.md` + `aof-architect.md`
      carry the declare-where-a-runner-can-see-it rule
- [x] `tasks/02_reviewers-report-findings-unnumbered.feature` — `verify.md` and the five reviewing
      agents carry the id-allocation rule: a reviewer reports unnumbered, the single writer allocates
      on landing

## Notes

**Read `ARCHITECTURE.md` ADR-005 §1, ADR-006 and ADR-007 §2 before building.** This story is the
milestone's whole *ask*; 66/02 is the matching *check*. Both are pinned by the same frozen blocks, so
they build concurrently without waiting on each other.

**Zero source coupling — the maximal-parallelism story.** No `src/*.mjs` imports anything under
`src/bundle/` (verified: no import edge in the graph). It starts immediately and shares no file with
66/00, 66/01 or 66/02, which is also why it is the only story touching the bundle descriptor and
manifest — one editor, no regeneration race.

**The schema is not an invention; it promotes the measured majority.** ACD ships **no
`VERIFICATION.md` template at all** — `src/bundle/templates/milestone/` holds ARCHITECTURE, COMPLIANCE,
DESIGN, OUTCOME, RESEARCH, SECURITY, SPEC, STATE, UAT and nothing else — while doctor checks only that
the file exists and is non-empty (`src/work-doctor.mjs:109`). Across the 50 `VERIFICATION.md` files
that do exist: **46 carry `## Verification evidence`, 46 `## Accept decision`, 43 `## Findings`**, and
the Findings columns are already prescribed in prose at `src/bundle/commands/verify.md:99` (*"id,
observed, type, severity, triage, routed-to, status"*). The template writes down what ACD already
does — plus the one section that is new.

**The red-probe discipline is already practised, in code, invisible to the record.** **164 of ACD's
287 arch tests (57%)** carry a self-check / non-vacuity / planted-defect lane —
`test/arch/acd-no-internal-project-names.test.mjs:132-155` is the model (*"a guard whose passing state
is found nothing is indistinguishable from a broken one by every signal except a red probe"*). Against
that, **0 of 50 `VERIFICATION.md` files mention a red probe in any form**, and the finding counted
**eight falsifiability terms at 0 files each across `src/bundle/`** (`red probe`, `seen red`, `vacuous`,
`positive control`, `falsifi*`, `must fail`, `observed failing`, `probe`). This story is the literal
discharge of that zero.

**The id-allocation rule is prevention; the check is only residue.** Finding §6 is the sharpest
mechanism in the investigation: the architect *executed* the read-based countermeasure — read the
register's last entry, saw `D-28`, allocated `D-29` — and collided anyway, because `D-29` had been
allocated hours earlier in a concurrent lane. *"A stale read looks exactly like a fresh one."* The
countermeasure is not weak, it is **unsound**, and no restatement repairs it. Story 65 made concurrent
dispatch real in this repo, so ACD now recommends the fan-out that produces the hazard — and milestone
66 is the first item built under it. Costs three paragraphs across six bundle files and no code.

**What the red-probe field cannot catch, and the template must not imply otherwise** (ADR-005 §4): a
fabricated probe; any assertion that is not a declared control; and whether the probe was performed on
the bytes that shipped. The claim is that an invisible absence becomes a specific, checkable lie in a
document a reviewer reads — a smaller surface, not a closed one. `SPEC §Scope` already settles this,
and the wording that ships must not promise more.

**Fitness function owned here** (ADR-007 §1): **FF-6608**
`test/arch/acd-verification-template-shape.test.mjs` — frozen-token presence over `src/bundle/**` with
the token set exported and set-equal to the ADR-005/006 literals, plus the template's heading and
table-header assertions.
