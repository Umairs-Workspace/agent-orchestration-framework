# 06 · Local runs reach the store through the ledger — Outcome

## Delivered

### Local runs are published through the ledger
`run.started` and `run.completed` each carry a `publish-run` reactor (locus `local`, retried until done) beside `publish-projection`. It upserts the run's current record into `work_item_runs` with this node as reporter, only for a workspace the propagation predicate allows; a run recorded before this change reaches the store through the reconciler's backfill.

- **A store outage owes the row, it never refuses the transition** — a transition whose publish finds the store unopenable leaves `publish-run` owed in the journal, and the row lands when the step drains. The `aof work run-start` verb itself still refuses in a mesh-enabled workspace when the store cannot be opened, because the item lock fails closed (m43/ADR-003 R1.4).

### The presence tick reads what is running from the store
The tick takes this node's running runs and their loops from `work_item_runs` in one query over its shared store handle (`readStoreActivity`), and reads no item's `runs/` folder. A loop's `lastActivityAt` is the one per-running-run disk read (FF-16705).

- **A workspace that does not propagate has no rows** — its runs are not in this node's presence, and a tick whose store cannot be opened reports no own runs.

## Gaps

### A failed publish-run step on the verb
- **Status:** open
- **Discharge condition:** `threadPropagationWarnings` threads `publish-run` outcomes as it does `publish-projection` ones.
A failed `publish-run` step raises no verb warning; it is visible only through doctor's unsettled steps and the sibling `publish-projection` warning (m167/F-02).

### `aof mesh heartbeat` reads runs off disk
- **Status:** open
- **Discharge condition:** the heartbeat verb reads active runs and loops through `readStoreActivity`, as the tick does.
The verb still lists a non-propagating workspace's runs from its run files, which the tick does not (m167/F-03).
