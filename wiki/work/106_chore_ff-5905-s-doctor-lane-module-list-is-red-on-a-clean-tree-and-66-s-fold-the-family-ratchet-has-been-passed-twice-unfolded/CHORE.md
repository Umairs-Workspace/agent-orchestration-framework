---
type: chore
number: 106
slug: ff-5905-s-doctor-lane-module-list-is-red-on-a-clean-tree-and-66-s-fold-the-family-ratchet-has-been-passed-twice-unfolded
title: "Ff 5905 S Doctor Lane Module List Is Red On A Clean Tree And 66 S Fold The Family Ratchet Has Been Passed Twice Unfolded"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 106 · Ff 5905 S Doctor Lane Module List Is Red On A Clean Tree And 66 S Fold The Family Ratchet Has Been Passed Twice Unfolded

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

66's codebase-health note recorded a local ratchet — *doctor's lane modules go 4 → 5; the
**SIXTH** folds the family into `src/work-doctor/`* — and the tree then passed it **twice**
without folding: 54/04's `work-doctor-rubric.mjs`, then 78/03's `work-doctor-loop-record.mjs`.
Chore 114 closed the roster half of the finding. What is left is the ratchet itself, which needs
a **decision** — fold, or supersede — because a third lane arriving to find the gate still
unanswered is how a recorded ratchet quietly becomes a comment nobody acts on.

## Definition of Done

- [x] Name src/work-doctor-loop-record.mjs (78/03's lane) in DOCTOR_LANE_MODULES so test/arch/acd-controls-never-execute.test.mjs states the truth again, then record the decision 66/ARCHITECTURE.md's ratchet asks for -- 'doctor's lane modules go 4 to 5; the SIXTH folds the family into src/work-doctor/' -- which rubric (6th) and loop-record (7th) both passed without folding. Either fold the family or supersede the ratchet; re-marking the gate is not the same as answering it.
- [x] `aof work validate` is green (no regression)

## Accept decision

**ACCEPTED** 2026-09-05, on the chore's two close criteria (ADR-003) — no scenario run, no
behavioural-verify step and no human sign-off applies.

1. **Checklist ticked.** Both `## Definition of Done` boxes are `- [x]`; none left `- [ ]`.
2. **`aof work validate` green.** `aof work validate 106` → `PASS — 106 is well-formed.`

**Both halves confirmed at the source, not from the record.** The roster half: FF-5905's suite
re-run under an isolated `AOF_GLOBAL_HOME` — `test/arch/acd-controls-never-execute.test.mjs`, 16 of
16 green, `./work-doctor-loop-record.mjs` present in `DOCTOR_LANE_MODULES` at line 107. The ratchet
half: the supersession is landed as an amendment under `wiki/work/TECH_DEBT.md` item 10
(`### THE FOLD-THE-FAMILY RATCHET IS SUPERSEDED, PRICED …`, line 516), and the three named in-source
citations (`src/work-doctor-controls.mjs`, `src/work-doctor.mjs`'s `controlsLane` entry,
`src/commands/audit.mjs`) each now resolve to it.

**Findings carried, not blocking.** Both entries under `## Findings` above are routed elsewhere — the
remedy-overlap shape to a story at the operator's call, the `owner: <role>` placeholder recorded
unfixed as out of scope. Neither is a blocker against this chore.

**`OUTCOME.md` authored** (story 80) — three capabilities under `## Delivered`; `## Assumptions` and
`## Gaps` are empty and therefore absent.

## Notes

- **Promoted from review finding:** "FF-5905's doctor lane-module list is red on a clean tree, and 66's fold-the-family ratchet has been passed twice unfolded" (`test/arch/acd-controls-never-execute.test.mjs:95`)
- **Raised reviewing:** `85`, review round 1
- **Promotion key:** `finding:85:ff-5905's doctor lane-module list is red on a clean tree, and 66's fold-the-family ratchet has been passed twice unfolded`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

**Resolved 2026-09-05. The roster half was already closed; the ratchet is SUPERSEDED, priced.**

- **The roster half needed no edit and got none.** `./work-doctor-loop-record.mjs` was named in
  `DOCTOR_LANE_MODULES` by **chore 114**, closed at 96's milestone gate on 2026-09-04 — the same
  defect promoted twice, from 85's review (this chore) and 97's (114). The control runs **green**
  at HEAD: `test/arch/acd-controls-never-execute.test.mjs`, 16 of 16.
- **The ratchet is refused with its price**, recorded as an amendment to `wiki/work/TECH_DEBT.md`
  **item 10** — the ratchet's own routed home, since 66 filed it there as a family extension with
  *"no new entry"*. Measured: the fold buys **8 of 158** root modules (**5.1%**) and would strand
  **214** `src/work-doctor-*.mjs` citations across **87** `wiki/` documents — measured before this
  record, 227 / 88 once it and the TECH_DEBT amendment are counted — the bulk of them inside
  **immutable** delivered registers — and **no gate in this tree resolves a `src/` citation** (the
  controls lane's `register-dangling-citation` is scoped by `isControlFileName` to `*.test.*` /
  `*.spec.*`), so the decay would be silent and permanent. The trigger was mismeasured at birth as
  well: 54/04's rubric lane already made the roster **six** on the day the note wrote **five**, so
  the gate was never untripped by anybody. Replaced by three satisfiable rules — placement is
  decided at **birth** (all thirteen `src/` interior directories were born there; this tree has
  never folded a family); this family's growth is governed by **FF-5905's named roster**, which is
  the control that actually caught the seventh lane; and the root count stays item 10's own
  `src/mesh/` + `src/work/` partition, unchanged and still owed.
- **Three stale in-source citations corrected** — `src/work-doctor-controls.mjs`,
  `src/work-doctor.mjs` (the `controlsLane` entry in `CHECK_GROUPS`) and `src/commands/audit.mjs`
  each still asserted a lane count of 5 or an **untripped** ratchet. The delivered registers that
  cite it (57, 59, 66, 78/03, 85) are immutable, are left exactly as they stand, and now resolve to
  the TECH_DEBT amendment.

**Findings surviving the review close (2026-09-05).** Routed, not allocated an id — the findings
register is a milestone's `VERIFICATION.md`, and a top-level chore has none.

- *(Important — routed to a **story**, operator's call; the loop creates nothing.)* **A promoted
  finding that bundles two remedies can be silently half-discharged by a later, narrower one.** This
  chore's first checklist box was discharged in full by **chore 114** — a narrower promotion of the
  same red control, raised at 97's review rather than 85's — while 106 itself sat `not-started` with a
  box that was already true. Nothing joins them: the promotion key is per finding TITLE, and 114's
  title is not this one's. They are not duplicates (106 is a superset — it also carries the ratchet),
  which is exactly why a duplicate check would not have caught it. **The shape:** promotion detects
  REMEDY overlap between open findings, and says what a partial discharge does to the chore still
  holding the other half. That needs new acceptance criteria — what "the same remedy" means, and what
  the partial case should do — so it is a refine act, not something this loop may mint.
- *(Nit — recorded, unfixed.)* **13 of the 17 top-level chore records carry the scaffold's
  `owner: <role>` placeholder**, this one among them; 4 carry a real role. Deliberately not filled
  here: a one-off fill on this chore alone deepens the inconsistency, and filling all 13 is another
  item's scope. `aof work validate` passes over the placeholder, which is why it has gone unnoticed.
