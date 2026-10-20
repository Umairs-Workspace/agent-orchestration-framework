# @aof/diagrams

Private Node.js workspace owning architecture diagramming over the work stream: the diagram
layout (folder, stem, brief and link block), the generator registry and its one adapter, the
`diagram:*` commands and the doctor's diagrams lane.

| Export | Ownership | Supplied collaborators |
|---|---|---|
| `./contribution` | The `{ name, commands }` contribution core registers, and the owned command ids | The four constructed commands |
| `./layout` | The one home of a diagram's place and spelling (milestone 133 / ADR-003) | None — pure over text and paths |
| `./generators` | The generator registry, keyed by each adapter's own id | None |
| `./commands/plan` | `aof diagram plan` — the ADR and loop plans | Config resolver, generator lookup, item resolution, checkout guard, loop wave planner and bounds |
| `./commands/export` | `aof diagram export` — SVG through the generator, PNG through a found browser | Config resolver, generator lookup, item resolution, checkout guard, browser finder and rasterizer |
| `./commands/file` | `aof diagram file` — one committed diagram file by bytes | Item resolution |
| `./commands/scene` | `aof diagram scene` — the native Excalidraw draft store and its review loop | Item resolution and checkout guard |
| `./doctor-lane` | The diagrams doctor lane (a pure check group) and the item listing probe | Config resolver; the directory reader is injected |

Dependencies run one way: this package depends on `@aof/contracts` and `@aof/work`, and
`@aof/work` depends on nothing here. The work doctor reaches the lane through its injected
`diagramsGroup` and `diagramListing` seams; core composes the two. Factories capture their
collaborators per instance and never import assembled core.

The browser half of diagramming (the Excalidraw editor in `apps/ui`) is a separate concern and a
separate package in a later step; this package carries no browser code.
