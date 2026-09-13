// THE GRADE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 59 / story 02 — EVIDENCE RE-RUN. The recorded evidence is EXECUTED rather than read:
// each fitness-register row's control is resolved, driven in a bounded child process by something
// that did not write it, and the row is then confirmed by what the child did or contradicted by
// it. The verdict comes from the failure MESSAGE the control produced and never from a pass/fail
// count — spike 56 measured nine standing-red gates, on which a real break moves no tally, and
// measured a gaming move that IMPROVED the count 9 -> 8 (FF-5906). The gate that holds doctor and
// the audit apart from this milestone's side is FF-5905, which extends
// `acd-controls-never-execute` — already imported above, so no second registration is added here.
import { evidenceReRunTests } from "./evidence-re-run.test.mjs";
// milestone 77 / story 03 — THE REFERENCE CORPUS AND THE DECLARED BOUNDS: "everyone else caps at N"
// is a research task whose answer depends on the day it ran, until it is written down with a source
// and a date against every row — and then it is a JOIN a reviewer diffs in a pull request. The
// corpus is a MODULE under `src/`, because the payload carries `src/` recursively and carries no
// `wiki/` and no `scripts/` at all: filed under `wiki/` it would make the bounds rule the one rule
// in this milestone that cannot travel. It is frozen (a caller that can append a row can invent a
// reference), non-vacuous, imports nothing, and is reached by module resolution, so it needs neither
// root — driven from four working directories and from two governed projects that each plant a
// decoy of their own. The lane joins it against the INJECTED loop model and parses nothing:
// `uncapped`/`unknown` is `audit-bound-undeclared` at error, a reference row declared nowhere is the
// same code at warn, a declared value outside the reference spread is `audit-bound-off-reference`
// (an argument, not a defect) and an old payload's row is `audit-reference-stale` — never the
// audited project's fault. `loop-ceiling-uncapped` stays exactly where it is, at warn, in the
// registry validation. The refresh is a hand-run PROGRAM under `scripts/`, not a flag: it confirms
// and stamps rather than scrapes, it is the only thing in this milestone that touches the network,
// and no registered command, no module under `src/` and no module of the audit family names it.
// All three @executable task features plus FF-7705.
import { harnessReferenceTests } from "./harness-reference.test.mjs";
// milestone 61 / story 01 — the epoch and the frozen criterion: all four
// @executable tasks + FF-6105. FF-6104 EXTENDS
// acd-acceptance-horizon-single-predicate in its existing registered suite above,
// and the two frozen-set censuses this story re-measured ride their own suites.
import { acceptorCriterionTests } from "./acceptor-criterion.test.mjs";
// milestone 61 / story 02 — the observation census: the one @executable task
// (fixtures excluded, dispatch worktrees folded into their parent, every
// population declaring what it read against a floor, and a census that filtered
// nothing reported as a finding) + FF-6107.
import { acceptorObservationsTests } from "./acceptor-observations.test.mjs";
// milestone 61 / story 03 — no executed consumer, no proposal: all three @executable tasks
// (a bound whose value reaches no decision, the fail-closed harness switch, and the tunable
// set being the registry's) + FF-6110. FF-6109 EXTENDS acd-progress-ledger-consumed with a
// second predicate beside `unconsumedCeilings`, in that guard's own already-registered
// suite below, so the red probe is the only evidence the new leg is armed.
import { acceptorAdmissibilityTests } from "./acceptor-admissibility.test.mjs";
// milestone 61 / story 04 — the rule and the ledger: all six @executable tasks (the
// crossing lattice derived from the criterion's own inputs, a loss that carries, one
// knob and one notch, the declared trial metric, the per-knob basket, and the accrual
// across epochs) + FF-6101, FF-6102, FF-6103, FF-6106. The trial metric `roundsToAccept`
// lands in the deterministic-counter leaf it is paired with, so its rows ride the
// work-counters suite already registered below.
import { acceptorRuleTests } from "./acceptor-rule.test.mjs";
import { acceptorLedgerTests } from "./acceptor-ledger.test.mjs";
// milestone 61 / story 05 — the event a ruling raises: all four @executable tasks (a ruling
// raising exactly one declared event whose consequence appends the record beside the
// configuration it concerns; the twelve things that travel with the change and the refusal
// of an incomplete record; an undeclared event name refused at the vocabulary's own door
// rather than appended to reach no reactor; and redelivery leaving one record) + FF-6108.
// The seam's row in `APPEND_EVENT_ALLOWED` rides `acd-effects-ledger`, registered above.
import { harnessRulingSeamTests } from "./harness-ruling-seam.test.mjs";
// milestone 61 / story 06 — the acceptor's face: all five @executable tasks plus
// FF-6112 (report-only/eight refusal lane) and FF-6113 (dwell gates reversion only).
import { acceptorCommandTests } from "./acceptor-command.test.mjs";
// milestone 43 / story 05 — GATE-TIME PROPAGATION (ADR-008 + ADR-010/R5.1/R5.2). A dispatch
// advances an EXISTING item branch to the directive's pinned base at the worker's REUSE door —
// the door that until now ignored the pin by design, so a continuing item never saw a
// control-side gate edit. Task 00: already-current / fast-forward / a REAL merge when the two
// lines have diverged (which is the common case, not the rare one). Task 01: both refusals —
// a dirty worktree and a conflicted merge — leave the branch byte-identical and settle the
// assignment `failed` with their code. Task 02: the outcome is reported on the EXISTING
// worker-worktree-base channel with both commits, so "which base did it run on" stays one
// `aof mesh logs --node` read. Task 03: the create path and the unavailable-base regression.
// Task 04 (the two-node soak) is @manual and task 05 is @uat — neither has a test file here.
import { gatePropagationReuseDoorAdvanceTests } from "./gate-propagation-reuse-door-advance.test.mjs";
import { gatePropagationRefusalsTests } from "./gate-propagation-refusals-leave-branch.test.mjs";
import { gatePropagationReportedTests } from "./gate-propagation-reported-on-base-channel.test.mjs";
import { gatePropagationCreatePathRegressionTests } from "./gate-propagation-create-path-regression.test.mjs";
import { acceptanceHorizonTests } from "./acceptance-horizon.test.mjs";
// milestone 54 / story 01 — THE DECLARED RUBRIC (ADR-003, ADR-004, ADR-005 §5). 54/00 is the
// pure compiler; this is the ONE IMPURE EDGE that feeds it — `work:grade`, the milestone's
// only registering story. aof runs EXACTLY what the project declared (an argv array, never a
// shell string; the environment it named; the scope it chose) because aof does not know that
// this repo's suite must run under `AOF_GLOBAL_HOME` or that one test cannot bind a port a
// live daemon holds, and must not guess. Task 00 is the declaration; task 01 is the honest
// no-op an unconfigured repo gets (`rubric-unconfigured`, never a pass, and the three shipped
// loop suites green UNEDITED); task 02 is the read face — bare reports the plan, `--run` is
// the only door, and the reason is measured: the bijection gate spawns this very verb as a
// real subprocess from inside the suite; task 03 is the bounded single spawn — stdin closed,
// BOTH streams captured (this repo writes `not ok` to stderr), the deadline force-killing
// through 69's single bounds home, and a re-entrancy stamp that refuses a grader tree.
// FF-5401/5404/5405/5406 are the story's own fitness functions; FF-5407 EXTENDS 66's
// `acd-controls-never-execute` so the deterministic engines can never acquire the runner.
import { gradeRubricIsDeclaredTests } from "./grade-rubric-is-declared.test.mjs";
import { gradeUnconfiguredNoOpTests } from "./grade-unconfigured-no-op.test.mjs";
import { gradeReadFaceNeverExecutesTests } from "./grade-read-face-never-executes.test.mjs";
import { gradeSpawnBoundedAndSingleTests } from "./grade-spawn-bounded-and-single.test.mjs";
// milestone 54 / story 04 — SCENARIO TRACEABILITY (ADR-006). `src/commands/validate.mjs:57`
// has shipped the line "test-traceability … is not yet checked here" for six milestones; this
// fills it, OUTSIDE the 256-dependent god-node, as a new `work:doctor` lane leaf. THE JOIN IS
// DECLARED, NOT INFERRED, and the measurement is the decision: across 719 `.feature` files
// this tree holds 4,744 distinct scenario names against 5,725 declared test names, of which
// **0** match exactly and 1,203 contain one — so aof asserts exactly one thing, that an
// emitted case's name CONTAINS an `@executable` scenario name from the item in scope, and
// reports every miss as a miss (`68/ADR-005`: a fallback that guesses is worse than a gap).
// Both legs are ADVISORY at `warn` — a deliberate departure from the horizon, because ~75% of
// this tree's scenarios would report unjoined on arrival. Task 02 holds the lane to 66's
// never-executes discipline: the report arrives as SNAPSHOT TEXT at the engine's one impure
// edge and the lane is a pure `(snapshot, ctx) => Finding[]`. FF-5408 is the story's own
// fitness function.
import { rubricJoinIsDeclaredTests } from "./rubric-join-is-declared.test.mjs";
import { rubricMissIsReportedUnjoinedTests } from "./rubric-miss-is-reported-unjoined.test.mjs";
import { rubricLaneReadsAndNeverRunsTests } from "./rubric-lane-reads-and-never-runs.test.mjs";
// story 81 — the loop's bounds survive a grader that takes real time. Four behavioural suites,
// one per task contract: the spawn that no longer stops the event loop and the deadline derived
// under the window supervising it (00); the payload bounded where it is WRITTEN rather than only
// where a human reads it (01); the resumed re-drive that DECLARES it carries no grade (02); and
// the fix transport returned to 70's own shape with the grade travelling beside it (03). They
// carry no `FF-NNNN` id: 81 is a standalone story with no `ARCHITECTURE.md`, so an id here would
// be one no register declares. Each case names the story and the task whose criteria it
// mechanises instead.
import { gradeWaitsWithoutBlockingTests } from "./grade-waits-without-blocking.test.mjs";
import { gradePayloadBoundedInTheWriterTests } from "./grade-payload-bounded-in-the-writer.test.mjs";
// milestone 54 / story 00 — THE GRADE RECORD (ADR-003 §1, ADR-005, ADR-006). Verification
// becomes a feedback loop, and its first move is refusing to believe an exit code. Measured
// at HEAD: `node --test test/arch/audit/acd-controls-never-execute.test.mjs` reports one case, one
// pass and exit 0 for a file whose arch-tests did NOT run — a grader reading that as green
// would ship a lie into the loop's own termination decision. `src/work/grade.mjs` is the
// pure leaf that refuses it: a closed verdict triple, a frozen nine-code vocabulary, and a
// `pass` that must be paid for in four pieces of positive evidence. Task 00 proves every
// code has a producer and a settled verdict; task 01 removes the four pieces one at a time
// (and the floor/ratchet backstop); task 02 proves the normalisers against SIX REAL CAPTURES
// under `test/fixtures/rubric-reports/` — `m38/ADR-008`, because the two producers this repo
// has disagree about TAP and a hand-written specimen would test the author's belief against
// itself. FF-5402 + FF-5403 are the story's own fitness functions, each with its
// planted-defect lane.
import { gradeRecordVocabulariesTests } from "./grade-record-vocabularies.test.mjs";
import { gradeGreenIsEvidenceTests } from "./grade-green-is-evidence.test.mjs";
import { gradeReportNormalisersTests } from "./grade-report-normalisers.test.mjs";
import { gradeSkippedIsNotEvidenceTests } from "./grade-skipped-is-not-evidence.test.mjs";

export const tests = [
  // milestone 59 / story 02 — evidence re-run: the register is re-executed, the oracle is the
  // failure message, evidence that cannot run says what was tried, and a recorded case count that
  // no longer matches the observed one is drift
  ...evidenceReRunTests,
  // milestone 77 / story 03 - the reference corpus and the declared bounds (tasks 00-02) plus FF-7705.
  ...harnessReferenceTests,
  // milestone 61 / story 01 — the epoch and the frozen criterion (tasks 00–03) +
  // FF-6105. FF-6104 rides the already-spread
  // acdAcceptanceHorizonSinglePredicateTests suite above.
  ...acceptorCriterionTests,
  // milestone 61 / story 02 — the observation census (task 00) + FF-6107.
  ...acceptorObservationsTests,
  // milestone 61 / story 03 — no executed consumer, no proposal (tasks 00, 01, 02) +
  // FF-6110. FF-6109 rides the already-spread acdProgressLedgerConsumedTests suite below.
  ...acceptorAdmissibilityTests,
  // milestone 61 / story 04 — the rule and the ledger (tasks 00–05) + FF-6101, FF-6102,
  // FF-6103, FF-6106. `roundsToAccept`'s own rows ride the already-spread
  // workCountersTests suite below, beside the counter-metric it is paired with.
  ...acceptorRuleTests,
  ...acceptorLedgerTests,
  // milestone 61 / story 05 — the event a ruling raises (tasks 00–03) + FF-6108. The
  // seam's entry in the admitted append-event set rides the already-spread
  // acdEffectsLedgerTests suite.
  ...harnessRulingSeamTests,
  // milestone 61 / story 06 — the terminal report surface (tasks 00–04) +
  // FF-6112/FF-6113.
  ...acceptorCommandTests,
  // milestone 43 / story 05 — gate-time propagation at the reuse door (tasks 00–03;
  // 04 is @manual and 05 is @uat)
  ...gatePropagationReuseDoorAdvanceTests,
  ...gatePropagationRefusalsTests,
  ...gatePropagationReportedTests,
  ...gatePropagationCreatePathRegressionTests,
  ...acceptanceHorizonTests,
  // milestone 54 / story 01 — the declared rubric (tasks 00–03) + its four fitness functions.
  // Appended ABOVE the 54/00 block below, which the F-54-00-1 note holds terminal.
  ...gradeRubricIsDeclaredTests,
  ...gradeUnconfiguredNoOpTests,
  ...gradeReadFaceNeverExecutesTests,
  ...gradeSpawnBoundedAndSingleTests,
  // milestone 54 / story 04 — scenario traceability (tasks 00–02) + FF-5408.
  ...rubricJoinIsDeclaredTests,
  ...rubricMissIsReportedUnjoinedTests,
  ...rubricLaneReadsAndNeverRunsTests,
  ...gradeWaitsWithoutBlockingTests,
  ...gradePayloadBoundedInTheWriterTests,
  // milestone 54 / story 00 — the grade record (tasks 00–03) + its two fitness functions.
  // THIS BLOCK SITS ABOVE THE ARRAY'S LAST ROW ON PURPOSE, AND MOVING IT DOWN BREAKS CI
  // (54/00, finding F-54-00-1). `acd-loop-suite-registration`'s REG-MUT-11 drops a spread
  // from its frozen residue only via /^\s*\.\.\.[A-Za-z_$][\w$]*,$/ — a TRAILING COMMA is
  // required — so the array's terminal, comma-less row is residue. Appending after it commas
  // the old terminal row and mints a new one, changing the digest REG-MUT-11 pins even
  // though its own message promises that appending "leaves this digest alone by
  // construction". Keeping `...acdVerificationTemplateShapeTests` terminal and comma-less
  // holds the residue at 18fd3c1e…, measured equal to the pin. The control's own defect is
  // routed to milestone 53 as F-54-00-4; until it lands, append ABOVE this comment.
  ...gradeRecordVocabulariesTests,
  ...gradeGreenIsEvidenceTests,
  ...gradeReportNormalisersTests,
  ...gradeSkippedIsNotEvidenceTests,
];
