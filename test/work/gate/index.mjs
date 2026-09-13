// THE WORK/GATE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { validateStreamTests } from "./work-validate.test.mjs";
// milestone 77 / story 00 — THE PROMPT LAYER: two rules over the prompt documents an audited project
// has INSTALLED, both designed to UNDER-REPORT and both stating that in their own output. A
// capability gap is a backticked CODE SPAN whose first token is one of eight declared programs
// FOLLOWED BY AN ARGUMENT, in a clause ordering a run, attributed by exactly ONE bolded role word
// through a declared eight-row map — the naive detector produced 17 findings over this corpus of
// which zero were the true one, and every gate removes one of those seventeen by construction
// rather than by an exception list. A duplicated instruction is a normalised sentence at or above a
// declared byte floor, matched EXACTLY and aggregated per FILE PAIR with the bytes it costs; a
// paraphrase is invisible, and the run says so. The lane is pure over injected inputs and a subject
// root, reads no clock, reaches no configuration key, and registers nothing — ADR-010 §2 puts every
// `REPORT_LANES` entry in 77/05. All three @executable task features plus FF-7701 and FF-7702.
import { promptLayerTests } from "./work-audit-prompt-layer.test.mjs";
// milestone 77 / story 01 — THE HOOK WIRING: a hook registered twice under one event and one matcher
// fires twice, and the prompt ping fires on every user turn, so the second cold process is paid per
// turn for as long as the file stays in that state. This lane DETECTS it in any audited repository
// and repairs nothing — `72/ADR-005 §3` refused to change the merge because the escape hatch that
// carries an unmarked entry through every update is the same one keeping this repo's own
// test-isolation guard alive, and the evidence base for reversing that is n = 0 observed pairs since
// 72/03 deleted the three RESEARCH measured. Equivalence is over the RESOLVED INVOCATION — command
// plus args, the project-directory variable unexpanded, each token portable-path normalised — so a
// reformatted copy is a copy and a differing `args` is not. The marker key is INJECTED, which keeps
// the family closure free of the module that declares it, and is proved by one object giving two
// answers under two keys. Both @executable task features plus FF-7703, a RATCHET green on arrival.
import { hookWiringTests } from "./work-audit-hook-wiring.test.mjs";
// milestone 77 / story 02 — THE SEAM LIVENESS: an exported module the code graph gives no dependent
// outside the declared test roots is a bound that exists only in prose, and a command can ask that
// on every run for the price of reading an artifact something else already built. It READS and never
// builds (72/ADR-002 §1's reasons intact: a build is minutes even when nothing changed), through the
// shipped normalizer alone — and inverts the dependents index in ONE pass, because the shipped
// per-path answer re-walks every edge per path and would cost ~12 s over ~150 candidates. An UNKNOWN
// is a stated LIMIT and never a clean seam: no artifact, an unreadable one, and a candidate the graph
// reports absent each yield zero findings plus a limit naming the reason, and the floor is taken over
// SOURCE ON DISK so an optional tool's absence cannot red a build at error. Both false-positive
// shapes are DERIVED every run — a zero-export module is a program, and a resolvable relative
// dynamic-import literal swept over `src/**` is a reference, resolved against its holder and never by
// basename, which would suppress the repository's only genuine finding. All three @executable task
// features plus FF-7704.
import { seamLivenessTests } from "./work-audit-seam-liveness.test.mjs";
import { declaredBoundsTests } from "./work-audit-declared-bounds.test.mjs";
// milestone 40 / story 03 — staleness in validate (ADR-005/006, dep-01 only):
// validateWork flags any item whose schema is behind WORK_ITEM_SCHEMA_VERSION,
// naming aof upgrade as the remedy, while an at-current item and an
// up-to-date stream stay clean.
import { workValidateStalenessTests } from "./work-validate-staleness.test.mjs";
import { contractParsesTests } from "./work-validate-contract-parses.test.mjs";
// milestone 57 / story 03 — the pure contract-integrity ratchet (tasks
// 00–04) and FF-5705's command-boundary purity/registration checks.
import { workRatchetTests } from "./work-ratchet.test.mjs";
// milestone 57 / story 04 — finding-escape + intervention counters (tasks
// 00–02), with a read-only observation-boundary/registration fitness suite.
import { workCountersTests } from "./work-counters.test.mjs";

export const tests = [
  ...validateStreamTests,
  // milestone 77 / story 00 - the prompt layer (tasks 00-02) plus FF-7701 and FF-7702.
  ...promptLayerTests,
  // milestone 77 / story 01 - the hook wiring (tasks 00-01) plus FF-7703.
  ...hookWiringTests,
  // milestone 77 / story 02 - the seam liveness (tasks 00-02) plus FF-7704.
  ...seamLivenessTests,
  ...declaredBoundsTests,
  // milestone 40 / story 03 — staleness in validate task traceability
  ...workValidateStalenessTests,
  ...contractParsesTests,
  // milestone 57 / story 03 — contract-integrity ratchet (tasks 00–04) + FF-5705
  ...workRatchetTests,
  // milestone 57 / story 04 — escape/intervention counters (tasks 00–02)
  ...workCountersTests,
];
