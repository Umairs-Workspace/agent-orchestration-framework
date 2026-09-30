# Plan 03 — Core package and installation layout

The installed product now lives in `packages/core`: package name `aof`, version `0.1.0`,
Node `>=20`, executable `aof`, implementation/application assembly under `src/`, and canonical
assistant assets under `assets/`. The repository is the private `@aof/repository` workspace and
depends on core. Release/version readers use core's manifest; feature packages retain their own
workspace metadata. Public core exports are only `application`, `cli` and `asset-base`.

Core declares its feature-package and prompt dependencies. Execution owns `node-pty`, server and
messaging own their websocket dependencies, and UI declares its public messaging form import.
Optional UI/desktop packages are absent from core's runtime closure. Root build/test tools and
the existing native build exceptions remain in place. Yarn's lock changes only workspace identity
and dependency edges; third-party resolutions and the pinned Yarn version are unchanged.

Source/copy location is resolved from core's declared manifest URL. Embedded CJS builds resolve
the installation beside the executable. The narrow `application/core-root.mjs` locator allows
audit programs to find their children without importing the optional UI/module resolver.
Asset resolution keeps the SEA sidecar contract (`bundle/`, `ui/`, `package.json`) and uses
`assets/` for source/plain-Node copies. UI tools resolve from the UI package rather than root
hoisting. Audit toolkit and subject roots remain distinct; the private AOF repository is recognized
explicitly for its existing own-tree checks.

`install-local` stages core's executable, complete manifest, source, assets and actual production
dependency closure. It also stages `bundle/` for SEA payload execution. Dependencies are copied
with workspace links dereferenced and package-local development dependencies excluded. Build-SEA,
manifest generation and WSL source deployment use the new canonical paths. Native SEA injection,
signing and cross-platform distribution verification remain Plans 05/08.

The root `bin/aof.mjs` is a temporary development forwarder. Its consumers are existing documented
`node bin/aof.mjs` usage, repository CLI fixtures and integration harnesses. Plan 06 removes it
after those consumers use the workspace executable or deliberate core entry. Configured compatibility
exports moved with core and remain private until Plan 06; no root implementation tree remains.

Canonical asset edits are source citations and the regenerated content manifest. Framework
`module:src/...` pointers remain package-relative. Checked-in `.aof`, `.claude` and `.codex` copies
were not refreshed. Their pre-existing and additional citation/hash drift is recorded for Plan 07.
No managed work-item state or persistent application data was changed.

## Verification in progress

- Pinned Yarn immutable install with builds disabled and supply-chain audit pass, with zero audit warnings.
- UI build passes after its form import uses the owning public messaging export.
- Registered copied-core proof stages a real distribution in a path containing spaces, executes
  from an unrelated project, rejects module loads outside its own payload and resolves public
  dependencies internally. All 117 command descriptors match the frozen inventory without UI/desktop.
- The focused application, copied-core, asset-base and configuration-error selection passes all
  34 checks. Application startup isolation and failure visibility remain covered.
- Source scanners follow relocated core and feature modules, retain nonempty floors and planted
  violations, and preserve existing ceilings except the one added pure location module and the
  registered copied-core suite. Driver/worker closures each gain that builtin-only location leaf.

Final broad/reconciled counts will be recorded here after the remaining checks finish. Logs and
comparison helpers are under `.tmp/workspace-migration/plan03/`.
