# 09 · Project libraries — Outcome

## Delivered

### Libraries used as they are, from two roots
Every `.excalidrawlib` in the global home's `diagrams/libraries/` (shared sets) and in the project's `.aof/diagrams/libraries/` (its own) loads into the editor's Library panel. A project file shadows a global one of the same name, and each root has its own 8 MB cap. A real set (AWS Architecture Icons, 249 items) loads.

### Insertions keep their provenance
An item a person drags in reads as `%% aof:lib <id> <library>/"<item>"`. The architect places an item by name, and an edge proposed to a hand-placed item binds to an anchor that compile adds in the item's own group.

## Gaps

### Finding an item in a large library
- **Status:** open
- **Discharge condition:** the editor filters the Library panel by item or library name.
Excalidraw 0.18's panel has no search, so an item in a large set is found only by scrolling (VERIFICATION F-170-12, deferred by the operator).
