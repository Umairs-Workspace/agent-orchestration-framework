# 05 · The public work verbs and loop are verified against a board — Outcome

## Delivered

### The 150 work-verb captures replay over a recorded Azure board and a second board
`work-stream.test.mjs` runs every accepted 205 capture three times: over files, over the shipped Azure definition with sanitized recorded HTTP, and over a project-owned alternate board under the fixture's own `.aof/`. Each case checks both the repository artifacts and the board items.

### The loop is exercised end to end over a board
A recorded-board case drives a story through `/aof:continue` and `/aof:verify`. It halts on a competing tracked edit with `board-conflict` and resumes after `aof work resync-board`, and the board sees each status move in order.

### A live Azure DevOps project runs the work verbs
The `umair-butt` organization holds an "AOF Agile" inherited process and an AOF Board Test project on it. There, `publish-board`, `status`, `list` and `resync-board` published, moved and resynced a Feature, a User Story and a custom Chore. Azure itself refused a stale guarded write with 412, and AOF recorded the conflict.

## Assumptions

- **The recorded replies are a subset of the live process metadata** — the live project also carries states the recordings omit (`Removed` on the Agile-derived types, `New` on Prototype), which the adapter reads as an unmapped-state fault on the item rather than a setup failure.

## Gaps

### The desktop daemon's own preflight running board-access
- **Status:** open
- **Discharge condition:** the payload at or after 209/04 is installed with `install-local` and the desktop app is restarted, so the running preflight reports `board-access` ok for a board-backed workspace.
The live run passed `board-access` under the LaunchAgent's environment with the checkout's `aof`. The installed daemon payload predates 209/04, so the desktop app's running preflight has not yet run the check.
