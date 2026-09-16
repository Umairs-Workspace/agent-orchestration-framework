---
type: chore
number: 107
slug: acd-cache-read-surface-boundary-is-red-on-a-clean-tree-its-pinned-reader-promote-gap-to-chore-mjs-no-longer-declares-defaultat
title: "Acd Cache Read Surface Boundary Is Red On A Clean Tree Its Pinned Reader Promote Gap To Chore Mjs No Longer Declares Defaultat"
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
# 107 · Acd Cache Read Surface Boundary Is Red On A Clean Tree Its Pinned Reader Promote Gap To Chore Mjs No Longer Declares Defaultat

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

The `acd-cache-read-surface-boundary` fitness function (m43/ADR-005) pinned
`src/commands/promote-gap-to-chore.mjs` for the subject `defaultAt()` — and that read has MOVED.
Milestone 71 / story 01 extracted the promotion ENGINE to `src/work-promote/promotion.mjs`
(ADR-004: one engine, two faces), where the append-position read is now `appendPosition()` and
answers for BOTH promotion faces rather than one. ADR-016/G2's subject anchor did exactly what it
was written to do — it went RED on the relocation instead of passing green on a surviving
`listItems` call elsewhere in the file — so the pin is re-pointed at the read's new home, never
deleted. Housekeeping now because the suite is red on a clean tree, and a standing red fitness
function is one every later reviewer learns to read past.

## Definition of Done

- [x] The structural read this pin protects has MOVED. Find its new home and re-point the pin (ADR-016/G2 says re-point, never delete), then re-run test/arch/acd-cache-read-surface-boundary.test.mjs. Pre-existing and unrelated to story 85; surfaced by running the arch suite at 85's review gate.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "acd-cache-read-surface-boundary is red on a clean tree: its pinned reader promote-gap-to-chore.mjs no longer declares defaultAt()" (`src/commands/promote-gap-to-chore.mjs:1`)
- **Raised reviewing:** `85`, review round 1
- **Promotion key:** `finding:85:acd-cache-read-surface-boundary is red on a clean tree: its pinned reader promote-gap-to-chore.mjs no longer declares defaultat()`
- **Discharged by `43e159dd`** (the milestones 78 + 96 PR, #28), which landed while this chore was
  open. The suite's STRUCTURAL entry now reads
  `{ file: src/work-promote/promotion.mjs, symbols: ["listItems"], subject: "appendPosition" }`.
  This session VERIFIED the re-point rather than re-applying it, and checked what a green suite
  alone does not say: `appendPosition()` is declared in `promotion.mjs` and imports `listItems`
  from `../work.mjs`; `promote-gap-to-chore.mjs` now imports NO disk reader at all; and the second
  face, `promote-finding-to-chore.mjs`, reaches the disk only through that same engine — so the
  old per-face pin left nothing unguarded behind it. Re-ran
  `test/arch/acd-cache-read-surface-boundary.test.mjs`: 5/5 green.
- **Fixed at the review close (finding-triage q2 — cheaper than the driver that would carry it):**
  the structural lens found `promotion.mjs` holds a SECOND structural disk read,
  `findPromotedChore(workDir)` — the pre-write idempotence scan — while a pin carries ONE subject.
  Pinning only `appendPosition` would leave that read green-by-accident if IT relocated while its
  neighbour stayed: the ADR-016/G2 relocation hole one level out, in the very module G2 had just
  been re-pointed to. Added a second STRUCTURAL entry naming `findPromotedChore` as its subject.
  Suite re-run after the fix: 5/5 green. No item created — the remedy is one array entry, against
  a driver's folder, record doc, DoD, validate gate and `aof:verify` session.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
