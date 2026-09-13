// THE PLANNING SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 55 / story 02 — provenance compiled from injected facts and enforced at
// the durable grade/anchor-reading write seams (FF-5504).
import { provenanceAtWriteTimeTests } from "./provenance-at-write-time.test.mjs";
// milestone 62 / story 00 — the corpus's three declared source lanes, their fixed floors,
// their shared scope rule and the distinction between a starved lane and an unmatched scope.
import { tuneCorpusTests } from "./tune-corpus.test.mjs";
// milestone 62 / story 02 — disk-resolved provenance, honest demotion and the
// distinct-document proposal floor, plus FF-6204's two imported-grammar controls.
import { tuneProvenanceTests } from "./tune-provenance.test.mjs";
// milestone 62 / story 03 — proposal distance, acceptor-owned removals, measured
// prerequisite limbs, shrink-only closure and FF-6206's no-copy/no-second-walk guard.
import { tuneDistanceTests } from "./tune-distance.test.mjs";
// milestone 62 / story 05 — pure, lossless candidate formation under a readable,
// variable criterion, plus FF-6209's partition and content-derived tie-break.
import { tuneFormationTests } from "./tune-formation.test.mjs";
// milestone 62 / story 04 — the registered read face, acceptor-only verdict seam,
// byte-level read-only proof and the integrated real-corpus acceptance condition.
import { tuneCommandTests } from "./tune-command.test.mjs";
import { planningInitTests } from "./planning-init.test.mjs";
import { planningPrdTests } from "./planning-prd.test.mjs";
// milestone 06 — headroom plugin (story 00: config-contract @executable traceability)
import { headroomConfigContractTests } from "./headroom-config-contract.test.mjs";
// milestone 06 — headroom plugin (story 01: toggle-cli, story 02: wrap-routing @executable traceability)
import { headroomToggleCliTests } from "./headroom-toggle-cli.test.mjs";
import { headroomWrapRoutingTests } from "./headroom-wrap-routing.test.mjs";
// milestone 12 — managed tool provisioning (story 03: headroom retrofit — the
// store-first re-point of headroom's defaultWhich onto resolveManagedBinary, ADR-004
// task 00; the headroom descriptor's uv-lane plan + the tool-platform platform-matrix
// warning, ADR-004 task 01 @executable; @executable traceability)
import { headroomStoreFirstTests } from "./headroom-store-first.test.mjs";
import { headroomProvisionPlatformTests } from "./headroom-provision-platform.test.mjs";
// milestone 71 / story 01 — findings become work items (ADR-003/ADR-004): the triage
// rule as a pure decider + the second face on the one promotion engine, plus FF-7103
// (one type, one placement, zero shifts) and FF-7104 (one engine, two faces, no rival).
import { promoteFindingToChoreTests } from "./promote-finding-to-chore.test.mjs";
// milestone 62 / story 01 — the proposal, its registry-computed lane and its complete
// patch: all five @executable tasks plus FF-6202 and FF-6203.
import { tuneProposalTests } from "./tune-proposal.test.mjs";
import { promoteGapToChoreTests } from "./promote-gap-to-chore.test.mjs";

export const tests = [
  // milestone 55 / story 02 — stamped claims, fail-closed writes, and run-record readings
  ...provenanceAtWriteTimeTests,
  // milestone 62 / story 00 — three source-owned readers behind one floor-disciplined corpus.
  ...tuneCorpusTests,
  // milestone 62 / story 02 — provenance resolution and FF-6204.
  ...tuneProvenanceTests,
  // milestone 62 / story 03 — measured distance and FF-6206.
  ...tuneDistanceTests,
  // milestone 62 / story 05 — candidate formation tasks 00–04 and FF-6209.
  ...tuneFormationTests,
  // milestone 62 / story 04 — tasks 00–04 plus FF-6201, FF-6207 and FF-6208.
  ...tuneCommandTests,
  ...planningInitTests,
  ...planningPrdTests,
  ...headroomConfigContractTests,
  ...headroomToggleCliTests,
  ...headroomWrapRoutingTests,
  ...headroomStoreFirstTests,
  ...headroomProvisionPlatformTests,
  // milestone 71 / story 01 — all three @executable tasks (the triage rule, the
  // promotion, and the one-type bound) + FF-7103 + FF-7104. 39/03's own untouched
  // suite is the control on the extraction being behaviour-preserving.
  ...promoteFindingToChoreTests,
  // milestone 62 / story 01 — proposal lanes and complete patches (tasks 00–04) +
  // FF-6202/FF-6203.
  ...tuneProposalTests,
  ...promoteGapToChoreTests,
];
