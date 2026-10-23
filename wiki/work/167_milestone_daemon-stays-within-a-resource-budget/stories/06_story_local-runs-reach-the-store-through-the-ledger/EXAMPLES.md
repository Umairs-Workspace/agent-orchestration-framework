# 167/06 · Local runs reach the store through the ledger — example map

## R1 · A run on this node reaches the store when it starts and when it ends
- E1 · `aof work run-start 01/00` in the mesh-enabled workspace `aof` on `node-7297`: the store's run rows hold that run, `running`, reported by `node-7297` [proposed]
- E2 · The same run completes with `--outcome done`: its row reads `done` [proposed]
- E3 · A run silent past the staleness threshold is reclaimed by the sweep: its row reads the reclaimed state, not `running` [proposed]
- E4 · The store cannot be opened when the run starts: the run still starts, the journal step stays owed, and the row lands on the next drain [proposed]
- E5 · A `running` record written before this change, with no `run.started` event: the reconciler's backfill puts it in the store [proposed]

## R2 · The presence tick reads what is running from the store, not from every item's runs folder
- E6 · A workspace of 1,800 items with 1 running run: one tick reads no item's `runs/` folder, and the presence record's active runs are exactly that run [proposed]
- E7 · A running loop-driven run: the presence record's loop entry carries the run's latest `heartbeatAt` as its last activity [proposed]
- E8 · A running row that `node-2976` streamed for the same workspace: it is not in `node-7297`'s active runs [proposed]
- E9 · A workspace that does not propagate, with a running run: it is not in this node's presence [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-008 · Does a workspace that is not on the mesh still show its runs in this node's presence? It has no ledger rows, so no; no face shows it.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-008 · Where does a loop's last activity come from, when the heartbeat raises no event? From the running run's own record, one read per running run.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-008 · How does a run recorded before this change reach the store? Through the reconciler's existing backfill.
