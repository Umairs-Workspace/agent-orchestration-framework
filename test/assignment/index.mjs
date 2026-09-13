// THE ASSIGNMENT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 69 / story 04 — slots-before-work. Tasks 02/03 amend admission so
// the durable local slot is the git lane, accepted/running rows survive scheduler
// restart as mesh occupancy, and parked answers re-acquire through the same count.
// FF-6907/6908/6910/6911 pin both doors and forbid shadow lease state.
import { slotsBeforeWorkPoolTests, slotsBeforeWorkMeshTests } from "./slots-before-work.test.mjs";
import { admissionRestartResumeTests } from "./admission-restart-resume.test.mjs";
// milestone 69 / story 05 — ADR-007 blocked-run parking and FF-6909.
import { blockedRunParkingTests } from "./blocked-run-parking.test.mjs";
// milestone 35 / story 03 — the READ-ONLY assignment lifecycle in the fleet UI
// (ADR-007): task 00 extends the /api/mesh/status read shape (shapeGlobalStatus)
// to carry assignment rows per item/node; task 01 is the pure assignment-chip
// helper (ui/src/fleet/assignments.mjs) mirroring the run-state ramp; task 02
// re-arms the m34 read-only serve-face posture over the extended shape
// (fitness #11, acd-mesh-ui-read-only). Independent of stories 01/02 — renders
// whatever assignment rows Story 00 wrote.
import { assignmentFleetStatusShapeTests } from "./assignment-fleet-status-shape.test.mjs";

export const tests = [
  // milestone 69 / story 04 — all four @executable tasks + FF-6907/6908/6910/6911.
  ...slotsBeforeWorkPoolTests,
  ...slotsBeforeWorkMeshTests,
  ...admissionRestartResumeTests,
  // milestone 69 / story 05 — blocked runs release capacity and resume the same run.
  ...blockedRunParkingTests,
  // milestone 35 / story 03 — assignment lifecycle in the fleet UI (read-only)
  ...assignmentFleetStatusShapeTests,
];
