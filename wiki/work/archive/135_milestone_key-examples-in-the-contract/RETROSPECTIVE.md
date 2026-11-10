---
doc: retrospective
updated: 2026-10-03
---
# 135 · Key examples in the contract — Retrospective

## R1 — three of five write sets were declared by where code is born, not who measures it

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect
- **Raised by:** the developers at 01, 04 and 05, and `aof:verify 135`

**What happened.** Three of the five builds touched files that refine had not declared:
- **01** touched six: digests, signatures, purity inventories and the ledger.
- **04** touched four: the controls that enumerate the lane's codes.
- **05** touched two: the bundle lock, and the ledger's registry count, which it left red.

The whole-tree gate then found two more tree-reading controls red on 04's code: the silent-catch
baseline and the member-census ban (F-135-05). Each story's own retrospective names its case
(01/R1, 04/R1, 05/R1). 143/R1 recorded the same
pattern for directory budgets a day earlier.

**Why.** Refine plans by subject: a module, a lane, a prompt. The controls that pin, count or digest
the tree are in no subject's path. An importer sweep does not reach them either, because they read
the tree rather than import the changed module.

**Lesson.** When refine declares `files:`, it also lists the tree-reading controls for each
directory or registry the story changes. Those are `acd-source-directory-budget` and
`acd-ui-directory-budget`, the surface file budgets, FF-5307's digests, the workspace runtime audit,
142's Plan 09 ledger (`core-workspace`), and the `test/arch/audit/` source scans
(`acd-no-new-silent-catch`, `acd-control-derives-its-census`). The census is a grep for the changed path's directory
in `test/arch/` and `test/bundle/`, and it is cheaper than the rework.

**Refs:** 01/R1, 04/R1, 05/R1; 143/R1.

## R2 — a red seen by one story's build was handed to verify rather than fixed

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer
- **Raised by:** `aof:verify 135`

**What happened.** 04's build found `DetailPanel.tsx` over its ratchet. 135/03 had caused it, and it
was recorded as outside the 04-05 span, then left for 03's verify. So 03 was `in-review` for its
whole time in review with three UI controls red (F-135-01), and 05 joined it with the ledger red
(F-135-02). Verify repaired both, mechanically, in one commit.

**Why.** Each story lane ran its own suites, and the tree-reading controls belong to no story.
Recording a red as "not this story's" kept the record honest, but left the milestone's tree red.

**Lesson.** A red found in a sibling story of the same open milestone is fixed in the story that
finds it, with the owner named in the commit. The milestone is one tree, and a red that waits for
verify is a red that every later lane runs over.

**Refs:** F-135-01, F-135-02; `3eb38e39`; memory "No chores — fix inline".
