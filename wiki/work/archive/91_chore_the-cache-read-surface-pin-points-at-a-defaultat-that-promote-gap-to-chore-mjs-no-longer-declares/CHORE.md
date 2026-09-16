---
type: chore
number: 91
slug: the-cache-read-surface-pin-points-at-a-defaultat-that-promote-gap-to-chore-mjs-no-longer-declares
title: "The Cache Read Surface Pin Points At A Defaultat That Promote Gap To Chore Mjs No Longer Declares"
status: done
owner: <role>
created: 2026-09-03
updated: 2026-09-04
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
# 91 · The Cache Read Surface Pin Points At A Defaultat That Promote Gap To Chore Mjs No Longer Declares

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`test/arch/acd-cache-read-surface-boundary.test.mjs` pinned a structural disk read to `src/commands/promote-gap-to-chore.mjs`'s `defaultAt()`, and that function had left the module — so ADR-016/G2's subject anchor reddened the `assertPinned` lane, asking for the pin to be RE-POINTED at the read's new home rather than deleted. The subject read is `appendPosition()` in `src/work-promote/promotion.mjs`, where 71/01 took it when it extracted the promotion engine.

## Definition of Done

- [x] Re-point ADR-016/G2's structural-read pin at defaultAt()'s new home, as the control's own failure message prescribes — never delete the pin. Then re-run test/arch/acd-cache-read-surface-boundary.test.mjs and confirm the assertPinned lane is green.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The cache-read-surface pin points at a defaultAt() that promote-gap-to-chore.mjs no longer declares" (`test/arch/acd-cache-read-surface-boundary.test.mjs:164`)
- **Raised reviewing:** `72/02`, review round 1
- **Promotion key:** `finding:72/02:the cache-read-surface pin points at a defaultat() that promote-gap-to-chore.mjs no longer declares`

### What was done (2026-09-04) — discharged by chore 88, verified here

**No code change was needed: this chore's subject was already re-pointed, and the re-point is the one
this chore prescribes.** Chore **88** (commit `bde9543e`, "re-point the four controls 71/00 and 71/01
moved out from under") moved the pin from `src/commands/promote-gap-to-chore.mjs`'s `defaultAt()` to
`src/work-promote/promotion.mjs`'s `appendPosition()` — the append-position read that 71/01 carried out
with the promotion ENGINE (ADR-004: one engine, two faces), so it now answers for both faces rather than
one. The pin was re-pointed, never deleted, exactly as the control's own failure message prescribes.

Verified at source in this checkout rather than taken from 88's record:

| check | result |
| --- | --- |
| `src/work-promote/promotion.mjs` declares `appendPosition` | yes — `promotion.mjs:53` |
| …and imports `listItems` from `work.mjs` (the disk reader the pin protects) | yes — `promotion.mjs:23`, used at `:54` |
| `defaultAt` still referenced anywhere under `src/` | no — `grep -rn defaultAt src/` returns nothing |
| the STRUCTURAL entry names the new subject | yes — `acd-cache-read-surface-boundary.test.mjs:108` |
| `node scripts/test.mjs --only test/arch/acd-cache-read-surface-boundary.test.mjs` | **5/5 green**, `assertPinned` lane included |
| the green is not an artifact of uncommitted work | both `promotion.mjs` and the test file are **clean at HEAD** (`git status --porcelain` empty) |
| `aof work validate 91` | **PASS** |
| `aof work doctor 91` | 0 admitted findings (its one `numbering-gap` is `warn`, stream-wide, not this chore's) |

**Duplicate promotion, as 88 already recorded.** Chore **107**
(`acd-cache-read-surface-boundary-is-red-…-no-longer-declares-defaultat`, `not-started`) schedules this
same pin a third time, raised at 85's review gate under a different title. It has nothing left to do and
should be closed as already-done. The promotion idempotence key is `(reviewed ref + finding title)`, so
one defect re-raised under a different title at a different review promotes again — the underlying gap
that produced 91 and 107 from one red.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

## Accept decision (2026-09-04)

**Accepted.** Both chore close criteria (ADR-003) hold, checked at the source rather than from the
ticks or from chore 88's record:

1. **Checklist ticked** — both boxes under `## Definition of Done` read `- [x]`, none left `- [ ]`.
   The re-point is real: the STRUCTURAL entry at
   `test/arch/acd-cache-read-surface-boundary.test.mjs:108` names
   `src/work-promote/promotion.mjs` / `listItems` with `subject: "appendPosition"`;
   `promotion.mjs:53` declares `appendPosition`, importing `listItems` at `:23` and reading at `:54`;
   `grep -rn defaultAt src/` returns nothing. The pin was re-pointed, never deleted.
   `node scripts/test.mjs --only test/arch/acd-cache-read-surface-boundary.test.mjs` → **5/5 green**,
   including the ADR-016/G2 subject-anchor lane. Both files are clean at HEAD, so the green is not an
   artifact of uncommitted work.
2. **Validate green** — `aof work validate 91` → `PASS — 91 is well-formed.`

`aof work doctor 91` reports no `control-unresolved` at either severity (a chore declares no
`ARCHITECTURE.md` register); its single finding is the stream-wide `warn: numbering-gap`, which is not
this chore's. No blocker finding is open. `OUTCOME.md` authored alongside (story 80): the state the
ticking made true is a subject anchor that resolves.

**Carried forward, not blocking:** chore **107** schedules this same pin a third time and has nothing
left to do — it should be closed as already-done. The duplicate is the promotion idempotence key
`(reviewed ref + finding title)` admitting one defect twice under two titles from two review gates.
