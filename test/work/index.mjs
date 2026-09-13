// THE WORK SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 59 / story 01 — THE RE-ARMING (ADR-003 §3). These twenty-six suites were imported
// and never spread: every spread site vanished in ONE commit (15e0a92, 2026-07-26) with the
// imports left behind, so the files still looked registered while a hundred and seventeen test
// entries had not run for a month. Building the detector without turning them back on would
// ship an instrument that reports a defect it declined to fix. Two of them had rotted red while
// dead (`mesh-node-identity`, `mesh-registry-store-seam`) and both were REPAIRED here — see
// each suite's own header for what had moved underneath it.
// milestone 59 / story 01 — AND THE FAST-LANE-ONLY SIX. The new instrument's first run found a
// second population of the same species: six suites registered in `scripts/test-unit.mjs` only,
// so `npm test` — what CI executes — never assembled them. `66/ADR-004` measured ONE of these
// (`work-content-free-discovery`) as a curiosity; there are six, carrying 122 test entries.
// They are registered here rather than carried in the baseline, because "it runs in the other
// lane" is exactly the reasoning this story exists to make unavailable.
import { workTests } from "./work.test.mjs";
// milestone 72 / story 00 — THE DECLARED TOOLCHAIN: the test runner aof launches is something the
// PROJECT declares (`work.test`), compiled by ONE module with no program name spelled anywhere in
// `src/` in an executable position, resolved through a PATH lookup that sits in FRONT of the
// bounded seam's door rather than relaxing it, expanded into an argv by the ONE `{file}` rule, and
// launched through `runBounded` with the declaration's own deadline — where an expiry or a failure
// to start is reported as itself and never folded into a pass. Both @executable task features,
// plus FF-7201.
import { workToolchainDeclarationTests } from "./work-toolchain-declaration.test.mjs";
// story 87 — the test-isolation guard stops shipping: the member/asset/body leave the
// bundle and a consumer is retracted (task 00), and this repository keeps the compiled
// predicate as its own hand-owned, unmarked hook with its cases re-homed (task 02).
// Task 01's re-aim of FF-5505 lands in acd-frozen-set-compiled.test.mjs, already imported.
import { frameworkStopsShippingGuardTests } from "./framework-stops-shipping-guard.test.mjs";
import { workInitTests } from "./work-init.test.mjs";
// chore 51 — the config half of init (`aof work init-config`, the second call
// `/aof:init` makes once it has analysed the repo).
import { workInitConfigTests } from "./work-init-config.test.mjs";
// milestone 127 / story 02 task 04 — the two legs of `work.intake` that need a STREAM rather than a
// config: the phase door refusing a backlog ref before it decides where to run, and the read side
// answering the same under either setting and when the key is absent (ADR-005 §2). The WRITE half
// rides chore 51's suite directly above.
import { workIntakeWriteSideTests } from "./work-intake-write-side.test.mjs";
import { workUpdateTests } from "./work-update.test.mjs";
// milestone 04 — round-trip proof (story 00: the frozen harness)
import { roundtripHarnessTests } from "./roundtrip-harness.test.mjs";
// milestone 04 — round-trip proof (story 01: install-proof, story 02: loop-proof)
import { installProofTests } from "./roundtrip-install-proof.test.mjs";
import { loopProofTests } from "./roundtrip-loop-proof.test.mjs";
// story 29 — migrate-command (the migrate:folder command — convert a source folder
// INTO a managed milestone under work.dir; @executable traceability across the four
// task features, the @manual architect-judgement / real-world-folder rows deferred)
// PLUS the two story arch-tests: the migrate:* command-cli bijection and the
// read-only-source boundary (no git write verb / no fs write into the source; the
// source tree byte-for-byte unchanged after a run).
import { migrateCommandCoreTests } from "./migrate-command-core.test.mjs";
// milestone 15 — work doctor core (story 00: the spine — work:doctor registered on
// the command core with the { code, severity, path, message } envelope, the
// snapshot-once doctorWork engine + pure check-group registry + injectable clock,
// the CLI face with the --strict advisory exit policy, the /api/work/doctor board
// route, the two seeded folder-only groups (orphan-folder warn / duplicate-driver-
// number error), and the registry-derived bijection generalisation; @executable
// traceability + the FOUR cross-cutting fitness functions — envelope contract,
// engine determinism, --strict exit matrix, and the two generalised bijections)
import { doctorCommandCoreTests } from "./doctor-command-core.test.mjs";
// milestone 15 — work doctor core (story 01: coherence & completeness — the
// status-coherence + lifecycle-completeness check-groups appended to the registry;
// story 02: freshness/date-sanity + structural-integrity — the injected-clock date
// group and the folder-first numbering/orphan/duplicate group with the opt-in
// roadmap-folder-mismatch cross-reference; @executable traceability)
import { doctorCoherenceCompletenessTests } from "./doctor-coherence-completeness.test.mjs";
import { doctorFreshnessStructuralTests } from "./doctor-freshness-structural.test.mjs";
// milestone 16 — context-budget lint (story 00: the doc-bloat check-group — the
// budgetGroup appended to CHECK_GROUPS, fed by the additive docSizes snapshot metric
// and the config-sourced budgetsFromConfig resolver; emits doc-over-budget warn at the
// over-budget FILE; @executable traceability across both task features + the two new
// fitness functions — finding-envelope conformance and config-sourced/no-baked-literal)
import { doctorContextBudgetTests } from "./doctor-context-budget.test.mjs";
// milestone 70 / story 00 — phase-brief: the pure leaf compiler (`src/phase-brief.mjs`,
// ADR-001/002/003) traced by test/work/phase-brief-compile.test.mjs (tasks 00+01) and the two
// spawn seams traced by test/work/phase-brief-seams.test.mjs (task 02); the story's three
// fitness functions FF-7001/FF-7002/FF-7003 (the last an EXTENSION of the m53 single-home
// guard) are registered below.
import { phaseBriefCompileTests } from "./phase-brief-compile.test.mjs";
import { phaseBriefSeamsTests } from "./phase-brief-seams.test.mjs";
// milestone 70 / story 03 — optional ordered `adrs:`, pure exact ADR block extraction
// from the one ARCHITECTURE.md, bounded brief slices, and the exact-item accept budget
// gate. All three @executable task features trace to architecture-slice.test.mjs;
// FF-7008 extends the existing artifact-set single-home suite (registered earlier).
import { architectureSliceTests } from "./architecture-slice.test.mjs";
import { storyContextContractTests } from "./story-context-contract.test.mjs";
// milestone 70 / story 05 — brief-carries-the-contract (ADR-009): a section is CONDENSED
// to fit rather than dropped for size alone, addressing is separated from condensing, one
// miss no longer cascades, and the compiler is handed addressed extracts instead of whole
// documents. Tasks 00+01 trace to test/work/brief-carries-the-contract.test.mjs (the pure
// compiler + its addressing/condensing helpers); task 02 traces to
// test/work/brief-pinned-to-the-stream.test.mjs, which compiles briefs for THIS repository's own
// wiki/work/ through the real reader — the guard whose absence let F-11 through three story
// gates. FF-7009 EXTENDS acd-phase-brief-bounded-in-writer and FF-7010 EXTENDS
// acd-phase-brief-single-bag, both already imported and spread above.
import { briefCarriesTheContractTests } from "./brief-carries-the-contract.test.mjs";
import { briefPinnedToTheStreamTests } from "./brief-pinned-to-the-stream.test.mjs";
import { fourDeadlinesTests } from "./four-deadlines.test.mjs";
import { loadworkspaceHydrationTests } from "./loadworkspace-hydration.test.mjs";
import { backcompatMigrateDoctorTests } from "./backcompat-migrate-doctor.test.mjs";
import { workDelegationTests } from "./work-delegation.test.mjs";
// story 31 — migrate-claude-command (the /aof:migrate BUNDLE BODY — the inference
// ceiling over the story-29 mechanical CLI). Task 00's @executable content pins over
// the AUTHORED src/bundle/commands/migrate.md (grep-able marker facts + offset
// ordering, the acd-doctor-validate-keystone idiom) + task 03's distribution matrix
// (descriptor member, derived-manifest byte-for-byte regeneration (ADR-002), work
// update/init landing, never-inited refusal, idempotent skip, dry-run preview,
// ADR-005 drift-preserved / --force-restored). Tasks 01/02 are @manual (agent-run
// at aof:verify) — the body's statements of their contracts carry hardening pins.
import { migrateClaudeCommandTests } from "./migrate-claude-command.test.mjs";
// chore 103 — work doctor reported health over a stream it could not see: config
// discovery walks UP to the enclosing project (so work.dir is cwd-independent), and a
// scan that finds ZERO items refuses instead of printing a clean line.
import { doctorCwdIndependenceTests } from "./doctor-cwd-independence.test.mjs";
import { frameworkTests } from "./frameworks.test.mjs";
import { workspaceTests } from "./workspace.test.mjs";
// milestone 34 / story 04 — worker live-state stream to control node (ADR-007): the
// worker-role/control-address resolution, the persistent worker stream client
// (snapshot-first-then-deltas, reconnect+backoff, failure isolation), the always-on
// control-node stream server (tailnet-only admission, apply+redact, liveness), and
// the stream retry/reconciliation/freshness lanes, plus the story's 4 fitness
// units. Tasks 00–03 are @executable; task 04 (the real two-machine soak) is @manual
// and deliberately has no test file here.
import { workerRoleAddressTests } from "./worker-role-address.test.mjs";
import { workerStreamClientTests } from "./worker-stream-client.test.mjs";
import { pathTests } from "./paths.test.mjs";
import { singleEntryTwoModeTests } from "./single-entry-two-mode.test.mjs";
import { verifyAuthorsOutcomeTests } from "./verify-authors-outcome.test.mjs";
import { danglingDeclarationFfTests } from "./dangling-declaration-ff.test.mjs";
// story 03 — gaps are schedulable debt: the `--status` recall filter (gap lifecycle)
// + promote-gap-to-chore over the reused chore insert seam.
import { gapCarriesDischargeTests } from "./gap-carries-discharge.test.mjs";
// review fix — pin the deliberate SCOPE_FLAGS/SCOPE_FIELDS seam-split as coverage.
import { scopeFlagsFieldsAgreeTests } from "./scope-flags-fields-agree.test.mjs";
// milestone 40 / story 01 — version stamp & reader (ADR-001/002/003/004): the
// reader (schema-int/aofVersion-string, schema-0 baseline, task 00), new items
// born-stamped at scaffold (task 01), and the ADR-004 transform-scoped
// frontmatter writer (applyItemFrontmatter) coexisting with rollbackItemStatus
// as two narrow, bounded writers (task 02).
import { workVersionReaderTests } from "./work-version-reader.test.mjs";
// 2026-08-16 — the ITEM STATUS LIFECYCLE: the forward half the stream never had. The
// declared ITEM_STATUS_EDGES table + setItemStatus (work.mjs), the automatic
// not-started -> in-progress on a run mint (the run.started reactor), the `work:status`
// door, and the phase door's local start.
import { workItemStatusLifecycleTests } from "./work-item-status-lifecycle.test.mjs";
// story 74 — a refused status move is DATA, not a failure: `--if-applicable` narrows
// exactly `status-edge-not-applicable` on the write door (task 00), and the three
// doc-shape faults get their own `record-doc-unusable` code at the shared writer so
// neither the flag nor the two reactors' sanctioned no-ops can swallow one (task 01,
// finding F-73-G).
import { workItemStatusIfApplicableTests } from "./work-item-status-if-applicable.test.mjs";
import { verifyOutcomePerTypeTests } from "./verify-outcome-per-type.test.mjs";
import { recordsFollowTheStoryTests } from "./records-follow-the-story.test.mjs";
import { deliveredStoryRecordsTests } from "./delivered-story-records-reported.test.mjs";
// milestone 43 / story 01 — THE EXCLUSIVE ITEM LOCK (ADR-003 + ADR-010's R1.1/R1.3/
// R1.4/R1.5). Task 00: the scope rule moves down into the leaf and every face answers
// byte-identically. Task 01: the predicate is SYMMETRIC over the execution scope. Task
// 02: one coded refusal at every door (second assignment / local mint / retry /
// control-side mutation), minting nothing and renaming nothing. Task 03: the holder is
// admitted by IDENTITY, never by exemption. Task 04: `work next` skips-and-reports
// through the SAME predicate. Task 05: an operator verb is refused loudly, the control's
// periodic publish tick skips quietly and counts. Task 06 (the two-machine soak) is
// `@manual` and deliberately has no test file here.
import { itemLockScopeOneHomeTests } from "./item-lock-scope-one-home.test.mjs";
import { itemLockSymmetricScopeTests } from "./item-lock-symmetric-scope.test.mjs";
import { itemLockCodedRefusalTests } from "./item-lock-coded-refusal-every-door.test.mjs";
import { itemLockHolderIdentityTests } from "./item-lock-holder-identity.test.mjs";
import { itemLockNextSkipsHeldTests } from "./item-lock-next-skips-held.test.mjs";
import { itemLockOperatorVsAutomaticTests } from "./item-lock-operator-vs-automatic.test.mjs";
// milestone 66 / story 00 — CONTRACT PARSES. ACD defines the contract artifact and has
// never parsed it: in the investigated downstream milestone 33 of 37 authored `.feature`
// files did not parse. Task 00: `src/feature-parse.mjs` becomes the ONE Gherkin reader
// under `src/` (the 37-line scanner in `work.mjs`'s `checkFeatureTags` is deleted, not
// copied), gaining structural findings under a NEW key — the accept/reject matrix is
// drawn from the corpus and its reject rows cite REAL files at REAL lines. Task 01: one
// exported predicate (`src/acceptance-horizon.mjs`, a zero-import leaf carrying
// `VALID_STATUS`) decides whether an item's record is still editable, so no gate ever
// fires on a delivered contract nobody may edit. Task 02: `aof work validate` refuses an
// unparseable contract inside the horizon — run over this repo it reports exactly ONE
// file and grandfathers thirteen. FF-6601 + FF-6602 are the story's own fitness
// functions (ADR-007 §1), each with its planted-defect lane.
import { featureParseStrictTests } from "./feature-parse-strict.test.mjs";
// milestone 57 / story 02 — additive Examples metadata on the one feature parser
// (tasks 00–01) + FF-5704's whole-corpus compatibility differential.
import { featureParseExamplesTests } from "./feature-parse-examples.test.mjs";
// milestone 57 / story 05 — the day-one pairing table (tasks 00–01): the three
// shipped watcher records + FF-5707 (counter resolution) and FF-5708 (table complete).
import { pairingTableTests } from "./pairing-table.test.mjs";
// milestone 66 / story 03 — THE ASK (ADR-005, ADR-006, ADR-007 §1/§2, ADR-009/H+I, ADR-011/E).
// A check with no ask is a trap: ACD's gates are met by agents reading `src/bundle/`, so every
// refusal 66/02 can raise ships its ask in the same milestone. Task 00 lands the
// `VERIFICATION.md` template ACD has never had — four frozen headings and the fitness register
// whose `red probe` cell records what was changed to make a control fail and the message
// observed. Task 01 gives the `ARCHITECTURE.md` template an `id` column plus the
// intended-path/`pending`/citation-form convention, in `refine.md` and `aof-architect.md` too.
// Task 02 puts the id-allocation rule in `verify.md` and the five reviewing agents: a reviewer
// reports UNNUMBERED, the single writer allocates on landing, because a stale read looks exactly
// like a fresh one. FF-6608 is the story's own fitness function (ADR-007 §1) and the literal
// discharge of the finding's measured zero — eight falsifiability terms, 0 files each across
// `src/bundle/` at HEAD; it holds the red-probe placeholder byte-equal across the JS/markdown
// boundary, which no import can do, and carries its own planted-defect lane per (ask, file).
import { verificationTemplateTests } from "./verification-template.test.mjs";
import { doctorLoopRecordLaneTests } from "./doctor-loop-record-lane.test.mjs";
// milestone 96 / story 01 — the sets are derived, not recalled. One behavioural suite over all three
// task contracts (the three sources and their closed reason set, the test lane derived by the
// repository's own root-and-extension rule, and the proposal that never writes) plus FF-9602 (the
// parser's zero imports preserved, no write path, the graph read and never built, the reasons
// closed, and an unusable graph answered rather than emptied).
import { storyContractDeriveTests } from "./story-contract-derive.test.mjs";
// milestone 96 / story 02 — the plan document. One behavioural suite over all three task contracts
// (the template's two sections and the restatement ban driven over the shapes a table wears, the
// length governed by the budget family that already exists, and the gate that ships off and reaches
// the builder alone) plus FF-9603 (the ban asserted over the stream as well as the template, the
// budget number living only in the defaults, the vocabulary unchanged, and the gate's one reader).
import { storyPlanDocumentTests } from "./story-plan-document.test.mjs";
// milestone 124 / story 00 — the depends census, as a fourth advisory doctor lane. Tasks 02 (each
// unwitnessed edge named, with both endpoints and both sets, at `warn`, rendering no verdict) and
// 03 (exactly one `depends-edges-unchecked` per run, its two exclusion reasons kept apart, and the
// four counts an identity over the whole edge set). The two scenarios that are claims about THIS
// REPOSITORY'S OWN STREAM live with FF-12401 in
// test/arch/work/acd-census-reports-its-denominator.test.mjs, so the real stream is measured once.
// Tasks 00 and 01 trace to the already-spread storyContextContractTests.
import { doctorDependsLaneTests } from "./doctor-depends-lane.test.mjs";

export const tests = [
  // milestone 59 / story 01 — the fast-lane-only six, now in what CI executes
  ...workTests,
  // milestone 72 / story 00 — the declared toolchain (tasks 00–01) plus FF-7201.
  ...workToolchainDeclarationTests,
  // story 87 — repo-specific lab hygiene leaves the bundle, and stays here hand-owned
  ...frameworkStopsShippingGuardTests,
  ...workInitTests,
  ...workInitConfigTests,
  // milestone 127 / story 02 task 04 — the phase door and the mode-less read side
  ...workIntakeWriteSideTests,
  ...workUpdateTests,
  ...roundtripHarnessTests,
  ...installProofTests,
  ...loopProofTests,
  // story 29 — migrate-command (the command + its two story arch-tests)
  ...migrateCommandCoreTests,
  ...doctorCommandCoreTests,
  ...doctorCoherenceCompletenessTests,
  ...doctorFreshnessStructuralTests,
  ...doctorContextBudgetTests,
  // milestone 70 / story 00 — phase-brief: the pure-compiler + boundary tests (tasks 00+01)
  // and the two-spawn-seam tests (task 02), plus FF-7001/FF-7002/FF-7003.
  ...phaseBriefCompileTests,
  ...phaseBriefSeamsTests,
  // milestone 70 / story 03 — all three @executable tasks. FF-7008 is an added test
  // in the already-spread acdWorkArtifactSetSingleHomeTests suite.
  ...architectureSliceTests,
  ...storyContextContractTests,
  // milestone 70 / story 05 — both @executable pure-compiler tasks (00+01) and the
  // real-stream guard (02). FF-7009/FF-7010 are added tests inside the already-spread
  // acdPhaseBriefBoundedInWriterTests / acdPhaseBriefSingleBagTests suites above.
  ...briefCarriesTheContractTests,
  ...briefPinnedToTheStreamTests,
  ...fourDeadlinesTests,
  ...loadworkspaceHydrationTests,
  ...backcompatMigrateDoctorTests,
  ...workDelegationTests,
  // story 31 — migrate-claude-command (the /aof:migrate bundle body + distribution)
  ...migrateClaudeCommandTests,
  ...doctorCwdIndependenceTests,
  ...frameworkTests,
  ...workspaceTests,
  // milestone 34 — global mesh work store (story 04: worker live-state stream to
  // control node, ADR-007)
  ...workerRoleAddressTests,
  ...workerStreamClientTests,
  ...pathTests,
  ...singleEntryTwoModeTests,
  ...verifyAuthorsOutcomeTests,
  ...danglingDeclarationFfTests,
  ...gapCarriesDischargeTests,
  ...scopeFlagsFieldsAgreeTests,
  // milestone 40 / story 01 — version stamp & reader task traceability
  ...workVersionReaderTests,
  // 2026-08-16 — the item status lifecycle (writer, run mint, door, phase door)
  ...workItemStatusLifecycleTests,
  // story 74 — the expected refusal as data (--if-applicable) + record-doc-unusable
  ...workItemStatusIfApplicableTests,
  ...verifyOutcomePerTypeTests,
  ...recordsFollowTheStoryTests,
  ...deliveredStoryRecordsTests,
  // milestone 43 / story 01 — the exclusive item lock (tasks 00–05; 06 is @manual)
  ...itemLockScopeOneHomeTests,
  ...itemLockSymmetricScopeTests,
  ...itemLockCodedRefusalTests,
  ...itemLockHolderIdentityTests,
  ...itemLockNextSkipsHeldTests,
  ...itemLockOperatorVsAutomaticTests,
  // milestone 66 / story 00 — contract parses (tasks 00–02) + its two fitness functions
  ...featureParseStrictTests,
  // milestone 57 / story 02 — additive Examples metadata (tasks 00–01) + FF-5704
  ...featureParseExamplesTests,
  // milestone 57 / story 05 — the day-one pairing table (tasks 00–01) + FF-5707/FF-5708
  ...pairingTableTests,
  // milestone 66 / story 03 — the ask (tasks 00–02) + its one fitness function
  ...verificationTemplateTests,
  ...doctorLoopRecordLaneTests,
  // milestone 96 / story 01 — the derived read and write sets and their one control (see the
  // import note).
  ...storyContractDeriveTests,
  // milestone 96 / story 02 — the plan document and its one control (see the import note).
  ...storyPlanDocumentTests,
  // milestone 124 / story 00 — the depends lane (tasks 02–03; see the import note).
  ...doctorDependsLaneTests,
];
