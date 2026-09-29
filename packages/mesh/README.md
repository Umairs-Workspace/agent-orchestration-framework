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

Projections, coordination, launcher orchestration and most command implementations still live under `src/`.
Root adapters currently compose the extracted services; final package/application assembly will
remove them. The presence cadence helper has no production callers and remains available as a
public API, preserving its existing contract. Run `yarn workspace @aof/mesh test`.
