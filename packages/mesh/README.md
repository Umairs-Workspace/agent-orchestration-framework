# @aof/mesh

Private workspace for mesh behavior. Its first extracted surface is
`@aof/mesh/effects`: `createMeshEffects(getServices)` contributes projection updates,
assignment settlement, parked-resume restoration, branch recording, and reference remapping.

Registration is inert. Core supplies the service provider for workspace enumeration,
projection storage/publication, assignment transitions, and worker-ask notification.
The handlers retain authority checks, park-edge deduplication, and borrowed-store
ownership.

`@aof/mesh/worktrees` exports `createMeshWorktrees({ reportDegrade, loadWorkspace, toolchain })`.
It owns assignment/session/dispatch paths, branch naming, reuse and retention, scoped staging,
commit identity and preparation policy. The toolchain is supplied lazily by application assembly.
Reusable Git operations come from the public `@aof/execution/worktrees` API. Construction performs
no I/O; neither implementation imports core or the assembled application.

The package also owns assignment directives, session-spawn frames/outcomes, terminal-resume
refusals, sync/presence cadence and the relay/terminal streaming implementations:

| API | Composition |
| --- | --- |
| `assignment-directive` | Direct exports; uses the public work-loop scope decision. |
| `session-spawn-directive`, `session-spawn-outcome`, `terminal-resume-refusal` | Direct protocol and bounded outcome-registry APIs. |
| `sync-cadence`, `presence-loop` | Direct cadence APIs; presence timers start only through an explicit call. |
| `relay` / `createMeshRelay` | Core supplies registry admission/verification, node publication and degradation reporting. |
| `relay-client` / `createMeshRelayClient` | Core supplies degradation reporting. |
| `terminal-relay-bridge` / `createTerminalRelayBridge` | Core supplies degradation reporting. |
| `terminal-input` / `createTerminalInput` | Supplied bridge kinds and degradation reporting; the created router receives stream dispatch. |
| `terminal-mirror` / `createTerminalMirroring` | Supplied relay limits, bridge framing/URL, reconnect backoff and degradation reporting. |

Wire kinds and capacity constants are directly exported; reading them does not construct a
configured network service. Factories start no network or timer. The relay retains fresh credential
checks on every group upgrade, payload-neutral forwarding and explicit shutdown. Terminal tails and
spawn outcomes remain bounded, ephemeral state. `ws` is the declared network dependency.

Mesh also owns node-record storage, the single-writer group registry, live-session persistence,
launcher lock ownership, fabric discovery and repository publication markers:

| API | Composition |
| --- | --- |
| `store` / `createMeshStore` | Global mesh-home resolver; explicit workspace roots remain supported. |
| `registry` / `createMeshRegistry` | Configured store's `meshDir`; owns admission, invite consumption and credential verification. |
| `session` / `createMeshSessions` | Store's `meshDir`, execution's shared `isStale`, and degradation reporting. |
| `launcher-lock` / `createMeshLauncherLock` | Global mesh-home resolver and degradation reporting. |
| `fabric`, `repo-marker` | Direct APIs with existing injected process/network seams. |

Storage uses `@aof/foundation/fs` for atomic writes. Factories perform no I/O at construction;
callers explicitly start persistence, discovery or lock acquisition. Run-path compatibility exports
stay in core and refer to execution's implementation; mesh defines no second run-path builder.

Mesh owns the shared SQLite projection store and assignment-record schema as well as presence,
descriptor publication, work publication and the fleet query:

| API | Composition |
| --- | --- |
| `projection-store` / `createGlobalWorkProjectionStore` | SQLite loading, global paths, disk work reads, identity, diagnostics, table classification and provenance mapping. Work row/artifact contracts come from `@aof/work`. |
| `assignment-record` | Direct assignment lifecycle vocabulary, SQL writers/readers and scope helpers. |
| `presence` / `createMeshPresence` | Configured mesh storage, execution runs, loop stop requests, sessions and projection access; loop declarations use work-loop's public engine. |
| `global-node-registry` / `createGlobalNodeRegistry` | Node/presence storage, identity, clone-URL resolution and diagnostics; fabric discovery is local to mesh. |
| `publisher` / `createGlobalWorkPublisher` | Configured store and registry services, content reads, identity and diagnostics. |
| `global-query` / `createGlobalMeshQuery` | Configured global paths, projection and registry reads, stable refusal code and cache freshness policy. |

The database schema is unchanged. Projection refreshes preserve assignment facts, absent SQLite
retains its coded refusal, and query callers can supply a borrowed store without transferring its
ownership. These services import no assembled core application and do no work at construction.

Mesh also owns scope locking, assignment/withdrawal, dual-staleness reclaim, recovery push,
resync, role resolution, supervised declarations and parked worker resume:

| API | Composition |
| --- | --- |
| `item-lock` / `createItemLocks` | Projection access, identity and propagation policy; assignment scope and holder rules stay local to mesh. |
| `assignment` / `createMeshAssignments` | Cache-first work resolution, lock inspection, configured storage and assignment transition services. |
| `assignment-reclaim` / `createAssignmentReclaim` | Shared presence/run clocks, heartbeat consumption, cache-first reads, transitions, concurrency policy and diagnostics. |
| `recovery-push` / `createRecoveryPush`, `resync` / `createMeshResync` | Deferred projection loading; recovery also receives the shared branch-name policy. |
| `role` | Direct role and fabric-target resolution exports. |
| `declarations` / `createSupervisedDeclarations` | Workspace/run/stop-request reads and a deferred command-registry loader; argv and decisions use work-loop's public APIs. |
| `park-resume` / `createMeshParkResumeServices` | Run/assignment transitions, transcript reads and deferred presence/work/notification loaders. |

Factories remain inert. Recovery retries disconnected workers; resync reports the disconnected
owner immediately. Those policies, assignment authority, scope locks and question bounds are
unchanged. Shared deadline constants come from `@aof/contracts/loop-bounds`.

The command family lives under `@aof/mesh/commands/*`, including identity/status, heartbeat,
enrollment, relay, assignment, recovery, terminal resume, repository publication, logs, serve/UI,
desktop placement/launch/preflight and the existing session-hook entry. Factories receive configured
services and preserve each command's validation, route, options, JSON and presentation contracts.
`@aof/mesh/commands` exports `createMeshContribution`, which assembles the seventeen registered
definitions in their established order. The session hook remains its existing separate CLI entry.
`commands/face-shared` and `commands/gate` export their stateless contracts directly.

Command registration performs no I/O. The identity command requests supervised declarations only
behind its existing flag, through the supplied deferred loader. Desktop preflight retains its
injected process/read seams and does not acquire a new package-manager or shell dependency.

Launcher orchestration and worker execution still live under `src/`.
Root adapters currently compose the extracted services; final package/application assembly will
remove them. The presence cadence helper has no production callers and remains available as a
public API, preserving its existing contract. Run `yarn workspace @aof/mesh test`.
