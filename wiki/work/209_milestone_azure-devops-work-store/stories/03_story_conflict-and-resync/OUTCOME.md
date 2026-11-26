# 03 · A workflow detects an external edit and recovers on operator request — Outcome

## Delivered

### Another party's change to a tracked field stops the workflow
The armed store polls the board even when no local edit is pending. A change by someone else to the title, state, parent, dependencies or order records a stop for that item, and so does a stale write refused by the board. AOF's own acknowledged writes, comments, tags, unmapped fields and attachments do not. A repeated observation keeps the one stop.

### The stop is durable and scoped to the item's top-level ref
A recorded conflict survives a restart. It refuses the item's next status change, halts a loop on the operator stop `board-conflict` before its next phase, and refuses dispatch and lanes under the same top-level ref. Workflows on other refs, and board writes to other items, continue.

### Feed continuity is checked, never assumed
The feed position advances only after its observations are saved. When the feed is lost, a comparison against the acknowledged revisions still finds the change. The gap between the startup comparison and the first poll is covered, and a deleted linked item is a stop.

### `aof work resync-board <ref>` restores AOF's values
It writes AOF's tracked values to the board, verifies them by readback, and only then clears the stop and acknowledges the new revision. A second edit during resync leaves the workflow stopped, and a deleted item is never recreated. Resync is a skip in local file mode and refuses when there is nothing to recover.

## Gaps

### A recorded conflict in the read verbs
- **Status:** open
- **Discharge condition:** a story adds criteria for how `aof work status <ref>` (with no target) and `aof work find` show a recorded conflict and the resync it names.
Only the doors that refuse name a conflict today: the status change, the loop halt and dispatch.

### The Azure feed's first position
- **Status:** open
- **Discharge condition:** a story starts the feed from the current position and measures it on a project of this repo's size.
With no saved position, the first poll pages the project's whole revisions history.
