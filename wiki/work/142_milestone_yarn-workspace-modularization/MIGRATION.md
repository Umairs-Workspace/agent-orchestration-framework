# 142 · Proposed package structure and migration path

**Status:** implementation plan, captured 2026-09-28. The product constraints in
[SPEC.md](SPEC.md) are the agreed direction; validate the package map and API sketches against the
code as implementation proceeds. This work runs outside the AOF workflow. Source evidence is
recorded separately in [RESEARCH.md](RESEARCH.md).

## Package map

```text
aof/
  packages/
    core/                 # aof executable, CLI framework, assembly, rendering, bundled assets
      bin/aof.mjs
      src/
      assets/
    contracts/            # Browser-safe boundary schemas and command contribution contracts
    foundation/           # Only necessary shared filesystem/path/config-reading primitives
    work/                 # Work-item lifecycle, dependency readiness, validation and acceptance
    work-graph/           # Declared loop graph, records and documentation tooling
    work-loop/            # Pure loop decisions and delivery orchestration
    execution/            # Agent sessions, PTYs, runs, transcripts and reusable worktree mechanics
    mesh/                 # Distributed identity, coordination, assignments and projections
    messaging/            # Notification delivery and Discord interactions
    knowledge/            # Graphify and memory indexing/retrieval
    integration-notion/   # Notion work synchronization and mapping
    effects/              # Durable journal, generic dispatch/retry and outbox
    server/               # HTTP/WebSocket/MCP adapters with injected application services
  apps/
    ui/                   # React/Vite application
    desktop/              # Rust/Tauri application, its frontend, Cargo manifests and lockfiles
  test/
    integration/
    architecture/
    support/
  scripts/
  wiki/
  package.json            # Private repository root
  yarn.lock
  .yarnrc.yml
```

Create workspaces when their boundaries are ready; do not scaffold an empty package for every
candidate. Names and finer splits can change during implementation without changing the agreed product
boundaries. Keep audit, acceptor and tuning modules inside work initially. Keep Discord inside
messaging initially. Do not create a general-purpose graph abstraction across different graph models.

`packages/core` retains the installed package/executable identity `aof`; other packages can use
`@aof/*`. Internal packages can remain private and participate in one coordinated release. Public
registry publication is not required for this migration.

## Core is the product and composition owner

Core owns the executable, CLI framework, shared command registry, configuration/rendering use cases,
and shipped skills/agents/templates/hooks. It explicitly assembles the required feature contributions.
There is no separate CLI app or second host package that competes with core for composition ownership.

The dependency direction differs from the original assessment's proposal of core as a leaf library:

```text
core -> feature contributions -> feature domain operations
core + features -> contracts / necessary foundation APIs / generic effects
core -> server factory, supplied with command invocation and lifecycle services
ui -> browser-safe contracts; reaches backend behavior over HTTP/WebSocket
desktop -> installed AOF process/API; Cargo owns its Rust implementation
```

Feature packages do not import the core that assembles them. Relocate only genuinely shared,
lower-level helpers into foundation/contracts. Asset installation and product composition stay in
core. If a domain operation requires rendering, notifications, distributed queries, or execution,
provide the relevant narrow service instead of importing core or inventing another global registry.

The base distribution includes every package required by shipped skills, including the work and
loop operations behind `aof:continue`, `aof:verify`, and related procedures. An optional UI/desktop
installation does not determine whether those skills work. Check the actual bundle invocation
inventory before deciding which other integrations can be omitted.

## Package-owned CLI contributions

Each feature declares its command IDs, routes/actions, arguments/options, input validation, handler,
and presentation adapters. Core registers and routes these contributions using common conventions.
Keep the existing command descriptor and shared invocation model where practical.

Illustrative shape only:

```js
// @aof/mesh/commands
export function registerCommands(registrar, services) {
  registrar.register({
    id: 'mesh:assign',
    path: ['mesh', 'assign'],
    arguments: assignArguments,
    options: assignOptions,
    input: assignInputSchema,
    run: input => services.mesh.assign(input),
    render: renderAssignment,
  });
}
```

The registrar is supplied to the contribution. It is not imported from a running core singleton.
Pure registration contracts belong in a lower-level package. No third-party CLI library has been
selected by this sketch.

Required properties of the contribution API:

- Packages own command namespaces or explicitly granted routes beneath shared namespaces.
  Work and work-loop can both contribute under `aof work` without depending on one another's parser.
- Duplicate command IDs/routes and incompatible argument/option registrations fail deterministically.
  Extending another package's existing command requires a declared extension point; it is not a
  silent override or an opportunity to replace its handler.
- Preserve current command IDs, aliases, flags, defaults, validation, exit codes, JSON and text
  output. Required-option and unknown-option behavior remain part of compatibility.
- CLI, UI and MCP invoke the same operation contract; formatting and transport concerns remain
  outside domain behavior. Server adapters receive that invocation interface from core.
- Registration and help must not start a daemon, read integration secrets, or launch a provider.
  Retain the lightweight session-presence path and verify loading/startup behavior.
- Assembly is explicit and deterministic for the first-party distribution. Required contributions
  cannot silently disappear. Discovery of arbitrary installed plugins is deferred.
- A staged installation proves the skill -> command -> operation chain. Check required commands and
  option forms against package contributions, alongside representative end-to-end scenarios.

## Current sources and candidate owners

| Candidate owner | Starting points; mixed files need splitting |
|---|---|
| Core | `bin/aof.mjs`, `src/cli.mjs`, registry assembly, config editing, adapters, render-plan, bundle loaders and `src/bundle/` assets. |
| Foundation/contracts | Necessary shared filesystem/path/workspace-reading primitives; command/error envelopes, transport data, and browser-safe shared helpers. |
| Work | `src/work.mjs`, most lifecycle/read/doctor/grade modules in `src/work/`, work audit/acceptor/promote/tune families. |
| Work graph | `src/work/loops*`, `loop-record*`, `loop-document*`, graph shapes and graph command logic. Shared bound vocabulary must not introduce a dependency on the executing loop. |
| Work loop | `src/work/loop.mjs`, `src/loop/`, orchestration in `commands/loop.mjs` and `commands/drive.mjs`, loop policy/progress modules. |
| Execution | Session driver, terminal modules/providers, run/session persistence and observation, transcript/spend handling; reusable Git mechanics extracted from mesh worktrees. |
| Mesh | `src/mesh/`, node registry/identity, worker/control streams, artifact sync and global projection storage/query adapters. |
| Messaging | `src/notify/` and `src/discord/`; domain publishers depend on a supplied delivery interface. |
| Knowledge | `src/memory/`, Graphify normalization/impact/integration and domain graph operations. |
| Notion | `src/notion/` and its contribution; effect handlers registered by core. |
| Effects | Generic journal/dispatch/outbox/retry; domain transitions stay with the domain that owns the state. |
| Server | Setup/board/mesh HTTP serving and graph MCP transport; composed with explicit services and asset locations. |

This is a responsibility map, not a bulk directory-move instruction. For example, mesh-specific
assignment policy stays in mesh even when reusable worktree operations move to execution. Work
queries must not depend back on mesh projection storage; supply a projection-reader interface.

## Yarn starting point

Pin an exact tested Yarn version in `packageManager`. Start with conventional Node resolution:

```yaml
nodeLinker: node-modules
enableScripts: false
enableTransparentWorkspaces: false
```

Use explicit `workspace:*` dependencies and explicit package exports. Preserve ESM JavaScript;
package extraction does not require compiling every library. Use `yarn install --immutable` in CI
after the cutover. Move dependencies to their actual owners and resolve build tools from the owning
workspace rather than assuming root hoisting. Hoisting restrictions are a follow-up compatibility
choice, not a substitute for checking undeclared imports.

Retain reviewed install-script exceptions through the chosen Yarn configuration and audit workspace
lifecycle scripts separately. Compare the resolved graph against the authoritative npm baseline.
At cutover, make the root Yarn lockfile authoritative, retire conflicting npm lockfiles, and update
instructions/scripts together. Do not maintain two competing installation workflows indefinitely.

## Incremental migration

| Stage | Change | Gate before proceeding |
|---|---|---|
| 1. Baseline and ownership | Record current tests, registered commands, generated output, dependency graph and installation paths; define allowed package dependencies. | Known failures and untested platform behavior are explicit; baseline is reproducible. |
| 2. Yarn in the current layout | Keep source folders in place; switch package-manager pin/lockfile, audit adapter, CI, worktree preparation, build/install scripts and documentation. | Clean immutable install, supply-chain checks, existing tests and applicable UI/native builds work. |
| 3. Contribution and service seams | Evolve command descriptors into package contributions; lower reusable helpers; separate effects registration; introduce projection/execution interfaces and asset-location indirection. | Shared CLI/API behavior stays stable; contribution collisions and skill-required capabilities are checked. |
| 4. Extract lower-level packages | Move contracts, necessary foundation APIs and the effects kernel; establish explicit exports and package tests. | New packages import no legacy root source or assembled core; existing consumers use temporary forwards. |
| 5. Extract domain packages | Move work, work-graph, execution and work-loop in dependency order after splitting mixed modules. | Local work is independent of mesh; loop decisions stay pure; operations are testable through supplied collaborators. |
| 6. Extract coordination/integrations | Move mesh, messaging, knowledge and Notion, with their CLI contributions. | Removing an optional integration from assembly does not break unrelated domains; required features remain present. |
| 7. Complete core/apps layout | Move the remaining CLI/composition/assets into core; move UI and wrap desktop build/test commands. | Base installation includes required contributions/assets; UI, Rust core and shell checks pass. |
| 8. Remove migration scaffolding | Remove old source forwards, finish test ownership and enforce package rules in CI. | No workspace cycles, sibling-private imports, legacy-source dependencies or undeclared dependency reliance remain. |

Each stage may require multiple changes. Choose extraction batches from the measured dependency
graph. Keep forwarding modules one-way: old source -> new package API. An extracted package must
not reach back into the old source tree. Update packaging and tests in every affected stage rather
than postponing them to stage 7.

## Verification and rollback discipline

- Run focused package checks first, then affected cross-package scenarios and the established
  broader gates. Record a baseline before moving tests; retain stable test identities and selectors.
- Check command contributions for route/ID/option conflicts, help/error/JSON parity, shared-namespace
  behavior, missing required modules and lightweight startup.
- Exercise skill-required CLI operations from a clean staged base installation, not only from a
  workspace-linked checkout. Check all referenced commands and representative real workflows.
- Compare generated Claude/Codex assets and manifests for unintended changes; preserve other runtime
  support that already exists. Test asset reads from unrelated working directories.
- Verify source mode, copied payload, embedded executable and native sidecars on supported platforms.
  Stage packages outside the checkout and prove that no module or asset resolves back into it.
- Preserve durable-effect ordering, retry/acknowledgement behavior, run/assignment transitions,
  identity rules and persisted-state compatibility across package interfaces.
- Exercise Windows worktree preparation and WSL/native dependency resolution. Preserve shell-free
  package-manager invocation and avoid workspace links escaping a disposable worktree.
- Migrate architecture scan roots alongside moves; assert non-empty subject sets and planted-failure
  detection. Enforce explicit exports, declared imports, forbidden dependency directions and cycles.
- Use Yarn constraints for manifest policies and a source-aware checker for code imports; include
  re-exports and dynamic imports where resolvable. Do not treat delayed imports as automatic boundary
  exemptions.
- Make each extraction a reviewable change that can be reverted with its consumer, packaging and
  test updates. Avoid persisted-data migrations in the same changes unless independently required.

The migration is complete when these outcomes are implemented and verified. This plan records
intended checks; it does not claim they have passed.
