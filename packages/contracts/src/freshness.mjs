// Shared strict threshold predicate for run, presence and cache liveness.
export function isStale(run, nowMs, stalenessThreshold) {
  const liveness = run.heartbeatAt ?? run.updatedAt;
  const age = nowMs - Date.parse(liveness);
  return age > stalenessThreshold;
}
