# @aof/mesh

Private workspace for mesh behavior. Its first extracted surface is
`@aof/mesh/effects`: `createMeshEffects(getServices)` contributes projection updates,
assignment settlement, parked-resume restoration, branch recording, and reference remapping.

Registration is inert. Core supplies the service provider for workspace enumeration,
projection storage/publication, assignment transitions, and worker-ask notification.
The handlers retain authority checks, park-edge deduplication, and borrowed-store
ownership. The package imports neither core nor runtime services.

Mesh command contributions and service implementations still live under `src/`;
their extraction follows this boundary. Run `yarn workspace @aof/mesh test`.
