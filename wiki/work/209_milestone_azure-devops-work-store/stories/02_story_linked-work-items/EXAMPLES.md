# 209/02 · Linked work items — example map

## R1 · Publication links a local item to a stable board identity
- E1 · Publishing draft 17 links its existing document home to board item 410. A subsequent find returns one item for 17 [proposed]
- E2 · A linked item 410 disappears upstream. Reading 17 identifies the missing linked item and preserves its local documents [proposed]
- E9 · Draft 17 stays local during refinement. Completing refinement triggers its first publication to the selected board [stated Q1]

## R2 · Retrying an interrupted publication accounts for each item exactly once
- E3 · A create for 17/00 succeeds as 411 but its reply is lost. After restart a retry recovers 411 and creates no duplicate [proposed]
- E4 · A plan creates 410 and refuses its second member. A retry finishes the outstanding member and verifies both links [proposed]

## R3 · Lifecycle and placement preserve the item's identity and document history
- E5 · Inserting a milestone before 17 changes its ref to 18. Board ID 410 still identifies it and its decision record remains readable [proposed]
- E6 · A status change from in-progress to in-review updates the linked board item and preserves the local record body [proposed]
- E10 · In board mode, milestone 17 reaches done and keeps its document home. An archive request leaves its board item and folder in place [stated Q2]

## R4 · An upload is a verified copy of an eligible local artifact
- E7 · Two attempts to copy the same version of diagrams/flow.png result in one verified link on 410 and the original remains readable [proposed]
- E8 · A selected board with uploads disabled tracks 17 without sending its documents [proposed]

## Questions
- Q1 · business · answered · What first publishes a local draft to the selected board? When refinement completes.
- Q2 · business · answered · When should a completed milestone's local folder move to the archive? Archiving applies only in local mode. Work backed by a board is never archived by AOF.
