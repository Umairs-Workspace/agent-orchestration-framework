# Plan 06 — Test ownership and boundary evidence

Implementation and verification complete, starting from `55bb9c41`; inherited failures and two
aggregate/isolated discrepancies are recorded below. These are ordinary engineering
batches; no managed work state or generated assistant assets are changed.

## Public-forward removal

The removal inventory in [06-removal-map.json](06-removal-map.json) records 312
candidate modules: 85 single-destination public forwards, one mixed forward, 224 configured
entries, one relative alias and one unused declaration forward, with their exports,
static consumers, package test programs and the baseline case-name multiset hash.
The first batch removes 85 forwards with a single public package destination. Imports
now use those public APIs; structural readers inspect the owning implementations.
The subsequent batch removes the mixed forward, all configured entries and the alias.
The original inventory incorrectly skipped the real `commands/assets/` source directory;
the correction adds its nine configured entries and the relative mesh-log alias. A final
declaration-aware census also found and removed the unused `notify/form.d.mts` forward;
the original JavaScript-only inventory had omitted it.

All 11,533 aggregate case names and multiplicities match the baseline. The coupled
architecture, application and command checks execute 703 cases: 701 pass, with only the
previously recorded FF-5910 audit-export and FF-5810 defining-line failures remaining.
The four new package-native citation-history checks pass. The supply-chain audit passes
with zero warnings; no third-party dependencies or versions change.

Source-directory ceilings fall with the removals, with zero added allowance. Closure,
purity and registration guards retain their nonempty assertions and planted violations.
Synthetic grammar and closure fixtures remain synthetic rather than being mistaken for
production imports. The citation sweep now covers every package source root and retains
its shrink-only unresolved ceiling of 55.

Git records a forwarding-module deletion rather than a rename into an implementation
that already exists. A shared history reader derives that relationship from the deleted
committed source and current explicit public exports. Configured destinations derive
from actual imported constructor calls. These module links are separate from Git rename
records and are reported as `via: "module"`; a missing implementation still fails.
Neither the reader nor the pure resolver executes inspected project code, and no manual
redirect table or edits to delivered work records are used.

Local detailed receipts are under `.tmp/workspace-migration/plan06/`: `before.json`,
`forward-case-parity.log`, `forward-final.log`, `citations.log` and `forward-budgets.log`.
The UI and desktop remain in their current locations pending Plan 04.

## Scoped application interfaces

The application exposes configured operations in domain groups, with registered command
definitions reached through `getCommand(id)`. Command-specific helper groups omit the
registered definitions, avoiding a second command registry. Separate public foundation,
workspace, session-driver and session-hook entries retain the lightweight startup layers.
No feature receives these application groups: construction continues to supply named ports.
All 1,464 exports of the remaining 215 configured entries were compared against these APIs;
service instances retain identity, while the four registry methods retain the existing
application lifetime proxies. All eight application startup, environment and cleanup checks
pass. The subsequent batch migrates consumers and removes the old named export catalog.

## Final owners and executable test registration

Eighteen domain array suites move into six package owners: knowledge (35 cases), execution
(30), mesh (17), work (104), work-graph (59) and integration-notion (9). Their 254 original
cases retain names, IDs and per-case global-home isolation. The six explicit package indexes
are assembled exactly once by the root runner, checked by object identity. Architecture,
integration, release and shared fixture suites stay at repository scope.

Each of the thirteen backend packages has an independent runner. It executes its owned
arrays through the shared harness and its native tests in an isolated child. All thirteen
pass: 254 array cases and 246 native cases in 64 files. An array-only file named `.test.mjs`
is refused by the native inventory. The aggregate retains every one of the original 11,533
case names and multiplicities and adds three boundary/harness checks (11,536 total).
A selected-run sentinel executes a passing case and a planted failure in separate processes;
the failure must print its case name, report one executed case and exit nonzero.

## Source and dependency boundaries

The locked owner manifests determine fifteen actual source surfaces, including current UI,
core CLI and repository tooling: 766 files, including 38 owned `.d.mts` declarations.
Static imports, re-exports, type imports, literal dynamic imports,
`require`/`require.resolve`, aliased `createRequire`, computed selection and child invocations
are inspected through TypeScript's parser. Declarations and UI aliases remain part of the
census. The UI `@/` alias must match its actual owner and `tsconfig.json` mapping.

The scan enforces declared dependencies, existing explicit public exports, package-private
boundaries, no feature/app import into assembled core, no legacy source import, and no cycles
across dependencies, optional dependencies, development dependencies or peers. Its 106
reviewed runtime expressions carry a per-file reason and hashes of both the expression and
the complete comment-free source: changing a selector invalidates review even if the call
text stays the same. Positive fixtures and planted undeclared/private/core-back/cyclic,
computed, stale-review and static-development-only dependencies exercise the same detector.
The final Windows and Linux censuses both pass with zero findings. Private declaration-import
violations and a public declaration-import control use this same discovery/parser path.

Source guards follow public factories and their actual injected collaborators. Shrinking
directories lower their exact ceilings with no growth allowance. Historical module citations
follow the deleted committed forward source and real constructor/public-export destinations;
actual defining symbols are still checked without executing the inspected source. Synthetic
grammar fixtures, immutable delivered records and old installed path spellings remain distinct
from current implementation paths.

## Deliberate composition and external compatibility

All 312 temporary compatibility entries and the root `bin/aof.mjs` launcher are removed.
Core keeps its 224 deliberate DI bindings, the command registry and scoped public application
entries. Source CLI callers now use the owned core bin. Root build tools use explicit public
core/feature entries; the old flat export catalog is gone.

Two core audit child entry paths stay intentionally stable because installed payloads execute
them: `src/work/audit-probe.mjs` and `src/work/audit-drive.mjs`. Work owns their implementations.
Installed framework retry ceilings also retain `module:src/run-store.mjs#shouldRetry`. Core
derives its current target from the real DI constructor/public export, admitting framework
records only; missing symbols, traversal and project-authored legacy references remain errors.
Execution exports the unchanged pure retry predicates and returns those same function objects
from its factory. No copied retry policy or manual redirect table is introduced.

The assets UI loads the public `@aof/ui/vite-cli` helper lazily for its development server.
That helper resolves Vite from the UI owner's dependency tree. Core declares UI as a development
dependency; the boundary admits only an explicitly reviewed lazy public development import.
SEA keeps this helper outside its runtime bundle. The built installed UI and the CLI's ordinary
startup need no development-server dependency. The UI build, immutable install and required
supply-chain audit pass; third-party versions and lifecycle policy remain unchanged.

## Native verification and aggregate reconciliation

Windows x64 native build/staging and all eight isolated distribution checks pass after the final
JavaScript removals: installer layout/update, source-help parity, both-runtime work-init assets, isolated
module loading, SEA census, bundled audit children, built UI and real PTY input/output.
Linux x64 passes the same eight checks from a clean disposable Ubuntu 22.04 clone at
`84aabf7d`, using Node 22.23.1, immutable pinned Yarn, the reviewed native rebuild and a
fresh UI build. Its source boundary census and supply-chain audit pass, and the clone has
no tracked changes. The disposable clone was removed after its receipts were saved.
Windows uses Node 22.22.2. Later repairs change test/tooling guards, and remove the unused
declaration forward; executable production source remains unchanged. The final UI type build
and copied-install checks pass after that declaration removal. The final Linux boundary
census over the current checkout also covers all 766 files without findings.

The unit lane executes 998 cases: 997 pass and the inherited `141/03` generated-render
comparison fails. The aggregate run began before the final source-guard repairs, so its
original failures are reconciled by case title against subsequent focused execution receipts.
A delayed dispatch child still importing a removed wrapper stopped the initial run after
5,037 completed cases. After its repair, a temporary selection suite checks those result names
against the exact registry prefix and runs all 6,499 remaining cases through the canonical
repository harness. Both dispatch concurrency cases also pass in the focused child-consumer
rerun. Fresh persistence readers construct and close a new application, avoiding reuse of an
in-memory configured store; the focused child/terminal/store suites execute 106 passing cases.
The watcher/stop migration repairs execute 64 passing cases, and the synthetic dynamic-reference
fixture now verifies that its literal actually resolves to its supplied module.

The separate CLI integration lane passes all 134 cases. Desktop `cargo test` passes 118 tests
and the shell `cargo check` passes. The aggregate continuation is complete: its 6,499 cases
and the original 5,037 results match all 11,536 registered names in exact order, with no omitted
or repeated case. The original runs report 11,448 passes and 88 failures. Focused receipts
reconcile 71 of those failures (69 repaired migration checks and the two discrepancies below),
leaving 17 failures from the recorded Plan 05 baseline and no unexplained migration failure.
Six of the baseline's original 23 failures now pass. This is not a fully green aggregate run.
Local receipts: `full-test.log`, `remainder-test.log`, `completion-proof.json`,
`fresh-child-consumers.log`, `stop-authorities-recheck.log`, `synthetic-seam-recheck.log`,
`cli-integration.log`, `desktop-tests.log`, `desktop-shell-check.log` and `reconciled.json`.
Final guard receipts include `late-guard-final.log` (163 passing cases),
`feature-surface-final.log` (39 passing cases), `final-controls-recheck.log`,
`final-boundaries.json`, `linux-final-boundaries.json` and `ui-types-final.log`.
The last three guard suites execute 139 cases; 138 pass in that receipt, and the corrected
archive-budget case passes in `final-archive-recheck.log` without repeating the other 138.
Focused counts overlap and are not added to the aggregate total.

The unchanged `129/04 task04` three-row wave-heartbeat case fails in the aggregate run
(`halted` versus `done`) and passes twice in independent isolated reruns. This is an observed
full-run/isolated discrepancy, not a proven baseline failure or a diagnosed cause. Its assertions
and timing allowances are unchanged. Receipts: `wave-heartbeat-recheck.log` and
`wave-heartbeat-repeat.log`.

The unchanged `72/00 task00` repository toolchain-declaration case sees Yarn's temporary
Windows `node.CMD` shim on PATH during the aggregate, and correctly refuses it under the
strict executable policy. The same case passes outside that shim PATH in
`toolchain-environment-recheck.log`. No toolchain configuration or shim-refusal assertion is
weakened. This environment-dependent discrepancy is separate from the inherited baseline.

The 17 inherited failures concern generated asset/render/lock agreement (FF-5312, FF-5313,
FF-6302/7, FF-12405 legs 8/9, 141/03, 133/05 and 140/00), historical defining-line/evidence
and prose authorities (FF-5810, FF-6208, loops-census/04 and anchor-taxonomy/03), the existing
124/00 wave/census rule check, and four real-stream/archive/link ratchets. Their exact titles
and focused reconciliation receipts are retained in `reconciled.json`.

Plan 04's UI/desktop relocation, Plan 07's documentation refresh and Plan 08's broader native
matrix/signing are still separate work. No real workflow state or generated assistant assets
are refreshed to quiet inherited verification failures.
