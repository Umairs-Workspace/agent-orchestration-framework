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

## Work validation, feature parser and digest extraction — 2026-09-28

@aof/work/validation owns deterministic record, schema, feature and dependency-graph checks.
@aof/work/feature-parse is the unchanged zero-import Gherkin parser. @aof/work/digest owns pure
template parsing, digest rendering and digest-shape findings over supplied data. Core's adapter
retains the cached shipped-template read and product version. Validation receives a lazy
getDigestContract collaborator, invoked only for digest records; missing it raises explicitly.
The old work/parser/digest public APIs remain compatible forwards/adapters. No dependencies,
lockfile, templates or persisted formats changed.

Source guards follow the new implementation and scan workspace source. The feature-parser
compatibility oracle still synthesizes the pre-examples parser from the actual implementation.
Driver and assignment-sink closures measure 38 and 83 modules, net one additional module: the
three extracted implementations replace two direct compatibility dependencies in that closure.

Verification:

- All 997 unit checks pass; all 676 focused validation/parser/digest/work/architecture/command
  checks pass on the corrected run. The package bridge runs 77 cases, including four new cases
  proving supplied-contract rendering, lazy contract access/refusal, acceptance-horizon behavior,
  outline examples and partial malformed parses.
- The first focused run had five assertion failures. Four source assertions still read old paths
  (two left over from discovery); these now inspect identity/discovery/validation directly.
  The parser corpus check was comparing all validation findings to an empty array, including
  the ordinary non-AOF migration notes' missing metadata. It now checks structural parser
  findings, as its stated invariant requires. No live work-item metadata was added or changed.
- Audit passes with zero warnings. The parser and digest browser bundles each contain one module.
  The SEA JavaScript bundle includes all three new modules. No native release was built.
- A copied installation outside the checkout resolves all new exports locally, loads 117 commands,
  and matches pre-extraction validation findings and digest bytes/contracts. Readiness and list/find
  parity and real work:next also pass. Temporary installation fixtures were removed.

Evidence is in .tmp/workspace-migration/work-validation/ (ignored). Full migration completion is
tracked in COMPLETION.md; full-root-suite and cross-platform/native gates remain outstanding.

## Work-graph package and command contributions — 2026-09-28

Created @aof/work-graph with registry/checks, execution projection, record rendering, shared graph
shapes, document composition and six package-owned command factories. Core assembles the contribution
in the existing command order and supplies asset-root policy, run reads, item resolution and registry
invocation. The package imports only declared lower-level contracts/foundation/work APIs and Node
builtins; it has no core, mesh or executing-loop dependency. Registration/help metadata are inert.
Shared loop bounds and the error constructor moved unchanged into contracts. Old paths forward or
compose supplied services temporarily; removing these is still a completion requirement.

The groundedness command now receives framework location from core's asset locator instead of
counting parent directories from its own file. Its stale architecture exception was removed.
Registry/module pointers continue resolving named compatibility exports in a copied installation.
Pure checks/shapes/document and bounds/error files match their pre-extraction implementations exactly.

Architecture changes follow the actual implementations: read-only registry discovery includes the
package, while the two opt-in writers remain separately constrained. Bounds, document-reader and
execution-fact consumer scans cover workspace source. Guards follow public package imports and
ignore forwarding declarations when counting readers. No new mesh edge enters the local session
closure (39 modules; assignment sink 84). The contribution-era ordering check now measures declared
group order through contracts instead of requiring the retired flat COMMANDS array. Core's registry
comment census is 44 after contribution extraction; its non-empty floor follows that surface.

One historical test froze its source against git status, which would forbid every relocation. Its
replacement freezes the public glyph bytes, alongside the existing Mermaid output oracles. Another
historical test hashes the finding-envelope suite outside narrowly permitted regions: five exact
read-subject/child-import path lines changed for 142, were reviewed, and its residue was re-pinned;
fixtures, assertions, mask regions and line positions remain unchanged.

Verification:

- All 997 unit checks pass. Four new package cases verify inert six-command registration, ordered
  routes/completeness, format refusal before service access, supplied-loader behavior and shared
  contract usability. The root bridge now runs 81 package cases.
- Immutable Yarn install with build scripts skipped passes; only the new internal workspace and
  root edge change the lockfile. Supply-chain audit has zero warnings; existing peer warning remains.
- Browser bundles for checks, projection and record rendering contain only the graph package and
  shared pure bounds. SEA JavaScript includes the graph package; no native executable was built.
- A real copied installer payload outside the checkout matches the old registry model and Mermaid
  output over shipped loop records and invokes all five graph read/document commands. All 117
  command IDs remain available; validation/digest, readiness and list/find parity also pass.
- Initial graph/command checks exposed stale source paths, scan roots and historical guards, plus
  one mechanical path rewrite that incorrectly changed a fixture's own source file. Those were
  corrected and rerun. No production behavior failure was found by those runs.

The final deduplicated selection passes all 820 checks with zero failures.
Evidence is in .tmp/workspace-migration/work-graph/ (ignored).
Full migration, full-root-suite and native/platform checks remain outstanding.

## Work-loop engine and control services — 2026-09-28

Created @aof/work-loop with the unchanged zero-import decision engine, ask records/polling,
stop/resume records and signal source, and child-drive argument/result mechanics. Factories
accept explicit runtime-path, diagnostic, executable-location and process-execution services;
they perform no I/O during construction. The package depends only on @aof/foundation's public
filesystem API. Core's temporary adapters preserve every existing export and inject the same
application policy as before. Cycle/wave orchestration and CLI contribution extraction remain.

The child process still owns its console and receives the same stdin/cancel options. Its Node
entry is supplied lazily by core; the SEA branch never evaluates an import.meta URL. Ask answer
sanitation, record keys, unknown-field preservation, stop escalation and signal teardown are
unchanged. Old/new behavioral outputs and serialized ask/stop/resume bytes match in fixtures.

Architecture sweeps now include package source and follow both compatibility and public imports.
The trigger's closure scanner follows declared workspace exports: its three-file leaf closure
includes the temporary forwarding module and the pure engine, with no filesystem builtin. The
local session driver remains mesh-blind; the assignment sink closure rises from 84 to 86 because
the two control-service implementations now sit behind their adapters. The strict import denylist
is unchanged. Source fixtures copy the actual engine so isolation assertions still test purity.

Shipped source citations were updated in three loop records, including two bounds references
left stale by the prior extraction. The manifest was regenerated. Automatic approval review
initially rejected refreshing repository .aof copies under the outside-AOF constraint. The user
then explicitly approved only the three generated documents and their three lock hashes. The
refresh checked the old hashes and proved the renders changed only source citations before
writing. No workflow commands, run tracking, work-item state or configuration were changed.

Verification:

- Four new package tests pass; they exercise independent service instances, persisted fields,
  answer sanitation, corruption reporting, escalation/listener cleanup and both child argv forms.
- Immutable pinned Yarn install (build scripts skipped) and supply-chain audit pass, zero audit
  warnings. Only the internal workspace and root dependency change in yarn.lock.
- The engine is byte-identical to its pre-move source and bundles for the browser. The SEA
  JavaScript bundle passes with the native PTY external; no native executable was built.
- A copied installer payload resolves all new APIs internally, loads all 117 commands, writes
  request records and passes Node/SEA child argv checks. Previous graph/readiness/discovery/
  validation compatibility checks also pass in that payload.
- Fresh Claude/Codex/OpenCode rendering, every rendered byte/hash and a no-op update pass in a
  temporary installation. Three approved checked-in asset/lock refreshes pass synchronization.
- The unit run passed 996 checks initially; its sole failure was generated-asset synchronization.
  That exact check passes after the approved refresh, covering all 997 unit cases.
- An initial ad-hoc broad runner omitted scripts/test.mjs's per-case AOF_GLOBAL_HOME isolation
  and was stopped; its shared ask/stop failures are not production evidence. The corrected runner
  uses a fresh runtime home per case. A lane-interrupt case reported lane-open-failed in the broad
  selection but passed unchanged on isolated rerun; retain that intermittent result explicitly.
- Eight targeted reruns pass after source-scan/citation corrections and the approved asset refresh.
- All 2,030 distinct selected checks are covered: 550 completed before a shared-process wave
  stall (the three failures pass targeted reruns), 1,431 remaining cases pass with zero failures,
  and all 49 wave cases pass in separate processes with two-minute case limits. The stalled
  shared-process run is not a full-suite green result. The root bridge includes 85 package cases.
- The copied-installation check was repeated successfully against the final source manifest.

Evidence is in .tmp/workspace-migration/work-loop/ (ignored). Full migration, full-root-suite
and native/platform verification remain outstanding.

## Work-loop orchestration and command contribution — 2026-09-28

Moved cycle, wave, ask and stop orchestration, progress sampling, diagnostics, argv composition,
the loop command and all three phase drivers into `@aof/work-loop`. Core modules now only compose
named service groups and preserve their existing exports. The package owns a four-command
contribution; registry order and all 117 command IDs are unchanged. Its dependencies are contracts
and foundation, with no external dependency added.

The package receives work/run services, grading, execution, worktree operations, notifications
and command invocation. It contains no import of core, mesh or the assembled registry. The
per-call invocation override still takes precedence over the supplied registry callback. Core's
adapters defer registry access, which remains transitional composition to remove in the final
core assembly; this change does not claim that all application runtime cycles are resolved.
Diagnostic installation state remains module-scoped for process-wide idempotency.

Source checks now inspect package implementations, follow public bounds imports and check adapter
wiring separately. The ask-call classifier uses the innermost function inside a factory. The
printer and bound-consumer censuses include runtime packages. Planted-violation checks remain.
The relocated loop-shell citation was refreshed in the canonical bundle, its manifest and the
previously approved `.aof/loops/autonomous-cascade.md` copy plus its single existing lock hash.
No other generated configuration, work state or AOF workflow action was changed.

Verification (evidence under `.tmp/workspace-migration/work-loop-orchestration/`, ignored):

- All 997 unit checks pass. The final root command bridge passes all 87 internal package cases,
  including two new tests for inert composition, contribution completeness, injected invocation
  and per-call override precedence.
- The 1,981-case loop/architecture selection completed with seven stale source/citation assertions;
  all seven pass in `behavior-final-rerun.log` after correction. No behavioral failure remained.
- All 49 wave cases are covered in isolated, bounded processes: 48 initially passed and the sole
  stale bounds-import assertion passes after correction. Thus all 2,030 cases in this selection
  are covered; this is not a full-root-suite result.
- The initial 520-case architecture selection's 49 failures all pass on focused rerun. The final
  supplemental selection passes 114 checks, and the final ask/command contract selection passes
  41 checks. These selections overlap the broad loop run; their counts are not additive.
- All eight legacy adapter export sets match captured baselines; all 117 command IDs retain
  their order. The argv leaf is byte-identical to its pre-move source.
- Immutable pinned Yarn installation with scripts skipped and the supply-chain audit pass
  (zero audit warnings; the existing Yarn peer warning remains). The only lockfile change is
  work-loop's internal dependency on contracts.
- Browser bundles for the zero-import engine and argv pass. The standalone JavaScript bundle
  includes all moved implementations and keeps native node-pty external.
- A real copied installation resolves every new package API internally and passes the loop
  probe plus all three driver dry runs. Request records, Node/SEA child argv, graph commands
  and prior work discovery/readiness/validation parity checks also pass in that payload.
- Fresh Claude/Codex/OpenCode rendering, output bytes/hashes and a no-op update pass in a
  temporary installation; the repository's approved generated citation and hash are synchronized.

The full migration remains active. Execution/run storage, remaining work services, mesh,
messaging, knowledge, server, final core/apps moves and adapter removal are still required.
Full-root-suite, native executable and platform verification remain outstanding.

## Execution run services — 2026-09-28

Added `@aof/execution` with run storage, transcript spend ingestion, heartbeat queues and session
attribution. Core's four original modules are composition adapters with unchanged export sets.
The pure provenance compiler moved unchanged to contracts. Internal workspace dependencies only;
no external library was added. Store-local spend composition removes the previous module cycle.
Answer vocabulary and session-answer reading are supplied application services; their core adapters
still defer work-layer access and remain temporary.

Source guards now inspect package implementations and sweep all runtime modules for provenance
and run-ask writes. Exact service-wiring objects are distinguished from persisted records. Frozen
source pins name the relocated implementation and document the extraction evidence. The canonical
bundle's four affected citations and manifest were corrected, including a formerly stale record-shape
line range. The matching checked-in `.aof` copies and hashes have not been changed: the earlier
approval covered three different files. A separate citation-only approval question is pending.

Verification (ignored evidence in `.tmp/workspace-migration/execution-runs/`):

- All five new package tests pass: inert composition, transition refusal bytes, node partitioning,
  live-only heartbeat consumption, spend/answer settlement, answer-reader degradation and capture
  ordering. The root bridge passes all 92 internal package cases.
- Original and extracted run-store statements match after only the declared composition changes.
  All five compatibility export sets and all 117 command IDs/order match their baselines.
- Differential API and complete persisted-JSON comparisons pass for lifecycle, node partitions,
  asks, provenance, session capture, answers, retries, illegal transitions, spend and ref rewriting.
- The selected 724 cases initially had 18 source/fixture guard failures; all 18 pass on focused
  rerun. No production behavior failure remains in that selection.
- The 997-case unit run had two failures. The relocated source-pin assertion now passes; the
  generated-output synchronization case remains pending the four additional citation refreshes.
  Thus 996 unit cases are covered, not a full unit green result.
- Final focused checks pass 38 cases, including the package bridge, fleet source pin and every
  shipped loop citation's path/range/export assertion. These overlap earlier selections.
- Immutable pinned Yarn installation with builds skipped and supply-chain audit pass. Browser
  provenance and standalone JavaScript bundles pass; the native PTY remains external.
- A copied installer payload resolves the execution APIs internally and preserves run-record bytes
  against the baseline. Loop probing, three phase-driver dry runs and previous work/graph checks
  pass there. An initial harness log collision on Windows was fixed by separating parent and child
  log paths; the rerun passes.
- Fresh Claude/Codex/OpenCode rendering, every output byte/hash and a no-op update pass in an
  isolated temporary installation. No AOF workflow commands were run against this repository.

Local drivers, terminals/worktrees, remaining domains, final core/apps moves and adapter removal
are still outstanding. Full-root-suite and native/platform verification remain outstanding.

## Terminal provider and session services — 2026-09-28

Moved provider resolution and live terminal-session storage into `@aof/execution` factories.
Root modules preserve all existing exports and supply diagnostics. Comparing implementation
bodies after removing only the factory/export wrapper proves both are unchanged. No dependency
or lockfile change was required. The provider's per-file MIT attribution moved with its code;
NOTICE and its architecture check now name that implementation.

Verification (ignored evidence in `.tmp/workspace-migration/execution-terminals/`):

- All 906 selected session, terminal, native-loader, architecture and package-contract checks
  pass. This includes the root bridge over all 94 internal package cases.
- Two new package cases cover provider launch values, independent argv/env copies, injected
  binary lookup, cross-instance registry visibility, inspection without writes and best-effort
  diagnostic reporting when persistence cannot write. No real agent or PTY was launched.
- Compatibility export sets and implementation bodies match the saved pre-move source exactly.
- Immutable pinned Yarn installation and supply-chain audit pass with zero audit warnings;
  the existing Yarn peer warning remains.
- The standalone JavaScript bundle contains both moved modules and keeps native node-pty
  external. This is not evidence of a built native executable.
- A copied installation resolves both public APIs inside its payload, preserves provider launch
  values and shares session records between public and compatibility interfaces. Existing run-byte,
  loop, graph and work parity checks also pass there. A duplicate variable in the temporary payload
  test script was corrected before this successful run.

The existing four generated-citation updates remain pending separately. No repository `.aof`
files or workflow state changed in this extraction. Full migration and platform verification
remain outstanding.

## Local session driver and shared PTY service — 2026-09-28

Moved the local session driver into `@aof/execution/session-driver`, constructed with explicit
transcript, launch and diagnostic services. The core compatibility adapter preserves all 17
exports. It now composes native loading directly through `@aof/execution/pty`, removing its import
of terminal-ws. The WebSocket adapter uses the same exported spawn factory. Native loading remains
deferred until a spawn and retains createRequire beside the executable for packaged builds and a
dynamic import for development. Execution declares the existing pinned node-pty 1.1.0 dependency;
the lockfile adds only that workspace edge. No library version or lifecycle allowance changed.

The static composed-driver closure shrank from 41 modules to 35; the mesh-worker closure shrank
from 92 to 86. The package driver reaches only itself, the PTY module and the contracts bounds
leaf. It imports no core, work, mesh or transport module. Screen observation, transcript reading,
trust, phase-brief compilation and attribution remain supplied services to finish assigning during
the remaining migration. There is no new deferred application import hiding a cycle.

Source guards now read the actual driver, distinguish supplied ports from adapter imports and
sweep runtime packages for native loads, competing launch builders and screen/transcript reads.
Planted violations remain exercised. Broader architecture checks also exposed three earlier Notion
scan helpers without non-empty assertions; those assertions were added without narrowing their
subjects. The PTY module carries the required MIT attribution and NOTICE includes its new path.

Verification (ignored evidence in `.tmp/workspace-migration/execution-driver/`):

- The complete original driver body is byte-identical after only import/export wrapping; copied
  lines were not indented, preserving multiline instruction strings. All 17 compatibility exports,
  non-function values and five launch-envelope scenarios match the old implementation.
- The 1,180-case affected selection initially passed 1,148 cases with 32 source-location/guard
  failures. Those are covered by focused reruns after correction; the final 14-case check also
  exercises expanded runtime scans and the bridge over all 96 internal package cases.
- All 217 cases across the complete changed test suites and the architecture census audit pass
  in `changed.log`. This final run catches interactions beyond the initially failing cases;
  its counts overlap the preceding selections.
- Two new package tests cover inert driver composition, supplied transcript/launch services,
  deferred native loading, argument identity and preserving the native-load error itself.
- The unit run reports 997 passes and one failure: the four generated citation copies whose
  refresh remains separately pending. The extra unit case is the added PTY attribution check.
  This is not a fully green unit-suite claim.
- Pinned Yarn immutable installation with builds skipped and supply-chain audit pass, zero audit
  warnings. The existing Yarn peer warning remains. Standalone JavaScript bundling includes both
  new modules and keeps node-pty external; no native executable was built.
- A copied installer payload preserves driver instructions and launch envelopes, uses the same
  public spawn factory through the WebSocket compatibility export and preserves simulated native
  load failures. Its prior work, graph, loop, driver-dry-run, terminal-registry and persisted-run
  parity checks also pass, with all 117 commands retained. Temporary harness issues involving a
  randomly generated session ID and nested JSON escaping were corrected before the successful run.

The four previously pending generated citation changes remain untouched; this driver move does
not add any shipped loop citation changes. Screen services, reusable worktree mechanisms, remaining
domain packages, final core/apps layout and adapter removal still remain. Full-root-suite and
native/platform verification are outstanding.
