// The applied park event is the stable identity of one released slot. Resume
// carries it through the relay so a repeated delivery of the same answer remains
// one process, while a later park (a new event id) may be answered normally.
export function latestAppliedAssignmentParkEventId(journal, assignmentId, { runId = null, sessionId = null } = {}) {
  if (!assignmentId) return null;
  const row = journal.db.prepare(`
    SELECT e.event_id AS eventId
    FROM events e
    JOIN effect_steps s ON s.event_id = e.event_id
    WHERE e.name = 'assignment.reported'
      AND s.reactor_key = 'settle-assignment'
      AND s.status = 'done'
      AND json_extract(e.payload, '$.assignmentId') = ?
      AND json_extract(e.payload, '$.state') = 'running'
      AND json_extract(e.payload, '$.code') = 'needs-input'
      AND json_extract(e.payload, '$.runId') IS ?
      AND json_extract(e.payload, '$.sessionId') IS ?
    ORDER BY e.rowid DESC
    LIMIT 1
  `).get(assignmentId, runId, sessionId);
  return row?.eventId ?? null;
}
