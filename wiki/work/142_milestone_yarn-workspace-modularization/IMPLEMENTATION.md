# Implementation progress

## Yarn cutover — 2026-09-28

Implemented directly, outside AOF orchestration. Source directories remain in place for this step.

- Pinned and checked in Yarn 4.18.1, with `node-modules` linking and explicit workspace references.
  `node scripts/prepare-worktree.mjs` installs the complete graph immutably without a global
  package-manager installation or Windows shell shim. UI build tools resolve through `@aof/ui`.
- Replaced both npm lockfiles with root `yarn.lock`. All 245 distinct package/version pairs from
  the old root lock are retained. The 89 additional pairs cover the lock parser, optional-platform
  dependencies omitted by npm, and Yarn's injected native-build dependency graph. `node-gyp` is
  explicitly resolved to 11.5.0 rather than allowing Yarn's injected `latest` to choose Node-22-only
  tooling. This is version preservation, not a claim that the two managers produce identical trees.
- Kept the seven-day registry age gate and default-disabled lifecycle scripts. Exceptions are
  version-pinned for esbuild 0.28.1/0.25.12, node-pty 1.1.0, and fsevents 2.3.3.
- Adapted the supply-chain audit to Yarn's full lock inventory and installed package manifests.
  The compromised-version/family, suspicious-payload, and unsafe-workflow checks remain. Workspace
  install hooks and unreviewed build exceptions are rejected. Yarn does not record install scripts
  in its lock: scripts for uninstalled platform packages are protected by the deny-by-default
  configuration; installed manifests are checked on each platform.
- Replaced `npm ls` in local payload packaging with a resolver over installed production
  dependencies, including nested versions and peers. Missing required dependencies fail explicitly.
  Production workspace staging will be added with extraction; the resolver currently rejects such
  links rather than silently shipping a broken payload.
- Updated release/Pages installation steps, dependency auditing, worktree preparation, WSL native
  production installs, repository instructions, and local-development documentation.
- Migrated the headroom dependency check to the actual Yarn lock. Re-pinned the UI byte freeze
  solely for removal of `ui/package-lock.json`; no UI source bytes changed. The freeze now accounts
  for unstaged deletions and still detects a one-character edit to every UI source file.
- Fixed an existing architecture self-test that assumed the real project configuration had no
  Claude hooks: its negative detector case now uses an empty fixture. Live configuration is unchanged.

## Verification

Passed:

- Supply-chain audit: zero warnings.
- Fresh Windows immutable install, including reviewed native builds, in an isolated directory.
- Worktree wrapper refuses manifest/lock drift with Yarn `YN0028`.
- Production-only focus: backend dependencies present, UI/dev dependencies absent, lockfile unchanged
  (tested on Windows; WSL execution still requires a Linux check).
- TypeScript/Vite UI build.
- CLI child-process smoke suite.
- Copied production payload outside the checkout: required dependencies resolve inside the payload;
  CLI help and version work from an unrelated working directory.
- Actual local installer dry-run, without modifying the user's installed AOF.
- Nine new audit, lockfile, and dependency-closure regression cases.
- Existing unit baseline: all 997 checks pass after the completed UI build.
- Focused reruns of the migrated lockfile/UI-freeze checks, test census, directory budgets, and
  release-workflow checks pass.

The broader 11,509-check regression run was stopped after 5,221 checks (5,209 passed, 12 failed).
Eleven failures involved the migrated lockfile/UI-freeze checks, an existing live-config fixture
assumption, the new suite's directory budget, and the census's double-quoted import convention.
These were corrected and passed focused reruns. One additional failure, `141/01 every wave lane's
child is handed the loop's --thinking`, returned `halted` instead of `done`; it passed unchanged
when rerun alone. Its fixtures do not invoke the changed installation scripts. This is an
unresolved intermittent failure, not a passing full-suite result. The remaining root cases and
the root runner's final integration/Cargo lanes were not executed in this run.

Observed existing warnings: tunnel-rat 0.1.2 does not declare React for its zustand dependency;
Vite reports a large output chunk. Neither is a dependency-version change in this migration.

WSL deployment and Linux/macOS native builds have not been executed here. Bash syntax has been
checked, and release jobs now use the pinned installer and audit. No release was published or
existing user installation deployed. Local logs live under `.tmp/workspace-migration/` (ignored).

## Command contribution extraction — 2026-09-28

The Yarn cutover is committed as `a66dd8d` on `refactor/yarn-workspace-modularization`.
The next slice introduces the first source workspace, `packages/contracts` (`@aof/contracts`).
Its public `./commands` export contains dependency-free registry composition and routing. Core
uses the workspace dependency, while its existing command-core and CLI-face exports remain compatible.

Mesh now owns its command inventory in `src/commands/mesh/contribution.mjs`; messaging exports
its contribution alongside its existing descriptors. Core explicitly composes those contributions
with the remaining command groups. The flattened order and all 117 command IDs, routes, and option
specifications match the snapshot taken before extraction. Registry construction rejects ID/route
collisions with both claimants named. It retains descriptor identity and verbatim invocation results.

Features own their routes, argument adapters, option specifications, and presentation. This supports
adding commands beneath shared namespaces. Merging flags or actions into another owner's existing
descriptor is deliberately not implicit; that needs a separate extension contract if required.
No dynamic package discovery or plugin loading was introduced. Mesh/messaging domain implementations
remain under `src/` until their lower dependencies and service interfaces can be extracted.

Production staging now recognizes repository-local workspaces from the lockfile, verifies their
installation aliases, and copies them into the payload as real directories. Runtime dependencies
retain their nested locations; workspace development dependencies are not copied with the source.
Unlisted linked source and missing required dependencies fail before the installed source is replaced.
WSL sync carries workspace code/manifests while excluding Windows `node_modules`, and workspace
manifests participate in its reinstall fingerprint. Actual WSL execution remains unverified.

Verification for this slice:

- Eight package-local contract tests pass, also wired through the root command contract suite.
- All 997 unit checks pass; log: `.tmp/workspace-migration/contributions/unit.log` (local, ignored).
- 88 focused checks pass: installation/audit regressions, command/CLI contracts, session startup,
  route derivation, dependency direction, route coverage, and directory budgets.
- Four test-registration checks and the CLI child-process smoke pass.
- The real installer ran into a disposable directory outside the checkout. All 117 commands loaded;
  contracts resolved inside that payload as real files, and development tooling was absent.
- Browser bundling confirms contracts has no Node/core dependency. SEA JavaScript bundling embeds
  contracts and keeps node-pty external. This is not a full executable/signing/release build.
- Immutable installation, the supply-chain audit (zero warnings), and WSL Bash syntax pass.

The prior full-suite and platform limitations above still apply; this slice does not claim a
complete root-suite or cross-platform release result.

## Next

Extract remaining domain services and command contributions through the new package boundaries.
Foundation filesystem and diagnostic services are now available for those moves. The CLI
and shipped skills/assets stay in core; feature packages must not import their assembling core.

## Effects execution and delivery extraction — 2026-09-28

`packages/effects` (`@aof/effects`) now owns dispatcher execution, ephemeral fallback, outbox
delivery, and acknowledgement handling. Its explicit `./dispatch` and `./outbox` exports provide
factories receiving journal operations, diagnostic reporting, and application policy. There are no
runtime dependencies, legacy source imports, filesystem accesses, or application-global instances
in this package. Core supplies the same reactor table and policy through the existing source adapters.

The journal schema, persisted event/step vocabulary, default storage location, domain transitions,
and public source APIs remain unchanged. The adapters compose on first invocation to retain safe
initialization within the existing application import cycle. Core still owns CLI assembly and the
required skill commands. Generic packaging/WSL support from the preceding slice accommodates this
workspace without adding another package-specific staging path.

Verification:

- Ten package-local tests cover factory isolation, retry/scope forwarding, failed/sibling/deferred
  execution, ephemeral applicability, repeated delivery, acknowledgement classes, and duplicate receipts.
  The root command contract suite runs these together with the eight contracts-package tests.
- All 997 unit checks pass on the final adapters (`effects/unit-final.log`). Immutable installation
  and the supply-chain audit pass with zero audit warnings; the existing Yarn peer warning remains.
- 105 focused checks pass, including real SQLite effects/mesh delivery, domain transitions, Notion
  synchronization, stream reindexing, projection propagation, commands, import order, architecture
  budgets, test registration, and installation/package boundaries.
- Package boundary checks scan all runtime modules in both extracted packages, including literal
  dynamic imports and re-exports. They reject outside imports and computed dynamic imports; planted
  core, sibling-private, provider, and computed imports prove the detector fails.
- CLI child-process smoke and browser/SEA JavaScript bundle checks pass. Both workspaces are embedded
  in the SEA JavaScript bundle; node-pty remains external. No complete executable release was built.
- The real installer produced a disposable payload outside the checkout. All 117 commands loaded;
  a real journal event executed locally, remote delivery remained pending without consuming attempts,
  and an acknowledgement durably settled its step. Both workspaces were real payload directories.
- The Notion fixture now uses its isolated environment for workspace loading as well as journal and
  projection storage. All five Notion ledger cases pass with the actual global configuration excluded.

Local logs: `.tmp/workspace-migration/effects/`. The earlier full-suite and cross-platform limitations
remain in force; no live installation, WSL worker, or release was deployed.


## Journal storage and reactor registration extraction — 2026-09-28

The effects workspace now exports ./journal and ./registry alongside dispatch/outbox. Generic
SQLite schema initialization, atomic event/step append, replay/conflict handling, pending selection,
step updates, and diagnostic reads live in the package. Its factory receives an ID generator and
best-effort diagnostic sink; initialization receives an already opened connection. The application
adapter retains SQLite loading and its coded refusal, directory creation, the existing database path,
and the original event-ID format. Run/assignment-specific queries stay outside the generic package.

Reactor registration now accepts explicit ordered contributions. Duplicate event/key pairs name both
owners; malformed descriptors and invalid loci fail at registration. Applicability and undeclared-event
refusals retain their behavior. The existing handlers are supplied as one application contribution:
this extracts registration but does not yet split domain handlers or remove their legacy import cycle.
A comparison with the previous implementation confirms unchanged names, keys, loci, applicability
flags, and cascade order across all ten events.

The schema version and on-disk format are unchanged. Table ownership metadata now identifies the
package journal as the fact writer. Architecture sweeps follow the extracted schema, SQL writers,
event append definition, and registration refusal, while the package boundary guard continues to scan
all package runtime modules and reject imports outside the dependency-free kernels.

Verification:

- All 22 effects-package tests pass, including seven new real-SQLite storage cases and five reactor
  contribution cases. These run through the existing root package-test bridge as well.
- All 997 unit checks and 127 focused checks pass. The latter cover real journal/mesh delivery,
  transitions, projection/reindex behavior, Notion, harness rulings, SQLite runtime filtering,
  command/import-order compatibility, package boundaries, and architecture/test registration.
- Browser and SEA JavaScript bundling and CLI child-process smoke pass. The new modules are embedded;
  native node-pty remains external. This is not a complete signed executable release build.
- The real installer produced a disposable payload outside the checkout. All 117 commands loaded.
  It reopened a database created by the pre-extraction journal implementation, drained its local
  step, delivered/acknowledged its remote step, and appended a new event. The pre-extraction code
  then reopened the same database and read the newly settled steps and event successfully.
- Logs and compatibility fixtures are local/ignored under .tmp/workspace-migration/journal/.

Full-root-suite and cross-platform release limitations recorded above still apply. No live deployment
or external publication was performed. Next: domain-owned reactor handlers/contributions and removal
of the remaining application table/transition cycle, followed by the next domain extraction.

## Domain effect contributions — 2026-09-28

Three new private workspaces own the handlers previously embedded in src/effects/table.mjs:

- @aof/work: status advance/rollback, run-reference remapping, and ruling evidence.
- @aof/mesh: projection publication/remapping, assignment settlement, parked-resume restoration,
  and branch recording.
- @aof/integration-notion: sidecar remapping and conditional status synchronization.

Each exposes a ./effects factory taking a service provider, with no imports or dependency on
assembled core. Core explicitly registers ordered contributions and supplies the existing domain
services through deferred imports. Notion supplies separate local/integration groups so sidecar
remapping precedes mesh projection and external synchronization follows it. All ten event cascades
preserve their keys, loci, applicability, and ordering; storage schema and CLI behavior are unchanged.

The static registration cycle is removed. Dispatcher/outbox adapters now construct normally at
module initialization rather than using lazy singleton workarounds. A source-graph test follows
workspace exports, rejects static domain/transition loading, and catches a planted cycle. Six
entry-order subprocess checks remain. This does not claim that the domain services have migrated:
work readers/writers, mesh stores/transitions, Notion sync, and command handlers still live in src/.
The CLI and its required skill commands remain core-owned.

Architecture scans now include packages/*/src/ for publication, synchronization, notification,
harness writes, and append ownership. Status/disk-read pins follow their package handlers and
check core's injected disk binding. The session import census follows @aof exports as well:
its driver remains within 28 modules; the assignment sink is now 73 including seven package modules.
The worker-ask guard covers both the mesh handler and core's single deferred service forwarder.

Verification:

- Nine new package cases cover inert registration, bounded status writes, remapping, evidence
  refusals, projection scope/faults, park-edge deduplication, store ownership, and Notion policy.
  All 39 internal package cases pass through the root test bridge.
- All 997 unit checks and 164 focused checks pass. Focused coverage includes real journal delivery,
  assignment transitions, run rollback, reindexing, projection, Notion, harness, notification,
  session startup, registry compatibility, workspace boundaries, and architecture/test registration.
- Immutable Yarn installation succeeds with the existing peer warning; supply-chain audit has
  zero warnings. Only local workspace dependencies were added; no external dependency changed.
- Browser bundles of all eight package runtime modules and the SEA JavaScript bundle pass, as
  does CLI --help. This is not a complete native executable/signing/release build.
- The actual installer copied a disposable payload outside the checkout. All 117 commands loaded;
  all five internal packages resolved to real payload files, with no esbuild development tooling.
  A real journal event advanced a story, and a failed completion rolled it back through the
  extracted work handlers. The fixture and payload were removed afterward.

Logs: .tmp/workspace-migration/domain-effects/ (local, ignored). The earlier full-root-suite and
cross-platform limits remain; no live installation, AOF lifecycle operation, push, or deployment.

## Notion services and CLI contribution — 2026-09-28

The five Notion service implementations (mapping, projection, apply, CLI launcher, and milestone
synchronization) and both command implementations now live in @aof/integration-notion. Core's old
source paths retain thin compatibility adapters. These bind workspace path policy, work metadata
and cache-first readers, shared routing, command errors, tool provisioning, diagnostics, and journal
services into package factories. The package imports no legacy source, assembled core, or other
workspace's private files. Its explicitly allowed Node APIs are pinned per module; it adds no npm
dependencies or lockfile changes.

The package owns the two command schemas, argv validation, run behavior and rendering. Core
registers its named command contribution between the same neighboring commands as before. All 117
command IDs retain their ordering, and the two descriptor/argv/error snapshots match the actual
pre-extraction modules. CLI host ownership and skill availability are unchanged.

The sidecar format stays at version 2, with existing v1 reads, per-board identity, reindex replay,
and sync deduplication preserved. Auth remains an environment reference and the launcher keeps
shell-free argv spawning. Architecture guards now follow the package implementation and core
adapters; cache-first reader pins check both the relocated call and its supplied service.

Verification:

- All 997 unit checks and 306 focused checks pass. The focused run includes the complete Notion
  behavior/architecture suites plus effects, commands, startup, projection, reindexing, package
  boundaries, and test-registration checks. The final 142 Notion checks also pass after source-scan
  and documentation cleanup.
- Four new independent package cases cover injected storage paths and instance isolation,
  cross-board/reindex replay, projection/apply failure and dry-run behavior, per-instance launcher
  descriptors with synthetic environment auth, and command contribution/no-op behavior. All 43
  internal package cases run through the existing root bridge.
- Immutable Yarn installation and the supply-chain audit pass (zero audit warnings; existing Yarn
  peer warning unchanged). Browser-safe contributions and the SEA JavaScript bundle pass; every
  one of the nine Notion runtime modules is included in the latter. CLI --help passes.
- A real installer payload outside the checkout resolves all nine Notion exports locally as real
  files and loads all 117 commands. Both commands execute: associate writes its descriptor; dry-run
  issues no calls; first sync creates a page through a fake spawn; repeated sync makes no second
  call. No live Notion request was made.
- The pre-extraction mapping implementation wrote an existing board into that fixture. The payload
  preserved it while adding a new board binding, which the old implementation then read back.
  Temporary payload/fixture directories were removed. Logs: .tmp/workspace-migration/notion-services/.

The full-root-suite and cross-platform/native-release limitations from previous slices remain.
Next: continue work/mesh service and command extraction; separate foundational diagnostics from
mesh logging before moving shared filesystem utilities. Work remains outside AOF's workflow.

## Foundation filesystem and diagnostic extraction — 2026-09-28

@aof/foundation now owns readJson, atomic writeText, normalizeId, an injected-diagnostic temp-file
sweeper, an instance-scoped throttled degrade reporter, and generic JSONL log storage/reading.
The package has no npm dependencies and no application, configuration, mesh, or feature imports.
Its reporter is browser-safe; the filesystem and log entries use explicit native Node imports.

Core retains the application path rule in src/diagnostics/log.mjs: the existing global mesh/logs
location, environment override, process filenames, and log options remain unchanged. src/fs.mjs,
src/degrade.mjs, and src/mesh/log.mjs preserve their existing exports through adapters. The reporter
no longer imports a mesh module. The original test-reset API still resets the application reporter's
sink and throttle state without exposing a process-global singleton inside foundation.

The module census now follows workspace exports. The session driver reaches 31 modules, including
three newly separated foundation modules, and NO mesh module; the prior mesh-log node is replaced
by the core path adapter. The assignment sink reaches 76. These are module relocations, not new
runtime services. The driver guard now denies all mesh/ imports. Trigger timer tracing follows
workspace exports and still finds exactly one bounded rename-retry timer. The silent-catch guard
scans core and all package runtime code; its two diagnostic-floor allowances moved to foundation
without increasing their counts. The new one-file core diagnostics directory is explicitly metered.

Verification:

- Nine new package tests cover inert/isolated reporters, keyed throttling, contained sink/input/clock
  faults, JSON error codes, dry-run and concurrent atomic writes, failed-write temp cleanup, age-gated
  sweep diagnostics, log rotation/tailing/torn lines, recovery after serialization failure, and IDs.
  All 52 internal package cases run through the root test bridge.
- All 997 unit checks and 468 focused checks pass, including existing daemon/remote log commands,
  terminal screen evidence, orphan cleanup, filesystem hygiene, trigger purity, import closures,
  run persistence, effects, Notion, package boundaries, and architecture/test registration.
- Immutable Yarn installation and supply-chain audit pass (zero audit warnings; existing peer
  warning unchanged). The reporter bundles for browsers, all three foundation modules are embedded
  in the SEA JavaScript bundle, and CLI --help passes. No complete native release was built.
- An actual installer payload outside the checkout resolves foundation to local real files and loads
  all 117 commands. It reads a file/log written by the pre-extraction implementations, writes back,
  emits a real throttled diagnostic, and serves the log through mesh:logs. The old implementations
  then read the new file/log data successfully. Temporary directories were removed.

Logs and compatibility fixtures: .tmp/workspace-migration/foundation/ (local, ignored). The earlier
full-root-suite and cross-platform limitations remain. No live install, push, deployment, or AOF
workflow operation was performed. Next: use the lower-level APIs for work/mesh service extraction
and their package-owned command contributions, then complete core/application layout moves.

## Work record and lifecycle extraction — 2026-09-28

@aof/work now owns item record selection, frontmatter parsing, metadata overlays, schema/version
reads and coercion, guarded lifecycle moves, bounded rollback, and body-preserving frontmatter
transforms. Its records export accepts concrete item descriptors and uses the explicit workspace
dependency @aof/foundation for atomic writes. No workspace discovery, node identity, mesh, effects
journal or core import is present. The lifecycle export owns the vocabulary, legal edges, acceptance
horizon and epoch predicate and remains a zero-import browser-safe leaf.

src/work.mjs retains its public API through re-exports; src/acceptance-horizon.mjs forwards to the
lifecycle leaf. The command and transition layers retain publication/gate responsibilities. Core's
effects service provider remains deferred and now reaches the extracted writers through the same
compatibility API. Workspace loading/enumeration, run persistence and acceptor services remain
transitional core dependencies. The root work module loses roughly 360 lines in this slice.

The boundary guard admits only records.mjs's exact native APIs and @aof/foundation/fs; the manifest
records that sole dependency. Status/rollback and frontmatter-parser guards follow the relocated
implementations. The single-horizon scan covers core and all workspace runtime source. The pure
controls guard checks both the compatibility forward and the zero-import implementation. Static
session reach is 33 and assignment-sink reach is 78: the two new nodes relocate existing code.
The session driver continues to reject every mesh module.

Verification:

- Eight package tests cover document/type selection, local/remote metadata overlays, parser shape,
  LF/CRLF preservation, illegal edges, rollback bounds, unusable-document faults, and digest-based
  transforms. These are registered in the existing root package-test bridge (60 internal cases).
- All 997 unit checks pass. The first regression pass found the validation call to the relocated
  schema-coercion helper; importing the shared implementation fixed it before this final run.
- The expanded selection completed 2,121 check executions: 2,115 passed and six test failures
  surfaced. One export-shape test ignored re-exports; it now checks the runtime namespace and types.
  Five legacy identity tests consulted the machine's global identity; they now supply isolated
  fixture homes. loadWorkspace's production implementation is byte-identical to the baseline.
  All 44 cases in those two corrected suites pass on rerun. The selection includes work/grade,
  their architecture families, terminal, Notion, effects, command/bundle and import-boundary checks.
  All 60 internal package cases pass through the root bridge. No unresolved failure remains in
  this selection; the complete root suite was not rerun.
- Immutable Yarn installation and the supply-chain audit pass (zero warnings in the audit; the
  existing peer warning is unchanged). No external dependencies changed.
- Browser lifecycle and SEA JavaScript bundle checks pass. The latter includes records, lifecycle
  and foundation filesystem code and keeps node-pty external. No complete native release was built.
- A real installer payload outside the checkout loads all 117 commands and resolves both work
  exports and foundation from local real files. A pre-extraction writer seeds a CRLF record; the
  payload exercises work:status reads/moves through the real transition/effects path, rollback,
  and a schema transform. The old reader reads it back. Only the expected status/date/schema fields
  differ; the body/line endings and old public export set are preserved. Temporary files are removed.

Logs, the selected-check runner and compatibility harness are in
.tmp/workspace-migration/work-records/ (local, ignored). Full-root-suite and cross-platform/native
release limitations from previous slices remain. This work stays outside AOF's workflow.

## Work discovery and identity extraction — 2026-09-28

@aof/work/discovery owns listItems, findWork, listStream, isLiveStreamRow and the shared tolerant
readWorkDirectory helper. It takes an explicit directory and optional view, uses record metadata
through the package's records API and imports only Node path/directory APIs outside the package.
@aof/work/identity owns ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT, sameNumber and
parseStorySpan. It is a zero-import browser-safe leaf. No external dependency or lockfile change
was required; the two entries are explicit package exports.

src/work.mjs forwards its existing discovery/grammar API and imports the shared helpers needed by
its remaining validator/readiness code. Its public export set is unchanged and it drops another
332 lines (1,491 -> 1,159). Workspace configuration and identity hydration are byte-identical to the
pre-extraction source. The extracted discovery bodies also match apart from the named helper export.

Architecture checks follow implementation ownership across core and package runtime source:

- The one grammar definition lives in identity and the one enumerator in discovery. Existing raw
  directory-scanner exceptions retain their exact reasons and must still have a scanned subject.
- Archived-row, null-number and intake-read guards scan the package files as well as core.
- Direct @aof/work/discovery imports are recognized by the loop and cache read-boundary guards,
  including a planted package import; the directory helper is also treated as a disk reader.
- Identity and lifecycle are explicitly held to zero external/computed imports in the package
  boundary test. The discovery entry admits only its exact native Node APIs.
- Session-driver reach is 35 and assignment-sink reach is 80, each two modules above the previous
  census because discovery and identity relocated existing code. The driver still rejects mesh.

Verification:

- Six new package cases cover all three roots, recursive backlog grouping/leaf stopping, corrupt
  or absent record documents, numeric/story/span/slug lookup, deterministic listing and archive
  inclusion, remote-view replacement/overlays, invalid roots and pure identity parsing.
- All 2,096 selected checks pass with zero failures (selection deduplicated by test name), covering
  work/grade behavior and architecture, terminal, Notion, effects, command and packaging boundaries.
  The root bridge passes all 66 internal package cases, including the six new discovery cases.
- All 997 unit checks pass. Immutable Yarn install, supply-chain audit (zero warnings), CLI help,
  browser identity bundle and SEA JavaScript inclusion checks pass. Native node-pty stays external.
  The existing Yarn peer warning is unchanged.
- An actual installer payload outside the checkout loads all 117 commands and resolves the new
  exports locally as real files. Enumeration, default/all listings, seven lookup forms, a remote
  view and readiness match pre-extraction results from the same fixture. work:list (default/all)
  and work:find also pass through the real command layer. Temporary directories were removed.

Logs and the compatibility harness are under .tmp/workspace-migration/work-discovery/ (ignored).
The complete root-suite and native/cross-platform release limitations from prior slices remain.
No AOF workflow operation, live installation, deployment or push was performed.

## Work readiness and dependency rules extraction — 2026-09-28

@aof/work/readiness now owns nextWork and its scope/ready-set helpers. It imports the work
package's discovery, record, lifecycle, identity and dependency APIs. @aof/work/dependencies owns
shared target classification, sibling resolution/gating, parent grouping and text-only dependency
rewrites. That module is browser-safe and imports only identity. Neither imports core or mesh.

src/work.mjs forwards the existing public API and consumes the shared rules in validation. The
workspace loader, validator and readiness implementation bodies match their pre-extraction source.
No external dependencies, lockfile, persistence formats or CLI routes changed. Core retains command
composition, cache provenance, held-scope policy and the conservative execution-wave partition.

Architecture guards now follow readiness's source and recognize its package export as a disk-reader
dependency at the loop/cache boundaries. Runtime null-number and intake scans include both new
modules. The spike/chore source check now reads vocabulary from identity, repairing a silently inert
check left by the earlier move. Measured session-driver/assignment-sink reach grows from 35/80 to
37/82 modules because two implementations have their own files; the mesh denylist is unchanged.
The dependency-rules guard permits only identity and rejects computed imports.

Verification:

- Seven new package cases pass: ordered independent candidates, archived/parentless dependency
  targets, route/lease precedence and stale annotations, sibling cycles, story scopes and malformed
  scope errors, through-review/acceptance separation, numeric dependency rules and CRLF rewrites.
- All 2,104 selected checks pass with zero failures (deduplicated by test name), including work,
  grade, mesh candidacy, terminal, Notion, effects, commands, packaging and architecture checks.
  The root bridge runs all 73 internal package cases, including the seven new cases.
- All 997 unit checks pass. Supply-chain audit passes with zero warnings. No install was needed
  for the two new exports; dependencies and lockfile remain unchanged.
- Browser dependency-rule bundle contains only dependencies and identity. SEA JavaScript includes
  both extracted modules with node-pty external; no full native executable was built.
- An actual copied installer payload outside the checkout loads all 117 commands and resolves the
  new exports locally as real files. Eight old/new readiness scenarios, malformed-scope refusal,
  enumeration/list/find compatibility and real work:next (including scoped through-review) pass.
  The harness initially omitted existing disk-provenance fields and assumed all ready candidates
  could run together; corrected expectations match the existing conservative unknown-write-set
  behavior. No production fix was needed. Temporary payload files were removed.

Logs, the selected runner and compatibility harness are in
.tmp/workspace-migration/work-readiness/ (local, ignored). Full-root-suite and cross-platform/native
release limitations remain. Work proceeds directly, outside AOF workflow operations.
