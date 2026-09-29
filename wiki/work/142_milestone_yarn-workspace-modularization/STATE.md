# 142 · Yarn workspace modularization — State

## Progress

- 2026-09-28: Milestone captured from the repository assessment and subsequent design discussion.
- Status: Yarn cutover committed as `a66dd8d` on `refactor/yarn-workspace-modularization`.
  `@aof/contracts` supplies command composition and routing (`5be0e23`).
  `@aof/effects` owns dispatch/outbox algorithms (`ba8c557`), generic SQLite journal storage,
  and reactor registration through injected runtime/diagnostic/policy interfaces. Mesh and messaging own their command contributions;
  domain source extraction remains incremental. Work, mesh, and Notion now own their effect handlers
  in three additional workspaces; core assembles them with explicit deferred service providers.
  Effect registration has no static transition/domain import cycle.
  Notion now owns its synchronization, sidecar, launcher, and both command implementations;
  core registers its CLI contribution and supplies services through compatibility adapters.
  @aof/foundation now owns atomic filesystem helpers, the throttled reporter, and JSONL storage.
  Core owns the existing log-path policy; the session driver no longer imports any mesh module.
  @aof/work now owns record selection/parsing, metadata/schema reads, guarded writes and lifecycle
  predicates. Its discovery and identity APIs now own enumeration, lookup, listing and folder/ref
  grammar. Readiness and shared dependency rules now live in the work package too.
  Validation, feature parsing and digest mechanics are extracted; core supplies the shipped digest contract.
  Core retains workspace configuration/identity loading, command
  gates and effect publication.
  @aof/work-graph now owns registry loading/checks, execution projections, diagram/document rendering
  and all six graph-related commands. Core supplies asset locations, run reads and shared invocation.
  Shared bounds and errors live in contracts below work-graph and execution.
  Work now also owns acceptance and audit services, declaration grammar and pure doctor controls.
  Core supplies audit execution, installed-program paths, vocabulary/reference data and graph checks.
  @aof/work-loop now owns the zero-import engine and ask/stop/resume/child-drive services;
  core supplies runtime paths, diagnostics, CLI location and bounded process execution.
  It also owns cycle/wave/ask/stop orchestration, progress/diagnostics, argv composition and
  the loop plus three phase-driver commands. Core adapters supply named application services
  and registry invocation; final application assembly and adapter removal remain.
  The earlier full root suite was stopped before completion; its limitations remain recorded below.
- Objectives: [SPEC.md](SPEC.md).
- Source findings and unresolved questions: [RESEARCH.md](RESEARCH.md).
- Proposed package map and migration stages: [MIGRATION.md](MIGRATION.md).
- Delivered changes and verification details: [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Full migration completion audit: [COMPLETION.md](COMPLETION.md).

## Notes & decisions

- 2026-09-28: The user clarified that this work proceeds outside AOF's workflow. This folder is
  a planning/research record only: implement directly using ordinary development and verification,
  without AOF skills, run tracking, story orchestration, or lifecycle gates. The mistakenly created
  local run record was removed and its local status change reversed. This instruction supersedes
  the workflow/refinement handoffs written during capture.
- The user explicitly requested `wiki/work/142_milestone_<appropriate_name>` as the location for
  these notes. This does not authorize managing the migration through AOF.
- The CLI belongs inside the core package. The original proposal for a separate `apps/cli`
  workspace was superseded in discussion and must not be carried into implementation.
- Core includes the bundled skills, commands, agents and templates. Skills such as `aof:continue`
  and `aof:verify` require the executable and supporting operations in the base AOF distribution.
- Feature packages contribute their own CLI commands, actions, arguments and options. Core owns
  registration/routing and shared conventions; feature packages own domain behavior.
- Domain packages must not import the core that assembles them. Shared contracts and necessary
  foundational utilities sit below both; collaborators can also be supplied through explicit interfaces.
- UI and desktop remain separate applications. Desktop retains its Rust/Cargo ownership.
- Package names beyond these agreed boundaries, the contribution API, and extraction sequence remain
  proposals to validate against the code.

## Verification

- The notes record core ownership of the CLI and package extensions. AOF lifecycle metadata and
  refinement handoffs have been removed.
- 2026-09-28: Existing supply-chain audit passed with no warnings. Unit baseline passed with
  997 successful checks; log: `.tmp/workspace-migration/baseline-unit.log` (local, ignored).
- Yarn cutover verification passes: audit, clean immutable install, production focus, lock-drift
  refusal, all 997 unit checks, nine new regression cases, focused architecture/release checks,
  UI build, CLI smoke, external payload smoke, installer dry-run, and Bash syntax.
- The broad root run was stopped after 5,221 checks: 5,209 passed and 12 failed during the run.
  Eleven failures were corrected and passed focused reruns. One loop-wave case passed unchanged
  when rerun alone; its intermittent full-run failure remains recorded. No full-suite green claim.
- Linux/macOS native builds, actual WSL deployment, release artifacts, and the unexecuted remainder
  of the root suite remain unverified. Details: [IMPLEMENTATION.md](IMPLEMENTATION.md).

- Domain-effect extraction: all 997 unit checks, 164 focused checks, and 39 package-local
  cases pass (the package cases also run through the focused bridge). Immutable install, audit,
  browser/SEA JavaScript bundles, CLI smoke, and an external installed-payload status cycle pass.

- Notion extraction: 306 focused checks, all 997 unit checks, and the 43 internal package cases
  pass. Installed-payload command workflows and old/new sidecar compatibility pass with fake
  Notion egress. All 117 command IDs retain their order.

- Foundation extraction: 997 unit checks, 468 focused checks, and all 52 internal package cases
  pass. Immutable install, audit, browser/SEA JavaScript bundles, and an external payload with
  old/new filesystem and log compatibility pass.

- Work record extraction: all 997 unit checks and eight new package cases pass. Immutable install,
  audit, browser/SEA JavaScript bundles, and an external payload status/rollback/transform cycle
  with pre-extraction reader compatibility pass. The expanded selection completed 2,121 checks:
  2,115 passed initially; six test issues were corrected and all 44 cases in their two suites pass
  on rerun. All 60 internal package cases pass. Details are in IMPLEMENTATION.md.

- Work discovery extraction: all 997 unit checks, 2,096 selected checks and 66 package cases pass.
  Immutable install, audit, browser/SEA JavaScript bundles, CLI help and copied-install old/new
  read-model parity pass. Full-root-suite and native/platform limitations remain.

- Work readiness extraction: all 997 unit checks, 2,104 selected checks and 73 internal package
  cases pass. Supply-chain audit, browser/SEA JavaScript builds and copied-install readiness parity
  pass. No external dependency change or install was needed. Full-root-suite and native/platform
  limitations remain; see IMPLEMENTATION.md.

- Work validation extraction: all 997 unit checks, 676 selected checks and 77 internal package
  cases pass. Audit, browser parser/digest bundles, CLI JavaScript build and copied-install old/new
  validation/digest parity pass. Four stale source assertions and one overly broad corpus assertion
  were corrected. The full migration remains in progress; see COMPLETION.md.

- Work-graph extraction: all 997 unit checks, 820 selected checks and 81 internal package
  cases pass. Immutable install, audit, browser/SEA JavaScript bundles and copied-install
  graph/model/command parity pass. Native/platform and full-root-suite checks remain outstanding.

- Work-loop engine/control extraction: all 997 unit cases and 2,030 selected cases are covered
  after focused reruns; all 85 package cases pass. Immutable install, audit, browser/SEA JavaScript
  bundles, persisted-record parity and final copied-installation checks pass. A shared-process
  wave run stalled; all 49 wave cases pass in separate bounded processes. Full-root-suite and
  native/platform checks remain outstanding. See IMPLEMENTATION.md for exact run evidence.

## Next

Work-loop orchestration verification: 997 unit checks and all 2,030 selected loop/architecture
cases are covered after focused source/citation reruns; 114 supplemental checks and the final
87-package-case bridge pass. Immutable install/audit, browser/standalone JavaScript bundles,
copied-install loop/driver checks and three-runtime rendering pass. Full-root/native/platform
verification remains outstanding. See IMPLEMENTATION.md for the exact overlapping selections.

Continue extracting domain service implementations and their command contributions behind the new
package interfaces. The work and mesh handler packages are implemented; their injected
service implementations are being extracted from src/. Work owns record/lifecycle services;
workspace configuration/identity loading and acceptance composition
remain in core. Acceptance implementations belong to work. Enumeration/lookup/listing, readiness and their shared identity/dependency
rules are extracted. Validation now consumes an explicit core-supplied digest contract.
Work-loop orchestration and commands now consume explicit execution, work, notification and mesh
services. Execution now owns run persistence, transcript settlement, heartbeat queues and
session attribution. The local driver and shared PTY loader/spawner are also extracted.
Continue with remaining work acceptance/audit services and mesh coordination,
then replace their transitional adapters in final core assembly. Notion owns
its services and CLI descriptors;
shared work/routing services, diagnostics, provisioning and journal policy remain injected.
Foundation filesystem and diagnostic mechanisms are extracted; core retains their application
policy through compatibility adapters. Core registration is statically acyclic, while deferred
runtime service composition remains transitional. Core still owns the CLI
and will move to packages/core with its assets. Keep the outstanding full-suite and platform
checks explicit. Continue direct development without AOF workflow commands.

Execution run extraction verification: 724 selected checks are covered after 18 focused source-guard
corrections; five new package cases and the final 92-package-case bridge pass. Old/new API results
and persisted bytes match, including in a copied installation. Immutable install, audit, JavaScript
bundles and temporary three-runtime rendering pass. The unit selection covers 996 of 997 cases;
the remaining generated-output synchronization check awaits approval for four additional citation-only
refreshes, separate from the three already approved and committed. See IMPLEMENTATION.md.

Terminal provider resolution and the live-session registry also now belong to execution.
Their implementation bodies and legacy export sets are unchanged; 906 affected checks pass,
including all 94 internal package cases. Immutable install/audit and standalone JavaScript
bundle checks pass. Driver, PTY/screen and worktree ownership remain next; the four pending
generated citation refreshes are unchanged by this slice.

Local driver/PTY extraction: static local-driver reach shrank from 41 to 35 modules, and the
package driver reaches only itself, PTY and contracts bounds. The copied body, instruction values
and launch envelopes match the old implementation. The affected 1,180-case selection is covered
after source-guard corrections; the final bridge passes all 96 package cases. The unit run reports
997 passes and one pending generated-citation synchronization failure. Immutable install/audit,
standalone JavaScript build and copied-installation launch/native-refusal checks pass. No native
executable or real agent-session launch is claimed by these checks.

Screen/trust extraction: execution now owns screen models, session observation, recognition rules
and workspace trust updates. Exact implementation/export comparisons, seven recorded-screen
replays and temporary-home trust-file byte comparisons pass. The 896-case affected selection is
covered after correcting one manifest-order assertion; a final 48-case rerun includes all 99
package cases. Immutable install/audit, standalone JavaScript bundling and copied-installation
checks pass. The four previously pending generated citations remain untouched. Reusable worktrees,
remaining domain packages, final core/apps layout and final verification remain outstanding.

Worktree extraction: execution owns reusable Git execution, materialization, branch advancement,
availability and porcelain parsing. Mesh owns lane paths, naming, preparation, reuse, retention and
scoped commit policy. Core supplies workspace loading, diagnostics and the existing lazy toolchain
port. All 37 legacy exports and 44 function bodies retain behavior after explicit port wiring.
The final changed-suite/census run passes 94 cases, including the bridge over 103 package cases;
immutable installation, audit, standalone JavaScript bundling and copied-payload parity also pass.
The broader affected selection additionally exercises real Git worktrees and loop/mesh consumers;
its final result and the Pages correction are recorded in IMPLEMENTATION.md.

The broader selection finished 1,720 cases: 1,704 initially passed; 13 source/setup assertions are
covered by focused corrections, leaving three repository-state failures (ungoverned 142, a backlog
context contract, and done story 141 at the root). Pages now installs/audits workspaces before staging
and includes package sources in its gate fixture; all 20 Pages cases are covered after one focused
mutation-test correction. No AOF item lifecycle or generated citations changed. The full migration
and final whole-tree/platform verification remain outstanding.

Work acceptance extraction: work now owns the rules, ledger arithmetic, admissibility, criterion,
persistence, observations and audit read contracts. Core supplies assets, journal reads and mesh
path policy. Seven legacy export sets and all implementation bodies match after port wiring.
The 610-case affected selection is covered after source-guard corrections; the final 146-case
changed-suite/census run passes, including all 106 package cases. Copied-installation API and
persisted-byte parity and standalone JavaScript bundling pass. Remaining audit services, domain
extractions, core/apps layout and final verification remain outstanding. The four pending generated
citation updates remain separate from the three already approved and committed.

Bounded child-process execution now belongs to execution with the original seven exports and
unchanged implementation. The audit safety guards follow public workspace exports and inspect
their implementations. The 334-case affected selection is covered after two source assertions
were corrected; the final 35-case guard/import-reach/census run passes. Source and copied-payload
process-result parity and standalone JavaScript bundling pass, retaining 117 commands. No dependency
or generated-output changes were needed. Continue with remaining audit services and their explicit
core/graph collaborators, then the outstanding domains and final application layout.

Audit services are now extracted: nine modules covering audit lanes/report assembly, declaration
grammar and pure controls. Core supplies installed-program location, execution, vocabulary,
reference/bounds and graph collaborators. The 831-case affected selection is covered after source
and copied-fixture corrections; the final 192-case changed/contract/census run passes, including
all 110 package tests. Old/new reports, real helper execution and grammar values match in source
and in a copied installation; standalone JavaScript bundling passes and 117 commands remain.
No dependencies or generated citations changed. Next: remaining doctor/tuning services, work
mutations and command implementations; other domains, core/apps layout and final verification
remain outstanding as recorded in COMPLETION.md.

Doctor extraction: work now owns the snapshot engine, check lanes, grades, scope, story contracts,
citation resolution and diagram layout. Core supplies execution/run reads and diagram policy;
check lanes import shared predicates directly, removing imports back into the snapshot engine.
The new work-to-contracts edge passes immutable installation and supply-chain checks. Legacy API,
source/copy behavior and standalone JavaScript checks pass; the 177-case focused run includes all
112 package cases, with later scan-coverage corrections passing 23 cases. The broader affected
selection finished at 1,931 passes and 32 failures; 27 source/fixture assertions are covered by
focused corrections, and the census passes all 12 cases. Four failures concern existing generated
citations/repository state; the fifth exposed a fixture date captured before midnight and written
afterward. Its timestamp now comes from fixture creation; the add/promote pair and four tuning
architecture checks pass (six cases). No additional generated citations or workflow state
changed. Continue with tuning and remaining work mutations/commands, other domains, core/apps
layout and final whole-tree/platform verification.

Tuning extraction: work now owns five tuning services, counters and the tune command descriptor.
Core supplies model assets, cross-domain readers and registry access. The 545-case affected selection
is covered after 20 source/helper-path corrections; the changed suites pass 278 cases, including all
115 package cases. Another 17 coverage checks, 69 doctor follow-up checks and the 12-case census pass.
Source and copied-installation comparisons preserve corpus/proposal/counter results, rendered output
and acceptor invocation; the copied payload retains 117 commands. Standalone JavaScript bundling and
the supply-chain audit pass. No dependencies or generated citations changed. Remaining work mutations,
commands, domain extractions, core/apps layout and final verification remain open in COMPLETION.md.

Mutation extraction: work owns archive moves/link rewriting, reindex/ref-remap mechanics and the
schema-upgrade registry/engine. Upgrade receives installed-version policy from core; the other two
engines use work-owned readers directly. All three legacy APIs and implementation functions match
their baseline. Source and copied-payload tests preserve reports and persisted bytes, and the payload
retains 117 commands. The 440-case selection is covered after nine source-path corrections; the
changed-suite run passes 126 cases, including the bridge over all 116 package cases. The broader
138-case final selection needed one cache-import matcher correction; the corrected guard and final
census pass all 17 cases.
Standalone JavaScript bundling and supply-chain audit pass. No dependencies, generated citations or
workflow state changed. Continue with remaining work services/commands, other domains and final layout.

Gap/finding promotion extraction: the content seed, append/idempotence engine and both command
implementations now live in work. Core supplies insertion flags/operation and the shared cache reader.
All four legacy APIs, exported values and function bodies match. The 506-case selection is covered
after 11 source-location corrections; the changed suites pass 225 cases, including all 117 package
cases. Source and copied-installation comparisons preserve promotion output, refusals, idempotence and
record bytes, retaining 117 registered commands. Standalone JavaScript bundling and supply-chain audit
pass. The final mint/census guard run passes all 17 cases. No dependency or generated-output change was
needed. Remaining scaffolding/backlog promotion, work services/commands, domains and final layout remain.
