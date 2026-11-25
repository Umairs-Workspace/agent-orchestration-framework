# 209/01 · Azure board adapter — example map

## R1 · Use the executing account to access a project that supports the declared mappings
- E1 · An inherited Agile project maps board item 410 of type Feature in Active to an in-progress milestone [proposed]
- E2 · A project missing the configured Blocked state for User Story identifies that mapping before changing an item [proposed]
- E9 · A personal-account HTTP read succeeds with the token from the executing account and the Azure pass-through header [proposed]

## R2 · Reads cover the selected stream, its relations and the requested IDs
- E3 · A recorded area containing 2,505 work items returns item 2,505, its lower-ranked neighbour and its dependency across detail batches [proposed]
- E4 · A verification read requests only 410 and 411. The reply accounts for 410 and identifies missing 411 [proposed]

## R3 · Report the outcome of each guarded change and verify attachment links
- E5 · Item 410 advanced from revision 8 to 9 before a status patch. Azure refuses the stale patch and the remote values stay at revision 9 [proposed]
- E6 · A batch applies the change to 410 and refuses the change to 411. The caller can identify which member applied [proposed]
- E12 · Upload succeeds but item 410 lacks the attachment relation on readback. The adapter reports the copy as unverified [proposed]

## R4 · Change observations preserve feed position and item revisions
- E7 · Polling from c17 returns two revisions of 410 in order and a continuation position c18 [proposed]
- E8 · The feed rejects c17 as expired. The caller sees loss of coverage [proposed]

## Questions
