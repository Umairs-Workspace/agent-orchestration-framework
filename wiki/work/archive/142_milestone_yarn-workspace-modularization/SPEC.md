# 142 · AOF becomes modular through Yarn workspaces and package-owned CLI extensions

These are ordinary project notes. Implement this migration directly, outside the AOF workflow:
no AOF skills, run tracking, story/task scaffolding, or lifecycle commands for this work.

## Objective

Decouple AOF into cohesive Yarn workspace packages with explicit public APIs, declared dependencies,
and enforceable ownership boundaries. A change to work orchestration, mesh, messaging, or a user
interface should be implementable and verifiable in its owning package without reaching into another
package's private source or loading the whole application unnecessarily.

AOF core remains the essential product: its CLI executable, configuration/rendering capabilities,
and bundled skills, commands, agents, templates, and hooks ship together. Skills such as
`aof:continue` and `aof:verify` require the CLI and its supporting domain operations. Installing the
base AOF distribution must supply that entire runtime chain. Each feature package can extend the
common CLI with its own commands, actions, arguments, and options through an explicit contribution
contract.

## Scope

In scope:

- Adopt Yarn workspaces with a pinned package-manager version, an authoritative root lockfile,
  reproducible installation, explicit internal dependencies, and package-local scripts.
- Separate AOF core, work lifecycle, loop execution, declared work/loop graph tooling, mesh,
  external messaging including Discord, and the UI and desktop applications. Refine the remaining
  boundaries using [RESEARCH.md](RESEARCH.md) and [MIGRATION.md](MIGRATION.md).
- Keep the executable entry point and CLI framework in core. Core owns registration, routing,
  common help/output/error conventions, and assembly; feature packages own their contributed
  command definitions and underlying behavior.
- Define CLI contributions for routes, actions, positional arguments, options, validation,
  handlers, and result presentation. Support additions beneath shared namespaces such as
  `aof work` through declared ownership/extension points. Detect conflicting registrations.
- Separate reusable operations from CLI presentation while preserving a shared invocation
  contract for CLI, UI, and MCP callers where those surfaces exist today.
- Establish a one-way dependency graph: core assembles feature packages; feature packages depend on
  lower-level contracts/utilities or injected services, never on the assembled core.
- Separate generic effect execution from feature-specific handlers and registration. Clarify
  ownership of local work records, run records, mesh projections, and their interfaces.
- Preserve skill-to-CLI compatibility: required command availability, arguments, package versions,
  templates, hooks, and asset manifests remain coherent in every installation.
- Migrate asset resolution, source/payload/standalone-executable packaging, local installation,
  worktree preparation, Windows/WSL paths, CI, and release automation alongside extraction.
- Migrate the supply-chain audit to the Yarn dependency model while retaining existing checks and
  explicit lifecycle-script exceptions. Update repository instructions when the lockfile cutover lands.
- Give packages focused verification and retain cross-package integration, architecture, and release
  checks. Preserve test registration, acceptance traceability, and non-empty architecture scans.
- Deliver incrementally with independently reviewable steps and temporary compatibility forwards
  that point from old paths to new package APIs.

Out of scope:

- Changing AOF's delivery methodology, CLI behavior, work-item formats, or existing runtime support
  merely as a consequence of moving code.
- A wholesale TypeScript conversion, replacement of the test framework, or adoption of a separate
  monorepo build orchestrator as a prerequisite.
- Separate repositories, services, or independently versioned/published releases for every package.
  Internal modularity can coexist with one coordinated AOF distribution.
- Automatic discovery, downloading, or execution of arbitrary third-party CLI plugins. First-party
  packages are assembled explicitly; a public plugin ecosystem is a later decision.
- Combining the React UI with the desktop app's existing frontend, or redesigning either interface.
- Treating generated `.claude/` or `.codex/` files as package source. Project configuration continues
  to be authored in `.aof/`; shipped product assets move from their current source locations.

## Product constraints

1. **Core includes the CLI.** There is no separate `apps/cli` workspace in the agreed direction.
   The executable may remain a thin entry file inside core.
2. **Packages extend the CLI.** Adding mesh behavior should normally change mesh's contribution and
   domain code, not teach the core parser every mesh-specific argument.
3. **Core assembles its features.** Shared registration contracts and necessary foundational
   utilities live below both core and feature packages. Package APIs and injection break upward imports.
4. **The base install is complete.** Every operation required by shipped skills is present; UI and
   desktop can be optional additions. Skill-to-CLI compatibility is a distribution contract.
5. **Preserve behavior during extraction.** Keep command IDs/routes, flags, defaults, output/error
   contracts, side-effect semantics, generated assets, and persisted-state compatibility stable
   unless a separate, explicit behavior change is scoped.
6. **Package boundaries are verifiable.** Extracted packages do not import legacy root `src/` or
   sibling private files; dependencies are declared rather than accidentally supplied by hoisting.

## Implementation sequence

Follow the incremental stages in [MIGRATION.md](MIGRATION.md), adjusting extraction batches to the
observed dependencies. Record implementation decisions and test results directly in this folder.

## Dependencies

- Implementation needs a recorded baseline for tests, generated assets, command/API contracts,
  supported Node/platform combinations, and installation modes.
- Yarn cutover depends on replacing npm-specific audit/install assumptions; package extraction
  depends on removing the ownership leaks identified in the research.
- Existing architectural invariants must be preserved or explicitly superseded with rationale;
  source moves must not silently remove files from verification.

## Supporting material

- [RESEARCH.md](RESEARCH.md) — observed dependencies, build constraints, documentation sources,
  and questions still requiring verification.
- [MIGRATION.md](MIGRATION.md) — proposed package responsibilities, CLI contribution design,
  migration stages, and verification gates.
- [STATE.md](STATE.md) — capture status and agreed decisions.
