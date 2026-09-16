# 100 · The Generated Marker Names A Command With No Ref — Outcome

## Delivered

### Invokable regeneration marker on every generated EXECUTION.md
`REGENERATE_COMMAND` in [src/loop-record-render.mjs](src/loop-record-render.mjs#L38) is `aof work loop-record <ref> --write`, so the marker line stamped into every rendered `EXECUTION.md` names the route the verb actually accepts, and 78/01's byte assertions pin that exact spelling.

## Gaps

### The marker's ref is a substitution placeholder, not the item's own ref
- **Status:** open
- **Discharge condition:** chore `117` renders the item's own ref into the marker, so the stamped line runs as-copied with no substitution.
The marker carries a literal ref token an operator replaces by hand; nothing in the renderer substitutes the ref of the item the document belongs to.
