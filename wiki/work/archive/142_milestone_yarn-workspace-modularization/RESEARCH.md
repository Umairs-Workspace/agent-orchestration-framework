---
doc: research
---
# 142 · Yarn workspace modularization — Research

**Gathered:** 2026-09-27; key source paths and manifests rechecked 2026-09-28.
**Method:** local source/manifests/build-script inspection, indicative import scanning, and official
Yarn documentation. This captures the assessment preceding milestone creation.
**Status:** static findings recorded; install, execution, performance, and release checks remain pending.

## Size and current organization

The 2026-09-27 inventory counted approximately 360 backend JavaScript source files and 115,780
physical lines, including comments and blank lines. Of these, 92 files sat directly under `src/`.
The UI inventory contained 83 source/configuration files. The test inventory contained 482
architecture test files. These are dated observations, not thresholds or a maintained census.

The root [package.json](../../../../package.json) already declares `ui` as an npm workspace. Its
runtime dependencies combine prompting, WebSockets, native PTY support, and headless terminal
emulation. [ui/package.json](../../../../apps/ui/package.json) declares React/Vite and browser terminal
dependencies. A separate `ui/package-lock.json` also exists alongside the root lockfile.

The desktop application is a Rust/Tauri project under
[app/desktop](../../../../apps/desktop/Cargo.toml), with its own frontend and Cargo lockfiles. Its core
crate and Tauri shell have deliberately different build/test scopes. A Yarn workspace wrapper
must preserve Cargo's ownership rather than treating desktop as an existing Node application.

The root AGENTS.md still references `.planning/`, which was absent during inspection. Current work
context is under `wiki/work/`; the root instructions' historical planning paths are not a reliable
inventory source for this migration.

## The CLI registry is an existing extension seam

[command-core.mjs](../../../../packages/core/src/application/bindings/command-core.mjs) assembles commands across the product. Its documented
command shape includes an ID, input schema, operation, and CLI adapters. The existing
[spine face](../../../../packages/core/src/application/bindings/spine/face.mjs) supplies a common invocation path. The CLI already delays
registry loading on the session-presence path; [cli.mjs](../../../../packages/core/src/cli.mjs) records the startup
reason for that separation.

**Constraint:** package contributions should evolve this shared invocation model. New package
barrels or registration side effects must not accidentally restore eager loading of the entire
product for lightweight commands. Startup implications need fresh measurement.

The user clarified that core includes the CLI because bundled skills rely on it, and that feature
packages must extend that CLI. These are product requirements in [SPEC.md](SPEC.md), not observations
that the present source tree already implements the proposed package boundaries.

## Upward imports and mixed responsibilities

| Observed source | Coupling | Extraction constraint |
|---|---|---|
| [loop/cycle.mjs](../../../../src/loop/cycle.mjs) | Imports item resolution, rubric handling and node identity helpers from `commands/`. | Move reusable operations below command presentation or supply explicit collaborators. |
| [mesh/declarations.mjs](../../../../src/mesh/declarations.mjs) | Imports retry-ceiling resolution from `commands/run-retry.mjs`. | Mesh supervision must not depend on the CLI implementation layer. |
| [effects/table.mjs](../../../../packages/core/src/application/bindings/effects/table.mjs) | Imports work mutations, projections, assignments, run storage and Notion sync. | Separate generic durable dispatch from domain reactions and application registration. |
| [memory/graphify-backend.mjs](../../../../packages/knowledge/src/memory/graphify-backend.mjs) | Imports `invoke` and workspace loading from the central command registry. | Extract a graph service API or inject a narrow invocation interface. |
| [work/read.mjs](../../../../src/work/read.mjs) | Combines local work queries, global cache access and mesh worktree classification. | Keep local work mechanics independent of mesh-specific projection/admission policy. |
| [agent-session-driver.mjs](../../../../packages/core/src/application/bindings/agent-session-driver.mjs) | Combines provider/terminal execution with observation and phase-brief helpers. | Separate session mechanics from work-specific input assembly and policy. |
| [ui/src/board/action.mjs](../../../../apps/ui/src/board/action.mjs) | Imports formatting helpers through `../../../src/notify/form.mjs`. | Browser-safe shared helpers need a public export instead of a sibling-source escape. |

These inspected imports establish boundary leaks, not an exhaustive cycle census. Refinement needs
a resolver-aware dependency graph covering static imports, re-exports, literal dynamic imports,
and declared runtime collaborators before finalizing extraction batches.

## Useful existing boundaries

- [work/loop.mjs](../../../../src/work/loop.mjs) is a pure decision engine with no imports. Preserve
  that property while separating the orchestration shell from CLI adapters.
- [terminal/screen.mjs](../../../../packages/execution/src/terminal/screen.mjs) and
  [terminal/session-screen.mjs](../../../../packages/execution/src/terminal/session-screen.mjs) provide existing terminal
  seams. They are candidates for an execution package, not reasons to rewrite terminal behavior.
- [work/bundle.mjs](../../../../packages/core/src/work/bundle.mjs),
  [bundle-runtime.mjs](../../../../packages/core/src/work/bundle-runtime.mjs), and
  [bundle-synthesis.mjs](../../../../packages/core/src/work/bundle-synthesis.mjs) separate aspects of asset loading,
  capability selection, and rendering. Their current `work/` location does not decide future ownership.
- Shared command invocation and durable effect journaling already exist. Migration can preserve
  those behavioral contracts while relocating ownership.

## Three different graph models

1. Work-item dependencies/readiness live in work mechanics such as [work.mjs](../../../../packages/core/src/application/bindings/work.mjs).
2. Declared feedback-loop metadata and graph rendering live in
   [work/loops.mjs](../../../../packages/core/src/application/bindings/work/loops.mjs),
   [work/loops-checks.mjs](../../../../src/work/loops-checks.mjs), and
   [commands/loops-graph.mjs](../../../../packages/work-graph/src/commands/loops-graph.mjs).
3. The code/knowledge graph is exposed through [graphify.mjs](../../../../packages/knowledge/src/graphify.mjs),
   normalization/impact modules, and a graph-backed memory implementation.

**Constraint:** a shared word does not imply shared ownership. Work-graph naming must distinguish
declaration/documentation tools from execution policy and Graphify's code graph.

## Assets and distribution depend on current layout

- [asset-base.mjs](../../../../packages/core/src/asset-base.mjs) resolves development paths assuming its module is
  directly in `src/`, and resolves packaged bundle/UI/version assets relative to the executable.
- [sea-asset-manifest.mjs](../../../../scripts/sea-asset-manifest.mjs) enumerates `src/bundle/` and
  `ui/dist/`. [build-sea.mjs](../../../../scripts/build-sea.mjs) copies those assets and externalizes
  `node-pty` into a platform-specific sidecar.
- [sea-entry.mjs](../../../../scripts/sea-entry.mjs) looks for the installed payload at `src/cli.mjs`
  beside the executable and otherwise uses the embedded build under its existing rules.
- [install-local.mjs](../../../../scripts/install-local.mjs) copies the root `src/` tree and obtains
  production dependency locations with `npm ls --omit=dev --all --parseable --workspaces=false`.
- [ui-build.mjs](../../../../scripts/ui-build.mjs) invokes TypeScript and Vite at assumed root
  `node_modules` paths, so changing dependency hoisting can affect it before source moves occur.
- [prepare-worktree.mjs](../../../../scripts/prepare-worktree.mjs) resolves npm's JavaScript entry to
  preserve shell-free spawning on Windows. It assumes npm lock/install semantics.
- [install-local.mjs](../../../../scripts/install-local.mjs) and
  [deploy-wsl.sh](../../../../scripts/deploy-wsl.sh) contain source/dependency synchronization assumptions
  that must follow the lockfile and package-layout changes.

**Constraint:** source checkout, copied payload and standalone executable are distinct verification
paths. Working Yarn workspace links in a checkout do not prove an installed artifact is complete.
An installation manifest must include required workspace code and external dependencies without
retaining links back to the checkout. Native binaries remain platform-specific.

## Supply-chain checks are npm-specific

[supply-chain-audit.mjs](../../../../scripts/supply-chain-audit.mjs) reads `package-lock.json`, traverses
its `packages` entries and checks `hasInstallScript`. It also contains package/version deny rules,
an install-script allowlist, and installed-content checks. Simply changing the filename to
`yarn.lock` would lose the expected data model.

**Constraint:** preserve equivalent audit coverage using Yarn's resolved dependency information and
package metadata. Compare resolution changes during cutover; do not assume regeneration reproduces
npm's exact dependency graph. Preserve reviewed native-build exceptions and account for workspace
lifecycle scripts. The authoritative-lockfile instruction changes when implementation switches
package managers, not during milestone capture.

## Test and documentation coupling

Implementation measurement (2026-09-28): the root runner assembles 11,509 checks after adding the
nine Yarn-installation cases. The focused installation suite completes in about five seconds on
this Windows checkout; the root run spends substantial time in unrelated Git-backed worktree and
wave fixtures. Package-local test ownership should make that narrow verification path standard,
while keeping explicit cross-package and full-system runs for changes that need them.

Tests frequently import root source paths and some architecture checks inspect literal source
shapes. Examples include [bundle location](../../../../test/arch/bundle/acd-bundle-location.test.mjs),
[SEA asset resolution](../../../../test/arch/bundle/acd-sea-safe-asset-base.test.mjs),
[command layering](../../../../test/arch/command/acd-command-layer-imports-downward.test.mjs), and
[loop import boundaries](../../../../test/arch/loop/acd-loop-module-import-boundary.test.mjs).

The command-layering check distinguishes root modules from family directories and excludes dynamic
imports from its static-import rule. New workspace checks need an explicit scope and coverage
contract rather than assuming existing path predicates cover all packages.

[scripts/test.mjs](../../../../scripts/test.mjs) aggregates suite registrations and also invokes Rust
checks. Work audit machinery consumes test metadata. Package-local test ownership must retain
discoverability, selectors, stable identities, and task/control traceability.

**Constraint:** update scans and registrations alongside source moves. Assert that expected files
are still inspected, and retain behavioral checks. Update active module references and bundle
declarations; preserve historical ADRs and append superseding decisions where necessary.

## Yarn documentation consulted

Official documentation reviewed during the 2026-09-27 assessment:

- [Workspaces](https://yarnpkg.com/features/workspaces): workspace declarations, explicit
  `workspace:` dependencies, focused installation, and workspace script execution.
- [Install](https://yarnpkg.com/cli/install): `--immutable` rejects lockfile changes.
- [Settings](https://yarnpkg.com/configuration/yarnrc): `nodeLinker: node-modules` retains conventional
  installation; `enableTransparentWorkspaces: false` requires explicit workspace references;
  `enableScripts: false` suppresses third-party build scripts but does not suppress workspace
  postinstall scripts. Hoisting limits and Windows junction behavior need compatibility checks.
- [Manifest](https://yarnpkg.com/configuration/manifest): root `dependenciesMeta` supports explicit
  build exceptions when scripts are disabled.
- [Constraints](https://yarnpkg.com/features/constraints): manifest/dependency policies are supported;
  source-import boundaries need a separate checker.
- [Workspace execution](https://yarnpkg.com/cli/workspaces/foreach): workspace selection and
  topological script ordering are available without introducing another task orchestrator.

These sources support the proposed tooling choices; they do not establish that AOF currently
builds under Yarn. Pin and verify a specific supported Yarn version during implementation.

## Questions to resolve during implementation

| Question | Proposed evidence |
|---|---|
| What are the actual package cycles and minimum safe extraction batches? | Resolver-aware import graph plus explicit runtime dependencies; enforce the chosen graph in CI. |
| Which commands and options are required by every shipped skill/hook? | Inventory the bundle's invocations, including constructed calls, and check the assembled registry and installed distribution. |
| How do packages share `aof work` without overwriting each other's routes/options? | Contribution contract with namespace ownership, collision cases, help and validation parity. |
| Which current configuration/rendering helpers are foundational versus composition-owned? | API inventory proving features can load without importing assembled core. |
| Which Node/Yarn/platform combinations are supported? | Reconcile the root Node engine range, native modules and release Node version; run clean installs/builds for the supported matrix. |
| How is the audit's coverage retained with Yarn? | Known-bad dependency and install-script fixtures against the new adapter, before broader verification. |
| How does the installed payload resolve internal packages? | Stage an artifact outside the checkout, make source unavailable, and exercise CLI/assets/native execution. |
| Do session-presence commands remain lightweight? | Compare cold-start timings/import closure against a fresh baseline; do not reuse old comment measurements as current results. |
| Does test selection preserve acceptance traceability after moving suites? | Compare registered test identities and audit discovery before/after; include non-vacuity checks. |

The original assessment was static. Subsequent implementation and verification are recorded in
[IMPLEMENTATION.md](IMPLEMENTATION.md), including the Yarn cutover and extracted workspaces.

## Effects extraction findings — 2026-09-28

- `src/effects/dispatch.mjs` combined generic execution/retry behavior with an import of the
  application-wide `EFFECTS` table. That table reaches domain transition modules which import the
  dispatcher/outbox again. Eager factory initialization exposed this existing ESM cycle when the
  outbox was loaded first. The compatibility adapters now compose on invocation; the extracted
  package has no imports or process-global instance. Six entry-order regression cases cover loading
  from dispatch, outbox, table, assignment transitions, run transitions, and command core.
- Journal operations can be supplied as a small interface: `pendingSteps`, `markStep`, and
  `readStep`. `@aof/effects` uses these without importing SQLite or choosing a database path.
  Application reactor tables, reachability, integration exclusions, and diagnostics are supplied
  separately. Retry/acknowledgement behavior is verified against the existing SQLite journal.
- Moving `src/fs.mjs` directly to foundation would pull `degrade.mjs`, which imports
  `mesh/log.mjs`. That diagnostic dependency should be separated deliberately; a folder move alone
  would carry a mesh dependency into a supposedly lower-level package.
- Journal extraction remains separate: `effectsJournalPath` currently derives its location through
  `globalMeshPaths`, while `hasEventForRun` and `latestAppliedAssignmentParkEventId` are domain-specific
  queries. Extract generic storage with explicit path/diagnostic inputs and keep those queries with
  their owning domains. Do not move the application reactor table into the generic effects package.
- The Notion ledger tests supplied an isolated journal home but loaded their workspace with the
  operator's real global configuration. Passing the same isolated environment into `loadWorkspace`
  fixes that test contamination without changing runtime lock enforcement or Notion behavior.


## Journal and registration boundary now implemented — 2026-09-28

The generic storage implementation can operate on an injected SQLite connection without importing
Node, workspace configuration, mesh paths, or application diagnostics. The existing source adapter
provides those concerns; hasEventForRun and latestAppliedAssignmentParkEventId remain application
queries. The outbox now receives readStep from generic storage instead of spelling its own SQL.

Reactor contribution registration is independent of handlers. Multiple owners may add ordered steps
to one event; duplicate event/key ownership fails deterministically. The existing ten-event table
currently registers as one explicit application contribution to preserve cascade ordering during
extraction. Moving its handler implementations to their domains is still necessary before the
remaining application import cycle can be removed; extracting the registry alone does not do that.

Both directions of on-disk compatibility were exercised against the actual previous journal code
and an installed payload outside the checkout. Details and remaining platform limits are recorded
in IMPLEMENTATION.md.

## Domain contribution boundary implemented — 2026-09-28

Handler ownership can move without migrating every storage/configuration service at once. Work,
mesh, and Notion now export inert contribution factories; core supplies explicit service providers.
Package tests inject narrow collaborators, while existing integration tests exercise the actual core
adapters. The providers still delegate to src/ and should shrink as those service implementations
move. This is an intermediate boundary, not a claim that the whole domains are extracted.

Cascade ordering is a composition concern: work remapping, Notion sidecar remapping, mesh remapping,
then publication; on completion, rollback precedes publication and Notion synchronization. Registering
all of one domain contiguously would change that order. Two contribution groups from the same Notion
package preserve it without making mesh import Notion or putting handlers back into core.

No domain implementations are imported statically by the registration table. Eager dispatcher/outbox
construction is now safe, proven from each of six entry modules and by an acyclic static graph with
a planted-cycle negative check. Runtime service dependencies remain explicit deferred composition,
not an exemption from the final package dependency rules. Architecture scans must follow workspace
source/exports; a root-only import count would incorrectly hide the new package code.

## Notion service and command extraction — 2026-09-28

Notion is now a substantive feature package: five service modules plus both CLI descriptors have
moved behind explicit factory inputs. Core retains its installed identity, command assembly, and
small old-path adapters. Shared integration routing was deliberately left outside Notion because
it is the extensible routing/configuration contract, not a Notion-owned storage backend.

The package can own Node filesystem/crypto/process APIs without depending on application core.
The boundary check therefore permits exact native imports per implementation module, while
continuing to reject core, sibling-private, undeclared package and computed imports. Browser
compatibility applies to the effects contribution entry, not to the native service or command entries.

Source guards must follow both the implementation and its supplied services: checking only the old
adapter would make no-write/no-read scans vacuous; checking only the package would miss a wrong
cache-reader binding in core. The cache-first checks now pin both ends. Sidecar compatibility and
both commands were exercised from a copied installation outside the checkout, with fake egress.

## Foundation boundary implemented — 2026-09-28

The filesystem/diagnostic coupling is now separated into mechanism and application policy.
Foundation's file operations import only Node; its temp sweeper accepts the diagnostic callback.
The reporter accepts a sink factory and has independent throttle state per instance. JSONL storage
accepts a concrete file path, leaving environment/configuration and destination policy in core.

Moving the default log-path adapter into core's diagnostics directory removes the session driver's
last mesh-module import while preserving the existing mesh/logs destination. src/mesh/log.mjs is
now a compatibility facade. Optional mesh behavior is no longer a prerequisite of the reporter.

Import-count controls must count the three extracted modules and replace the old mesh-log node
with core's path adapter; ignoring bare workspace imports would hide the actual dependency graph.
The session and trigger controls now follow workspace exports. The diagnostic silent-catch floor
also follows the implementation into foundation, with the same allowance and a non-empty runtime
scan rather than an exemption that silently leaves the new package unexamined.

## Work record boundary implemented — 2026-09-28

Item document selection, metadata parsing/overlays, schema/version reads, status transitions,
bounded rollback, and migration transforms now belong to @aof/work/records. They accept concrete
item descriptors; workspace discovery, node identity, projection reads and effect publication are
not prerequisites of this API. Atomic persistence is the declared @aof/foundation/fs dependency.

The lifecycle vocabulary and acceptance/epoch predicates move together to @aof/work/lifecycle.
It remains a zero-import browser-safe leaf, so controls can consult it without acquiring record
I/O. The existing acceptance-horizon and work modules preserve their public exports. Validation
also needs the shared schema-coercion function; moving only the public readers would leave its
private call unresolved. This dependency was caught and corrected by regression checks.

Source guards now inspect the actual record writer and parser. The single-horizon scan includes
all workspace runtime source, and the controls guard follows the exact compatibility re-export
to the pure leaf. The session-driver closure increases from 31 to 33 modules (records/lifecycle);
the assignment sink increases from 76 to 78. Neither adds a new domain service or mesh dependency.

The next substantial work boundary is enumeration/resolution/readiness, separated from workspace
configuration and identity hydration. Effect publication stays in the transition layer; extracting
record writes does not transfer command orchestration or durable journals into the record package.

## Work discovery boundary implemented — 2026-09-28

Discovery requires a concrete work directory and optional plain-data view, not a configured AOF
workspace. @aof/work/discovery now owns the one directory enumerator, ref/slug resolution, live-row
predicate and ordered listing. Supplied views replace directory enumeration and overlay metadata
through the existing record API; no projection store or node-identity service enters the package.
The shared tolerant directory reader is exposed as readWorkDirectory for the transitional validator's
item-task scan. It preserves the original empty-result behavior for absent, invalid and file paths.

The folder grammars, root names, numeric comparison and story-span parser are independently pure
in @aof/work/identity. Keeping these apart from the disk readers gives later graph/readiness
extractions a grammar API that does not import filesystem or configuration code. The old core
surface forwards the same exports; readWorkDirectory and sameNumber are new package APIs only.

The single-enumerator guard now distinguishes grammar ownership (identity) from scanning ownership
(discovery). Both are checked across core and all workspace source. Archived-row, null-number and
intake-read guards also follow the moved implementation; direct package imports count as disk-reader
imports at the cache and loop boundaries. This avoids declaring a relocation successful while its
old path-specific tests merely stop inspecting the implementation.

The remaining root work module still owns workspace configuration/identity hydration, validation,
dependency rules and readiness. Its loader is unchanged. Validation/readiness are the next domain
candidates; configuration composition can remain core policy while those operations take explicit
inputs. Core still owns the CLI and effect publication.

## Work readiness boundary implemented — 2026-09-28

Readiness uses the same explicit directory/view contract as discovery. @aof/work/readiness owns
nextWork, ready-set ordering, dependency blocking, story scopes, through-review behavior and
candidacy handling. Routing/lease information is caller-supplied data; the package imports no mesh,
cache store, configuration or command assembly. With a complete pathless view, readiness operates
on supplied data; without a view it still reads directories/records and is not a browser-safe leaf.

@aof/work/dependencies owns the shared driver/target classification, numeric and sibling rules,
parent grouping, and formatting-preserving dependency-text transforms. Its only import is the
zero-import identity grammar. Validation and readiness share these rules through one implementation.
The legacy core export set is unchanged; helpers newly exposed by the package are not added to it.
Core's cache-first adapter and command layer retain provenance, item-lock and ready-wave policy.

The next extraction is validation. src/work.mjs still imports the feature parser and digest validator;
the latter reads the shipped digest template through core's asset locator. Move the reusable parsing
and validation mechanisms behind explicit package APIs while keeping asset-location policy in core.
Do not make @aof/work import core assets or assembled core to finish this move. Workspace/node
identity loading, run persistence, acceptance and command contributions remain later work.

## Validation boundary and remaining graph — 2026-09-28

Validation requires filesystem reads and a digest contract, not workspace hydration or core's asset
locator. The package now receives getDigestContract explicitly. Core preserves cached/lazy asset
loading; digest parsing/rendering/checks themselves are pure and use explicit version/contract data.
The feature parser moved unchanged. This leaves src/work.mjs primarily configuration/identity
composition and compatibility exports rather than the work-domain implementation.

A static relative-import inventory of the remaining tree finds cycles in adapters/bundle hooks,
run-store/spend/examples, transitions/mesh publishing, doctor lanes, and command/server/loop/Discord
composition (including dynamic imports). These require explicit service interfaces as their owners
move; hiding the same edges behind deferred imports is not the final architecture.

Work-graph is the next cohesive extraction: loops loader/checks, loop records/rendering, graph shapes,
document composition and their six command descriptors. Loader asset/version-root policy belongs to
core; run lookup and registry invocation should be supplied. Shared loop-bound vocabulary/resolvers
must sit below the graph and executing loop so declaring a graph does not import execution.

## Work-graph boundary implemented — 2026-09-28

Work-graph owns the declared registry and its checks, projections over supplied execution records,
renderers and six CLI descriptors. Core passes getFrameworkRoot for framework-authored module
pointers and supplies run reads, exact item/local-checkout resolution, command lookup and registry
invocation. The package depends only on contracts, foundation and work; it never imports core,
execution, mesh or the running command registry. The declared graph therefore remains separate
from executing the delivery loop.

The shared loop-bound vocabulary/resolvers and command-error constructor are pure contracts.
Moving them below both graph and execution avoids a work-graph -> work-loop -> work-graph cycle.
The graph grounding command no longer guesses the framework root with two parent-directory hops;
its old admitted path-arithmetic exception was removed. Copied-install module-pointer resolution
continues to work through named compatibility exports, without importing target code to inspect it.

Next: work-loop. src/work/loop.mjs is a zero-import decision engine. The shell and cycle/wave/ask/stop
modules combine work lookup, run persistence, notification, scope locks, mesh worktrees and child
execution. Those services need explicit ports; moving the entire import cycle unchanged would
violate the package boundary. The process boundary remains important: lanes run as child processes,
not in-process session drivers, and the wave is read from work:next rather than recomputed.

## Work-loop decisions and control services — 2026-09-28

The decision engine is a zero-import module and moves byte-for-byte. Ask and stop/resume
records were coupled to core only through global runtime-path policy, diagnostics and atomic
filesystem helpers. The package now imports the public foundation filesystem API and accepts
getRuntimeRoot(env) and reportDegrade. No singleton setter or core import is needed. Factories
create independent service instances without filesystem access.

Child-drive mechanics belong with loop orchestration; executable discovery and bounded process
execution are application/execution services supplied by core. Node receives core's own CLI path;
SEA receives only verb arguments. The subprocess, console and cancellation boundaries remain.
Cycle/wave/ask/stop orchestration still needs execution/work/notification/mesh ports. Those
implementations and CLI contribution ownership are not satisfied by this first package slice.

Moving source invalidated three shipped line citations, including two shared-bounds references
left over from work-graph extraction. Canonical bundle documents and their derived manifest are
updated. Automatic approval review rejected updating the repository's generated .aof documents
and lock because the user required work outside AOF. The user then explicitly authorized only
those three generated documents and their three lock hashes. They were refreshed after verifying the existing files matched their recorded hashes
and that the new renders differed only in source citations. Fresh rendering, lock hashes and
idempotent updates also pass in a temporary installation. No workflow state was changed.

## Work-loop orchestration and CLI ownership — 2026-09-28

Cycle/wave orchestration depended on application services rather than on a reason to own those
services: run persistence, work lookup, grade execution, worktree operations, session execution,
notifications and shared command invocation. Their implementations now live in work-loop factories
with named service groups. The old modules only assemble those groups and expose the existing API.
The package's only workspace dependencies are contracts and foundation. It never imports mesh,
the assembled registry, or legacy core source.

The loop and three phase-driver descriptors are package-owned and supplied by one contribution.
The core registry still assembles contributions and resolves their shared work namespace. Both
default injected invocation and the existing per-call override remain supported. Core adapters
currently defer registry access to avoid initialization cycles; that is transitional application
composition, not evidence that all runtime cycles have been removed.

Progress sampling, diagnostic recording and declaration argv composition moved with their owner.
The diagnostic installation WeakMap stays at module scope so two factory instances cannot register
duplicate process listeners. The engine and argv remain zero-import leaves. Source guards must
scan actual package implementations, inspect adapter wiring separately, and attribute calls to
the innermost function now that implementations are enclosed in factories. Their planted-failure
checks remain in place.

Next, run persistence can move into execution without a mesh dependency: run-store currently
imports atomic filesystem writes, diagnostics and the zero-import claim-provenance helper.
Its item paths and node identity already arrive as data. Execution ownership should retain the
existing run-record shape and keep work-item status changes in the command/effects layer.

## Execution run services extracted

`@aof/execution` now owns run storage, spend ingestion, heartbeat consumption and session-id
capture. The pure claim-provenance compiler belongs in contracts and moved byte-for-byte.
Run paths and node identity remain input data; this package has no mesh/configuration/registry
imports. It depends only on contracts, foundation and Node builtins.

The old run-store/spend dynamic-import cycle is removed: the store constructs its local spend
service with its own reader and writer functions. Work answer tokens and session answer reading
are explicit ports. Core still defers those work-owned collaborators in its compatibility adapter;
final composition must resolve that transitional relationship. The package itself has no dynamic
imports. Comparing implementation statements after the mechanical factory/import changes and
comparing persisted bytes against the old implementation both passed.

The next execution boundary includes the local session driver and terminal services. Its existing
dependency on terminal-ws mixes reusable PTY launching with transport/application assembly; separate
the spawn service before assigning WebSocket routing to server. Observation, screen recognition and
provider launch policy must keep their existing behavior and test injection seams.

Provider resolution and terminal session records have now moved into execution as independent
factories with diagnostic ports. Provider PATH lookup remains injectable, returned argv/env values
retain their copying behavior, and registry writes retain their best-effort reporting. The moved
provider code retains its MIT attribution and the NOTICE index follows the implementation.
This removes two service implementations from the root without introducing an execution dependency
on WebSocket transport. The native loader and local driver still require the next boundary change.

## Local driver and PTY ownership

The local driver and lazy native PTY loading/spawning now belong to execution. Its factory takes
named transcript and launch service groups plus diagnostics. The old driver adapter composes those
services directly and no longer imports terminal-ws. Both the WebSocket route and driver use the
same exported spawn factory. Core supplies the packaged-executable sentinel; execution owns the
createRequire-versus-dynamic-import choice and declares the existing pinned node-pty dependency.

Measured static closure: the composed local driver falls from 41 modules to 35; the mesh worker
falls from 92 to 86. The driver implementation itself reaches three modules: itself, the shared
PTY service and the contracts bounds leaf. No dynamic application import was introduced. The
remaining work/observe reach is through the supplied transcript service, whose later separation
still belongs in final composition. Screen observation and reusable worktree mechanisms remain
to extract.

The body is copied without indentation changes, so multiline instruction whitespace is preserved.
An exact body comparison after import/export wrapping, runtime constant comparison and differential
launch-envelope comparison all pass. Source guards now distinguish adapter wiring from implementation
ownership and inspect runtime packages for native loads, screen reads and competing launch builders.

## Screen and trust boundary

Screen observation and workspace trust are now execution services. The diagnostic callback is
application policy, while bounded screen state, parsing and trust-file updates are implementation
mechanisms. Preserve the module-level cache keyed by loader identity when composing screen factories:
moving it inside a factory would retry previously failed loads and duplicate diagnostics.
Seven recorded-screen replays and temporary-home trust-byte comparisons demonstrate unchanged behavior.
The existing @xterm/headless version is now declared by its implementation owner.

Reusable worktree extraction must retain mesh naming, assignment/session/dispatch paths, retention,
commit identity and preparation policy in mesh/application composition. Git execution, porcelain
parsing and worktree operations can move behind explicit policy ports without moving mesh rules
into execution. The loop-family source guard must cover package API names as well as old basenames;
otherwise an exported driver would bypass the prohibition on loading a PTY inside a loop child.

## Reusable worktrees and mesh policy

The former mesh/worktree module mixed three responsibilities: shell-free Git operations, mesh
lane/branch/retention rules, and application workspace/toolchain composition. These are now separate.
Execution accepts preparation, diagnostics, merge identity and merge-message functions; mesh supplies
its policy through those ports. The core adapter supplies workspace loading and the existing lazy
toolchain resolver. Neither extracted package imports application source or hides it behind a
dynamic import. The only new dependency is the declared mesh-to-execution workspace edge.

The historical refusal codes remain compatible, even where they contain assignment terminology.
No force-update/reset/rebase path was added. Dirty-tree checks and conflict aborts remain beside
the merge implementation, and materialization still invokes preparation through one shared door.
Exact comparisons cover 44 function bodies, preserving template whitespace and default merge text.

Repository-wide guards must inspect packages as well as src. This extraction expands the branch
mint, materialization, lane-keyspace, link/deletion and observation-classification scans. A generic
`worktree add` text match also matched a diagnostic message after the split; the materialization
detector now recognizes argv or an executable shell call rather than arbitrary message prose.

Next work-service extraction constraints: acceptance rule/ledger/admissibility are pure kernels;
criterion loading also depends on acceptance-horizon and frozen-set assets. Observation classification
uses mesh path policy and the effects journal, which should remain supplied collaborators rather
than introduce a work-to-mesh dependency. Audit tooling must retain the installed toolkit root:
`work-audit/toolkit.mjs` currently derives it by walking two parents from its own source path and
declares runnable targets under `src/`. Moving that file unchanged would resolve the wrong root.
Assign asset/program location before moving audit evidence/launch consumers.

Acceptance extraction resolves the preceding constraints through three explicit factories. The
criterion receives frozen-set readers; the store receives the criterion-owned ledger path; the
observation service receives journal reads and pure mesh path policy. Observation composition
derives its prefix through the supplied slug function but performs no journal I/O. Arithmetic
and audit read contracts remain direct exports. Package tests and copied-payload differential
checks verify these seams without adding work-to-core or work-to-mesh dependencies.

Source guards need to follow implementation ownership, including pure families now under packages.
The acceptance ledger single-writer check scans runtime sources carrying the declared ledger-path
constant/port, so an unrelated work-loop progress ledger is not mistaken for the acceptance writer.
Its planted second-writer checks remain in place. Remaining audit launch services must still retain
the installed program-root contract before their physical move.

The audit spawn module is a reusable execution mechanism: no audit-specific imports, assets or
workspace state. Its entire implementation now belongs to `@aof/execution/bounded-process`,
retaining the exported API through a compatibility path. Audit, loop and toolchain callers still
choose commands and deadlines. No dependency was added.

The audit safety closure now resolves public exports from workspace manifests without evaluating
those modules. It follows export-from into package source and continues down relative imports;
unknown/private package specifiers and project test imports remain refused. Synthetic violations
behind a workspace export demonstrate that the closure sees implementation code. The hook settings
write guard now uses this closure too. Small adapters are required to contain nonempty code, while
the bounded-process implementation and hook detector still have positive structural assertions.

Remaining audit composition: census and evidence need the core-owned toolkit/program locator and
the extracted bounded-process API. Evidence also uses the fitness-register grammar from
`work/doctor-controls.mjs`; that grammar depends only on lifecycle and pure declared-ID parsing,
so those mechanisms can move together into work. Prompt-layer checks need the supplied runtime
and resource-kind vocabulary. Seam liveness needs supplied knowledge-graph reads/normalization.
Declared-bound comparisons need the shipped reference corpus and bounds resolvers. Audit reports
consume work-graph checks through an explicit port, avoiding a work-to-work-graph dependency cycle
(work-graph already imports work records). Keep filesystem/program location in core composition.

The audit extraction implements those seams. Work owns census, evidence, prompt/hook checks,
declared-bound comparison, seam liveness and report assembly, plus declared-ID grammar and pure
controls. Toolkit derivation stays in core; both the source differential and copied-installation
probe execute real helper programs from the toolkit against a separate subject. No dependency
edge was needed: execution, model vocabulary, reference/bounds and graph services are explicit
factory inputs. Function bodies, constants, legacy export sets and assembled report data retain
their pre-move values.

Source guards now inspect both the moved implementations and core wiring. Repository-wide grammar,
graph-reader, audit-program and policy-reader scans include runtime packages. The copied provenance
fixture gets its own work-package copy and alias, so mutating a grammar exercises the copied reader
and cannot mutate the checkout's package. Other installed dependencies are read through fixture
aliases. The graph-reader allowlist identifies core composition and the existing supplied-reader
implementation separately; no new graph reader or build path was introduced.

Doctor extraction moves fifteen implementations into work: scope, story contracts, citation
resolution, grade normalization/compilation, diagram layout, the snapshot engine and nine check
modules. Coherence, freshness and dependency checks import the shared dependency predicates
directly, removing their former imports back into the snapshot engine. The diagram policy and
execution projection/run readers remain core-supplied ports. The only new manifest edge is
work to contracts, for the existing pure error and claim-provenance APIs; no registry dependency
or work-to-work-graph cycle is introduced.

The next tuning extraction has five services. Formation has no imports. Provenance can use
work-owned declaration, identity and citation APIs directly. Proposal needs a supplied core asset
map; distance needs the counter policy alongside work's acceptance rules. Corpus joins work
discovery, scope, observations and audit read contracts with supplied retrospective parsing,
execution record readers and loop-pointer parsing. Keep these cross-domain readers explicit,
especially the graph reader: work-graph already depends on work. The tune command should move
with those services when its remaining core configuration and registry collaborators are explicit.

The tuning extraction now implements these seams: five tuning services, counters and the command
descriptor live in work. Corpus receives six cross-domain readers; proposal receives the model-map
path and resolver; command assembly receives the corpus/proposal APIs, loop loader and an on-demand
registry provider. Formation, provenance, distance and counters use their existing pure/work-owned
dependencies. No new dependency edge is required. In particular, work does not import work-graph
or the registry, and the acceptor remains the sole verdict owner.

Copied-installation comparisons cover both structured data and rendered output, including source
locators embedded as JSON in human-readable text. The comparison normalizes only fixture-root paths;
all corpus reads, proposals, counters and acceptor arguments match the pre-move behavior. Source
guards inspect the actual package implementations, and copied mutation tests use a separate work
package instance. Counter metric pointers keep their stable legacy paths while source checks follow
the implementation through the public export.

Archive, reindex and schema upgrade form a self-contained mutation slice. Archive depends only on
discovery/identity plus Node filesystem operations. Reindex also consumes records, dependency
rewrites and foundation's atomic writer. Upgrade consumes discovery/records and contracts errors;
installed-product version is its only core policy and is supplied as a function, called only at
stamp application. These mechanisms do not publish effects or resolve workspaces. Keeping command
selection/refusal and stream-effect ordering in their current composition preserves those boundaries.

The three implementations now live in work. Source and copied-installation differential fixtures
compare reports, ref maps, archive link rewrites and every persisted byte, including a CRLF record.
The public upgrade factory also has a test proving construction/planning do not consult version
policy, while applying a pending stamp does and a second application does not. Architecture import
walks now follow public workspace exports to the actual mutation engines. Positive disk-reader pins
follow the new implementation paths and explicit discovery imports; legacy forwards remain in place.

Gap/finding promotion has four movable implementations: a pure content seed, the append/idempotence
engine, and two command descriptors with handlers. The engine needs only work discovery, filesystem
reads and foundation's atomic writer. Gap promotion additionally needs insertion flags and the shared
insertion operation; finding promotion needs that operation and the cache-first item reader. These are
explicit factory inputs, preserving the distinction between structural disk reads and item-state reads.
The broader scaffold/backlog-promotion implementation remains core composition for the next extraction.

Those four implementations now belong to work. Construction is inert, the seed and append/idempotence
logic have one home, and the engine imports no command. Source and copied-installation fixtures invoke
both real command handlers, compare their output and persisted record bytes, and cover repeat-finding,
discharged-gap and reviewed-chore refusals. Positive cache/disk pins inspect package source and core
wiring; mint scans cover all runtime packages, including the top-level insertion-call guard.

Shared insertion is the next completed boundary. The scaffold module owns template reading/rendering,
confirmation counts and nested-story creation. Its only external policies are the installed version
and stream transition. Backlog promotion owns resolution, refusal, number stamping, placement and
dependency rewrites, consuming the shared scaffold functions and the same transition. Four insertion
descriptors use those composed services. All six implementations now belong to work; core supplies
the version and transition collaborators and assembles the factories. No dependency edge was added.

The transition port is essential: replacing it with direct reindex calls would bypass locking and
effect publication. Both nested and top-level paths retain their old call arguments and order. Source
and copied-payload fixtures exercise all four commands, including a top-level insertion that shifts
a milestone, its nested story and a UAT dependency, followed by backlog promotion. Every record byte
and rendered result matches the baseline. The positive disk-reader pins and mint/importer scans now
inspect package implementations and verify that core adapters supply the shared insertion service.

The work read layer can own its implementation without acquiring mesh or storage dependencies.
`createWorkReader` receives the cache reader, degrade reporter and three mesh-worktree predicates;
disk discovery and readiness stay local to the work package. Worker content collection receives only
the execution run reader and always reads artifact bodies from its own disk. Command factories receive
the composed reader, execution/assignment overlays and remote content services. Core remains their
temporary composition site. This keeps remote-row provenance and the worker's own-checkout rule intact.

Package tests explicitly exercise a remote cache row with no local directory, local cache misses,
worktree cache bypass, supplied execution records, remote doc/task bodies and exact write resolution.
Architecture checks follow the implementations and inspect both ends of injected cache ports. The
worker execution import closure changes from 91 to 94 nodes: only work's row, artifact and content-read
implementation homes are added behind existing forwards. No previous node or dependency disappears.

Observation's heavy dependency was the core work facade, despite using only disk enumeration and
two root-name constants. Importing discovery/identity locally removes that upward dependency and eight
net modules from the local session driver's closure. The observer's only application policy is the
degrade reporter; workspace configuration loading belongs to its command's composition. The existing
transcript attribution, question reader, timing/token analysis and snapshot rules remain unchanged.
Debt's parser/budget is pure, and its command needs only that engine plus foundation's atomic writer.
The shipped debt instruction must name the package implementation when telling an author to lower
the budget; naming the old compatibility export would point to a file that no longer owns the value.

Test selection and execution form a cohesive work service, but the graph implementation and generic
bounded process runner belong outside it. Factories now accept graph readers/impact analysis, bounded
execution and shared census services explicitly. The test command consumes those composed services
and exact item resolution, while report normalization and story declaration parsing remain direct
local package dependencies. Changing the source of a changed set still feeds the same selector.

Architecture controls now inspect both the injected services and core bindings. Their configuration
reader census covers every runtime package, and the single-selector check counts implementations
inside factories as well as module-level exports. The selected-suite harness must enter through the
normal `scripts/test.mjs` assembly before importing its test-command-contract leaf: entering that leaf
first exposes the existing suite/index ESM initialization cycle. This is test harness setup, not a
runtime import cycle introduced by the extraction.

Doctor, validation, archive and schema upgrade are work-owned command faces. Archive must receive
the stream transition service, rather than import its fact-writing engine: the lock, event and
publication behavior belongs to application composition. Validation must receive the configured
record validator, because its digest contract comes from the installed bundle. Importing the raw
package validator alone silently drops that required configuration for digest records.

Doctor has two deferred reads in addition to its static collaborators: node identity and the command
registry. Both now enter through loader ports supplied by core. Their laziness is preserved, with the
registry cycle explanation beside the actual deferred import. Git history uses an injected bounded
execFileAsync binding; the work package imports no child-process API for this command. Source and
copied-payload fixtures include both a legacy identity sidecar and a discriminating loop registry so
neither optional read can degrade silently and make the comparison pass.

Grading has two owners: work chooses the declared rubric, resolves its deadline, guards the read/run
door and reentrancy, collects provenance and compiles evidence; execution owns the asynchronous child
and its timeout, byte ceiling and stream draining. The process mechanism now lives in
`packages/execution/src/rubric-process.mjs`, supplied to the work command by core. It retains the
existing result shape and termination distinctions instead of being replaced by the different audit
runner contract during a packaging migration. The work package gains no execution-package dependency.

The single-rubric-launch guards now scan all runtime packages, assert the work-owned invocation and
the single execution-owned implementation, and verify core connects them. Deadline-home scans also
include contracts rather than passing over the old root forwarding file. The public command and
process APIs, including every function body, remain unchanged.

Feedback records, counters and contract-integrity observation are work concerns. The append-only raw
and classification ledger now lives beside the work record APIs; capture still passes through the
application transition so raw append, STATE projection and publication ordering stay together.
Counter observation reads that local ledger directly and receives run history/retry policy from core.
The ratchet's pure engine has three local pure imports; its command receives exact item resolution
and bounded Git execution. It retains first-parent history resolution and base-only authority checks.

Architecture scans follow both the package implementation and the remaining composition adapter.
In particular, the raw-writer scan now covers all runtime packages, board-write isolation checks the
injected transition and its actual binding, and the ratchet remains an item-subtree walker rather
than becoming a second work-root enumerator. A real temporary Git repository exercises both supplied
and history-derived bases in source and copied-installation comparisons.

Audit and acceptor command implementations now belong to work. Their core adapters supply configured
services rather than importing unconfigured package factories: audit receives its report, prompt-layer
and bound services; acceptor receives criterion and observation services plus journal and transition
ports. Journal snapshots and report-only behavior remain unchanged. Package tests verify that a report
opens and cleans up a private journal copy and that an ineligible request never reaches the transition.

One discovery gap remains deliberately visible: acceptor's sourceUnits(root) walks only root/src.
After package extraction that population omits workspace implementations. The final migration must
define the audited project's source roots and cover package implementations without treating installed
dependencies as project source. Tune already delegates this population to acceptor; it must not gain
a second source enumerator. Legacy counter metric citations also remain pending the final citation
and composition audit. Moving the command alone does not satisfy either requirement.

Run command ownership follows the work-item operation rather than the storage mechanism. Start,
complete, retry and status now live in work; execution owns the records they consume. Configured
item resolution, local-checkout requirements, driven-session resolution, mesh presence/session/cache
reads and application transitions enter through core ports. This preserves the retry command's
deliberate distinction between lock context and publication context: supplying a workspace there
would introduce a new publish side effect. The package's retry test explicitly rejects that change.

The run-status render still receives the work-loop elapsed-time calculation through composition.
Architecture guards follow both that core binding and its package call site, and its document freeze
now pins the package implementation. Max-attempt resolution remains at the same four logical sites;
the source classifier and its mutation specimens follow the two relocated command files. Shipped
run-resilience, watcher and rubric citations now point at the relevant implementations. Their pending
generated-copy refresh is separate from source ownership and does not authorize workflow operations.

Acceptance's command-layer gates belong with work, while the pure lifecycle predicates stay free of
I/O. The item-status and regression-gate implementations now share the work-owned regression record
directly. Budget preflight remains the configured doctor service; Git execution, test execution,
notifications and application transitions are injected by core. The gate keeps its own fail-closed
Git status adapter rather than reusing a helper that treats a Git error as an empty change list.

The record-format and refusal-code guards now inspect root and workspace runtime source. Notification
ownership follows the package call site and checks that core actually supplies the shared notifier.
The package tests verify missing evidence cannot reach the transition or notifier, and that a permitted
accept notifies only after the status write. Real-Git comparisons additionally prove that the record's
own uncommitted append is excluded from the gate's dirty-tree refusal while unrelated dirt is refused.

The continue/refine/verify doors route an operation; they do not execute a session. Work now owns
their shared decision and command factory, receiving mesh assignment and execution projection services
through core. Milestone continue still resolves to autonomous, while story continue and refine/verify
retain their phases. The separate work-loop package remains the execution/orchestration owner.

Resume and answer share work's re-entry command module. Resume consumes the execution store's retry
and liveness decisions; answer writes through work-loop's ask service or invokes the registered mesh
resume operation. The latter invocation remains deferred, now through a named core loader port so
the package cannot import the assembled registry. Package tests exercise the loader's default path
and the explicit refusal path, including absence of a notification on refused delivery. Ask-reader,
notification and cap guards now cover package implementations as well as the actual core bindings.

Triggers belong with work-loop: their outputs are loop inputs and arguments, and both scope and level
decisions already live in that package's pure engine. The declaration compiler receives the shared
cadence grammar and bundled asset reader through core composition, avoiding a reverse import into
the application's graph loader. Registry access remains a deferred port; invalid declarations refuse
before it loads, and resolving an ungated trigger never invokes the loop.

The package contributes the trigger in a separate ordered command group so the existing registry's
enumeration stays unchanged. Source guards discover the actual package family and walk core's binding
as an additional closure root. This retains checks for clocks and process execution across injected
services while pure signal/level leaves now reach the local engine directly. Generated-citation parity
remains a separate known failure, not an exemption added to those checks.

Local dispatch belongs with loop orchestration: it admits lanes into the existing pool, resolves the
lane's item, runs the bounded set and coordinates merge/cleanup. It delegates worktree mechanics and
branch policy to the existing execution/mesh services. Keeping those operations injected preserves
the direction of package dependencies; local dispatch does not acquire mesh's assembled runtime.

Moving dispatch into work-loop means that the package now contains the legitimate owner of the pool
bound as well as its consumers. The guard still requires exactly one reader at the dispatch home and
rejects reads elsewhere; the loop-family rule acknowledges that owner. Admission and default-bound
scans now cover all runtime workspace sources instead of only root src/. The worker sink closure adds
one implementation module behind its existing adapter; the session driver's denied reach is unchanged.

Work's command contribution owns the existing 37 lifecycle, read, acceptance, grading and testing
operations. The `work` namespace also contains core installation/configuration operations, graph
operations and loop execution; a namespace is therefore not a package boundary. Core composes ordered
groups to preserve enumeration while work validates its own command IDs. Duplicate IDs and routes
remain the shared registry's responsibility across all packages. Registration preserves descriptor
identity, including input schemas, options, conversion, handlers and presentation.

Acceptor evidence must follow workspace declarations rather than a list of this repository's package
names. Scanning arbitrary package manifests would count undeclared fixture projects; scanning installed
dependencies would count code the audited project did not author. The new source reader therefore uses
the audited root manifest's workspace patterns, requires matched package manifests and reads each src/
tree once. The previous .mjs scope remains explicit; this is not a new TypeScript or native-code analyzer.
Malformed declarations fail rather than making the evidence population silently smaller.

The matcher is the already-locked picomatch 4.0.4, now declared directly by work. Its existing
[pattern matcher API](https://github.com/micromatch/picomatch#api) supports the workspace glob forms
without introducing a second glob grammar. Directory traversal is bounded to the project, does not
follow links and excludes installed dependencies, hidden directories and named build-output directories.
The production reader is tested independently and through acceptor's actual source-loading path.
# Audit child programs and workspace ownership

`src/work/audit-drive.mjs` and `audit-probe.mjs` were the remaining audit execution implementations
outside the work package. Their special boundary is a process boundary: the driver imports a cited
control and calls its exported cases, while the probe imports a runner solely to enumerate its array.
Moving either into the parent audit's import graph would violate that isolation even if imports were
inert. Both implementations now live under `packages/work/src/programs/`, with public entry points
used by compatibility launchers. Installed command paths and wire protocols remain unchanged.

The architecture census follows static imports from each launcher to its package implementation,
checks that every child dependency is readable and excluded from the parent closure, and forbids
secondary process creation throughout that closure. The package boundary allows exactly the two
existing computed subject imports. Full launcher removal still depends on final core installation
and program-path composition; this extraction does not claim that layout work is complete.

## Messaging is a complete feature boundary

The notification and Discord directories form one feature: shared presentation and REST transport,
credential storage, ask-message indexing, configured notification delivery, gateway lifecycle, reply
authorization and slash commands. The five messaging CLI descriptors use the same services. All ten
implementations now live in @aof/messaging; their public factories receive application policy instead
of importing core. Formatting and REST helpers stay directly importable.

The nonlocal collaborators are global-home resolution, project configuration reads/writes, degradation
reporting, workspace identity, ask/loop readers, assembled command invocation and served mesh project
resolution. The bot's old dynamic core imports are now deferred application services in its adapter;
the package itself has no such imports. Worktree folding accepts an async service to retain lazy core
loading. Discord replies still enter through work:answer, and slash commands still invoke work:list
or work:loop. Package ownership does not confer permission to write their records directly.

The package declares contracts/foundation plus the already locked @inquirer/prompts and ws versions.
The formatter's declaration forward is validated by a full UI build. Architecture scans include the
package implementations and compatibility callers, with planted violations proving that second
gateway connections, direct ask writes, process spawning and unauthorized HTTP paths remain detected.

## Knowledge operations and their application ports

Graphify integration and the memory stack form one package: graph-backed memory invokes graph:build
through the assembled registry, while both local and Graphify memory share record parsing and ranking.
Directly moving the old imports would have made knowledge depend on core. The new factories instead
receive managed-binary resolution, command invocation, workspace loading and configured work/import
services. Pure graph normalization/impact and record ranking remain direct exports. Work's public
ref-scope and declared-heading APIs are lower-level dependencies, not copies of those rules.

The memory seam keeps one backend-selection read and receives deferred loaders. Its none backend and
help path do not load local indexing or Graphify; the Graphify backend still invokes registered commands
and never acquires a second subprocess path. The five graph descriptors and work:memory contribute
under @aof/knowledge without changing command contents or enumeration order.

Rendered Graphify skill/MCP configuration stays in core with assistant assets. The graph:serve command
receives its transport; moving the generic MCP server belongs to server extraction. Imported-document
storage/materialization still enters through application ports and needs a final ownership decision.
Architecture scans now include workspace source and trace configured service bindings through their
adapters; module actuator validation also recognizes exported destructuring declarations.
## Import ownership follow-up

The import engine has two distinct consumers. `import:milestone` writes a knowledge digest beside
the source documents and requests memory reindexing; `migrate:folder` scaffolds managed work from
the same recovered content. Source access, recovery and knowledge materialization now live in
`@aof/knowledge`. Managed-work conversion remains a work command, supplied with recovery by the
application composition. Work must not import knowledge directly because knowledge already uses
work's public lifecycle, heading and record contracts.

Import services use explicit configured ports for workspace paths, the shipped digest renderer and
schema version. Package tests can therefore exercise real temporary source/storage directories
without loading the application registry or locating assets relative to the repository root.

## Server ownership follow-up

Board HTTP, config-editor HTTP, terminal WebSocket and graph MCP are transport adapters. Their
services now enter through factory ports in `@aof/server`, keeping command execution shared without
an upward dependency on core. Static path/MIME/fallback/loopback rules stay a directly importable
pure module. The board launcher retains explicit asset and trust collaborators, and native PTY
loading remains execution-owned and deferred.

`control-stream-server.mjs` and `mesh/ui-serve.mjs` contain mesh coordination decisions as well as
network I/O. Moving those whole files into server would assign domain policy to the wrong owner.
Their next extraction must preserve mesh ownership of assignment, presence, credentials and
terminal relay behavior while identifying any reusable transport portion.

## Mesh protocol follow-up

Relay admission and terminal/session wire behavior belong to mesh, even though they use HTTP and
WebSocket libraries. They interpret membership and relay envelopes; generic server ownership would
obscure those domain rules. Mesh now owns these implementations with configured registry/publication
ports. Immutable wire kinds export separately from configured factories, making both protocol
consumers and producer/reader census checks independent of service construction.

The presence-cadence helper has no production caller. It remains a supported package API and is
tested/bundled separately; expecting it in the executable's reachable source graph would mistake a
coverage assumption for existing application behavior.

## Mesh persistence follow-up

Node records and the registry share the machine-global mesh partition, but have different write
authority: node records are partitioned by node, while registry writes are limited to the nominated
control node. The extraction preserves both rules, including strict registry corruption errors.
Session liveness continues to use execution's one staleness predicate; package ownership must not
introduce a second TTL implementation. Core supplies the configured predicate and global-home policy.

Launcher lock ownership, fabric discovery and repository publication belong with mesh behavior.
The repository-marker API retains its read/merge/write contract and injectable Git remote lookup.
Run-path builders remain execution-owned, despite their historical re-export through the mesh store.

## Mesh projections and assignment records

The global projection store is also the persistence home for assignment facts, so moving only fleet
shaping would leave the main mesh data boundary in core. Mesh now owns that schema, the assignment
record API and global presence/descriptor/publication/query behavior together. The work package keeps
its row and artifact contracts. Configured disk enumeration, SQLite loading, workspace/node identity,
table classification and provenance policy enter through application ports.

Core's table classification remains shared composition data. Its writer paths must name the package
implementations, and writer-isolation scans must cover every runtime workspace: leaving either at
the old root would turn the extraction into an unguarded second writer. The existing database schema,
authority checks, author-scoped retractions and fact-preserving projection refreshes are unchanged.

## Mesh coordination and deferred application services

Scope locks and assignment/reclaim decisions belong beside mesh's assignment records. Recovery
push and resync share a storage shape but intentionally differ when the owner is disconnected:
recovery remains requested for retry; resync records a coded failure for the waiting operator.
Extracting them must preserve that distinction and close each tick's owned store on failure.

Supervised declarations consume work-loop decisions and argv composition, then ask the assembled
registry for the route. Park/resume needs the assembled notification service only when posting an
ask. These existing deferred loads are explicit factory ports now; the package imports no core
application. This does not eliminate the remaining core composition cycles. Eagerly capturing
`meshGlobalPropagationDecision` during item-lock construction exposed one such initialization
cycle; the compatibility adapter now supplies a call-through binding. Final composition must
remove that cycle rather than count deferred access as architectural completion.

## Mesh command ownership

The mesh contribution is seventeen registered commands, plus the deliberately separate session-hook
entry. Its implementation family also owns desktop preflight, positional/read-miss presentation and
the mesh-node gate. Moving the entire family preserves shared namespace and three-word desktop/repo
routes while making route/flag/handler changes package-owned. Configured services remain supplied by
core until final assembly; errors and filesystem primitives use public lower-level APIs directly.

Cold session startup is a property of the configured application closure, not just the inert package.
Its guard must start at the core session adapter, prove that the mesh implementation is reached, and
continue excluding the registry and generic face. The identity command's deferred declarations
loader must also remain behind the flag: merely injecting a loader would not preserve that cost rule
if the command called it unconditionally.

## Mesh runtime ownership and initialization

Launcher, worker, credential, session-spawn and fleet/control-stream policies now live in mesh.
Their configured collaborators remain explicit factory inputs until final core assembly. Mesh uses
server's public static HTTP helpers; this adds one workspace dependency, without changing third-party
versions. Transport protocol constants and pure clone URL resolvers export without constructing a
service. The root worker API retains its legacy driver/worktree re-exports by identity.

Capturing the configured worker API from global-node-registry exposed an initialization cycle.
That caller only needs `resolveCloneUrl`, so it now imports the pure mesh repo-admission API. The
credential provider likewise imports `parseRepoFromCloneUrl` locally. Neither pure URL operation
needs to initialize the worker graph. Final assembly must still remove the remaining composition
cycles; factory extraction alone does not complete that requirement.

The worker's active-worktree map belongs to its configured instance. Root's singleton preserves
existing shared state, while separately constructed instances are isolated. The session-spawn
source contained a raw NUL byte; its moved source spells the same string value as `\0`.

Source guards must distinguish implementation ownership from configured dependency ownership:
producer scans cover runtime workspace roots, dependency closure starts at the configured adapter,
and injected services are checked on both the factory input and the adapter binding. Compatibility
checks continue to import the legacy surface rather than treating a factory as that surface.

## Domain transitions versus generic effects

The generic effects package owns persistence/dispatch mechanics; it should not learn domain event
vocabulary merely because a transition appends an event. Assignment transitions therefore belong
to mesh, run transitions and run reconciliation to execution, and item/document/stream/harness
transitions to work. Core supplies the configured journal, reactor selection and drain services.
The reconciliation scan needs work-item discovery as a port; importing work from execution would
undo the mesh-blind local execution boundary. These factories construct no journal or event.

The harness error class is exported once per module and returned by every configured factory,
preserving error identity across instances. Constants likewise remain available without composing
the effect runtime. Existing legacy adapters still return the same API and require final assembly
cleanup; their presence is not evidence that the full modularization is complete.

Source guards now distinguish the configured stream seam from its package implementation when
checking that archive cannot reach reindex except through the seam. The configured worker closure
adds two transition implementation homes and loses the assignment-record forward (107 -> 108);
its driver's own denylist/closure is unchanged. A source detector also mistook prose constants
inside a function body for object keyword tables. It now checks literal table-cell syntax and has
regression probes for both factory-local prose and real factory-local keyword tables.
