---
type: chore
number: 110
slug: the-promotion-family-has-two-listitems-reads-the-cache-read-surface-gate-classifies-neither-way
title: "The Promotion Family Has Two Listitems Reads The Cache Read Surface Gate Classifies Neither Way"
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
# 110 · The Promotion Family Has Two Listitems Reads The Cache Read Surface Gate Classifies Neither Way

## Intent

The `acd-cache-read-surface-boundary` gate (m43/ADR-005) sorts every disk read into (a) control-side,
(b) worker-side or (c) structural — and named neither of the promotion family's two remaining
`listItems` reads. An unclassified read is invisible to the gate in BOTH directions: nothing pins it
to disk and nothing requires it off disk, so a migration and a stray pin pass equally green. This
chore makes the classification and lands each read in the list its category names.

Since the chore was raised, `src/work-read.mjs` has landed (2026-09-01), so the gate's ARMED leg is
live rather than dormant — which turned the (a) answer from a list edit into a migration.

## Definition of Done

- [x] Classify ADR-005's (a)/(c) for the two promotion-family disk reads the boundary gate names in neither list: promote-finding-to-chore.mjs's ref-resolution scan (does the reviewed ref resolve?) and work-promote/promotion.mjs's findPromotedChore idempotence scan. Both are item-state reads by shape, so control-side (a) is the likely answer — but the classification is an ADR-005 act, not a guess. Add each to CONTROL_SIDE or STRUCTURAL in test/arch/acd-cache-read-surface-boundary.test.mjs, with its subject anchor, so the ARMED leg covers them when src/work-read.mjs lands.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "the promotion family has two listItems reads the cache-read-surface gate classifies neither way" (`src/commands/promote-finding-to-chore.mjs:66`)
- **Raised reviewing:** `88`, review round 1
- **Promotion key:** `finding:88:the promotion family has two listitems reads the cache-read-surface gate classifies neither way`

### The classification (the ADR-005 act)

The category is a property of the READ, not of the module or the family — which is why one function
makes three reads that land in two different lists. The discriminator ADR-005 actually supplies is
what the read reaches through, and `src/work-read.mjs` settles it in code: `buildStreamView` starts
from `listItems(workDir)` and only OVERLAYS state onto it, then APPENDS `cacheOnlyItem` rows whose
`dir` and `name` are `null`. So a cache-first read can never miss a local item; the only thing it
adds is rows with no folder here.

- **`promotion.mjs`'s `findPromotedChore` idempotence scan → (c) STRUCTURAL.** Already landed at
  `107`; this chore confirms it rather than re-deciding it, and adds the reach-through evidence:
  the scan does `readFile(path.join(item.dir, "CHORE.md"))`, so it needs a REAL folder — a cache-only
  row's `dir: null` is exactly the ADR-010/R6.4 reach-through case, on top of the disk being the
  subject of the write it guards.
- **`promote-finding-to-chore.mjs`'s ref-resolution scan → (a) CONTROL-SIDE.** It reaches through
  neither `dir` nor `number`: it asks whether the reviewed ref resolves and whether it is itself a
  chore (the 118/01 depth bound), and `cacheOnlyItem` carries `type`. Disk-only, a finding raised
  reviewing a worker-authored item is refused on control as "does not resolve" — ADR-005's own
  false-finding class — and the depth bound never gets to state its own reason. Migrated to
  `listItemsCacheFirst` with the classification, because the seam has since landed and the gate's
  ARMED leg is live. 71/01's delivered criterion is untouched: it says "an item ref that does not
  resolve", which is source-neutral, and an unknown ref is still unknown to both sides.

`appendPosition` (the family's third read) keeps its (c) pin from ADR-010/R6.3, unchanged.

### Also landed

- **CONTROL_SIDE entries now carry a SUBJECT anchor**, which is what "add it with its subject anchor"
  costs on the negative side of the gate. A control-side entry asserts an ABSENCE, and an absence is
  satisfied for free by a module the read has LEFT — the ADR-016/G2 relocation hole inverted, and
  worse, because a positive pin fails loudly on a relocation while this one went green on it. Proven
  non-vacuous: a planted `runPromoteFindingToChoreMOVED` subject trips the leg.
- **A missing control-side module is now a re-point signal, not a silent `continue`** — the positive
  pins already treated it that way, and the inconsistency let a deleted module satisfy the absence.
- `src/commands/promote-finding-to-chore.mjs` no longer imports `src/work.mjs` at all: one fewer
  importer of the 37-module god-node (m41/ADR-001).

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
