# 209/03 · Conflict and resync — example map

## R1 · A board change AOF did not make to a linked item stops the workflow
- E1 · Story 17/02 is linked to board item 411 at acknowledged revision 6 and has no pending edit. A teammate moves 411 to Closed (revision 7). The next poll records a stop naming 17/02, 411 and revision 7 [proposed]
- E2 · AOF's own status write for 17/02 is acknowledged at revision 8. The feed later reports revision 8 for 411 and the workflow continues [proposed]
- E3 · A teammate adds a comment to 411 (revision 9) and changes nothing AOF tracks. The workflow continues and AOF records revision 9 as acknowledged [stated Q1]
- E13 · A teammate drags 411 to a new position on the board, changing only its order. The workflow stops for 17/02 [stated Q1]
- E4 · The feed reports revision 7 of 411 again after a restart. The existing stop is kept and no second stop is recorded [proposed]

## R2 · A recorded stop survives a restart and is checked before every board write and workflow step
- E5 · After the stop on 17/02 the daemon restarts. "aof work status 17/02 in-review" is refused with work-board-conflict naming 411 and revision 7, and the loop halts board-conflict before its next phase [proposed]
- E6 · AOF writes 17/02's status expecting revision 6 but the board holds revision 7. The board refuses the write, AOF rereads 411, finds a changed state and records the stop [proposed]
- E7 · While 17/02 is stopped, the loop driving milestone 17 halts before its next phase. A loop driving milestone 18 in the same workspace continues, and a status change for 18/00 reaches the board [stated Q2]

## R3 · Loss of feed continuity falls back to comparing every linked item
- E8 · The saved feed position is rejected. AOF compares each linked item's revision with its acknowledgement, finds none changed, and resumes polling from a new position with no stop [proposed]
- E9 · The saved feed position is rejected and 412 (17/03) moved from revision 3 to 5 with a new title. AOF records one stop for 17/03 [proposed]

## R4 · Resync restores AOF's tracked values and clears the stop only after verification
- E10 · "aof work resync-board 17/02" reads 411 at revision 7, writes AOF's status, title, parent, dependencies and order under revision 7, reads revision 8 back with those values and clears the stop. The comment and unmapped fields on 411 are unchanged [proposed]
- E11 · A teammate edits 411 again between AOF's read and write. The board refuses the write, the stop stays and now names the newer revision [proposed]
- E12 · A teammate deletes 411 on the board. Resync creates no board item, the stop stays, and the message asks the operator to restore 411 from the recycle bin before resyncing again [stated Q3]

## Questions
- Q1 · business · answered · Which board changes to a linked item count as an external edit that stops the workflow? A change by someone else to a tracked field: title, state, parent, dependencies or order. Comments, tags, other fields and attachments do not.
- Q2 · business · answered · When one linked item has a conflict, which workflows stop? Every workflow whose scope contains the item. Workflows on other milestones and board writes to other items continue.
- Q3 · business · answered · What does resync do when a linked board item was deleted on the board? It refuses and stays stopped until the operator restores the item from the recycle bin. It never creates a replacement.
- Q4 · technical · defaulted ADR-003 · Is the conflict an operator stop the loop's repair session may not clear? Yes. ADR-003 makes resync an explicit operator request, so board-conflict joins the operator stops.
- Q5 · technical · defaulted ADR-003 · Where is the stop recorded? Beside the board journal for the workspace, written before the feed position advances.
