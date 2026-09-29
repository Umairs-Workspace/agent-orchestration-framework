# Plan 01 ownership ledger

This is ordinary development, outside AOF lifecycle management. Baseline: e343d50.
The complete machine-readable census is [01-module-ledger.json](01-module-ledger.json).

## Ownership decisions and public seams

| Group | Owner and API | Application responsibilities |
| --- | --- | --- |
| Cache reads | Mesh: createCacheReader(projectionStore, globalMeshPaths, reportDegrade) | Core constructs the store and hands reader methods to work and board services. |
| Provenance | Contracts: toWireProvenance, cacheFreshness, isStale | Mesh resolves the configured freshness window through cache-policy. Unknown facts remain null. |
| Artifact propagation | Mesh: artifact-sync public module | Core still installs the standalone enqueue hook as a bundled asset. Queue paths and state formats remain unchanged. |
| Identity | Mesh: node-identity and workspace-identity | Core discovers/loads project configuration and machine-global paths; mesh owns derivation, healing and identity migration. |
| Board execution overlay | Mesh: createExecutionOverlay | Core supplies the projection opener and diagnostics; server consumes the composed board projection through shared command invocation. |
| Resync | Mesh: createResyncCommand and createResyncContribution | The route remains work/resync, at its original registry position. A delivered request never asserts a fresh copy. |
| Briefs and examples | Work: phase-brief, phase-brief-read, examples/map, createExampleAnswers | Brief compilation stays pure. Reads take explicit item paths; answer collection takes transcript/run readers and diagnostics. |
| Contract derivation and readiness | Work: createStoryContractDeriver and ready-wave | Graph access/impact are injected from knowledge; work has no dependency back on knowledge. |
| Folder migration | Work: createMigrateFolderCommand | Knowledge supplies source resolution/recovery; core supplies installed product version. Work owns scaffolding, gap/status policy and source-preserving writes. |
| ADR diagrams | Work: diagram command factories and existing diagrams/layout | These are work-item ADR artifacts, not the declared loop graph. Core injects configuration and the selected generator/rasterizer. |
| Diagram generator selection | Core retains diagrams/generators and generator-diagram-design | Discovers the installed third-party skill, constructs its instructions and translates its output. This is product integration/tool selection, not graph modeling. |
| Rasterization | Execution: createSvgRasterizer | Core injects diagnostics. Browser discovery, bounded subprocess execution and scratch-file cleanup are reusable execution mechanisms. |
| Delegation/orchestrator/headroom | Core retains work/delegation, work/orchestrator, work/headroom and their commands | These edit product configuration and transform/re-render installed assistant assets or select a managed binary. They do not schedule or execute work items. Retention is deliberate; the work namespace does not determine ownership. |
| Init/update, bundle and planning setup | Core retains work/init, work/update, work/bundle*, planning-init, planning-prd, project commands | Product installation, rendering, lock state and project configuration remain core. |
| Frozen set, graph faces and harness reference | Core | Compile/render shipped assistant assets and installed command references; not work-record/domain operations. |
| Board launch command | Server: createWorkUiCommand | Core supplies the configured board server, command errors and a lazy fleet-port getter, preserving initialization order. |
| Asset editor launch | Core retains commands/assets/ui | Product development setup resolves installed assets and spawns the Vite frontend; this is application launch assembly. |
| Effect stores and journal | Domain packages own their metadata and event-specific queries; effects owns generic journal mechanics | Core aggregates classifications and reactor registration, resolves installation paths and injects configured runtime services. |
| Integration routing | Work owns the provider-neutral descriptor and legacy milestone discovery; Notion owns board/parent routing and RoutingError | Core supplies diagnostics and injects the descriptor reader into the Notion resolver. |

## Temporary compatibility

Root forwards exist for old test/import paths; root configured adapters preserve the current assembled application.
Plan 02 centralizes construction and resolves existing application initialization cycles; Plan 06 removes adapters
and forwards after consumer/test migration. No domain implementation is deferred merely to move it into core.
Executable audit driver/probe wrappers remain until program path composition moves in Plans 02/05/06.
Bundled hooks remain standalone assets installed by core, with no package imports introduced into their copied bodies.

## Baseline and mesh batch

- Baseline real runner: 113 selected suites, 1,524 passing checks and three enrollment architecture failures.
  The failures were stale discovery (root-only enrollment scanning) and a regex-literal false positive.
  They were corrected to inspect package implementations while retaining the positive/negative detector controls.
- Baseline registry: all 117 command descriptors, including ordered IDs, schemas and CLI specifications, captured.
- Initial mesh selection: 234 passes and six failures (the three baseline failures and three moved-source guards).
- Corrected guard/config/identity/assignment selection: 57 passes, zero failures.
- Four new public-package cases cover store lifetime, local fallback, explicit provenance unknowns and resync outcomes.
- Pinned Yarn 4.18.1 immutable linking passes; existing peer warning unchanged. Supply-chain audit: zero warnings.
- Detailed local logs: .tmp/workspace-migration/plan01/.

Copied mesh installation: four public cases pass; all 117 ordered command descriptors unchanged.

Work batch: six public-package tests pass, including bounded briefs, supplied graph services, transcript filtering, readiness, source-preserving migration and shared diagram invocation. Root behavioral and architecture checks inspect package implementations and their configured ports.

## Completed source census

[01-module-ledger.json](01-module-ledger.json) inventories all 452 remaining source files: 78 deliberate core implementations, 193 configured adapters, 88 compatibility forwards, two executable child wrappers and 91 canonical assets (including the standalone hook). Each row records owner, public seam, production consumers, test-consumer count and disposition. The ledger also lists 69 dynamic-import sites and 58 subprocess/program-path sites, including the CLI child URL, audit driver/probe wrappers, installed Vite and mesh launcher ports. Package APIs own behavior; unresolved/computed import targets remain the explicit injected program or cited-control inputs.

The core implementation rows retain configuration/schema editing, assistant asset compilation/rendering, install/lock/tool selection, project/planning setup, installed generator integration, command/CLI composition and product path policy. Core effect registration and workspace integration eligibility are deliberate application policy. No domain implementation remains deferred. Plan 02 centralizes bindings, Plan 03 relocates core, Plan 05 resolves installed paths, Plan 06 removes compatibility/test paths, and Plan 07 relocates/synchronizes assets.

## Final service boundaries

Execution owns session model/effort policy, telemetry attribution, SVG rasterization and run-event journal queries. Mesh owns assignment park-event queries, effect frame vocabulary and mesh table metadata. Effects owns generic journal opening and classification queries; execution/work/Notion declare their own file stores. The SQLite runtime importer is a foundation primitive shared by both stores. Work owns the provider-neutral integration descriptor and foreign milestone-folder discovery; Notion owns board/parent resolution and one stable RoutingError class. Server owns the board launcher; its fleet default is supplied lazily by core. The asset editor Vite launcher stays core-owned.

85 single-public-module forwards were audited and production imports through them were replaced where present. Remaining aggregate facades and configured services have explicit application responsibilities, not hidden domain implementations. Public manifests use explicit subpaths; no new dependency/version/lock entry was needed. Canonical refine documentation now cites the work-owned contract deriver and its bundle hash is regenerated; installed/generated copies are reserved for the later asset plan.

## Verification and inherited debt

- All 17 newly added public-package cases pass in a fresh copied installation; the 117 ordered command descriptors remain unchanged.
- Through the composed application, 27 legacy APIs preserve 196 existing bindings, types and constant shapes. RoutingError and the shared freshness predicate have one identity. The node-identity API additionally exports the moved healing operation.
- The full 482-suite architecture selection completed with 2,081 passes and 26 failures. Corrected public-import/source-home assertions then pass; nine failures are reproduced on baseline e343d50.
- The retained nine are lane-slot source discovery, two installed-loop parity checks, audit/supervision source citations, installed asset line endings, bundle/installed-lock hash parity, token-bucket writer discovery and item-vocabulary discovery. These predate this plan and belong to Plans 06/07; the canonical citation update adds the corresponding expected installed-copy drift.
- The isolated baseline archive is linked to its own baseline workspaces and unchanged external dependencies. Its two UI digest failures are archive-without-Git artifacts and are not counted as product failures.
- The static worker closure changes 108 -> 117 solely through extracted implementation/metadata homes and removed forwards; session-driver isolation and its lifecycle denylist remain intact.
- The registered package test bridge passes. The combined 157-suite run passed 2,018 checks; its sole missing per-file platform allowance was corrected and the 13-check dependency suite passes. The 58-suite service selection passes all 757 checks. Immutable Yarn linking, audit, bundle inclusion and whitespace verification are recorded in IMPLEMENTATION.md. Local transcripts are under .tmp/workspace-migration/plan01/.
