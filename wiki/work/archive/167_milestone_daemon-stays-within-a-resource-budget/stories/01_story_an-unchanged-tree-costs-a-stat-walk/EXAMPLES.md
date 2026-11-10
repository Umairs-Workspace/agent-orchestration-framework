# 167/01 · An unchanged work tree costs a stat walk — example map

## R1 · A read of a tree nobody edited parses no record doc
- E1 · aof's tree is read, then read again 15 s later with no edit: the second read opens no record doc, and the meter counts one `full-disk-read` and one `cache-hit` labelled `memo` [proposed]
- E2 · One STORY.md's status is edited from `in-progress` to `done` between two reads: the second read parses again and answers `done` [proposed]
- E3 · A new story folder is scaffolded between two reads: the second read answers the new item [proposed]

## R2 · Concurrent reads of one tree share one walk
- E4 · The presence tick and a board poll read aof's tree at the same moment: one walk and one parse happen, and both get the same items [proposed]
- E5 · The shared read fails because the work dir cannot be listed: both callers get the failure, and the next read walks again because a failure is never remembered [proposed]

## R3 · The stat digest has one home
- E6 · The publisher's stat gate and the read memo hash the same tree: both get the same digest, from the one function in `discovery.mjs` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · Is the memo bounded? Yes: one entry per resolved work dir, replaced on each digest change, so its size is the number of registered workspaces.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-003 · What about a tree whose digest cannot be computed? The read bypasses the memo and reads from disk, as today.
