---
type: chore
number: 115
slug: the-contract-and-register-condensers-still-emit-a-husk-at-a-tight-budget-and-boundedfill-starves-a-skeleton-to-hold-room-a-first-entry-cannot-use
title: "The Contract And Register Condensers Still Emit A Husk At A Tight Budget And Boundedfill Starves A Skeleton To Hold Room A First Entry Cannot Use"
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
# 115 · The Contract And Register Condensers Still Emit A Husk At A Tight Budget And Boundedfill Starves A Skeleton To Hold Room A First Entry Cannot Use

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Chore 95 taught `condenseArchitectureSlice` never to emit a husk — a section announced as CONDENSED
while naming none of its own entries — and left the same hole open in the two bounded condensers
beside it, plus the starved reserve in the fill underneath all three. This closes both: the
never-a-husk rule moves into `condensedResult`, the one place a reduction becomes a section, and the
reserve in `boundedFill` holds room back only for a first entry that could actually claim it.

## Definition of Done

- [x] Apply chore 95's architecture fix to the other two bounded condensers: when no optional entry fits the room whole, condenseTaskContracts and condenseFitnessRegister should carry a bounded form of the first (or refuse rather than announce CONDENSED with kept=0), so no bounded section is ever counted as carried while naming none of its entries. Measured: condenseTaskContracts at budget<=300 returns 271 chars kept=0/8, condenseFitnessRegister at budget<=200 returns 225 chars kept=0/11. Second leg: boundedFill's 'held' reserve holds back optional[0].length even when that entry cannot fit the whole room, starving the skeleton for room nothing can claim -- chore 95 worked around it for architecture by re-filling; fix it at the helper.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The contract and register condensers still emit a husk at a tight budget, and boundedFill starves a skeleton to hold room a first entry cannot use" (`src/phase-brief.mjs:519`)
- **Raised reviewing:** `95`, review round 1
- **Promotion key:** `finding:95:the contract and register condensers still emit a husk at a tight budget, and boundedfill starves a skeleton to hold room a first entry cannot use`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

## Accept decision

**ACCEPTED** 2026-09-05, on the chore's two close criteria (ADR-003) — no scenario run, no
behavioural-verify step and no human sign-off applies.

1. **Checklist ticked.** Both `## Definition of Done` boxes are `- [x]`; none left `- [ ]`.
2. **`aof work validate` green.** `aof work validate 115` → `PASS — 115 is well-formed.`

**Both legs confirmed at the source, not from the record.** The husk leg: `condensedResult`
(`src/phase-brief.mjs:430`) refuses a `total > 0 && kept === 0` reduction, and the two named
condensers now share the architecture slice's retry through `boundedFillOrOpen`
(`src/phase-brief.mjs:533`) under their own OPENED forms. The reserve leg: `boundedFill`
(`src/phase-brief.mjs:466`) holds `optional[0].length + join` back only while it is `<= room`.
`test/brief-carries-the-contract.test.mjs` re-run under an isolated `AOF_GLOBAL_HOME` — exit 0, zero
`not ok`, including the swept-at-every-budget never-a-husk lane and the reserve's could-claim-it lane.

**Doctor read at both severities.** `aof work doctor 115` reports no `control-unresolved` at either
severity (a chore declares no `ARCHITECTURE.md` register); its one `warn` is the stream-wide
`numbering-gap` at number 42, which is not this chore's.
