---
doc: digest
milestone: 142
slug: yarn-workspace-modularization
title: "AOF becomes modular through Yarn workspaces and package-owned CLI extensions"
status: done
imported: true
importedBy: aof
source: 142-milestone-yarn-workspace-modularization
importedAt: 2026-10-02
schema: 1
aofVersion: 0.1.0
---
# 142 · AOF becomes modular through Yarn workspaces and package-owned CLI extensions — Digest

<!-- Recovered digest, co-located in the source milestone folder. Each `## ` section → one `summary` record via parseAof. -->

## Intent

Decouple AOF into cohesive Yarn workspace packages with explicit public APIs, declared dependencies, and enforceable ownership boundaries. A change to work orchestration, mesh, messaging, or a user interface should be implementable and verifiable in its owning package without reaching into another package's private source or loading the whole application unnecessarily.

AOF core remains the essential product: its CLI executable, configuration/rendering capabilities, and bundled skills, commands, agents, templates, and hooks ship together. Skills such as `aof:continue` and `aof:verify` require the CLI and its supporting domain operations. Installing the base AOF distribution must supply that entire runtime chain. Each feature package can extend the common CLI with its own commands, actions, arguments, and options through an explicit contribution contract.

## Scope

In scope:

- Adopt Yarn workspaces with a pinned package-manager version, an authoritative root lockfile, reproducible installation, explicit internal dependencies, and package-local scripts.
- Separate AOF core, work lifecycle, loop execution, declared work/loop graph tooling, mesh, external messaging including Discord, and the UI and desktop applications. Refine the remaining boundaries using [RESEARCH.md](RESEARCH.md) and [MIGRATION.md](MIGRATION.md).
- Keep the executable entry point and CLI framework in core. Core owns registration, routing, common help/output/error conventions, and assembly; feature packages own their contributed command definitions and underlying behavior.
- Define CLI contributions for routes, actions, positional arguments, options, validation, handlers, and result presentation. Support additions beneath shared namespaces such as `aof work` through declared ownership/extension points. Detect conflicting registrations.
- Separate reusable operations from CLI presentation while preserving a shared invocation contract for CLI, UI, and MCP callers where those surfaces exist today.
- Establish a one-way dependency graph: core assembles feature packages; feature packages depend on lower-level contracts/utilities or injected services, never on the assembled core.
- Separate generic effect execution from feature-specific handlers and registration. Clarify ownership of local work records, run records, mesh projections, and their interfaces.
- Preserve skill-to-CLI compatibility: required command availability, arguments, package versions, templates, hooks, and asset manifests remain coherent in every installation.
- Migrate asset resolution, source/payload/standalone-executable packaging, local installation, worktree preparation, Windows/WSL paths, CI, and release automation alongside extraction.
- Migrate the supply-chain audit to the Yarn dependency model while retaining existing checks and explicit lifecycle-script exceptions. Update repository instructions when the lockfile cutover lands.
- Give packages focused verification and retain cross-package integration, architecture, and release checks. Preserve test registration, acceptance traceability, and non-empty architecture scans.
- Deliver incrementally with independently reviewable steps and temporary compatibility forwards that point from old paths to new package APIs.

Out of scope:

- Changing AOF's delivery methodology, CLI behavior, work-item formats, or existing runtime support merely as a consequence of moving code.
- A wholesale TypeScript conversion, replacement of the test framework, or adoption of a separate monorepo build orchestrator as a prerequisite.
- Separate repositories, services, or independently versioned/published releases for every package. Internal modularity can coexist with one coordinated AOF distribution.
- Automatic discovery, downloading, or execution of arbitrary third-party CLI plugins. First-party packages are assembled explicitly; a public plugin ecosystem is a later decision.
- Combining the React UI with the desktop app's existing frontend, or redesigning either interface.
- Treating generated `.claude/` or `.codex/` files as package source. Project configuration continues to be authored in `.aof/`; shipped product assets move from their current source locations.
