# 01 · Diagramming is a package pair — Outcome

## Delivered

### `@aof/diagrams` and `@aof/diagrams-ui`
Diagramming lives in two workspace packages, the node half (layout, generator registry, `diagram:*` verbs, doctor lane) and the browser half (editor, pure state, SDK, fonts), each reached through one contribution or one dynamic import.

### One-way dependencies
`@aof/work` imports nothing of either package, which FF-17001 (`acd-diagrams-package-one-way`) enforces.

## Gaps

### Leaving the package out of a build
- **Status:** open
- **Discharge condition:** core assembles the diagrams contribution optionally, so a build without the package starts.
Core still imports `@aof/diagrams` statically. The capability's `absent` answer and the doctor's null listing are ready, but nothing exercises them in a real build.
