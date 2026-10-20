# 164/03 · Owed sync never gives up and shows its lag — build plan

## Mechanism

**Retry.** `drainEffects` fetches its candidates with `pendingSteps(..., { maxAttempts })`. Split
the fetch:
- steps under the ceiling, exactly as today;
- plus failed steps over the ceiling whose reactor (looked up in the table the dispatcher already
  holds) declares `retry: "until-done"` and whose backoff has elapsed.

The journal gains no vocabulary. It answers "failed steps over the ceiling, with their
`updated_at`", and the dispatcher filters by reactor declaration and clock. `registry.mjs`
validates the new optional key, and `mesh/effects.mjs` declares it on every `publish-projection`
entry.

**Visibility (doctor, Q1).** `commands/doctor.mjs` is doctor's impure edge, which already opens
the journal for `--explain` and `--converge`. It reads:
- the unsettled `publish-projection` steps (`readUnsettledSteps`, key-narrowed), grouped by
  payload `workspaceId`;
- the latest `observed_at` per workspace for this node: one read added beside
  `readObservations` in the projection store, reached through `cache-read.mjs`'s existing opener;
- this workspace's changed-since-observed count, which story 00's predicate computes over the
  snapshot doctor already holds.

It passes all three into `doctorWork` as data. The new pure group `doctor/sync.mjs` turns them
into `sync-failing` and `sync-behind` findings, plus a `sync` block on the result, which the text
render prints as one line per workspace. `packages/work/src/doctor` has a ceiling with no
allowance, so it rises 12 → 13, with ownership stated.

## Verification step

With an isolated `AOF_GLOBAL_HOME`, make the projection store unopenable (a directory where the
file should be), hand-edit a fixture record and run seven `aof work list` commands. The step's
attempts climb past 5 with backoff respected (injected clock). The surface shows the workspace
as owed with the error. Restore the store and run one more command: the step is `done`, and the
surface shows the workspace in sync.

## Out of scope

- Retry policy for any reactor other than `publish-projection`.
- A fleet-view or `aof mesh status` surface: Q1 chose doctor alone.
- Forcing a sync. `aof work doctor --converge` already drains everything owed, and every command
  runs the pass for its own workspace (story 00).
