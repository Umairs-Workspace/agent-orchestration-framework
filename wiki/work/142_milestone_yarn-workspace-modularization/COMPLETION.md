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
| Work owns lifecycle, records, discovery, readiness, validation and acceptance | Lifecycle/read/discovery/readiness/validation, acceptance, audit, doctor and tuning services extracted, including counters and the tune command descriptor. Archive, reindex and schema-upgrade engines are extracted. Remaining promotion/mutation services and command implementations/contributions remain. Run persistence belongs to execution. |
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

No row with outstanding work is satisfied by an empty workspace, a forwarding shell, a passing
unrelated test, or moving an import cycle behind dynamic imports. The goal remains active until
the final source tree and matching verification prove the requested boundaries and installation modes.
