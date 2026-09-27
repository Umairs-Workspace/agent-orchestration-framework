
# 14 · One channel, several projects — Outcome

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

### `/loop` finds its project by the loop the scope names
With several projects on one channel and no `workspace:`, `/loop stop` and `/loop resume` run in the one project whose scope carries a loop declaration (`hasLoopOn`, `src/loop/stop.mjs`); none is refused `discord-loop-not-found`, and a real tie is refused `discord-scope-ambiguous` naming only the tied projects.

### A dispatch lane is never served as a project
The bot's served list folds every member through `foldDispatchWorktree`, so a workspace whose presence recorded a lane's worktree is served as its primary checkout.

## Gaps

### Presence still records a lane's root
- **Status:** open
- **Discharge condition:** the workspace descriptor publish records the primary checkout, never a dispatch worktree (F-131-18).
Other readers of `global_workspace_descriptors.project_root` still see a lane's worktree while one publishes.
