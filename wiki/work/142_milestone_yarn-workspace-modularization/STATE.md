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
  Core retains workspace configuration/identity loading, validation, command
  gates and effect publication.
  The earlier full root suite was stopped before completion; its limitations remain recorded below.
- Objectives: [SPEC.md](SPEC.md).
- Source findings and unresolved questions: [RESEARCH.md](RESEARCH.md).
- Proposed package map and migration stages: [MIGRATION.md](MIGRATION.md).
- Delivered changes and verification details: [IMPLEMENTATION.md](IMPLEMENTATION.md).

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

## Next

Continue extracting domain service implementations and their command contributions behind the new
package interfaces. The work and mesh handler packages are implemented; their injected
service implementations are being extracted from src/. Work owns record/lifecycle services;
workspace configuration/identity loading, validation, run persistence and acceptor
services remain in core. Enumeration/lookup/listing, readiness and their shared identity/dependency
rules are extracted. Next, separate validation's feature parser and digest-template asset access
before moving its implementation. Notion owns
its services and CLI descriptors;
shared work/routing services, diagnostics, provisioning and journal policy remain injected.
Foundation filesystem and diagnostic mechanisms are extracted; core retains their application
policy through compatibility adapters. Core registration is statically acyclic, while deferred
runtime service composition remains transitional. Core still owns the CLI
and will move to packages/core with its assets. Keep the outstanding full-suite and platform
checks explicit. Continue direct development without AOF workflow commands.
