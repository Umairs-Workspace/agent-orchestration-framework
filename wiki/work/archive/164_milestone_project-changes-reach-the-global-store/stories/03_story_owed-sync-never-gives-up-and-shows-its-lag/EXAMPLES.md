# 164/03 · Owed sync never gives up and shows how far behind it is — example map

## R1 · An owed sync is retried until it lands, without hammering a broken store
- E1 · The aof workspace's `workspace.changed` step has failed 5 times because the store was locked; the lock clears: the next drain retries it and it lands [proposed]
- E2 · A `workspace.changed` step failed 2 seconds ago after 3 attempts: a drain now skips it (backoff), and a drain after the backoff retries it [proposed]
- E3 · A reactor that does not declare `retry: "until-done"` (say the Notion sync) fails 5 times: it is not retried again, exactly as today [proposed]

## R2 · `aof work doctor` shows what is owed and how far behind each workspace is
- E4 · The aof workspace has one owed sync, failing for 40 minutes with "database is locked": `aof work doctor` in aof shows the workspace, that its sync is owed, for how long, its attempts and the last error, and raises a warn finding [stated Q1]
- E5 · Every workspace is in sync: doctor's sync section shows each registered workspace's last successful sync and that nothing is owed, and raises no sync finding [stated Q1]
- E6 · The daemon has been stopped for 2 hours and I hand-edited two records in aof-test-repo since: `aof work doctor` in aof-test-repo shows 2 changed records not yet synced, and its last successful sync 2 hours ago [stated Q1]

## Questions
- Q1 · business · answered · Where do you want to see whether the global store is behind (owed syncs, how long each has been failing and why, and each workspace's last successful sync)? (a) **`aof work doctor`**: a sync section per workspace, and a warn finding when a sync has been failing; (b) **`aof mesh status`**: a sync block beside the node and peer status; (c) **the fleet view**: a sync line per workspace card in the desktop UI; (d) **a new `aof mesh sync` verb** that shows the state and forces a pass now. Doctor and mesh status are CLI-only and cheapest. The fleet view needs a UI story. Answer: (a) `aof work doctor`.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-006 · What is the backoff? `min(base * 2^attempts, cap)` from the step's last attempt, with base 15s (one tick) and cap 15 minutes.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-006 · Who declares the retry policy? The reactor entry, with `retry: "until-done"`. The journal stays vocabulary-blind.
