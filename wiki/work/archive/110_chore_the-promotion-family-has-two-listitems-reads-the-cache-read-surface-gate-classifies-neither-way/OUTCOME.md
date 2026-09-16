# 110 · The Promotion Family Has Two Listitems Reads The Cache Read Surface Gate Classifies Neither Way — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### Every promotion-family disk read carries an ADR-005 category
The `acd-cache-read-surface-boundary` gate names all three reads the promotion family makes:
`appendPosition` and `findPromotedChore` are pinned (c) STRUCTURAL against `src/work-promote/promotion.mjs`,
and `runPromoteFindingToChore`'s ref-resolution scan is an (a) CONTROL_SIDE entry — no promotion read
is invisible to the gate in either direction.

### The reviewed ref resolves cache-first
`runPromoteFindingToChore` reads the stream through `listItemsCacheFirst(ctx.workspace)` rather than
`listItems(workDir)`, so a finding raised while reviewing a worker-authored item resolves on control
instead of being refused as `promote-finding-unknown-ref`, and the depth bound is reached for a ref
this node's disk has never held.

### A CONTROL_SIDE entry fails on relocation instead of passing green
Every entry in the (a) list is `{ file, subject }`, and the ARMED leg reports a straggler when the
module is gone or no longer declares that subject — so a module the migrated read has LEFT, or one
deleted outright, no longer satisfies the absence for free. Proven non-vacuous by a planted
`runPromoteFindingToChoreMOVED` subject, which trips the leg.

### promote-finding-to-chore.mjs imports nothing from work.mjs
`src/commands/promote-finding-to-chore.mjs` holds no import of `src/work.mjs`, one fewer importer of
the 37-module god-node named by m41/ADR-001.
