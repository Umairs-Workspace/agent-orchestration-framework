// The worker-to-control negative acknowledgement for a reserved terminal resume.
// It carries the reservation's complete compare-and-set identity so control can
// restore only the exact row this worker refused, including an overridden target.
export const TERMINAL_RESUME_REFUSED_KIND = "terminal-resume-refused";

export function buildTerminalResumeRefusedFrame(nodeId, {
  assignmentId,
  reservedAt,
  targetNodeId,
  previousNodeId,
  code,
  now,
} = {}) {
  return {
    kind: TERMINAL_RESUME_REFUSED_KIND,
    nodeId,
    assignmentId,
    reservedAt,
    targetNodeId,
    previousNodeId,
    code,
    at: now,
  };
}
