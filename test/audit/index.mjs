// THE AUDIT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 59 / story 01 — the instrument census and the bounded spawn seam: registration is
// decided by RUNTIME MEMBERSHIP of what the runner assembled, never by a substring search over
// the runner's source text (FF-5903), and every child process the audit family starts comes
// from one seam that carries a deadline, a kill on expiry and an observed exit code (FF-5904).
import { instrumentCensusTests } from "./instrument-census.test.mjs";
import { auditSpawnBoundedTests } from "./audit-spawn-bounded.test.mjs";
// milestone 59 / story 03 — STALENESS, SILENCE AND THE PRUNE. Four judgments the existing checks
// could not make, in the pure leaf that already holds them: an anchor nobody refreshed (three
// answers, not two — stale, undated, fresh), an instrument that has said nothing inside its own
// declared `cadence:` (ONE rule keyed on a field every record carries, not one rule per channel), a
// counter that has not moved across the declared number of cycles, and a declared loop nobody
// consults — reported by name and never removed. FF-5907 EXTENDS 52's purity guard (already
// imported above, so no second registration) rather than adding a sibling: the module still imports
// nothing, holds no date and no duration literal, and every clock reading arrives on the call.
// FF-5908 is the new gate, and its sharpest leg is the BIND — the checks leaf may not import the
// census, so its `audit-ran-on-nothing` is necessarily a second mechanical copy, and the gate
// asserts the two are byte-identical for the same read record (58/FF-5807's move, one milestone on).
import { instrumentStalenessTests } from "./instrument-staleness.test.mjs";
// milestone 59 / story 04 — THE AUDIT FACE. One command over the three lanes above, in the shape
// `work:doctor` already established, with two keys doctor's findings do not carry: what the
// finding is ABOUT and who it is addressed TO. Both are computed from the shipped registry, and
// the rule that makes the second worth having is that the audited loop is never its own addressee
// (FF-5909, asserted over the records this repository really ships rather than over the resolver).
// FF-5910 is the day-one auditor: the framework audits itself out of the box, its subject holds no
// work item, and it declares no reporting edge to anything it audits. The read-record convergence
// ADR-004 §1a ruled on lands here too — the evidence lane's third spelling is gone and
// acd-audit-reports-what-it-read (already imported above) now binds all three shapes.
import { auditCommandTests } from "./audit-command.test.mjs";
import { citedPathResolveTests } from "./cited-path-resolve.test.mjs";

export const tests = [
  // milestone 59 / story 01 — the instrument census, the bounded spawn seam and the gate that
  // decides registration by runtime membership rather than by the runner's source text
  ...instrumentCensusTests,
  ...auditSpawnBoundedTests,
  // milestone 59 / story 03 — staleness, silence and the prune: an anchor past its window degrades a
  // verdict without deleting one, an instrument silent inside its own cadence is named, a metric
  // that has not moved is named, and a loop nobody consults is a prune candidate that is never
  // removed. Every lane says what it read.
  ...instrumentStalenessTests,
  // milestone 59 / story 04 — the audit face: one command over every registered lane, doctor's
  // finding shape plus an addressee that is never the audited loop, an escalation bypass that is
  // a second copy rather than a re-route, and the auditor record the framework ships.
  ...auditCommandTests,
  ...citedPathResolveTests,
];
