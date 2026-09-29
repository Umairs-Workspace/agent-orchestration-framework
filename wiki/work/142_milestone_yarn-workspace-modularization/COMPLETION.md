# Migration completion audit

This is an ordinary engineering checklist, outside AOF's workflow. Completion means the full
SPEC.md objective, not completion of one extraction. Evidence must be refreshed against the
final tree. Historical passing checks alone do not prove the final layout works.

| Requirement | Current evidence and remaining work |
| --- | --- |
| Pinned Yarn, one authoritative lockfile, immutable installation and disabled scripts | Implemented at the repository root; final workspace installation/audit still required after remaining manifest changes. |
| Private repository root; `packages/core` owns installed `aof` identity and CLI | Outstanding. Root still owns `bin/` and composition code in `src/`. |
| Core owns configuration, rendering, assistant assets, templates and hooks | Ownership retained; physical move and final asset-path/manifest verification outstanding. |
| Contracts and foundation have explicit APIs | Implemented kernels; remaining shared primitives must be assigned without becoming a second monolith. |
| Work owns lifecycle, records, discovery, readiness, validation and acceptance | Lifecycle/read/discovery/readiness/validation, acceptance, audit, doctor and tuning services extracted, including counters and the tune command descriptor. Archive, reindex, schema upgrade, scaffolding and backlog/gap/finding promotion are extracted, with promotion and four insertion command implementations. Row/artifact contracts, worker content reads, cache-first readers, resolvers and five read commands are extracted, along with observation, debt and their commands. Test selection, changed sets, the declared toolchain and the test command are extracted. Doctor, validate, archive and upgrade command faces are extracted with explicit runtime/configuration ports. Remaining work services and command implementations/contributions remain. Run persistence belongs to execution. |
| Work graph is separate from executing the loop | Work-graph mechanisms and six command implementations/contribution extracted; final removal of compatibility paths and full-distribution checks remain. |
| Work loop owns pure decisions and orchestration | Engine, cycle/wave/ask/stop orchestration, progress/diagnostics, argv and all four command descriptors/contribution extracted with explicit application ports. Final application composition and compatibility-adapter removal remain. |
| Execution owns local sessions, runs, PTYs and reusable worktree mechanisms | Run storage, transcript spend settlement, heartbeat queues, session attribution, terminal provider resolution, live-session registry, local driver, shared lazy PTY loader/spawner, screen observation/recognition, workspace trust, reusable Git worktree mechanisms and bounded child-process execution extracted. Final application composition and adapter removal remain. |
| Mesh owns coordination, projections and package commands | Effects, contribution declaration and worktree lane/naming/preparation/retention policy extracted; most coordination implementations remain in root source. |
| Messaging owns Discord and notification behavior | Contribution seam exists; package extraction outstanding. |
| Knowledge owns memory/Graphify operations | Outstanding. |
| Notion owns integration behavior and CLI contribution | Implemented with injected core/work collaborators; replace transitional services as their owners move. |
| Effects kernel is separate from domain handlers/registration | Implemented; remaining transitional domain services and runtime cycles must be resolved. |
| Server owns transport adapters with injected application services | Outstanding. |
| UI and desktop are separate applications with package scripts | UI workspace exists at `ui/`; final `apps/` layout, desktop wrapper, asset paths and Cargo checks outstanding. |
| Feature-owned CLI definitions; shared namespaces; deterministic conflict detection | Contracts/registry seams implemented; remaining feature commands must move with their domains. |
| Shared invocation for CLI/UI/MCP; lightweight registration/help | Existing behavior preserved by checks to date; verify final assembly and optional integration isolation. |
| Base install contains all skill-required operations | Prior copied payloads retain 117 commands; verify final skills/flags/assets inventory and representative workflows. |
| One-way package graph with explicit dependencies and public APIs | Current extracted kernels guarded; final whole-tree graph, undeclared imports, private paths and computed imports audit outstanding. |
| Remove temporary compatibility forwards and legacy-source imports | Outstanding, after consumers and architecture scans move. |
| Source, copied payload and standalone/native installation work | JS bundles and copied payloads pass on Windows so far; final installer, standalone, native sidecar and platform checks outstanding. |
| Worktree preparation, Windows/WSL, CI and release paths follow final layout | Yarn cutover changes implemented; final path migration and platform verification outstanding. |
| Package tests plus cross-package, architecture and release verification | Incremental checks recorded in IMPLEMENTATION.md; final full suite and build/release gates outstanding. |
| Behavior, persisted state and generated output remain compatible | Differential checks per extraction; final asset/output/persistence comparisons outstanding. Three shipped citation updates render correctly in a temporary installation; the user explicitly approved refreshing only the corresponding checked-in copies and lock hashes. |

Grading is also extracted: work owns the command and execution owns the asynchronous rubric process.
Core still composes its resolver/history/provenance services; final adapter removal remains open.
Work also owns feedback records, the pure contract-integrity ratchet and feedback/counters/ratchet
commands. Application transition and runtime service composition remain in core pending final layout.
Audit and acceptor command implementations are also extracted with configured core services injected.
Acceptor's sourceUnits(root) still scans only the audited project's src/ directory. Workspace-aware
source discovery, with coverage over package implementations and exclusion of installed dependencies,
is a required remaining task. Legacy counter metric citations need final review with the asset paths.

No row with outstanding work is satisfied by an empty workspace, a forwarding shell, a passing
unrelated test, or moving an import cycle behind dynamic imports. The goal remains active until
the final source tree and matching verification prove the requested boundaries and installation modes.
