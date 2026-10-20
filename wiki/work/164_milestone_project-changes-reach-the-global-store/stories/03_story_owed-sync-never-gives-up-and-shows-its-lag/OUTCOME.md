# 03 · Owed sync never gives up and shows how far behind it is — Outcome

## Delivered

### Retry until done, with backoff
A reactor may declare `retry: "until-done"` (anything else is refused when the reactor table is built); every `publish-projection` declares it, and a failed step waits `min(15s × 2^attempts, 15 min)` from its last attempt instead of stopping at the five-attempt ceiling, which every other reactor keeps.

### Explicit retries skip the backoff
`doctor --converge` and the lane cleanup drain with `backoff: false`, so an operator retry pays a recovered store at once.

### Doctor shows the sync lag
Where the workspace propagates, `aof work doctor` prints one `sync:` line per workspace (last success, owed steps with age, attempts and error, records changed since the last sync), raises `sync-failing`/`sync-behind` as warnings that never fail validate, and adds a `sync` array to `--json` only where it applies.
