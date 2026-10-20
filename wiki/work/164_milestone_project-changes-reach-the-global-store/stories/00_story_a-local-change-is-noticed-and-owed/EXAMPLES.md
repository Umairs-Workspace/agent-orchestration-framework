# 164/00 · A local change is noticed and owed — example map

## R1 · A change to my own record file takes its row in the store, and is never lost before it does
- E1 · I hand-edit 164/00's STORY.md from `not-started` to `in-progress`; the row this node authored says `not-started`: after the next pass the row says `in-progress`, reported by this node [proposed]
- E2 · 05/01's row was last reported by node-9549 (`in-review`, unheld); I pull the merged branch and my STORY.md now says `done`: after the next pass the row says `done`, reported by this node [proposed]
- E3 · 05/01's row was reported by node-9549 (`in-review`); my STORY.md still holds the old scaffold `not-started` and has not changed since I last observed it: the row stays node-9549's `in-review` [proposed]
- E4 · I reword 164/00's user story, touching no frontmatter: no change is claimed and the row is untouched [proposed]
- E5 · The store is locked by another process when the pass runs: the change is still owed, and the next pass lands it [proposed]
- E6 · `work_item_observations` is empty (a new or rebuilt store) and node-9549 authored 05/01: the first pass records what it sees and takes nothing from node-9549 [proposed]

## R2 · A change on an item another machine is working on waits for that machine
- E7 · node-9549 holds an active assignment on 05/01; I hand-edit 05/01's status to `blocked`: the row is not written while it is held, and the edit stays owed [stated Q1]
- E8 · node-9549's assignment on 05/01 settles and reports `in-review`; my `blocked` edit is still owed: the row ends up `blocked` [stated Q1]

## R3 · Each workspace owes at most one sync at a time
- E9 · Three changes are noticed in the aof workspace before anything drains: the journal holds one owed `workspace.changed` step for it, the older two `superseded` [proposed]
- E10 · The same workspace state is noticed twice: one event, not two [proposed]
- E11 · An `item-status.changed` event for 164/00 and a `workspace.changed` mark for the aof workspace are both owed: neither supersedes the other [proposed]

## R4 · Every aof command syncs the workspace it runs in, and never fails because of it
- E12 · With the desktop app stopped, I hand-edit 164/00 and run `aof work list`: the list prints, and the store now holds the edit [proposed]
- E13 · The command runs in a workspace that is not mesh-propagating, or in a dispatch lane: no pass runs [proposed]
- E14 · The pass fails because the store is unreadable: the command's own output and exit code are unchanged, and a degrade is reported [proposed]

## Questions
- Q1 · business · answered · You hand-edit an item while a lane on another machine is actively working on it (say 05/01, running on the Mac). Your edit is held back while that lane runs. When the lane finishes and reports its own status, which one should the store keep? (a) **your edit**: it lands as soon as the lane finishes and replaces the lane's report (E8 as written); (b) **the lane's report**: your edit is dropped from sync and doctor shows it as a conflict for you to redo; (c) **your edit, immediately**: it lands even while the lane is running, and the lane's next report may overwrite it. Answer: (a) your edit. It is held while the lane runs, then lands as soon as the lane finishes and replaces the lane's report.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-002 · What does the fingerprint cover? Row fields only (type, slug, status, title, parent, source path, backlog, archived).
- Q3 · technical · defaulted ARCHITECTURE.md#adr-003 · Where do marks live? The existing journal, as `workspace.changed` with a generic collapse key.
- Q4 · technical · defaulted PLAN.md#cost · What does the CLI pass cost? One stat walk of the work tree, and a row pass only when the stat digest moved.
