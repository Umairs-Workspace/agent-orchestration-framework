# Plan 03 — Move the product into the core workspace

Status: pending. Depends on [01](01-domain-ownership-PLAN.md) and
[02](02-composition-and-cli-PLAN.md). Apply relevant [distribution work](05-distribution-and-tooling-PLAN.md)
in the same commits as path changes.

## Objective

`packages/core` owns the installed `aof` package, executable, application assembly, configuration,
rendering and bundled assistant assets. The repository root becomes a private coordination workspace.
There is no separate CLI app: core ships the executable that its skills require.

## Work

- [ ] Create `packages/core/package.json` with the existing installed name `aof`, version policy,
  executable name and Node requirements. Give the private repository root a distinct workspace name.
  Keep release/version metadata read from one authoritative product location.
- [ ] Move `bin/aof.mjs`, retained core implementation and explicit assembly into `packages/core`.
  Move canonical `src/bundle/` assets to the agreed `packages/core/assets/` layout, preserving the
  installed/embedded asset contract where it differs from the source layout.
- [ ] Define only necessary public core exports and executable child entry points. Do not export
  every private file solely to preserve old test imports.
- [ ] Move runtime dependencies to actual owners based on imports. Keep repository build/test tools
  at root when appropriate; resolve package-local tools without relying on accidental hoisting.
- [ ] Ensure core's dependency closure includes every operation required by shipped skills. Optional
  UI/desktop availability must not determine whether continue, verify, loop or work operations exist.
- [ ] Update root scripts, workspace declarations, bin resolution and version/build metadata readers.
  Preserve developer entry commands with documented script forwarding where useful.
- [ ] Refactor `asset-base`, bundle readers, render plans, hooks, manifest generation and child-process
  launch paths to distinguish source, copied and SEA roots. Resolve from explicit/module locations,
  not an assumed current working directory or a fixed number of parent directories.
- [ ] Update distribution staging and current tests alongside each move. Any temporary root launcher
  must have a documented consumer and removal condition in Plan 06.
- [ ] Refresh `yarn.lock` only for the workspace/dependency changes required here; preserve the pinned
  Yarn version, disabled lifecycle scripts and existing reviewed native build exceptions.

## Verification and exit

- [ ] Immutable install and `node scripts/supply-chain-audit.mjs` pass with the final manifest graph.
- [ ] Source CLI and a copied core distribution execute from an unrelated working directory. Inspect
  resolved package/asset paths to prove they cannot fall back to the original checkout.
- [ ] Configuration errors remain visible, including `test/command/config-fault-visible.test.mjs`;
  rendering and init/update/install fixture behavior remains compatible.
- [ ] All skill-required command forms resolve without UI/desktop installation. Compare command
  descriptors and fixture-generated assets, allowing only reviewed source citation/path changes.
- [ ] Version reporting, hook entry points and spawned audit/probe processes work from the new layout.
- [ ] Root is private and no longer owns the installed product implementation. Core contains product
  assembly and configuration/assets, while feature behavior remains in its owning packages.

Commit executable, manifest, asset resolver and necessary staging changes together. A rollback must
restore a usable source and installed entry point, not just move directories back.
