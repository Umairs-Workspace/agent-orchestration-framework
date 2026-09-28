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

Separate application reactor registration from the effects table/transition import cycle; then
extract generic journal storage through explicit path/diagnostic interfaces. Keep run/assignment
queries in their domains. Extract foundational utilities and remaining domains in the order described
in [MIGRATION.md](MIGRATION.md). The CLI and shipped skills/assets stay in core; feature packages must
not import the core that assembles them.

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
