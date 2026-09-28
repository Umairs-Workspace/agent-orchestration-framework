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

Most mesh command contributions and service implementations still live under `src/`;
their extraction follows this boundary. Run `yarn workspace @aof/mesh test`.
