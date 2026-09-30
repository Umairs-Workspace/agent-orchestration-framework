// Compatibility entry; construction belongs to core application assembly.
import { meshAssignmentReclaim } from "../application/default.mjs";
export const {
  DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS,
  assignmentOccupiesDispatchSlot,
  countDispatchSlotsByTarget,
  dualStalenessDecision,
  reclaimStaleAssignments,
  runControlDispatchReclaimTick,
} = meshAssignmentReclaim;
