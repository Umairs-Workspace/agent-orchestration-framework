// THE MESH/SESSION SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { meshSessionCliRecordTests } from "./mesh-session-cli-record.test.mjs";
import { meshSessionTtlLivenessTests } from "./mesh-session-ttl-liveness.test.mjs";
//   task 00 — the ordered ladder over the REAL CLI (`--session` → payload `session_id` →
//   `CLAUDE_SESSION_ID` → null), byte-identical storage, and the coded refusals unmoved.
import { meshSessionIdLadderTests } from "./mesh-session-id-ladder.test.mjs";
//   task 01 — two sessions in one repo are two records, `end` removes only its own leaf,
//   and the record read back off disk is the ordered seven.
import { meshSessionPerSessionRecordTests } from "./mesh-session-per-session-record.test.mjs";
//   task 02 — the reaper: an expired leaf (including a pre-m48 3-part one — ADR-002's whole
//   migration) is gone after one real start/ping, a peer's leaf never is, and a reap fault
//   never fails the write.
import { meshSessionOrphanReaperTests } from "./mesh-session-orphan-reaper.test.mjs";
//   task 00 — the PROJECTION: the freshness gate (a stale/unknown node contributes ZERO
//   while its own presence record is left untouched), no session-level liveness re-derived,
//   the anonymous session absent from the index and complete in `sessions[]`, rebuildability
//   with no memoised identity, codepoint ordering, and every lookup miss exactly `null`.
import { meshSessionIndexProjectionTests } from "./mesh-session-index-projection.test.mjs";
//   task 01 — ATTRIBUTION and the FREE SESSION: `workItem` explicitly present (null for a
//   free session, `{ ref, assignmentId }` on a two-column match), the payload's additive
//   `sessions` key with every pre-existing key unmoved, and the SERVED runtime shape read
//   off a real fleet server on an EPHEMERAL port.
import { meshSessionIndexAttributionTests } from "./mesh-session-index-attribution.test.mjs";
// milestone 50 / story 01 — session-spawn directive (ADR-002): the wire kind, frame
// builders, and the worker-stream-client receive lane.
import { meshSessionSpawnDirectiveTests } from "./mesh-session-spawn-directive.test.mjs";
// milestone 50 / story 03 — the WORKER-SIDE spawn handler (ADR-003 + ADR-004, as
// amended by ADR-007): the operator's default shell in a workspace checkout or an
// item's worktree, registered through the SAME m48 session API, bridged onto the SAME
// terminal-frame wire, with four coded refusals. Tasks 00–03.
import { meshSessionSpawnHandlerTests } from "./mesh-session-spawn-handler.test.mjs";

export const tests = [
  ...meshSessionCliRecordTests,
  ...meshSessionTtlLivenessTests,
  ...meshSessionIdLadderTests,
  ...meshSessionPerSessionRecordTests,
  ...meshSessionOrphanReaperTests,
  ...meshSessionIndexProjectionTests,
  ...meshSessionIndexAttributionTests,
  // milestone 50 / story 01 — session-spawn directive (ADR-002): the wire kind +
  // frame builders + worker-stream-client receive lane (tasks 00 + 01)
  ...meshSessionSpawnDirectiveTests,
  // milestone 50 / story 03 — the worker-side PTY open + session registration
  // lifecycle + output bridging + coded failure/cleanup (tasks 00–03), plus the two
  // source-shape gates that hold the lane boundaries independently of it
  ...meshSessionSpawnHandlerTests,
];
