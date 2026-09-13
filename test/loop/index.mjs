// THE LOOP SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 52 / story 05 — the six BEHAVIOURAL suites the fifteen @executable features of 52/00,
// 52/01 and 52/02 never had (F-52-04-H, TECH_DEBT 48): 323 scenarios and 461 rows across 28 tables,
// plus 52/03's day-one registry census, plus the ledger that re-derives that traceability from the
// .feature files on every run. They live in test/ WITHOUT the `acd-loop-` prefix and are aliased
// away from `acdLoop*` deliberately — FF-5209 deep-equals both the test/arch/acd-loop-* roster and
// the story-04 block above against literals, so a tenth so-named file or a tenth `...acdLoop`
// spread would red an accepted gate. Import AND spread, both: TECH_DEBT item 50 records that the
// orphan gate keys on this file's TEXT, so an imported-but-never-spread suite reads green there
// while running never (m35/R4).
import { workLoopsRecordTests } from "./work-loops-record.test.mjs";
import { workLoopsValueTests } from "./work-loops-value.test.mjs";
import { workLoopsChecksTests } from "./work-loops-checks.test.mjs";
import { workLoopsCommandsTests } from "./work-loops-commands.test.mjs";
import { workLoopsRegistryCensusTests } from "./work-loops-registry-census.test.mjs";
import { workLoopsCoverageLedgerTests } from "./work-loops-coverage-ledger.test.mjs";
// milestone 53 / story 01 — the pure loop engine's seven executable task suites.
// Each suite is imported and spread with the module whose decisions it mechanises.
import { workLoopScopeGuardTests } from "./work-loop-scope-guard.test.mjs";
import { workLoopLevelLadderTests } from "./work-loop-level-ladder.test.mjs";
import { workLoopPhaseMapTests } from "./work-loop-phase-map.test.mjs";
import { workLoopStopSetTests } from "./work-loop-stop-set.test.mjs";
import { workLoopGateOrderTests } from "./work-loop-gate-order.test.mjs";
import { workLoopDeclarationTests } from "./work-loop-declaration.test.mjs";
import { workLoopDeterminismTests } from "./work-loop-determinism.test.mjs";
// milestone 53 / story 02 — the launcher shell and local phase executors.
import { driveCommandPhaseDriverTests } from "./drive-command-phase-drivers.test.mjs";
import { loopCommandProbeTests } from "./loop-command-probe.test.mjs";
import { loopCommandSequencingTests } from "./loop-command-sequencing.test.mjs";
import { loopCommandGateTests } from "./loop-command-gate.test.mjs";
import { loopCommandStopsTests } from "./loop-command-stops.test.mjs";
import { loopCommandResumeTests } from "./loop-command-resume.test.mjs";
// milestone 126 / story 00, tasks 02-03 — FF-12602's DRIVEN half: what reaches the one injected
// printer while a drive or a gate is still pending, and what `--quiet` does and does not silence.
// The structural half is `test/arch/loop/acd-loop-narrates-in-flight.test.mjs`.
import { loopCommandNarrationTests } from "./loop-command-narration.test.mjs";
// milestone 126 / story 02, tasks 00-01 — the declaration predicate driven over literal run
// records, and the ninth declaration key. FF-12604 driven half.
import { workLoopDeclarationsTests } from "./work-loop-declarations.test.mjs";
import { loopCommandBoardStateTests } from "./loop-command-board-state.test.mjs";
import { loopCommandRefusalTests } from "./loop-command-refusals.test.mjs";
import { loopCommandRegistrationTests } from "./loop-command-registration.test.mjs";
// milestone 102 — THE DECLARATION NAMES ITS LOOP. Story 00's eighth key rides the existing
// declaration/determinism/stop-set suites; story 01's driven-loop scenarios ride
// `loop-command-board-state` above, and its two registry-facing scenarios are the arch suite
// below. Story 02 is the join proved end to end through the real producer, store and reader —
// the shape of test whose absence was F-78-A.
import { loopDeclarationJoinTests } from "./loop-declaration-join.test.mjs";
import { workLoopsHomeAndDeliveryTests } from "./work-loops-home-and-delivery.test.mjs";
// milestone 53 / story 03 — the Loop-Ready score's five @executable task suites.
// Each lands with the scorer it mechanises and is spread below in this story's
// own labelled block (ADR-011 §1; imported-but-unspread is not evidence).
import { loopReadyJsonKeyTests } from "./loop-ready-json-key.test.mjs";
import { loopReadyRegistryAbsentTests } from "./loop-ready-registry-absent.test.mjs";
import { loopReadyComposedTests } from "./loop-ready-composed.test.mjs";
import { loopReadyBaseChecksTests } from "./loop-ready-base-checks.test.mjs";
import { loopReadyScoreTests } from "./loop-ready-score.test.mjs";
// milestone 53 / story 04 — the autonomous prompt hands the range to the code-owned
// shell while retaining its solo/ship wrapper semantics and existing bundle door.
import { autonomousShellOutPromptTests } from "./autonomous-shell-out-prompt.test.mjs";
// milestone 55 / story 01 — the groundedness report, widened seed, and pure
// authority-resolution boundary (FF-5502/FF-5503).
import { groundednessReportTests } from "./groundedness-report.test.mjs";
// milestone 55 / story 05 — L3's computed gate and its additive Loop-Ready row (FF-5508).
import { l3LadderWidensTests } from "./l3-ladder-widens.test.mjs";
import { l3GateComputedTests } from "./l3-gate-computed.test.mjs";
import { l3GateRefusalTests } from "./l3-gate-refusal.test.mjs";
import { l3AnchorCheckScoreTests } from "./l3-anchor-check-score.test.mjs";
// milestone 57 / story 00 — the fourth loop-registry node kind, its frozen
// declaration vocabulary, the existing outbound monitoring edge, and FF-5701.
import { watcherNodeTests } from "./watcher-node.test.mjs";
// milestone 58 / story 03 — the supervision face: `aof work loops show` names the layer a loop
// declares and the node that sets its reference, and `aof work loops graph` gives each of the five
// declared kinds a shape of its own (FF-5808). The behavioural suite drives both of the story's
// task features end to end — records a human authored on disk, through the registered commands, to
// the line a reader sees — and the arch gate holds the durable half: the count of distinct shapes
// the renderer emits equals the count of declared kinds, in BOTH directions, and none of them is
// the fallback `acd-loop-render-deterministic` pins for an endpoint nobody declared.
import { loopsSupervisionFaceTests } from "./loops-supervision-face.test.mjs";
// milestone 63 / story 00 — the trigger declaration: a trigger is reviewable data at
// `.aof/triggers.jsonc` with ONE pure compiler, a member that does not compile refuses the
// WHOLE set, and the cadence grammar is IMPORTED (`parseCadence`, the additive FUNCTION export)
// rather than copied — all five @executable task features, plus FF-6302 and its eol ratchet.
import { triggerDeclarationTests } from "./trigger-declaration.test.mjs";
// milestone 63 / story 01 — the level a trigger declares is a CEILING REQUEST, never an admission:
// resolved at EVERY fire through the one gate home (`resolveLoopLevelGate`, the same function
// `work:loop` gates with when it is entered), refused BY NAME with the failing half named, never
// silently downgraded, and with an ABSENT level and a REFUSED level kept as two different answers
// — all four @executable task features, plus FF-6304.
import { triggerLevelCeilingTests } from "./trigger-level-ceiling.test.mjs";
// milestone 63 / story 04 — the three signals that are NOT the mesh: a cadence, a CI signal and an
// inbound finding, each answering only WHICH SCOPE and carrying nothing else; a finding-triggered
// wake that keys on a capture EXISTING and never on what it says (55/ADR-005 holding at its second
// consumer); a CI signal read for its ref and never for its outcome; every scope resolved through
// the loop's own `decideLoopScope` with no grammar authored in the family; and a source that cannot
// answer refusing BY NAME rather than resolving to nothing — all five @executable task features,
// plus FF-6307.
import { triggerSourcesTests } from "./trigger-sources.test.mjs";
// milestone 63 / story 02 - THE LAUNCH ENVELOPE COMPILES: the fourth enforcement point stops
// being a spelling with no referent and compiles to the UNATTENDED LAUNCH SHAPE itself, an
// unattended launch resolves only the declared program and leading argv (anything else is a
// coded refusal that carries nothing spawnable), and every ATTENDED launch - human session,
// phase-driver session and all three single-phase mesh directives - is byte-identical to what
// it resolved before. All four @executable task features, plus FF-6305.
import { unattendedLaunchEnvelopeTests } from "./unattended-launch-envelope.test.mjs";
// milestone 63 / story 05 — THE TRIGGER'S FACE: the milestone's one registered surface and its
// only convergence. `work:trigger` composes the four `src/work-trigger/` leaves, obtains the two
// gate readings through the registry exactly as `work:loop` gathers them when it fires, and emits
// the `work:loop` input each declared trigger resolves to plus the argv that carries it — and
// LAUNCHES NOTHING, which is structural rather than careful (53/ADR-005 left the loop exactly one
// launcher, reachable only from outside it). All five @executable task features, plus this
// story's THREE controls: FF-6301 (does the family coordinate?), FF-6303 (does it hold a clock,
// or write?) and FF-6308 (does the shipped declaration actually resolve?). The three are separate
// files on purpose — the two family-wide rows fail for different reasons and their red probes
// mutate different things.
import { triggerCommandTests } from "./trigger-command.test.mjs";
// milestone 70 / story 06 - saving-is-measured (task 00): the three local-drive
// defects that made the measurement impossible to take on Windows - the folder-trust
// key claude actually reads, the nested-Claude-Code session env scrub, and the
// bracketed-paste + separate-Enter directive transport.
import { warmStartLocalDriveTests } from "./warm-start-local-drive.test.mjs";
// milestone 70 / story 04 — warm-fix-loop (ADR-008): only the fix produced by a
// red review gate resumes its specific build session; unavailable targets degrade
// cold with a brief, and every review/verify/refine lane remains cold. FF-7007 is
// registered beside the two executable task suites.
import { warmFixLoopTests } from "./warm-fix-loop.test.mjs";
import { reviewStaysColdTests } from "./review-stays-cold.test.mjs";
// milestone 69 / story 00 — the seven declared loop bounds, the review-round
// decision, resolved framework ceilings, and FF-6901/6902.
// milestone 61 / story 00 — the clamp: all three @executable tasks (the range,
// the key that is two bounds, and the resolver-is-the-answer probe). FF-6111
// EXTENDS acd-loop-cap-single-home in its existing registered suite above, and
// this story's own rows ride the loop-bounds suite that already declares them.
import { loopBoundsTests, clampTests } from "./loop-bounds.test.mjs";
// 2026-09-11 — the loop's exit-reason recorder (src/loop-diag.mjs).
import { loopDiagTests } from "./loop-diag.test.mjs";
import { workLoopReviewBoundTests } from "./work-loop-review-bound.test.mjs";
import { workLoopProductionReviewBoundTests } from "./work-loop-production-review-bound.test.mjs";
import { workLoopsResolvedCeilingsTests } from "./work-loops-resolved-ceilings.test.mjs";
// milestone 69 / story 03 — deterministic progress samples, append-only ledger,
// reset/escalate policy, build-loop derivative, and FF-6906.
import { loopProgressTests } from "./loop-progress.test.mjs";
// milestone 69 / story 06 — F-69-V7 amendment: the production build loop now
// writes and consumes story 03's ledger rather than leaving a tested leaf dormant.
import { loopProgressProductionTests } from "./loop-progress-production.test.mjs";
import { laneIsLocalSlotTests } from "./lane-is-local-slot.test.mjs";
//   task 02 — invariant 4 AMENDED in exactly one of its three parts, driven against the gate's own
//   SHIPPED detectors: part 1 generalised to a surface → posture-home table with PER-SURFACE JSX
//   floors (a concatenated floor is satisfied by Fleet alone and leaves the home unchecked — this
//   clause's own recorded failure mode, and the floor plant is what proves it), part 2 untouched,
//   part 3 untouched plus a `ui/src/home/**` sweep. The last two lanes are the strictly-stronger
//   checklist: twelve surviving assertions re-run, eight additions, nothing exempted.
import { invariant4AmendedTests } from "./invariant-4-amended.test.mjs";
// milestone 57 / story 01 — computed watcher independence (tasks 00–02) and
// the severity/exit/validate-procedure gate (task 03).
import { watcherIndependenceGateTests } from "./watcher-independence-gate.test.mjs";
// milestone 54 / story 02 — FITNESS IN THE GATE (ADR-007). The SPEC's own headline, measured
// at refine to be HALF WIRED: `GATE_ORDER` was three rows naming one gate command, and
// `grep -ci "doctor|controls|fitness"` over both loop modules returned 0 — the fitness half
// had never graded anything in the loop. Task 00 lands the five-row COST LADDER (validate →
// doctor → grade → verify, each rung short-circuiting the ones after it, so a red validate
// never pays for the doctor and a red doctor never pays for a review turn); task 01 lands the
// rung that CHANGES BEHAVIOUR — `work:doctor` at the driven item's own scope, admitting
// `error` only, never reading `loopReady`, and admitting a code set DERIVED BY FILTER from
// 66's frozen `CONTROL_FINDING_CODES` (minus the two `verification-*` members, because
// gating entry to verify on verify's own output is circular, and minus the warn-by-
// construction `control-runner-unchecked`). FF-5410 is the story's own fitness function;
// FF-5409's GATE_ORDER clause EXTENDS `acd-loop-probe-contract`.
import { loopGateCostLadderTests } from "./loop-gate-cost-ladder.test.mjs";
import { loopDoctorGateScopeAndSeverityTests } from "./loop-doctor-gate-scope-and-severity.test.mjs";
// milestone 54 / story 03 — FEEDBACK RIDES THE RE-DRIVE (ADR-007 §3, ADR-008). The pure
// engine already returned the right decision and the shell dropped it three times over; 70/04
// closed one of those drops on this branch (`pendingFixes` → `ctx.loopDrive.fix` →
// `composeFixInput`'s `## REVIEW FINDINGS`), so **54 supplies the records and 70 carries
// them** — this story builds no second transport, widens no driver input schema and coins no
// third meaning for `brief`. Task 00 lands the two halves 54 owns: the grade's failing cases
// on that existing payload, each entry naming its producer, and `brief.grade` on the run the
// grade DROVE, written through the seam that already writes `brief.loop` (so `run-store.mjs`
// and `run-transitions.mjs` are passed through, not edited — no new key, state or
// transition). Task 01 puts the verdict, the codes and the observed counts on the `driven`
// row — the one place in the frozen `LoopState` that is per-drive, additive and pinned by
// nobody — leaving the ten top-level keys and `actShape()`'s whitelist exactly as they are.
// Task 02 turns `:494`'s hardcoded `findings: []` into the real accumulated record, the union
// over this loop's own runs keyed by `loopRunId`, with the exhausting cycle's own grade
// carried by the halt because there is no successor run to ride. Task 03 is the closed
// routing table, including the one row that is the whole no-regression rule:
// `rubric-unconfigured` proceeds EXACTLY as today, and no path anywhere records a `pass`.
// FF-5409's remaining `grade-indeterminate` clause EXTENDS `acd-loop-probe-contract`.
import { loopRecordReachesTheRedriveTests } from "./loop-record-reaches-the-redrive.test.mjs";
import { loopDrivenRowCarriesTheGradeTests } from "./loop-driven-row-carries-the-grade.test.mjs";
import { loopCapExhaustionCarriesTheRecordTests } from "./loop-cap-exhaustion-carries-the-record.test.mjs";
// milestone 124 / story 01 — the DRIVEN half of "cap exhaustion returns to the plan": the
// hand-off, the two bounds, the set-aside, and the range that keeps running past it. It shares
// a file with 54/03's suite because it is the same site's behaviour, one milestone later — the
// arch half is `test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs` (FF-12404).
import { loopCapExhaustionReturnsToThePlanTests } from "./loop-cap-exhaustion-carries-the-record.test.mjs";
import { loopResumedRedriveDeclaresItsGradeTests } from "./loop-resumed-redrive-declares-its-grade.test.mjs";
import { loopFixTransportShapeTests } from "./loop-fix-transport-shape.test.mjs";
import { loopOnlyFailRedrivesTests } from "./loop-only-fail-redrives.test.mjs";
// story 79 — the committed loop graph. Two behavioural suites (the pure composer; the writer and
// its one home) and four structural gates: the DRIFT check that reds when a loop record was edited
// without regenerating the document, the write scope and the composer's purity, the board
// deferral, and byte-identical regeneration. They carry no `FF-NNNN` id on purpose: story 79 is a
// standalone story with no `ARCHITECTURE.md`, so an id here would be one no register declares —
// the "invisible to every register check" shape 78/ADR-001 is written about. Each gate names the
// story and the task whose criteria it mechanises instead. Registration is explicit so no authored
// gate is dead — and the drift gate's last entry asserts THIS membership from inside the runner's
// own process.
import { loopDocumentTests } from "./loop-document.test.mjs";
import { loopDocumentCommandTests } from "./loop-document-command.test.mjs";
// milestone 78 / story 00 — the execution projection. One behavioural suite over both task
// contracts (the execution model; join coverage and the three gap classes of ADR-005) and FF-7801,
// the purity gate that follows the module's DIRECT IMPORTS rather than only its own body.
// The behavioural suite carries its own FIXTURE PIN: the registry shapes it builds are asserted
// against loadLoops reading the real .aof/loops, which is m77/R8 ("two of five fixture rows passed
// for the wrong reason, because the fixture was written against a belief about the loader") made
// executable rather than remembered.
import { loopRecordProjectionTests, loopRecordRegistryShapeTests } from "./loop-record-projection.test.mjs";
// milestone 78 / story 01 — the item-scoped renderer: the graph of what ran and the document body,
// with FF-7802 (ONE glyph table — KIND_SHAPES imported, no glyph restated, and the frozen
// loops-graph.mjs byte-unmodified, asked of git rather than of a digest someone re-stamps) and
// FF-7806 (the four declared-ceiling states are PAIRWISE distinguishable in the rendered bytes,
// which is the requirement SPEC.md opens with).
import { loopRecordRenderTests } from "./loop-record-render.test.mjs";
// milestone 78 / story 02 — the record COMMAND: the read face, the writer, and the frozen lists it
// moves. One behavioural suite over the two task contracts it owns (the read face; the writer's
// byte-identity and signature preservation), plus the four gates the story's fitness functions name:
// FF-7803 (byte-identity in-process AND across separate processes — two different failure modes),
// FF-7804 (a signed row survives verbatim while every other line is re-derived), FF-7805 (the record
// is a FACE — no read path recovers an execution fact from the document; the sign-off is the only
// thing read back), FF-7807 (registration, the frozen census, the documented BOARD_DEFERRED
// carve-out and the absent route) and FF-7810 (the write scope, and the name 52/FF-5201 forces).
import { loopRecordFixtureShapeTests, loopRecordCommandTests } from "./loop-record-command.test.mjs";
// milestone 78 / story 03 — the frozen sign-off block and the doctor lane that reports it and gates
// nothing. Two behavioural suites over the two task contracts (the block's frozen shape and the
// signed/unsigned boundary; the lane's four codes, its purity and its silence on an item with no
// record) plus FF-7809 (the writer's, the checker's and the gate's own copies of the frozen shape held
// byte-equal, and round-tripped through a real document) and FF-7808 (the record never gates — a
// constant severity over every cause × every status, codes structurally outside the gating sets, no
// door naming the signature, and `done` succeeding over an unsigned record).
import { loopRecordSignoffShapeTests } from "./loop-record-signoff-shape.test.mjs";

export const tests = [
  // milestone 52 / story 05 — the six behavioural suites and their coverage ledger
  ...workLoopsRecordTests,
  ...workLoopsValueTests,
  ...workLoopsChecksTests,
  ...workLoopsCommandsTests,
  ...workLoopsRegistryCensusTests,
  ...workLoopsCoverageLedgerTests,
  // milestone 53 / story 01 — scope, level, phase, stops, gate, declaration, determinism
  ...workLoopScopeGuardTests,
  ...workLoopLevelLadderTests,
  ...workLoopPhaseMapTests,
  ...workLoopStopSetTests,
  ...workLoopGateOrderTests,
  ...workLoopDeclarationTests,
  ...workLoopDeterminismTests,
  // milestone 53 / story 02 — one code-owned shell and three local executors
  ...driveCommandPhaseDriverTests,
  ...loopCommandProbeTests,
  ...loopCommandSequencingTests,
  ...loopCommandGateTests,
  ...loopCommandStopsTests,
  ...loopCommandResumeTests,
  ...loopCommandNarrationTests,
  ...workLoopDeclarationsTests,
  ...loopCommandBoardStateTests,
  ...loopCommandRefusalTests,
  ...loopCommandRegistrationTests,
  // milestone 102 — the declaration names its loop (see the import note).
  ...loopDeclarationJoinTests,
  ...workLoopsHomeAndDeliveryTests,
  // milestone 53 / story 03 — additive doctor envelope, optional registry composition,
  // base checks, and the equal-weight scorer/rung.
  ...loopReadyJsonKeyTests,
  ...loopReadyRegistryAbsentTests,
  ...loopReadyComposedTests,
  ...loopReadyBaseChecksTests,
  ...loopReadyScoreTests,
  // milestone 53 / story 04 — one prompt-side door, no second prose loop
  ...autonomousShellOutPromptTests,
  // milestone 55 / story 01 — groundedness behavior and the unchanged SCC gate
  ...groundednessReportTests,
  // milestone 55 / story 05 — earned L3, actionable refusals, and score composition
  ...l3LadderWidensTests,
  ...l3GateComputedTests,
  ...l3GateRefusalTests,
  ...l3AnchorCheckScoreTests,
  // milestone 57 / story 00 — watcher grammar and its additive fitness gate
  ...watcherNodeTests,
  // milestone 58 / story 03 — the supervision face: the layer, the computed reference-setter, and one shape per declared kind
  ...loopsSupervisionFaceTests,
  // milestone 63 / story 00 — the trigger declaration (tasks 00–04) plus FF-6302.
  ...triggerDeclarationTests,
  // milestone 63 / story 01 — the level is a ceiling, not an admission (tasks 00–03) plus FF-6304.
  ...triggerLevelCeilingTests,
  // milestone 63 / story 04 — the signals that are not the mesh (tasks 00–04) plus FF-6307.
  ...triggerSourcesTests,
  // milestone 63 / story 02 — the launch envelope compiles (tasks 00–03) plus FF-6305.
  ...unattendedLaunchEnvelopeTests,
  // milestone 63 / story 05 — the trigger's face (tasks 00–04) plus FF-6301, FF-6303 and FF-6308.
  ...triggerCommandTests,
  // milestone 70 / story 06 - saving-is-measured (task 00): the local-drive fixes
  // that let a phase be driven through the loop door on Windows at all.
  ...warmStartLocalDriveTests,
  // milestone 70 / story 04 — both @executable tasks + FF-7007.
  ...warmFixLoopTests,
  ...reviewStaysColdTests,
  // milestone 69 / story 00 — all four executable tasks + FF-6902. FF-6901
  // extends acd-loop-cap-single-home in its existing registered suite above.
  ...loopBoundsTests,
  // milestone 61 / story 00 — the clamp (tasks 00, 01, 02). FF-6111 rides the
  // already-spread acdLoopCapSingleHomeTests suite above.
  ...clampTests,
  ...workLoopReviewBoundTests,
  ...workLoopProductionReviewBoundTests,
  ...workLoopsResolvedCeilingsTests,
  // milestone 69 / story 03 — all three executable tasks + FF-6906.
  ...loopProgressTests,
  // milestone 69 / story 06 — both executable amendment tasks and the
  // production-consumer guard raised by F-69-V7.
  ...loopProgressProductionTests,
  ...laneIsLocalSlotTests,
  ...invariant4AmendedTests,
  // milestone 57 / story 01 — computed independence and the loop-registry gate (tasks 00–03)
  ...watcherIndependenceGateTests,
  // milestone 54 / story 02 — fitness in the gate (tasks 00–01) + FF-5410.
  ...loopGateCostLadderTests,
  ...loopDoctorGateScopeAndSeverityTests,
  // milestone 54 / story 03 — feedback rides the re-drive (tasks 00–03). FF-5409's remaining
  // `grade-indeterminate` clause rides `acdLoopProbeContractTests`, already spread above with
  // the rest of milestone 53's loop guards.
  ...loopRecordReachesTheRedriveTests,
  ...loopDrivenRowCarriesTheGradeTests,
  ...loopCapExhaustionCarriesTheRecordTests,
  // milestone 124 / story 01 (see the import note).
  ...loopCapExhaustionReturnsToThePlanTests,
  ...loopResumedRedriveDeclaresItsGradeTests,
  ...loopFixTransportShapeTests,
  ...loopOnlyFailRedrivesTests,
  // story 79 — the committed loop graph: the composer, the writer, and the four gates that hold
  // it current, scoped, board-deferred and named outside the registry family.
  ...loopDocumentTests,
  ...loopDocumentCommandTests,
  // milestone 78 / story 00 — the execution projection, its fixture pin against the real loader,
  // and FF-7801's purity sweep over the module and everything it directly imports.
  ...loopRecordProjectionTests,
  ...loopRecordRegistryShapeTests,
  // milestone 78 / story 01 — the renderer's two faces and its two fitness functions.
  ...loopRecordRenderTests,
  // milestone 78 / story 02 — the record command's two task contracts and its five fitness
  // functions (see the import note).
  ...loopRecordFixtureShapeTests,
  ...loopRecordCommandTests,
  // milestone 78 / story 03 — the frozen sign-off block and the reporting-only doctor lane (see the
  // import note).
  ...loopRecordSignoffShapeTests,
  ...loopDiagTests,
];
