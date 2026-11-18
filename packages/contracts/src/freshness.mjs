// Shared strict threshold predicate for run, presence and cache liveness.
export function isStale(run, nowMs, stalenessThreshold) {
  const liveness = run.heartbeatAt ?? run.updatedAt;
  const age = nowMs - Date.parse(liveness);
  return age > stalenessThreshold;
}

// ownerGone(run, horizon) — whether a run's owner is KNOWN to be gone, where `isStale` only infers
// it from silence. `horizon` is `{ node, beforeMs }`: no owner survives of a run `node` minted and
// that was last alive before `beforeMs`. Two producers name one — a machine's boot instant (nothing
// that beat before it outlived the restart) and an operator's `--reclaim` (the instant they vouched
// for). A horizon is ONE machine's fact, so a run another node minted is never matched, and an
// absent node matches only an absent node. It may also name ONE loop (`loopRunId`): then only a run
// carrying that loop's declaration is behind it — an operator vouches for the loop they resume, never
// for another session's run in the same scope. Strict `<`: a run alive AT the horizon is not behind it.
export function ownerGone(run, horizon) {
  if (horizon == null || !Number.isFinite(horizon.beforeMs)) return false;
  if ((run?.node ?? null) !== (horizon.node ?? null)) return false;
  if (horizon.loopRunId != null && run?.brief?.loop?.loopRunId !== horizon.loopRunId) return false;
  const aliveMs = Date.parse(run.heartbeatAt ?? run.updatedAt);
  return Number.isFinite(aliveMs) && aliveMs < horizon.beforeMs;
}
