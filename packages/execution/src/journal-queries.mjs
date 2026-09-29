// Run-specific queries over the generic effects journal.
// hasEventForRun(journal, name, runId) — does an event of this name already
// name this runId in its payload? The d5 reconciler's join: run records carry a
// UNIQUE runId, which is what makes "did the crash eat my event?" answerable at
// all (record-doc bullets have no such key — their window is acknowledged, not
// scanned). json_extract, not LIKE: the payload is a JSON document, not text.
export function hasEventForRun(journal, name, runId) {
  if (!name || !runId) return false;
  const row = journal.db
    .prepare("SELECT 1 FROM events WHERE name = ? AND json_extract(payload, '$.runId') = ? LIMIT 1")
    .get(name, runId);
  return row != null;
}

