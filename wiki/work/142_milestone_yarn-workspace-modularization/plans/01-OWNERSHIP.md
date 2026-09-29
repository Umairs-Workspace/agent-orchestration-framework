# Plan 01 ownership ledger

This is ordinary development, outside AOF lifecycle management. Baseline: e343d50.
The machine-readable module ledger is recorded alongside this document at completion.

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
| Transport launch commands | Server: configured command factories | Core supplies configured board/setup servers and product defaults. |
| Effect stores and journal | Domain packages own their metadata and event-specific queries; effects owns generic journal mechanics | Core aggregates classifications and reactor registration, resolves installation paths and injects configured runtime services. |
| Notion routing | Notion owns routing/error policy; work owns legacy milestone discovery | Core supplies diagnostics and composes compatibility exports. |

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
