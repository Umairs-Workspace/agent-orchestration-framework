// THE RUN SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 26 — distributed-runs-leasing (story 00: node-dimensioned run records —
// the git substrate; ADR-001 + ADR-002, no lease, no relay). src/run-store.mjs gains
// the m22-frozen runNodeRecordPath (authority moved here; mesh-store.mjs RE-EXPORTS
// it + RESERVES leaseClaimPath for story 01), the FOURTEEN-key record (20/ADR-001's
// thirteen + the additive `node`, defaulting null — every legacy record reads
// forward), the record-driven persist (record.node ⇒ runs/<node>/, null ⇒ flat —
// byte-identical single-node behaviour), the UNION readers (readRuns/readRun/dedup/
// completeRun span flat + one level of node subdirs; runId uniqueness spans the
// union), and the retired mesh sync root-set path for historical compatibility. Three @executable
// task features: 00_node-dimensioned-records (the mint-placement matrix + the
// single-node floor + read-forward + the union read/torn-skip + cross-node dedup +
// union completion + same-instant distinct ids), 01_sync-root-set (the default-root
// scope matrix + the widened runs pathspec + never-sweeps-operator-edits + the
// branch-wide pull report split + the no-op and failure envelopes in both modes +
// content-agnostic bytes), 02_add-only-run-merge (two REAL clones over a shared bare
// remote — add-only merge, no MERGING state, converged identical unions). Fitness
// #1–#5: acd-run-node-path-single-builder, acd-run-record-node-additive,
// acd-runs-eol-pinned (the 23/R3 git-semantics check over the REAL nested path —
// .gitattributes gained `**/runs/**/*.json text eol=lf`), acd-run-store-mesh-free,
// acd-sync-root-set (which also re-arms the EXTENDED acd-mesh-sync-record-neutral
// over the root-set engine). The five FROZEN_KEYS literals across the run suites
// carry the fourteenth key ("node") — the supersede's sanctioned ripple.
import { runNodePartitionTests } from "./run-node-partition.test.mjs";
// milestone 19 — work-run-lifecycle (story 00: run-store — the SPINE src/run-store.mjs:
// the per-run JSON store under runs/ (ADR-002 path seam runsDir/runRecordPath), the frozen
// run-record schema (ADR-003), and the state-machine transition table (ADR-001). The three
// task features (00_run-record-store / 01_state-machine / 02_derived-log-lifecycle) +
// the three fitness arch-tests — derived-record invariant (FF#1, prune AND rebuild),
// write-scope guard (FF#2), partition-ready layout (FF#3).
import { runStoreRecordTests } from "./run-store-record.test.mjs";
import { runStoreStateMachineTests } from "./run-store-state-machine.test.mjs";
import { runStoreDerivedLogTests } from "./run-store-derived-log.test.mjs";
// milestone 19 — work-run-lifecycle (story 01: run-commands — the three work:run-*
// commands (run-start/run-complete/run-status, ADR-003) registered into the SAME
// core + the CLI `work run-*` dispatch/--json face; each a thin wrapper over story
// 00's src/run-store.mjs. The three task features (00_run-commands in-process via
// invoke / 01_cli-face via real CLI spawn / 02_lifecycle-survives-restart via fresh
// CLI processes); the bijection extension (fitness #4) is the EXTENDED
// acd-work-command-cli-bijection arch-test already wired above.
import { runCommandsTests } from "./run-commands.test.mjs";
import { runCliFaceTests } from "./run-cli-face.test.mjs";
// milestone 126 / story 01, tasks 00-01 — FF-12603's DRIVEN half: what the render prints for a
// record, and the two time figures it derives from the instant the face injects. The structural
// half is `test/arch/run/acd-run-status-renders-the-record.test.mjs`.
import { runStatusRenderTests } from "./run-status-render.test.mjs";
// milestone 126 / story 01, task 02 — the other half of the same claim, and the one a source sweep
// cannot make: the `--json` document DRIVEN through every one of its six answering paths, so the
// `fromWorker`/`reportedBy` asymmetry is proved rather than read.
import { runStatusDocumentFrozenTests } from "./run-status-document-frozen.test.mjs";
import { runLifecycleRestartTests } from "./run-lifecycle-restart.test.mjs";
// milestone 20 — autonomous-run-resilience (story 00: resilience-core — the run-store
// resilience spine: the four additive record keys (ADR-001), the closed classification
// table + attempt ceiling (ADR-002), the retry-lineage mint (ADR-003 store side), the
// heartbeat + path-walking orphan-reclaim scan (ADR-004), the dedup guard +
// collision-safe mint (ADR-006), and the atomic persist (ADR-007). Five @executable
// behavioural test files + five fitness-function arch-tests.
import { runResilienceRecordKeysTests } from "./run-resilience-record-keys.test.mjs";
import { runFailureClassificationTests } from "./run-failure-classification.test.mjs";
import { runRetryLineageTests } from "./run-retry-lineage.test.mjs";
import { runHeartbeatReclaimTests } from "./run-heartbeat-reclaim.test.mjs";
import { runHeartbeatConsumptionTests } from "./run-heartbeat-consumption.test.mjs";
import { runDedupAtomicPersistTests } from "./run-dedup-atomic-persist.test.mjs";
// milestone 20 — autonomous-run-resilience (story 01: resilience-commands — work:run-retry
// (command + CLI face, ADR-003), the --reason producer half on work:run-complete (ADR-001/002),
// rollbackItemStatus the first item-status writer (ADR-005), and the outsider-verifiable
// CLI acceptance. Five @executable behavioural test files + one new bounding fitness function
// (acd-status-rollback-bounded); the acd-run-retry-resumes-lineage arch-test (imported above)
// gains a command-path test object riding the same import.
import { runRetryCommandTests } from "./run-retry-command.test.mjs";
// 348 auto-resume — the session_limit park gate + work:resume's re-entry face.
import { runSessionLimitResumeTests } from "./run-session-limit-resume.test.mjs";
import { runRetryCliFaceTests } from "./run-retry-cli-face.test.mjs";
import { runStatusRollbackTests } from "./run-status-rollback.test.mjs";
import { runResilienceAcceptanceTests } from "./run-resilience-acceptance.test.mjs";
import { runCompleteReasonTests } from "./run-complete-reason.test.mjs";
// milestone 68 / story 00 — spend-bearing-run-record: the run record's sixteenth
// key `spend` (ADR-001), the four mutually-exclusive writer-enforced token buckets
// (ADR-003), cost stamped once with provenance (ADR-004), and the closed exit
// vocabulary (ADR-008). The four @executable task features trace to
// test/run/run-store-spend.test.mjs; the four fitness functions FF-6801 (the EXTENDED
// acd-run-record-node-additive, registered below) / FF-6802 / FF-6803 / FF-6804.
import { runStoreSpendTests } from "./run-store-spend.test.mjs";
// milestone 68 / story 02 — spend-ingest-at-settle: the transcript's own numbers,
// copied once, priced once. The new producer module (src/run-spend-ingest.mjs)
// reads the session's whole transcript tree into the spend envelope and stamps it
// once at settle through the 68/00 writer (ADR-003/004/008); a missing or unreadable
// transcript leaves spend null, never a fabricated zero. The two @executable task
// features trace to test/run/run-spend-ingest.test.mjs. This story declares no fitness
// function of its own — FF-6803/FF-6804 (story 68/00) bind its output in the writer.
import { runSpendIngestTests } from "./run-spend-ingest.test.mjs";
// milestone 39 — delivery memory (OUTCOME.md): story 01 (the OUTCOME.md bundle
// template + the verify.md Accept-authoring hook + the generalized stripBundleMarker),
// story 02 (parseOutcome → buildRecords reaching both backends + the bounded,
// query-class-conditional capability ranking), story 04 (the dangling-declaration
// fitness function — declared record-format field with no producer fails red), plus
// the five ADR fitness functions on disk (frozen-shape ADR-001, single-index-seam
// ADR-002, capability-ranking-bounded ADR-003, authored-by-verify ADR-004,
// dangling-declaration-present ADR-005). @executable traceability + arch-tests.
import { outcomeTemplateTests } from "./outcome-template.test.mjs";
import { outcomeParseRecordsTests } from "./outcome-parse-records.test.mjs";
// story 80 — EVERY ITEM THAT DELIVERS SAYS WHAT IT DELIVERED, not only milestones.
// OUTCOME.md was milestone-only by FILING, not by content: task 00 moves the template
// to a member filed under no type (`shared`) and deletes the milestone-filed copy on
// update; task 01 widens the verify prompt to author one for a milestone, a story and
// a chore and to SAY that a spike and a uat carry none; task 02 widens the index scan
// past top-level milestones, makes a record cite by REF, and makes `--item`/`--only`
// match the subtree so a milestone-scoped recall still sees its own stories.
import { outcomeTemplateSharedHomeTests } from "./outcome-template-shared-home.test.mjs";
import { outcomeIndexAnyItemTests } from "./outcome-index-any-item.test.mjs";
// milestone 96 / story 00 — the run record on the phase path. One behavioural suite over all three
// task contracts (the session-id rung and its ambiguity table, the mint's position and close and the
// reactor's own status table, and the unattributed runs' body) plus FF-9601 (one transcript-to-item
// join, one reader of the sessions store, the pure identity resolver still pure, ambiguity resolving
// to absence, and the run record's field set unchanged).
import { runMintSessionAttributionTests } from "./run-mint-session-attribution.test.mjs";
// milestone 96 / story 04 — the regression gate is mandatory. One behavioural suite over all three
// task contracts (the run recorded as evidence on a clean checkout, the accept door refusing a
// milestone with no green gate, and the override that is a recorded reason rather than a flag) plus
// FF-9605 (the horizon still importing nothing, the two codes raised only in the item-status
// command and disjoint from the vocabularies in service, the refusal scoped to milestones, and the
// override required to be reasoned AND recorded) and FF-9606 (the record in the item own folder, the
// frozen shape with one home, the four facts unreadable rather than skipped, the rerun appending,
// and the partial run recorded but not satisfying the door).
import { regressionGateTests } from "./regression-gate.test.mjs";

export const tests = [
  ...runNodePartitionTests,
  // milestone 19 — work-run-lifecycle (story 00: run-store)
  ...runStoreRecordTests,
  ...runStoreStateMachineTests,
  ...runStoreDerivedLogTests,
  // milestone 19 — work-run-lifecycle (story 01: run-commands)
  ...runCommandsTests,
  ...runCliFaceTests,
  ...runLifecycleRestartTests,
  // milestone 20 — autonomous-run-resilience (story 00: resilience-core)
  ...runResilienceRecordKeysTests,
  ...runFailureClassificationTests,
  ...runRetryLineageTests,
  ...runHeartbeatReclaimTests,
  ...runHeartbeatConsumptionTests,
  ...runDedupAtomicPersistTests,
  // milestone 20 — autonomous-run-resilience (story 01: resilience-commands)
  ...runRetryCommandTests,
  // 348 auto-resume — session_limit parks on its stated reset; work:resume is the
  // deterministic re-entry after an infra kill.
  ...runSessionLimitResumeTests,
  ...runRetryCliFaceTests,
  ...runStatusRollbackTests,
  ...runResilienceAcceptanceTests,
  ...runCompleteReasonTests,
  // milestone 68 / story 00 — spend-bearing-run-record: the four @executable task
  // features + the story's four fitness functions (FF-6801 the EXTENDED
  // acd-run-record-node-additive, now also spread so it is actually enforced).
  ...runStoreSpendTests,
  // milestone 68 / story 02 — spend-ingest-at-settle: the transcript → spend
  // producer + stamp-once-at-settle (both @executable task features).
  ...runSpendIngestTests,
  // milestone 39 — delivery memory (OUTCOME.md): stories 01/02/04 traceability +
  // the five ADR fitness functions (frozen-shape / single-seam / ranking-bounded /
  // authored-by-verify / dangling-present) + story 04's declared-field-has-a-producer.
  ...outcomeTemplateTests,
  ...outcomeParseRecordsTests,
  // story 80 — an outcome per DELIVERING item: the template's one home (task 00), the
  // per-type authoring decision in the verify prompt (task 01), and the widened,
  // ref-citing, subtree-scoped index read (task 02).
  ...outcomeTemplateSharedHomeTests,
  ...outcomeIndexAnyItemTests,
  // milestone 96 / story 00 — the phase-path run record and its one attribution join (see the
  // import note). Appended ABOVE the milestone-54 block below, which must stay terminal.
  ...runMintSessionAttributionTests,
  // milestone 96 / story 04 — the regression gate and its two controls (see the import note).
  ...regressionGateTests,
  // milestone 126 / story 01 — FF-12603 driven half (see the import note).
  ...runStatusRenderTests,
  ...runStatusDocumentFrozenTests,
];
