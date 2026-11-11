# 03 · The config editor has a Memory section that shows the node in the new shape and saves only the new shape — Outcome

## Delivered

### The Memory section
The config editor's project scope has a fifth section, `Memory`, that shows the memory node already rewritten to the new shape, lists each old key and its replacement in a notice ending `Saving writes the new shape.`, and keeps its `Saved Memory` message after the save's refresh.

### The editor never writes a legacy key
A saved Memory node that carries an old spelling is refused with `memory-config-legacy-write`, and a save that is accepted drops the superseded root `graph` through `replaceMemoryNode`.

## Gaps

### Visual fidelity of the Memory section
- **Status:** open
- **Discharge condition:** DESIGN Surface 1 names a `Route`, and `aof:verify 180 --url` against a served config editor returns a CONFORMS verdict from the designer (VERIFICATION F-01).
The section's states are asserted structurally by the mounted-App cases, but no render of it has been judged against DESIGN Surface 1's binding checklist.
