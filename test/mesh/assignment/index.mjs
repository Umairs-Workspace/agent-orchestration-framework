// THE MESH/ASSIGNMENT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 63 / story 03 — A MESH ASSIGNMENT RESOLVES TO A LOOP CALL: the one dispatchable
// phase with an orchestrator session to remove (`autonomous`) stops being a slash command
// typed into an interactive PTY and becomes a LOOP LAUNCH carrying the assigned scope, riding
// the directive additively beside `baseBranch` and `commit`; `refine`, `continue` and `verify`
// keep the exact bytes a delivered tree sends; a story-shaped ref is refused AT THE CONTROL
// before a directive is sent; and no leasing, reclaim, presence, routing, PTY, streaming,
// completion or NEEDS_INPUT machinery moves. Task features 00, 01, 02 and 04 (03 is @manual),
// plus FF-6306.
import { meshAssignmentLoopDirectiveTests } from "./mesh-assignment-loop-directive.test.mjs";
// milestone 35 / story 00 — assignment record + assign/withdraw verb + the control-side
// repo-availability gate (ADR-001/003/007): the frozen 10-key record + state→producer
// enum + the additive v2→v3 global_assignments table + dedicated writers (task 00), the
// assign verb + store-uniqueness arbitration (task 01), withdraw as a state write
// (task 02), and the loud coded repo-availability gate (task 03).
import { meshAssignmentRecordTests } from "./mesh-assignment-record.test.mjs";
import { meshAssignVerbTests } from "./mesh-assign-verb.test.mjs";
import { meshAssignWithdrawTests } from "./mesh-assign-withdraw.test.mjs";
import { meshAssignRepoGateTests } from "./mesh-assign-repo-gate.test.mjs";
import { meshAssignmentStatusUplinkTests } from "./mesh-assignment-status-uplink.test.mjs";
import { meshAssignmentReclaimTests } from "./mesh-assignment-reclaim.test.mjs";
import { meshAssignmentDirectiveTests } from "./mesh-assignment-directive.test.mjs";

export const tests = [
  // milestone 63 / story 03 — a mesh assignment resolves to a loop call (tasks 00, 01, 02, 04;
  // task 03 is @manual) plus FF-6306.
  ...meshAssignmentLoopDirectiveTests,
  // milestone 35 / story 00 — assignment record + assign/withdraw verb + repo-availability gate
  ...meshAssignmentRecordTests,
  ...meshAssignVerbTests,
  ...meshAssignWithdrawTests,
  ...meshAssignRepoGateTests,
  ...meshAssignmentStatusUplinkTests,
  ...meshAssignmentReclaimTests,
  // VERIFICATION (UI phase selection, 2026-07-25) — refine/continue/verify chosen in the
  // UI: the phase→command mapper, the additive side-table, the dispatch tick honouring it,
  // and the route→verb→side-table persistence with closed-set validation.
  ...meshAssignmentDirectiveTests,
];
