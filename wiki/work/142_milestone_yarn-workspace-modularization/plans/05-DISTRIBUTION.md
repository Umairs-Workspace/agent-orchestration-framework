# Plan 05 distribution and tooling evidence

Implementation is delivered for the current layout. Plan 04 still owns relocating the applications
and the desktop consumers as one batch. UI staging already follows the locked `@aof/ui` owner, and
a relocated `apps/ui` fixture passes. Final app-layout confirmation and unexecuted release-matrix
legs remain open; this is not overall migration acceptance.

## Ownership and staging

| Consumer | Final behavior |
| --- | --- |
| `install-local.mjs` | Copies core's source, bin, complete manifest and assets; traverses core's declared production dependency closure, preserving nested versions while dereferencing workspace links. Built UI is a sidecar, outside core's dependency closure. Also stages Node for audit children. |
| `dependency-inventory.mjs` | Retains repository-local, locked workspace validation and required-dependency refusal. No whole-checkout staging or production dependency inferred from root hoisting. |
| `workspace-paths.mjs` | Reads locked workspace owners, checks manifest identity and real paths, and resolves node-pty through its declaring execution package. WSL consumes the same owner list. |
| `sea-asset-manifest.mjs` / `build-sea.mjs` | Core owns version and canonical assets. UI files follow its locked workspace. Main and audit-child metafiles reject foreign inputs, legacy source, app source/assets and inlined node-pty. |
| `sea-entry.mjs` | Preserves the single command core and existing payload/embedded selection. Releases carry no `src/cli.mjs`; their two audit children are standalone ESM bundles under `src/work/`. |
| `generate-bundle-manifest.mjs` | Already reads core's canonical assets through the relocated core implementation; no further source-root replacement needed. |
| `ui-build.mjs` / `yarn.mjs` | Execute the checked-in Yarn from their own checkout and build `@aof/ui` through its workspace command. Build tools remain owned by root/UI manifests. |
| `prepare-worktree.mjs` | Immutable installation with `--mode=skip-build`, including reviewed exceptions. Native compilation is a subsequent explicit operation. Core's bin is tracked executable so Linux preparation leaves Git clean. |
| `deploy-wsl.sh` | Synchronizes locked workspace owners with rsync, removes retired source, excludes native dependency/build trees, hashes all owner manifests and the pinned tools/configuration, and resolves native PTY through execution. Repeat deployment retains a valid native install. Reports the synchronized core entry's version. |
| `scripts/release/` | Resolve native ownership, archive every required runtime sidecar, retain asset names/checksum format, and execute the extracted release before signing/upload. |

The unchanged extensionless `node-pty-<platform>-<arch>` archive now contains `bundle/`, `ui/`,
`package.json`, both bundled audit programs, `node-runtime/`, and target-native PTY files/module
runtime. It excludes foreign-platform native prebuilds and build intermediates. An unmodified copy
of the build host's Node executes audit children; an AOF SEA cannot interpret those files as Node.
Core supplies this executable explicitly to the work audit and optional Notion CLI factories;
callers' injected executables continue to win. Factory construction does not probe the runtime.
Source/copy/SEA census and evidence behavior are exercised. Notion's lazy runtime selection and
explicit overrides are tested with a spawn spy, without external requests.

Both real installers place additional sidecars, replace retired assets on updates and clear a prior
developer payload stamp when a standalone release replaces it. Older PTY-only archives remain
installable. Signing order, archive names, checksums and the configured five native matrix legs are
preserved. Pages already uses immutable workspace preparation and public APIs; no path/cache edit
was required there. Desktop installation's `app/desktop` source path remains Plan 04's consumer.

Optional source UI lookup is confined to the private repository's real workspace paths. A copied
CLI without built UI cannot borrow or read an ancestor package. An invalid foreign parent manifest
proves that isolation. This is tested alongside a staged UI
winning over a foreign ancestor package, full command inventory, hooks, child programs and repeat
payload installation. All five new tooling cases live in the existing core-distribution suite;
the exact `test/bundle` file budget stays 35 and its negative probes remain intact.

## Reproducible native release gate

On each target host, run the pinned preparation, audit and UI build, then:

```text
node scripts/build-sea.mjs --out <temporary-build-dir>
node scripts/release/stage-release-assets.mjs --sea-out <temporary-build-dir> --stage-dir <temporary-stage-dir> --os <windows|macos|linux> --arch <x64|arm64>
node scripts/release/verify-distribution.mjs --stage-dir <temporary-stage-dir> --os <windows|macos|linux> --arch <x64|arm64>
```

Linux additionally uses the reviewed `yarn rebuild node-pty` and
`scripts/release/stage-linux-node-pty-prebuild.mjs`. Yarn also executes the already reviewed,
version-pinned esbuild exceptions when they are pending; scripts remain globally disabled and
the audit passes. No manifest dependency versions or lockfile resolutions changed in this plan.

The tracked gate invokes the real installer into an OS-temporary path with spaces, installs twice,
removes stale assets and a prior payload stamp, compares source help, renders both supported
runtimes, executes a census through the SEA and both bundled audit programs through staged Node,
serves the real built UI, and opens the SEA's WebSocket terminal. A disposable codex shim waits
for input and returns the marker through **real node-pty**, proving bidirectional native I/O.
Node module-load hooks reject application modules outside the isolated fixture, and `NODE_PATH`
is cleared. No source alias or another checkout supplies the release's code.

## Available-host receipts

Both final builds use code revision `23676ce5`. Implementation batches are packaging `4d608ac2`,
isolation/suite consolidation `e4b6170b`, executable mode `4d830057`, optional JavaScript runtime
`69eb75c4`, and foreign-parent isolation `23676ce5`. Embedded build IDs are
`23676ce5.20260930T183306` (Windows) and `23676ce5.20260930T183310` (Linux).

| Host | Evidence |
| --- | --- |
| Windows x64, Node 22.22.2 | Detached fresh worktree; pinned immutable preparation/audit, UI build, main/child metafiles, real SEA injection, real zip installer/update and all eight extracted-runtime checks pass. |
| Ubuntu 22.04 under WSL, x64, Node 22.23.1 | Independent clone with its own dependencies; immutable preparation, reviewed native compilation, audit, UI build, native staging, SEA injection, real POSIX installer/update and all eight extracted-runtime checks pass. Prepared Git status is empty after the executable-mode correction. |
| WSL transport (`4d608ac2` tooling) | Windows source path contains spaces. Synchronization into the disposable Linux clone removes a planted retired source file, installs the native production closure, loads node-pty, and stamps success. The repeat run keeps native dependencies and reports the synchronized source version. Subsequent commits do not change the transport. |

Final SHA256 receipts (unsigned reference artifacts; signing and publishing were not invoked):

| Artifact | SHA256 |
| --- | --- |
| `aof-windows-x64.exe` | `0372242b1578517fa320bcd94ed642deff16ddd555b19f8f56c7ffdc51d616f1` |
| `node-pty-win32-x64` | `38e0c2d926a79971e9217af829ce1e68a7227fbab4493117bf804aab593b7cfd` |
| Linux x64 SEA | `7938534bbf91abcfbbef39ce5bc04e81a65b0b699939287bb2c43b242cf1a24e` |
| `node-pty-linux-x64` | `16c759523724e857261e5ed0a8964d90b9940bc5586d797f5a97409bdb4d8d89` |

Actual generation of the Windows `SHA256SUMS` produces the two expected lower-case, LF records.
Fixture archive roundtrips and checksum verification run through their registered runners.
Postject emits existing Windows signature and Linux section-name warnings; both resulting
executables pass the real runtime gate. These receipts prove these hosts, not macOS signing,
arm64 execution, an official hosted matrix run, or a broader Linux/glibc compatibility floor.

Logs and disposable build receipts are under `.tmp/workspace-migration/plan05/`. Future proof
uses the tracked runner/tooling above; it does not depend on those ignored helpers. Neither the
real installed development copy nor the existing WSL worker installation was modified. The
disposable Windows worktree and Linux clone were removed after preserving their receipts.

## Registered checks and remaining gates

Focused packaging/installer/asset checks: 111 passes. Ownership/composition/registration batch:
82 passes. Final installer/census regression batch: 78 passes. Consolidated core distribution,
exact-budget, registration, census and asset batch: 48 passes. These overlap and are not summed.
The census/evidence/package batch has 78 passes plus an initially detected registration spelling
issue; the final census batch passes after correction. The final foreign-parent/asset batch has
20 passes; the optional Notion package has five passes, and its integration/assembly/Yarn batch
has 29 passes. Unit tests have 997 passes and one inherited
`141/03` generated-render mismatch. No generated repository assets were refreshed.

Principal checks are registered in `test/bundle/core-workspace.test.mjs`,
`test/bundle/bundle-asset-manifest-complete.test.mjs`,
`test/bundle/release-sidecar-archive-roundtrip.test.mjs`,
`test/bundle/release-workflow-lint.test.mjs` and `test/testing/installer-place.test.mjs`.
Run them with `node scripts/test.mjs --only <suite-paths>`. Public Notion cases run with
`node --test packages/integration-notion/test/services.test.mjs`. Broader commands executed are
`node .yarn/releases/yarn-4.18.1.cjs test:unit` and `node scripts/test.mjs`.

The full root run completes all **11,533 registered cases**, with **11,504 passes and 29 failures**.
It started before the final corrections. Six failures came from the added distribution test file
exceeding the exact file budget; all six pass in the corrected 48-case batch after consolidation.
The remaining **23 failures exactly match the Plan 03 ledger**: 20 checks in inherited families and
three previously recorded citation checks. There are no additional unresolved failure titles.
The broad snapshot precedes the final optional-runtime/UI-isolation fixes, which have fresh focused
and native executable evidence above; this is not a full-suite-green claim.
All **134 CLI integration cases**, all **118 Rust tests** and the desktop shell cargo check pass.

The prior ledger and later-plan assignments are in [03-CORE](03-CORE.md); exact title reconciliation
is retained in `.tmp/workspace-migration/plan05/reconciled.json`. Plan 04's real desktop/application
relocation, Plan 06's inherited source-reader issues, Plan 07's generated/citation parity and
Plan 08's unexecuted platform matrix remain their respective gates. No architecture floor or
negative check was relaxed to make these results pass.
