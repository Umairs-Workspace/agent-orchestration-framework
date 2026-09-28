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

## Next

Implement package-owned CLI contributions and narrow service interfaces, then extract lower-level
packages and domains in the order described in [MIGRATION.md](MIGRATION.md). Keep the CLI and shipped
skills/assets in core; feature packages must not import the core that assembles them.
