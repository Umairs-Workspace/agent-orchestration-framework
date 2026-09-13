// THE MESH/LAUNCHER SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { meshFaceSkeletonTests } from "./mesh-face-skeleton.test.mjs";
// milestone 33 (story 01) — fabric-native transport + coordination launcher: task 03
// (03_coordination-launcher.feature): src/mesh/launcher.mjs's launcherProbe (the
// NON-BLOCKING mesh:serve registered-run shape) + startLauncher (the --serve daemon —
// preflight-refuse-with-guidance, publish presence, the reused sync loop, the peer-poll
// ticker, the observable stop() seam for SIGINT/SIGTERM) over an injected fabric-exec +
// injected tickers — no tailnet, no wall-clock wait. task 04 (04_operator-guidance
// .feature): src/mesh/fabric.mjs's fabricGuidance/remediationForReason/
// macOsAppStoreSplitWarning — the healthy-tailscale guidance, the per-BackendState
// remediation matrix, the macOS App-Store-CLI-split warn over an injected platform, and
// work doctor (src/commands/doctor.mjs) surfacing the SAME remediation, silent when the
// mesh fabric is unconfigured.
import { meshCoordinationLauncherTests } from "./mesh-coordination-launcher.test.mjs";
import { meshLauncherStreamRoleTests } from "./mesh-launcher-stream-role.test.mjs";
import { meshLauncherLockTests } from "./mesh-launcher-lock.test.mjs";
// ── milestone 48 / story 02 — RUN SUBSUMPTION MOVES TO THE FORMATTER (ADR-004, with
// ADR-009's one-home clause and ADR-010 R3's strictness ruling). The milestone's ONLY
// behaviour-changing merge, and its two halves MUST land together: the producer's
// `.filter(...)` is deleted so every live session reaches the wire (the busiest session in
// the fleet is addressable instead of hidden), and `fleetCurrentWorkLines` applies the
// display rule over the `workspaceHasRun` fact — so the operator sees byte-identical
// output from a wire that no longer hides anything.
//   task 00 — the WIRE: fed by the REAL assembler over a hermetic repo with real run and
//   session records; the same-workspace session is PRESENT and stamped, activeRuns is
//   untouched, the stamp follows activeRuns' own run-state rule, and a session read fault
//   still degrades to `sessions: []` through the coded-degrade channel.
import { meshLauncherSessionWireCompleteTests } from "./mesh-launcher-session-wire-complete.test.mjs";

export const tests = [
  ...meshFaceSkeletonTests,
  ...meshCoordinationLauncherTests,
  ...meshLauncherStreamRoleTests,
  ...meshLauncherLockTests,
  // milestone 48 / story 02 — run subsumption moves to the formatter (ADR-004/009/010 R3).
  // Its two @executable task features (00 the wire, fed by the REAL assembler; 01 the pure
  // render). The fitness function this story AMENDS is acd-session-run-reconciliation,
  // registered with m38's block above.
  ...meshLauncherSessionWireCompleteTests,
];
