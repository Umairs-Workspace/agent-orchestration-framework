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

Insertion extraction: work now owns shared scaffolding/nested insertion, backlog promotion and all
four insertion command implementations. Core supplies installed-version and stream-transition policy.
Six legacy API/value/function comparisons pass; source and copied-payload fixtures preserve outputs,
renumbered records, nested parent/dependency rewrites and all 117 commands. The 808-case affected run
had 793 initial passes and 15 failures: 13 source-location failures are covered by the corrected
277-case run (including all 118 package cases); two pre-existing generated citation/lock checks remain
pending the separate four-file approval. Standalone JavaScript bundling and supply-chain audit pass.
The final census passes all 12 cases. No generated output, dependency or workflow state changed. Remaining
work services/commands, domain extractions, core/apps layout and final verification remain outstanding.

Read extraction: ten implementations now belong to work: row/artifact contracts, worker content
collection, cache-first reads, shared resolvers and find/list/next/doc/tasks commands. Core supplies
cache, mesh, execution and projection services through explicit factory ports. Ten legacy API/value/
function comparisons pass. Source and copied-installation comparisons preserve read results, command
rendering, artifact bodies and all 117 registered commands. The corrected ten-suite selection passes
82 cases, including the bridge over all 120 package cases; the census passes all 12 cases. Standalone
JavaScript bundling and the supply-chain audit pass. The original 52-suite affected run completed
1,079 cases: 1,066 passed and 13 source-location assertions failed. Ten were covered by the initial
corrections; the remaining three are covered by the later 156-case observation/read follow-up run.
No dependencies, generated citations or workflow state changed. Remaining work
services/commands, other domains and the final core/apps layout remain open in COMPLETION.md.

Observation/debt extraction: work owns the observer, pure debt engine and both commands. Observation
receives reporting and configuration ports; debt uses foundation's atomic writer. Four legacy API/value/
function comparisons pass. The affected run completed 750 cases with 738 initial passes and 12 source
assertion failures. Corrections pass 156 cases (including the bridge over 122 package cases), followed
by all 35 transcript cases and all 12 census cases. Source and copied-payload reports, snapshots,
debt previews/pruning and persisted documents match, retaining 117 commands. Standalone JavaScript and
supply-chain checks pass. The driver closure shrinks from 37 to 29 modules; the worker gains only the
observer implementation home. The shipped pay-debt instruction now names the package's budget source;
all 115 shipped manifest hashes match fresh rendering. The bundle/source-reference follow-up has 18
passes and one generated manifest/lock parity failure. Three pay-debt renders and their lock hashes
are prepared for the separately requested citation-only approval; the earlier four-loop request is
still separate. No generated copies or workflow state changed. Continue with remaining work services/commands and the
other domains, then final core/apps layout, adapter removal and whole-tree/platform verification.

Testing extraction: work now owns selection, Git changed sets, story-declared changed sets, toolchain
resolution/launch mapping and the test command. Core supplies graph, bounded execution, shared census
and resolver services; declaration parsing and report normalization are local package imports. Five
legacy API/value/function comparisons pass. The complete affected selection covers 206 cases; its
remaining source-guard failures are covered by the corrected 75-case run and final nine-case speller
run. The strengthened authority guard passes all five cases, and the root bridge includes all 125
package cases. The final census passes all 12 cases. Source and copied-installation checks launch a real declared Node runner and compare
argv/output, scopes/refusals, Git changes, declarations and widening, retaining 117 commands.
Standalone JavaScript bundling and supply-chain audit pass. No dependencies, shipped assets, generated
copies or workflow state changed in this slice. Existing citation approvals remain pending separately.
Continue with remaining work services/commands and domain extraction before final core/apps layout.

Command-face extraction: doctor, validate, archive and upgrade implementations now live in work.
Core supplies shared services, configured validation, transitions and the two deferred doctor loaders.
Four legacy API/value comparisons pass; function bodies match apart from the explicit loader-port
substitutions. The 54-suite selection finished with 779 passes and 12 failures. Those exposed source
assertions plus missing configured-validator/deferred-loader wiring; corrections pass 156 cases,
with one pre-existing tuning-loader explanation subsequently restored. The final deferred-import and
census run passes all 20 cases. Four new package tests bring the bridge to 129 package cases. Source
and copied-payload comparisons preserve reports, registry composition, archive refusals/moves and
record bytes, retaining 117 commands. Standalone JavaScript and supply-chain checks pass. No dependency,
generated copy or workflow state changed. Remaining services/commands, other domains, final layout,
composition, adapter removal and whole-tree/platform verification remain open.

Grading extraction: the grade command now lives in work, with asynchronous rubric spawning in
execution. Core supplies execution, item resolution, run history and provenance services. All legacy
APIs, exported values and function bodies match. The 41-suite affected run finished with 314 passes
and 11 source-guard failures; the corrected 11-suite run passes all 108 cases. Four new package tests
bring the bridge to 133 cases, covering real process argv/capture/timeout/overflow and grading ports.
Source and copied-installation fixtures match grading, read/refusal paths, provenance, termination
outcomes and record bytes; the payload retains 117 commands. Standalone JavaScript bundling and
supply-chain audit pass; the final census passes all 12 cases. No dependencies,
generated copies or workflow state changed. Remaining work commands/services, other domains and
final layout/composition/verification are still outstanding.

Feedback/ratchet extraction: work now owns the raw/classification record ledger, pure ratchet engine,
and feedback/counters/ratchet commands. Core supplies transitions/publication, run history/retry
policy, exact resolution and bounded Git execution. All five legacy APIs, values and function bodies
match. The 16-suite selection finished with 122 passes and 11 source-guard failures; the corrected
11-suite run passes all 71 cases. Four new package cases bring the bridge to 137 cases. Source and
copied-installation comparisons preserve capture/classification, counters, real Git base resolution,
ratchet output and persisted bytes, retaining 117 commands. Standalone JavaScript bundling and
supply-chain audit pass; the final census passes all 12 cases. No dependency,
generated copy or workflow state changed. Remaining work commands/services, other domains and final
layout/composition/verification remain outstanding.

Audit/acceptor extraction: both command implementations now live in work, with configured audit,
graph, criterion, journal and transition services supplied by core. Both legacy APIs, values and
function bodies match. The initial 15-suite selection finished with 176 passes and six source-guard
failures; the corrected nine-suite run passes all 85 cases. Two new package tests bring the bridge
to 139 cases. Source and copied-installation comparisons preserve audit findings/limits, report-only
acceptor behavior and eligible/refused requests against a fixture transition, retaining 117 commands.
The final census passes all 12 cases; standalone JavaScript bundling and supply-chain audit pass.
No dependencies, generated copies or workflow state changed. Acceptor still scans only the audited
project's src/ tree: workspace-aware discovery is explicitly outstanding alongside remaining domain
extraction, final layout/composition and whole-tree/platform verification.

Run-command extraction: work owns start, complete, retry and status command implementations; execution
retains run persistence, and core supplies resolution, mesh/cache, transition and publication services.
Four legacy API/value/function comparisons pass. The 82-suite affected run finished with 1,125 passes
and 19 failures. Corrected guards pass 255 cases across 13 suites, and all eight shipped-citation checks
pass; two existing generated-output checks remain unresolved. Four new package tests bring the bridge
to 143 cases. Source and copied-installation fixtures preserve minting, driven echoes, park/refusal,
retry lineage, completion, history and persisted bytes, retaining 117 commands. Standalone JavaScript,
supply-chain audit and all 12 census checks pass. Five canonical loop citations were corrected; no
generated files or workflow state changed. The four additional generated watcher/rubric copies need
an eventual citation-only refresh alongside the previously pending four loops and three pay-debt
renders. Final source layout, package composition and remaining domains/verification are still open.

Status/gate extraction: work owns the item-status command, regression-gate command and shared
regression-record format. Core supplies configured Git/test execution, resolution, budget preflight,
notification and transition services. Three legacy API/value/function comparisons pass. The 25-suite
affected run finished with 314 passes and five source-guard failures; the final six-suite correction
passes all 78 cases. Three new package tests bring the bridge to 146 cases. Source and copied-payload
fixtures use a real Git repository and declared Node runner to compare refusals, gate append,
acceptance/override, idempotence and record bytes, retaining 117 commands. Standalone JavaScript,
supply-chain audit and all 12 census checks pass. No dependencies, shipped/generated assets or workflow
state changed. Remaining work commands/services and contribution, other domains, core/apps layout,
final composition and whole-tree/platform verification remain open.

Phase/re-entry extraction: work owns continue/refine/verify routing and resume/answer implementations.
Core supplies execution overlays, assignment, run/ask services, transitions, notifications and a deferred
registry loader. Both legacy APIs, exported values and function bodies match. The 22-suite selection
finished with 432 passes and eight source-guard failures; the corrected eight-suite run passes all
144 cases. Three new package tests bring the bridge to 149 cases. Source and copied-installation
fixtures preserve phase routing, readiness/retry, parked answers and persisted bytes, retaining 117
commands. Standalone JavaScript bundling and supply-chain audit pass. No dependencies, assets,
generated copies or workflow state changed. The final census/registry run passes all 20 cases.
Remaining work services/commands, feature contribution,
other domains, final core/apps layout and whole-tree/platform verification remain outstanding.

Trigger extraction: work-loop owns the declaration compiler, pure signal/level resolvers and trigger
command. Its package contribution registers the command without changing enumeration order. Core
supplies the asset reader, shared cadence grammar and deferred registry loader. Four legacy API/value/
function comparisons pass, as does comparison of all 117 registered descriptors and their order.
The initial 16-suite selection passed 383 cases with 14 failures; the corrected seven-suite run passes
82 cases with one existing generated-citation parity failure. Three new package cases bring the bridge
to 152 cases. Source and copied-installation trigger comparisons, standalone JavaScript bundling and
supply-chain audit pass. No dependencies, generated copies or workflow state changed. Remaining
dispatch/work services, other domains, final layout/composition and whole-tree verification remain open.

Dispatch extraction: work-loop owns local lane admission, concurrency, inspection, merge/cleanup policy
and the dispatch command contribution. Core supplies configured worktree operations, discovery, locking
and effect delivery. Both legacy APIs/values/functions and all 117 registry descriptors/order match.
The 23-suite affected run finished with 521 passes and 11 source-ownership failures. Corrected scans
pass 104 cases across ten suites; all 20 final census/registry checks pass. Three package contracts
bring the bridge to 155 cases. Real-Git source and copied-installation comparisons preserve lane
open/reuse, capacity refusal, dirty protection, merge and cleanup. Standalone JavaScript and supply-chain
audit pass. No dependency, asset, generated-copy or workflow-state changes. Final work/core composition,
other domain extraction, apps/core layout, adapter removal and whole-tree/platform checks remain open.

Work contribution: all 37 extracted work/testing command descriptors register under @aof/work.
Ordered groups retain all 117 descriptors and their enumeration order. The actual assembled registry's
ownership was checked against the package's declared command set, including the separate work-loop and
work-graph owners of commands in the shared namespace. Three new contract tests bring the bridge to
158 cases; all 58 selected integration, CLI and served-route checks pass. The copied installation exposes
the contribution and retains earlier behavior comparisons; standalone JavaScript and supply-chain
audit pass. No dependency or generated-file changes. Final core composition/layout, remaining domain
boundaries, adapter removal and whole-tree/platform verification remain outstanding.

Workspace acceptance scan: acceptor now reads root src/ plus declared workspace src/ directories, using
the existing .mjs scope. It handles workspace glob patterns, exclusions and the packages-object form;
deduplicates units; excludes links/dependencies/generated directory trees; and reports malformed inputs.
The source repository yields 571 modules, including 173 workspace modules and no installed dependencies.
Four new package tests also pass from a copied installation; the bridge now covers 162 package cases.
All 109 affected checks and 20 census/registry checks pass; standalone JavaScript includes the reader.
Picomatch 4.0.4, already locked, is now an explicit work runtime dependency. Skip-build and immutable
installs pass, and supply-chain audit reports zero warnings. No generated files or workflow state changed.
Final core/apps layout, remaining domain boundaries, adapter removal and full/platform checks remain open.

Audit child programs: work owns control driving and assembled-runner enumeration behind two public
entry points. Root launchers preserve existing paths; package imports are inert and both modules also
run directly. The isolation guard follows the launcher dependency closures and still excludes the
children from the audit parent. All 156 focused checks pass, including the bridge to 165 package cases.
Thirty source/copied-install/direct-package comparisons match the pre-move programs; the three new
package tests also pass after installation. Standalone JavaScript and supply-chain audit pass.
No dependency, generated-file or workflow-state changes. Final launcher/application composition,
other domains, core/apps layout and whole-tree/platform verification remain outstanding.

Messaging extraction: @aof/messaging owns all ten notification/Discord/CLI implementations and the
shared formatter declarations. Core supplies configuration, global-home policy, identity, loop reads,
mesh workspace services and command invocation. Five CLI descriptors retain their contribution owner.
Ten legacy APIs and 54 exported values/functions/descriptors match the pre-move baseline. Four new
package tests pass both locally and from a copied installation; the bridge now runs 169 cases and the
installed registry retains 117 commands. The 15-suite run reached 265 passes with one stale red-probe
import; the corrected guard, source budget and command bridge pass all 45 cases. Registry/source
census checks pass all 20 cases; the two expanded architecture suites pass all 26. Standalone
JavaScript includes all ten implementations, and the UI builds against the formatter declaration forward.
Yarn skip-build and immutable installs pass with existing peer warnings; supply-chain audit is clean.
No generated asset or workflow-state changes. Final core/apps layout, remaining mesh/knowledge/server
boundaries, composition/adapter removal and whole-tree/platform verification remain outstanding.

Knowledge extraction: @aof/knowledge owns sixteen graph/memory implementations and six command
descriptors, registered by its contribution in the existing order. Core supplies managed-tool,
workspace, invocation, import-storage and configured work services. Memory backend loading remains
deferred. Sixteen legacy APIs and 96 exported values/functions/descriptors match; all 117 command
descriptors/order remain unchanged. Four package contracts pass locally and in a copied installation,
and the package bridge now covers 173 cases. The 86-suite selection passed 885 cases with 32 failures;
corrected source scans/bindings pass 170 cases with two failures, followed by five passing checks for
the final graph-reachability correction. The remaining failure is the known generated watcher citation
parity mismatch. All 17 knowledge modules/contribution bundle into standalone JavaScript.
Runtime census/registry verification passes all 20 checks. Yarn
skip-build/immutable installs and supply-chain audit pass. Final import ownership, mesh/server work,
core/apps layout, composition, adapter removal and whole-tree/platform verification remain open.

Import extraction: knowledge owns source access, recovery, storage, materialization and the
import:milestone command/contribution. Core supplies configured paths, the shipped digest renderer,
schema version and memory backend. Five legacy APIs and 27 exported values/functions/descriptors
match; all 117 registry descriptors/order match with platform line endings normalized. Seven package
tests pass locally and in a copied installation, including three new import contracts. The 26-suite
selection passed 271 cases with one stale shipped-manifest failure; regenerating the five affected
canonical bundle hashes makes all 14 distribution checks pass. No checked-in generated runtime
copies or lock hashes were changed. All 22 knowledge APIs resolve inside the copied installation,
the five implementations bundle into standalone JavaScript, and supply-chain audit is clean.
The final census/registry selection passes all 20 checks, and the command suite passes all 29 cases,
including its bridge to 176 package tests.
Conversion into managed work, mesh/server, final core/apps layout/composition, adapter removal and
whole-tree/platform verification remain outstanding.

Server extraction: @aof/server owns six HTTP/WebSocket/MCP/static implementations. Core supplies
command invocation, config editing, workspace/provider/session services and asset resolution.
Six legacy APIs and 23 exported values/function bodies match; all 117 descriptors/order match.
Four public transport tests pass locally and in a copied installation; the command bridge now runs
180 package cases. The 60-suite selection passed 738 cases with 24 failures. Source ownership and
factory-aware corrections pass 394 cases with four failures, followed by 27 passing final guard
checks with one import-scanner defect. Correcting quoted-import detection and remaining cache-reader
pins yields 48 passing checks across the final eight suites. The broader run also exposes known
repository work-tree validation failures, including ordinary milestone 142 and a backlog context
contract; those records remain unchanged. All six public server APIs resolve inside the copied
installation and bundle into standalone JavaScript. Yarn skip-build/immutable installs and audit
pass with no third-party version changes. Final mesh transport/domain separation, core/apps layout,
composition, adapter removal and whole-tree/native/platform verification remain open.
The final runtime census/registry selection passes all 20 checks.

Mesh relay/protocol extraction: mesh owns eleven directive, wire, cadence, relay and terminal
implementations, with registry/publication/diagnostic collaborators supplied by core. Wire kinds and
capacity constants export directly. Eleven legacy APIs and 69 exported values/function bodies match;
all 117 descriptors/order remain unchanged. The 49-suite selection passed 557 cases with nine
source-guard failures; the corrected 16-suite selection passes all 150 checks. Five new package
tests pass locally and in a copied installation, bringing the command bridge to 185 package cases.
The ten production-reachable modules bundle with the CLI; the existing unused presence-cadence API
bundles independently and resolves in the copied payload alongside the other ten APIs. Yarn
skip-build/immutable installs and supply-chain audit pass with no third-party version changes.
One canonical cadence citation and its shipped manifest hash were refreshed; the unapproved
generated mesh-assignment-reclaim copy remains pending. Persistence/projections, coordination,
launchers and most mesh commands, final core/apps layout/composition, adapter removal and whole-tree/
native/platform verification remain outstanding.
The final mesh relay census/registry run passes all 20 checks, and all 14 distribution-manifest
checks pass after the canonical citation update.

Mesh persistence/fabric extraction: six implementations now belong to mesh: node storage, registry,
sessions, launcher locks, fabric discovery and repository publication markers. Core supplies global
paths, diagnostics and the shared execution TTL predicate. All six legacy APIs/58 exports match;
all 117 command descriptors/order match. The 101-suite selection passed 911 checks with 25 source
guard failures; the corrected 20-suite selection passes all 150 checks. Five package tests pass in
the copied installation, bringing the package bridge to 190 cases. The installed registry retains
117 commands, six APIs resolve inside the payload, and all six modules bundle into standalone JS.
Yarn skip-build/immutable installs and supply-chain audit pass; foundation is the only new declared
workspace dependency. No generated assets or workflow state changed. Mesh projections/coordination,
launchers/workers/commands, final core/apps layout/composition, adapter removal and full native/
platform verification remain outstanding.
The final persistence/fabric census and registry architecture selection passes all 20 checks.

Mesh global projections: presence, registry descriptors, fleet query, publication, SQLite projection
storage and assignment records now belong to mesh. All six legacy APIs/84 exports and 117 command
descriptors/order match. The 161-suite run passed 1,656 cases with 33 source-guard failures. Corrections
passed 161 with 12 failures, then 184 with one stripper self-check; the final eight index-guard checks
pass after covering factory-owned declarations. The corrected selection includes all 20 passing
census/registry checks and the bridge to 195 package cases. Five new package tests pass locally and
in a copied installation; all six modules bundle into standalone JS. Immutable linking and audit pass.
All 20 distribution checks pass. Canonical presence citations and shipped hashes were refreshed,
along with only the explicitly approved generated operator citation/hash. Other pending generated
copies remain unchanged. Mesh coordination/recovery, launchers/workers/commands, core/apps layout,
final composition/adapter removal and full native/platform verification remain outstanding.

Mesh coordination: eight more implementations now belong to mesh: scope locking, assignment,
reclaim, recovery push, resync, roles, supervised declarations and park/resume. Eight legacy APIs
and 65 exports match; the copied installation retains 117 commands. Five new public package tests
pass locally and in the copied payload, bringing the package bridge to 200 cases. All eight modules
bundle into standalone JavaScript. Immutable linking and supply-chain audit pass, with contracts
the only added workspace dependency. The 51-suite selection passed 870 checks with 28 source-guard
failures. The corrected 28-suite selection passed 194 with four failures, including all 20 census/
registry and all 20 distribution checks passing. Final targeted runs pass 13 and 21 checks with
zero failures after following configured readers, notification loading and the mesh-owned reactor.
Canonical reclaim/liveness citations and shipped hashes were refreshed; generated copies remain
unchanged. Launcher/worker orchestration, remaining commands, core/apps layout, final composition,
adapter removal and full native/platform verification remain open.

Mesh command ownership: nineteen command/helper modules moved into mesh, including all seventeen
registered command definitions, the ordered contribution, session-hook entry and desktop preflight.
Nineteen legacy APIs and 53 exports/function bodies/descriptors match. Five new package tests pass
locally and in the copied installation; all nineteen APIs resolve there and 117 commands remain.
All nineteen modules bundle into standalone JavaScript. Immutable linking and supply-chain audit
pass without dependency changes. The 59-suite selection passed 467 checks with 29 source-guard
failures. The corrected 33-suite selection passed 249 with eight failures, followed by 118 passing
checks across ten final suites. The corrected selection includes all 20 census/registry checks and
the bridge to 205 package tests. Guards retain configured session closure, shared preflight facts,
terminal transport bindings, source coverage and deferred declaration lookup. No canonical/generated
assets or workflow state changed. Launcher/worker/control-stream orchestration, core/apps layout,
final composition/adapter removal and whole-tree/native/platform verification remain outstanding.
The three later-added write-scope/preflight guard suites pass all 26 checks.

Mesh runtime/transport extraction: nine implementations now belong to mesh, covering launcher,
worker launch/admission/execution, credential providers, session spawn, control/worker streams and
fleet HTTP serving. All nine legacy APIs/137 exports match. Five package tests pass locally and in
the copied installer payload, which retains 117 commands and resolves all nine APIs. The package
bridge passes 210 cases. Standalone bundling, immutable linking and supply-chain audit pass, with
server the only new workspace dependency. A pure clone-URL import replaces an unnecessary configured
worker dependency; final composition cycles still require resolution.
The 190-suite run passed 1,505 checks with 138 source-guard failures before source-reader updates.
The corrected 102-suite run passed 654 with 53 failures, followed by 324 passes with six failures
across 38 suites. Final corrections pass all 27 checks across five suites. Distribution checks and
the corrected census/registry guards pass. Runtime scans cover package roots and configured-service
guards check both bindings and implementations. The canonical reclaim citation/manifest were
refreshed. No generated output changed; the three approved generated loop files/hashes already
match. Core/apps layout, final composition, compatibility removal, remaining root services and
whole-tree/native/platform verification remain outstanding.

Domain transition extraction: seven modules now belong to mesh (assignment), execution (run
transitions/reconciliation), and work (item/document/stream/harness). Core supplies the configured
effect runtime. Seven legacy APIs/26 exports match; seven public tests pass locally and in the
copied installation, which retains 117 commands and resolves all seven APIs internally. The package
bridge passes 217 cases. Standalone bundling, immutable linking and audit pass without dependency
or lockfile changes. The 42-suite run passed 663 with 12 source-guard failures; the corrected
17-suite run passed 155 with two failures, followed by all 14 checks passing in the two final
suites. All 20 census/registry and all 20 distribution checks pass. Canonical reclaim citations/
manifest and reconciliation metadata follow the package homes; generated copies remain unchanged.
Remaining root services, core/apps layout, final composition, adapter removal and whole-tree/native/
platform verification remain open.

Plan 01 completed (2026-09-29): all remaining domain services have owning packages and explicit public seams; the 452-file ownership ledger records deliberate core retention, configured adapters, forwards, child entries and assets. Copied installation/public API, ordered registry, package bridge, focused behavior, dependency-boundary and bundle checks pass after moved-source guard corrections. Nine architecture failures are confirmed on baseline e343d50 and remain later-plan source-reader/installed-asset debt. See plans/01-OWNERSHIP.md and IMPLEMENTATION.md for evidence. Plan 02 is the next engineering plan; this note creates no managed lifecycle state.

Plan 02 completed (2026-09-30): core explicitly constructs 224 services, with ready-gated callbacks, isolated configuration/worker/journal state and owned-resource cleanup; the contracts registry supports declared additive input extensions. All 117 descriptors, 18 CLI comparisons and 1,502 compatibility bindings retain their baseline contract. Eight assembly checks, 32 copied-installation cases, 134 CLI integration cases, 118 Rust tests and the desktop shell check pass. The full run's 27 source-guard failures are corrected and pass focused reruns; 20 inherited failures and one timing check that passed a separate rerun are recorded in plans/02-ASSEMBLY.md. Plan 03 is next. This is an ordinary engineering handoff, with no managed lifecycle transition or generated-asset refresh.

Plans 04, 07 and 08 completed (2026-10-01) on the available host; see plans/08-VERIFICATION.md and COMPLETION.md. Open: live desktop-app run, Linux/WSL re-run, macOS/arm64/hosted CI, and four pre-existing work-record ratchets awaiting operator decisions.
