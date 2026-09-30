# Plan 03 — Core package and installation layout

The installed product now lives in `packages/core`: package name `aof`, version `0.1.0`,
Node `>=20`, executable `aof`, implementation/application assembly under `src/`, and canonical
assistant assets under `assets/`. The repository is the private `@aof/repository` workspace and
depends on core. Release/version readers use core's manifest; feature packages retain their own
workspace metadata. Public core exports are only `application`, `cli` and `asset-base`.

Core declares its feature-package and prompt dependencies. Execution owns `node-pty`, server and
messaging own their websocket dependencies, and UI declares its public messaging form import.
Staged UI files take precedence over an optional package visible in an ancestor directory.
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

## Verification

- Pinned Yarn immutable install with builds disabled passes (Yarn reports a peer-requirements warning).
  The supply-chain audit passes with zero warnings.
- UI build passes after its form import uses the owning public messaging export.
- Registered copied-core proof stages a real distribution in a path containing spaces, executes
  from an unrelated project, rejects module loads outside its own payload and resolves public
  dependencies internally. All 117 command descriptors match the frozen inventory without UI/desktop.
- The focused application, copied-core, asset-base and configuration-error selection passes all
  34 checks. Application startup isolation and failure visibility remain covered.
- Source scanners follow relocated core and feature modules, retain nonempty floors and planted
  violations, and preserve existing ceilings except the one added pure location module and the
  registered copied-core suite. Driver/worker closures each gain that builtin-only location leaf.
- The final copied-core suite passes its registered case, including source CLI help/version,
  copied session and heartbeat hooks, and both real spawned audit programs. The focused package
  ownership/production-closure suite passes all 13 cases; site build/deployment guards pass all 20.
- Historical citation and stable module-pointer checks pass all 11 cases. All 12 registration checks
  pass after the final fixture corrections. Five mesh source guards
  pass; the late guard selection has 12 passes and one inherited literal-export-reader failure.
- Lane reconciliation passes all 18 cases; worker commit fixtures pass all 29. Canonical prompt
  citation/progress cases have 42 passes and one inherited generated-render failure.
- The corrected example-path/loop-reader selection has 208 passes and one installed prose-path
  failure. The checked-in loop points at retired `src/bundle/agents/...`; its canonical asset has
  the new citation. This additional relocation drift is assigned to Plan 07, alongside the existing
  installed-asset failures, without weakening the file-existence assertion.
- The real-repository tuning census now lacks its tunable lane: archived provenance still names
  moved `src/...` files, and the emission resolver correctly refuses those absent files. This is
  new historical-citation drift rather than an inherited failure; Plan 07 owns reconciliation.
  The generic tune operations and their descriptor contracts remain covered independently.
- The historical wiki link ratchet also reports relocation drift: 2,176 links resolve against its
  pre-move floor of 2,317. Historical links into retired source locations are assigned to Plan 07;
  its floor and archive checks remain unchanged.
- Canonical asset comparison covers 91 files: 22 have only reviewed source citation changes, plus
  the regenerated manifest. Descriptor IDs, flags and package-relative `module:src/...` pointers
  remain unchanged.
- The standalone JavaScript SEA payload compiles with 699 inputs: 287 core modules and 315
  feature modules. It contains no retired root source input, and native PTY remains external.
  This verifies bundling, not native injection/signing or cross-platform artifacts.
- The final staged-UI/asset-base/source-guard/board selection passes all 45 cases, including a
  copied UI beside a conflicting ancestor UI package. Session/regression guards pass all 49;
  finding/resume cases pass all 72; dispatch cases pass all 86. The corrected work-fixture
  selection has 96 passes and one inherited readiness-rule source-reader failure.
- Pinned Yarn `test:unit` has 997 passes and one inherited render/manifest/lock failure.

The corrected wave suite passes all 49 cases. The initial broad run ended at an unresolved
fixture promise after 4,039 passes and 38 failures, before integration/native lanes. Its generic
fixture paths are corrected. A separate remainder run completes all 7,420 remaining registered
cases with 7,357 passes and 63 failures, then passes all 134 CLI integration cases, all 118 Rust
cases and the desktop shell cargo check. The remainder uses the original runner body, import
order and resolved module URLs under direct Node rather than the Yarn launcher. It retains
integration/native lanes and per-case global-home isolation.

Coverage of the 11,527 registered cases is explicit: 4,077 first-run cases + 49 complete wave
cases - 19 overlapping wave cases + 7,420 remainder cases. These are separate runs. Across their
101 observed failures, 78 now pass focused reruns; the reconciliation matches test identities,
normalizing only relocated path spellings in generated example names. Twenty remaining checks
belong to recorded inherited families, and three are new citation checks: installed prose paths,
tuning provenance and the historical wiki link floor. This is not a claim that the full suite is
green. The Windows Yarn temporary-node-shim refusal recorded in Plan 02 was not observed in the
direct-Node remainder context.

Commands run include pinned Yarn 4.18.1 immutable install with builds skipped, supply-chain audit,
unit/full tests and UI build; selected suites through the repository runner; real copied installation
and source CLI/hook/child-program probes; canonical asset comparison; and esbuild JavaScript SEA
compilation. The final runtime root change has fresh focused and compilation evidence; broad
runs began before the final corrections. Local logs, the complete coverage calculation and the
23-case remaining-failure ledger are under `.tmp/workspace-migration/plan03/`.

Implementation commits: `1e8976ee` (core move), `78be5372`, `6ef52f65`, `2a80686d`,
`f8fd4f88` (source guards/fixtures), and `4a341b73` (staged UI isolation).

## Remaining plan boundaries

Plan 04 relocates UI/desktop applications. Plans 05/08 complete native/platform distribution and
release verification; no real local installation or WSL deployment was changed here. Plan 06 removes
private configured compatibility adapters and the documented root executable forwarder. Plan 07
reviews the generated-copy diff and reconciles installed assets. Baseline failure evidence remains
in [Plan 02 notes](02-ASSEMBLY.md#verification); broad-run source corrections are reported separately
from inherited failures. No managed lifecycle commands or state changes were made for this plan.
