# 107 · Acd Cache Read Surface Boundary Is Red On A Clean Tree Its Pinned Reader Promote Gap To Chore Mjs No Longer Declares Defaultat — Outcome

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

### The cache-read-surface boundary is green on a clean tree
`acd-cache-read-surface-boundary` passes 5/5 with no standing red, so a failure in that suite is now
a signal rather than known noise a reviewer reads past.

### The promotion engine's disk reads are pinned at their real home
Both of `src/work-promote/promotion.mjs`'s structural reads — `appendPosition` and
`findPromotedChore` — are pinned STRUCTURAL subjects on `listItems`, and `promote-gap-to-chore.mjs`
imports no disk reader of its own, so both promotion faces are guarded through the one engine.
