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

The root [package.json](../../../package.json) already declares `ui` as an npm workspace. Its
runtime dependencies combine prompting, WebSockets, native PTY support, and headless terminal
emulation. [ui/package.json](../../../ui/package.json) declares React/Vite and browser terminal
dependencies. A separate `ui/package-lock.json` also exists alongside the root lockfile.

The desktop application is a Rust/Tauri project under
[app/desktop](../../../app/desktop/Cargo.toml), with its own frontend and Cargo lockfiles. Its core
crate and Tauri shell have deliberately different build/test scopes. A Yarn workspace wrapper
must preserve Cargo's ownership rather than treating desktop as an existing Node application.

The root AGENTS.md still references `.planning/`, which was absent during inspection. Current work
context is under `wiki/work/`; the root instructions' historical planning paths are not a reliable
inventory source for this migration.

## The CLI registry is an existing extension seam

[command-core.mjs](../../../src/command-core.mjs) assembles commands across the product. Its documented
command shape includes an ID, input schema, operation, and CLI adapters. The existing
[spine face](../../../src/spine/face.mjs) supplies a common invocation path. The CLI already delays
registry loading on the session-presence path; [cli.mjs](../../../src/cli.mjs) records the startup
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
| [loop/cycle.mjs](../../../src/loop/cycle.mjs) | Imports item resolution, rubric handling and node identity helpers from `commands/`. | Move reusable operations below command presentation or supply explicit collaborators. |
| [mesh/declarations.mjs](../../../src/mesh/declarations.mjs) | Imports retry-ceiling resolution from `commands/run-retry.mjs`. | Mesh supervision must not depend on the CLI implementation layer. |
| [effects/table.mjs](../../../src/effects/table.mjs) | Imports work mutations, projections, assignments, run storage and Notion sync. | Separate generic durable dispatch from domain reactions and application registration. |
| [memory/graphify-backend.mjs](../../../src/memory/graphify-backend.mjs) | Imports `invoke` and workspace loading from the central command registry. | Extract a graph service API or inject a narrow invocation interface. |
| [work/read.mjs](../../../src/work/read.mjs) | Combines local work queries, global cache access and mesh worktree classification. | Keep local work mechanics independent of mesh-specific projection/admission policy. |
| [agent-session-driver.mjs](../../../src/agent-session-driver.mjs) | Combines provider/terminal execution with observation and phase-brief helpers. | Separate session mechanics from work-specific input assembly and policy. |
| [ui/src/board/action.mjs](../../../ui/src/board/action.mjs) | Imports formatting helpers through `../../../src/notify/form.mjs`. | Browser-safe shared helpers need a public export instead of a sibling-source escape. |

These inspected imports establish boundary leaks, not an exhaustive cycle census. Refinement needs
a resolver-aware dependency graph covering static imports, re-exports, literal dynamic imports,
and declared runtime collaborators before finalizing extraction batches.

## Useful existing boundaries

- [work/loop.mjs](../../../src/work/loop.mjs) is a pure decision engine with no imports. Preserve
  that property while separating the orchestration shell from CLI adapters.
- [terminal/screen.mjs](../../../src/terminal/screen.mjs) and
  [terminal/session-screen.mjs](../../../src/terminal/session-screen.mjs) provide existing terminal
  seams. They are candidates for an execution package, not reasons to rewrite terminal behavior.
- [work/bundle.mjs](../../../src/work/bundle.mjs),
  [bundle-runtime.mjs](../../../src/work/bundle-runtime.mjs), and
  [bundle-synthesis.mjs](../../../src/work/bundle-synthesis.mjs) separate aspects of asset loading,
  capability selection, and rendering. Their current `work/` location does not decide future ownership.
- Shared command invocation and durable effect journaling already exist. Migration can preserve
  those behavioral contracts while relocating ownership.

## Three different graph models

1. Work-item dependencies/readiness live in work mechanics such as [work.mjs](../../../src/work.mjs).
2. Declared feedback-loop metadata and graph rendering live in
   [work/loops.mjs](../../../src/work/loops.mjs),
   [work/loops-checks.mjs](../../../src/work/loops-checks.mjs), and
   [commands/loops-graph.mjs](../../../src/commands/loops-graph.mjs).
3. The code/knowledge graph is exposed through [graphify.mjs](../../../src/graphify.mjs),
   normalization/impact modules, and a graph-backed memory implementation.

**Constraint:** a shared word does not imply shared ownership. Work-graph naming must distinguish
declaration/documentation tools from execution policy and Graphify's code graph.

## Assets and distribution depend on current layout

- [asset-base.mjs](../../../src/asset-base.mjs) resolves development paths assuming its module is
  directly in `src/`, and resolves packaged bundle/UI/version assets relative to the executable.
- [sea-asset-manifest.mjs](../../../scripts/sea-asset-manifest.mjs) enumerates `src/bundle/` and
  `ui/dist/`. [build-sea.mjs](../../../scripts/build-sea.mjs) copies those assets and externalizes
  `node-pty` into a platform-specific sidecar.
- [sea-entry.mjs](../../../scripts/sea-entry.mjs) looks for the installed payload at `src/cli.mjs`
  beside the executable and otherwise uses the embedded build under its existing rules.
- [install-local.mjs](../../../scripts/install-local.mjs) copies the root `src/` tree and obtains
  production dependency locations with `npm ls --omit=dev --all --parseable --workspaces=false`.
- [ui-build.mjs](../../../scripts/ui-build.mjs) invokes TypeScript and Vite at assumed root
  `node_modules` paths, so changing dependency hoisting can affect it before source moves occur.
- [prepare-worktree.mjs](../../../scripts/prepare-worktree.mjs) resolves npm's JavaScript entry to
  preserve shell-free spawning on Windows. It assumes npm lock/install semantics.
- [install-local.mjs](../../../scripts/install-local.mjs) and
  [deploy-wsl.sh](../../../scripts/deploy-wsl.sh) contain source/dependency synchronization assumptions
  that must follow the lockfile and package-layout changes.

**Constraint:** source checkout, copied payload and standalone executable are distinct verification
paths. Working Yarn workspace links in a checkout do not prove an installed artifact is complete.
An installation manifest must include required workspace code and external dependencies without
retaining links back to the checkout. Native binaries remain platform-specific.

## Supply-chain checks are npm-specific

[supply-chain-audit.mjs](../../../scripts/supply-chain-audit.mjs) reads `package-lock.json`, traverses
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
shapes. Examples include [bundle location](../../../test/arch/bundle/acd-bundle-location.test.mjs),
[SEA asset resolution](../../../test/arch/bundle/acd-sea-safe-asset-base.test.mjs),
[command layering](../../../test/arch/command/acd-command-layer-imports-downward.test.mjs), and
[loop import boundaries](../../../test/arch/loop/acd-loop-module-import-boundary.test.mjs).

The command-layering check distinguishes root modules from family directories and excludes dynamic
imports from its static-import rule. New workspace checks need an explicit scope and coverage
contract rather than assuming existing path predicates cover all packages.

[scripts/test.mjs](../../../scripts/test.mjs) aggregates suite registrations and also invokes Rust
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
