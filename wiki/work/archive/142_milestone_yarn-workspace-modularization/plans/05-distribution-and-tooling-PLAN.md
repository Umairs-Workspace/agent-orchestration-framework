# Plan 05 — Finish distribution and developer tooling

Status: implemented and verified on available Windows/Linux x64 hosts. Evidence and reproducible
gates are in [05-DISTRIBUTION](05-DISTRIBUTION.md). Final application-layout confirmation awaits
[app relocation](04-app-workspaces-PLAN.md); other native matrix legs remain open in Plan 08.

## Objective

Make the final workspace layout work as source, a copied installation and a real standalone binary.
Developer worktrees and release automation must use the same dependency and asset ownership rules.

## Work

- [x] Inventory source-root assumptions in `scripts/install-local.mjs`, `scripts/build-sea.mjs`,
  `scripts/sea-entry.mjs`, `scripts/sea-asset-manifest.mjs`, `scripts/dependency-inventory.mjs`,
  `scripts/generate-bundle-manifest.mjs`, `scripts/ui-build.mjs` and `scripts/release/`.
- [x] Make copied installation traverse declared production workspace dependencies and stage public
  entry points, executable child scripts and required assets. Do not copy the entire checkout to
  compensate for undeclared dependencies. Ensure staged workspace links cannot escape the payload.
- [x] Resolve product version/bin/core assets from their new owner and keep installed relative paths
  coherent. Cover paths with spaces, unrelated working directories and repeat installation/update.
- [x] Point the SEA entry at core, verify the bundle import closure and retain explicit native/asset
  sidecars. Inspect the bundler metafile; a successful JavaScript bundle alone is insufficient.
- [x] Stage real `node-pty` binaries and supporting files for the target platform/architecture using
  the existing reviewed process. Preserve release checksums, archive contents and signing order.
- [x] Update `scripts/prepare-worktree.mjs`, `scripts/yarn.mjs`, `scripts/deploy-wsl.sh` and local
  installation instructions for final paths and immutable dependency preparation.
- [x] Update `.github/workflows/release.yml` and relevant pages/build workflow paths, cache inputs,
  workspace build commands and artifact staging. Preserve the supported release matrix.
- [x] Ensure a fresh worktree does not resolve modules, tools or assets from another checkout. Audit
  runtime dependency ownership and build-script resolution rather than relying on root hoisting.
- [x] Promote migration proof helpers needed for future maintenance into tracked tests/tooling.
  Ignored `.tmp/workspace-migration/` evidence is useful history, not a reproducible release gate.

## Verification and exit

- [x] Run pinned immutable installation with scripts disabled and the supply-chain audit after final
  manifest changes. Verify reviewed native exceptions remain explicit.
- [x] Run installer detection/placement/verification, asset-base, SEA recipe, sidecar archive,
  checksums and release workflow checks through their actual registered runners.
- [x] Stage and execute a copied distribution in a temporary root; verify command inventory, assets,
  package resolution and representative fixture operations with access to the source checkout removed.
- [x] Build and execute a real SEA binary on available supported hosts, including an actual PTY
  interaction. A fake executable sentinel or `--skip-ui` smoke test does not satisfy this gate.
- [x] Exercise clean worktree preparation and the relevant Windows/WSL paths.
- [ ] Confirm the real relocated app/desktop paths after Plan 04.
- [ ] Run other supported platform builds through the established release matrix and record exact
  artifact/revision evidence (Plan 08).
- [x] Source, copied and standalone modes share the same operation/asset contract. Missing platform
  evidence remains open in Plan 08; do not publish or deploy merely to validate local packaging.

Keep build/installer changes coupled to the moves they support. Validate archives in temporary
locations before changing any installed development copy.
