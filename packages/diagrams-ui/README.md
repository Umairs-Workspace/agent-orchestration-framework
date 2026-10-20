# @aof/diagrams-ui

Private browser workspace owning the Excalidraw draft editor: the browser half of diagramming,
beside `@aof/diagrams` (the node half). The board app reaches it through ONE dynamic import, so
the SDK and its fonts stay out of the board bundle until an operator chooses Edit draft, and a
client built without this package carries none of it.

| Export | Ownership | Supplied collaborators |
|---|---|---|
| `./editor` | `ExcalidrawEditor`, the native draft editor and its review panel (React, the SDK) | The item ref, the SVG member, a close handler and an optional `onAskArchitect` that launches the architect session |
| `./editor-state` | The editor's pure state: scene file name, document fingerprint, the review invocation, proposal counts and ids, error copy, the poll rule | None — headless, no React, no DOM, no SDK |

The editor talks to `aof` only through `/api/diagram/scene` on the board's own origin, and never
publishes a diagram: a saved scene is a draft, and nothing is applied until a human accepts a
proposal. `react` and `react-dom` are peer dependencies the app supplies; `@excalidraw/excalidraw`
is this package's own, pinned, and the app's build resolves the SDK's fonts from here.

The app's Tailwind build names this package's sources (`@source` in `apps/ui/src/index.css`) so the
editor's utility classes are generated; the headless UI harness stubs `@aof/diagrams-ui/editor` by
default, as it stubs the terminal, because the canvas needs a real DOM.
