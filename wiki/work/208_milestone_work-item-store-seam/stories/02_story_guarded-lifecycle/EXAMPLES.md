# 208/02 · Status moves and run effects use the selected store — example map

## R1 · The item type and current state govern the move
- E1 · Given chore 11 is not-started with a user-authored body, when the operator moves it to in-progress, a subsequent find returns in-progress and the body and unrelated fields are preserved [proposed]
- E2 · Given prototype 16 is paused, when the operator moves it to active, the move succeeds and the file delta matches the accepted prototype baseline [proposed]

## R2 · Run effects retain their narrower status preconditions
- E3 · Given a caller observed not-started and the item is now blocked, when the caller requests in-progress expecting not-started, the store refuses the stale move and the blocked record is unchanged [proposed]
- E4 · Given a running story has already moved to in-review, when its run closes with a failure, the bounded rollback leaves the reviewed story in-review [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Which layer owns the expected-state check?
