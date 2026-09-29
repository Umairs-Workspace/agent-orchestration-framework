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
| Work loop owns pure decisions and orchestration | Engine, cycle/wave/ask/stop orchestration, progress/diagnostics, argv, trigger resolution and local dispatch extracted with explicit application ports. Package contributions register loop, three phase drivers, trigger and dispatch. Final application composition and compatibility-adapter removal remain. |
| Execution owns local sessions, runs, PTYs and reusable worktree mechanisms | Run storage, transcript spend settlement, heartbeat queues, session attribution, terminal provider resolution, live-session registry, local driver, shared lazy PTY loader/spawner, screen observation/recognition, workspace trust, reusable Git worktree mechanisms and bounded child-process execution extracted. Final application composition and adapter removal remain. |
| Mesh owns coordination, projections and package commands | Effects, contribution declaration, worktree policy, assignment directives, spawn/outcome/resume protocols, cadence, relay admission/clients and terminal bridge/input/mirror extracted. Node storage, group registry, live-session persistence, launcher locks, fabric discovery and repository publication markers are package-owned, as are presence, global registry/query/publication, the SQLite projection store and assignment records. Scope locking, assignment/withdrawal, reclaim, recovery/resync, roles, supervised declarations and park/resume are extracted. Launcher/worker orchestration and most command implementations remain in root source. |
| Messaging owns Discord and notification behavior | Implemented in @aof/messaging: formatting/REST, credentials, reply index, notifier, gateway, bot, handlers and five CLI descriptors/contribution. Core supplies configured ports through compatibility adapters; final composition and adapter removal remain. |
| Knowledge owns memory/Graphify operations | Implemented in @aof/knowledge: Graphify integration, normalization/impact, memory seam/backends/indexing/retrieval, source recovery, import storage/materialization and seven command descriptors/contribution. Final composition and compatibility removal remain open; MCP transport remains for server extraction. |
| Notion owns integration behavior and CLI contribution | Implemented with injected core/work collaborators; replace transitional services as their owners move. |
| Effects kernel is separate from domain handlers/registration | Implemented; remaining transitional domain services and runtime cycles must be resolved. |
| Server owns transport adapters with injected application services | @aof/server owns board routes, setup HTTP, board launching, terminal WebSocket, static serving and graph MCP, with explicit application ports. Mesh fleet/control transport remains mixed with coordination policy; final assembly and compatibility removal remain open. |
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
The audit driver and suite probe implementations are work-owned as well, with child-only public
entry points and compatibility launchers under root src/. Final program-path composition and launcher
removal remain open; their complete import closures are checked for parent isolation and spawn safety.
Acceptor source discovery now scans the audited project's src/ and declared workspace src/ roots,
covering moved implementations while excluding installed dependencies and generated directory trees.
Command-level tests prove a moved consumer remains visible and dependency/fixture copies cannot replace
it. The existing .mjs language scope is retained. Final source-census checks after the apps/core moves
and legacy counter metric citations still need review with the asset paths.
Work also owns run start/complete/retry/status commands, with execution persistence and application
transitions supplied by core. Final removal of those composition adapters remains outstanding.
Item-status, regression-gate and their shared regression record are also work-owned. Configured
runtime services still enter through transitional core composition. All 37 extracted work/testing
commands now register through the work package's contribution, preserving their descriptor contents
and order. Final application composition and compatibility-adapter removal remain outstanding.
Continue/refine/verify routing and resume/answer implementations are now work-owned too, including
the deferred registry invocation supplied by core. Work-loop owns trigger compilation, signal and
level resolution, its command and CLI contribution. Core still supplies assets, cadence grammar and
deferred registry access. Work-loop also owns local dispatch lane admission, concurrency, inspection,
merge/cleanup policy and its command contribution; core still supplies configured worktrees, locks,
work discovery and effect delivery. Other domain boundaries and final application composition remain
outstanding.
Generated-output parity is still incomplete: four previously pending loop copies, four additional
watcher/rubric copies and three pay-debt renders need citation-only refreshes and matching lock hashes.

No row with outstanding work is satisfied by an empty workspace, a forwarding shell, a passing
unrelated test, or moving an import cycle behind dynamic imports. The goal remains active until
the final source tree and matching verification prove the requested boundaries and installation modes.
