# Migration completion audit

This is an ordinary engineering checklist, outside AOF's workflow. It audits the full [SPEC](SPEC.md)
objective against the final tree at revision `2cd5d915` (2026-10-01). Evidence is current: commands, host,
counts and dispositions are in [plans/08-VERIFICATION.md](plans/08-VERIFICATION.md); per-plan evidence is
linked from [plans/README.md](plans/README.md). "Open" means not verified on an available host — it is never
inferred from source inspection.

**Verdict:** the migration is implemented and verified on this host (Windows x64). It is **not**
claimed complete across the full platform matrix: the real desktop-app run, the Linux/WSL native leg on this
revision, macOS/arm64 and the hosted CI release matrix remain open (below), and one work-record ratchet remains red
with a documented, accepted disposition (142 has no AOF record doc; the link floor, story 141 and the backlog story are resolved —
[09-CLEANUP](plans/09-CLEANUP.md)). Test ownership is **partial**: 73 root suites are package-owned in principle and not yet moved.

| Requirement | Status | Current evidence |
| --- | --- | --- |
| Pinned Yarn, one lockfile, immutable install, scripts disabled | Verified | Yarn 4.18.1 checked in; `install --immutable --mode=skip-build` and `supply-chain-audit` pass on a clean detached worktree. Lifecycle scripts stay off except the reviewed esbuild/node-pty/fsevents exceptions. |
| Private root; `packages/core` owns `aof` identity and CLI | Verified | Root `@aof/repository` is private with no `bin`; `packages/core` (`aof`) owns `bin/aof.mjs`, `src/`, `assets/` and the application assembly. `npm link` from `packages/core` restores the dev command. |
| Core owns configuration, rendering, assistant assets, templates, hooks | Verified | Canonical assets under `packages/core/assets/` (manifest regenerated, 115 entries); fixture rendering parity green; citations retargeted at final owners ([07-ASSETS](plans/07-ASSETS.md)). |
| Contracts and foundation have explicit APIs | Verified | `@aof/contracts`, `@aof/foundation` package suites pass; workspace-boundary scan enforces explicit exports. |
| Work owns lifecycle, records, discovery, readiness, validation, acceptance | Verified | `@aof/work` (105 registered + 97 native cases); doctor/validate/archive/upgrade/tune/promote/insert command bodies live in the package; tune provenance follows recorded renames. |
| Work graph separate from loop execution | Verified | `@aof/work-graph` (loader, record, document, 6 commands) and `@aof/work-loop` (engine, cycle, wave, dispatch) are separate; groundedness and loader share one declaration predicate. |
| Work loop owns pure decisions and orchestration | Verified | `@aof/work-loop` suites pass; wave/lane suites pass in isolation (aggregate-load discrepancy documented). |
| Execution owns sessions, runs, PTYs, worktree mechanics | Verified | `@aof/execution` suites; real SEA PTY round-trip passes in the distribution gate. |
| Mesh owns coordination, projections, package commands | Verified | `@aof/mesh` (17 command definitions, launcher, worker, transports) suites pass. Cross-machine behaviour on a second node is **not re-run** (see open items). |
| Messaging owns Discord/notifications; Knowledge owns memory/Graphify; Notion owns sync | Verified | Package suites pass; Notion is optional and isolated (own suite; CLI-only payload runs without it). |
| Effects kernel separate from domain handlers | Verified | `@aof/effects` kernel; domain reactors owned by mesh/execution/work; effect replay/ack suites pass. |
| Server owns transport adapters with injected services | Verified | `@aof/server` (board, setup UI, terminal WebSocket, static serving, graph MCP); served-UI integration tests and distribution UI check pass. |
| UI and desktop are separate apps with package scripts | Verified (build/test); **open** (live app) | `apps/ui` builds; `apps/desktop` has `@aof/desktop` scripts; 118 Rust tests, `cargo check` and a release build pass. A freshly built desktop app was not launched ([plans/04-APPS.md](plans/04-APPS.md)). |
| Feature-owned CLI definitions, shared namespaces, conflict detection | Verified | Contribution contract and registry; frozen 117-command inventory unchanged. |
| Shared invocation for CLI/UI/MCP; lightweight registration | Verified | Registration is inert; invocation suites pass across the board/fleet/terminal surfaces. |
| Base install contains all skill-required operations | Verified | Fixture project, unrelated cwd, no UI: init, insert, list, validate, next, run-start/status, status, loops groundedness, update --dry-run all dispatch ([07-ASSETS](plans/07-ASSETS.md)); distribution gate checks work-init assets from the extracted release. |
| One-way package graph, explicit exports, no private/legacy imports | Verified | Declared acyclic graph; boundary scan (declared deps, explicit exports, no feature→core, no computed imports without audit) passes with a re-homed, EOL-stable runtime audit; planted-violation cases still reject. |
| Remove temporary forwards and legacy-source imports | Verified | No root `src/`, no root forwarders; whole-tree guards pass ([06-BOUNDARIES](plans/06-BOUNDARIES.md)). |
| Source, copied payload, standalone/native installation | Verified (Windows x64); **open** (others) | Source CLI, copied payload and a real SEA release build/extract/update/PTY/UI pass on Windows x64 (`verify-distribution`, 8 checks). Linux x64 passed at `23676ce5` ([05-DISTRIBUTION](plans/05-DISTRIBUTION.md)); not re-run on `2cd5d915`. |
| Worktree prep, Windows/WSL, CI, release paths follow the final layout | Verified (Windows); **open** (WSL re-run, CI) | `prepare-worktree`, `install-local` (apps paths), `build-sea`, release scripts and the gitignore follow `apps/`; WSL transport synchronizes locked owners (Plan 05). Hosted CI not run. |
| Package tests plus cross-package, architecture and release verification | Verified with documented reds | Plan 09 final gate from a clean worktree ([09-CLEANUP](plans/09-CLEANUP.md#final-gate)): all 11,539 registered cases executed by the sharded run in 33.9 min at `e7addd1e`; only the accepted 142 finding red plus one intermittent real-PTY case (diagnosed in [09-REVIEW](plans/09-REVIEW.md#final-gate--e7addd1e-2026-10-02)); load flakes re-run green alone. 14 workspace suites green in isolation; integration and cargo lanes green; Windows distribution gate 8/8. |
| Behavior, persisted state and generated output remain compatible | Verified (checked-in parity: scoped) | No persisted format, command id, flag, default or route changed. Generated copies refreshed only within the operator's approvals (35 files + hashes; `wiki/work/loops.md`); `work update` reports 0 drift. |

## Open requirements

1. **Real desktop app**: launch, supervision/shutdown, terminal connection of a new build (operator-gated; app is running).
2. **Linux/WSL native leg** on this revision; **macOS, arm64, hosted CI matrix, signing, publishing** (unavailable here).
3. **142's record doc** (`work/this-tree-holds-what-is-live` cases 00 and 02): accepted, not resolved — 142's `SPEC.md` states it proceeds outside
   the AOF workflow ([09-CLEANUP](plans/09-CLEANUP.md#work-stream-dispositions-and-what-stays-open)). The wiki link floor (repaired), story 141
   (archived) and the backlog story contract (authored) are resolved.
4. **73 package- or core-owned suites still at the root** ([09-test-ledger.json](plans/09-test-ledger.json); Plan 09's ownership
   requirement is not complete until they move or the reduction is explicitly accepted). The other 402 assembled-application suites are
   measured integration or command-surface tests.

## What moved and the supported seams

Final layout: `packages/{core,contracts,foundation,work,work-graph,work-loop,execution,mesh,messaging,knowledge,
integration-notion,effects,server}` and `apps/{ui,desktop}`. Public seams are each package's explicit `exports`
(for core: `aof/application`, `aof/cli`, `aof/asset-base`, `aof/default-application`). Build/test/install: see the root
README ("Local setup", "Applications"), `packages/core/README.md` and `apps/desktop/README.md`.
