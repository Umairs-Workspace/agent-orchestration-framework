# Plan 05 — Finish distribution and developer tooling

Status: pending. Start alongside [core relocation](03-core-workspace-PLAN.md), then finish after
[app relocation](04-app-workspaces-PLAN.md). Do not defer broken installation paths until this plan ends.

## Objective

Make the final workspace layout work as source, a copied installation and a real standalone binary.
Developer worktrees and release automation must use the same dependency and asset ownership rules.

## Work

- [ ] Inventory source-root assumptions in `scripts/install-local.mjs`, `scripts/build-sea.mjs`,
  `scripts/sea-entry.mjs`, `scripts/sea-asset-manifest.mjs`, `scripts/dependency-inventory.mjs`,
  `scripts/generate-bundle-manifest.mjs`, `scripts/ui-build.mjs` and `scripts/release/`.
- [ ] Make copied installation traverse declared production workspace dependencies and stage public
  entry points, executable child scripts and required assets. Do not copy the entire checkout to
  compensate for undeclared dependencies. Ensure staged workspace links cannot escape the payload.
- [ ] Resolve product version/bin/core assets from their new owner and keep installed relative paths
  coherent. Cover paths with spaces, unrelated working directories and repeat installation/update.
- [ ] Point the SEA entry at core, verify the bundle import closure and retain explicit native/asset
  sidecars. Inspect the bundler metafile; a successful JavaScript bundle alone is insufficient.
- [ ] Stage real `node-pty` binaries and supporting files for the target platform/architecture using
  the existing reviewed process. Preserve release checksums, archive contents and signing order.
- [ ] Update `scripts/prepare-worktree.mjs`, `scripts/yarn.mjs`, `scripts/deploy-wsl.sh` and local
  installation instructions for final paths and immutable dependency preparation.
- [ ] Update `.github/workflows/release.yml` and relevant pages/build workflow paths, cache inputs,
  workspace build commands and artifact staging. Preserve the supported release matrix.
- [ ] Ensure a fresh worktree does not resolve modules, tools or assets from another checkout. Audit
  runtime dependency ownership and build-script resolution rather than relying on root hoisting.
- [ ] Promote migration proof helpers needed for future maintenance into tracked tests/tooling.
  Ignored `.tmp/workspace-migration/` evidence is useful history, not a reproducible release gate.

## Verification and exit

- [ ] Run pinned immutable installation with scripts disabled and the supply-chain audit after final
  manifest changes. Verify reviewed native exceptions remain explicit.
- [ ] Run installer detection/placement/verification, asset-base, SEA recipe, sidecar archive,
  checksums and release workflow checks through their actual registered runners.
- [ ] Stage and execute a copied distribution in a temporary root; verify command inventory, assets,
  package resolution and representative fixture operations with access to the source checkout removed.
- [ ] Build and execute a real SEA binary on available supported hosts, including an actual PTY
  interaction. A fake executable sentinel or `--skip-ui` smoke test does not satisfy this gate.
- [ ] Exercise clean worktree preparation and the relevant Windows/WSL paths. Run other supported
  platform builds through the established release matrix and record exact artifact/revision evidence.
- [ ] Source, copied and standalone modes share the same operation/asset contract. Missing platform
  evidence remains open in Plan 08; do not publish or deploy merely to validate local packaging.

Keep build/installer changes coupled to the moves they support. Validate archives in temporary
locations before changing any installed development copy.
