# 02 · A prototype draws its diagrams — Outcome

## Delivered

### Diagram plan and export take a prototype
On a prototype, `aof diagram plan` and `aof diagram export` take a diagram name in place of an ADR id. The brief is the prose under `### <name>` in `PROTOTYPE.md` `## Diagrams`, and the files land in the prototype's `diagrams/` named by that name. An unknown name is refused as `diagram-name-unknown`, `--slug` as `diagram-slug-not-applicable`, and a heading with no prose as `diagram-brief-missing`. The prototype paths live in `packages/work/src/diagrams/layout.mjs` beside the ADR paths (FF-13302).

### A prototype diagram can be redrawn
Exporting a name that is already drawn overwrites its files, with no dated copy; `diagrams/` holds only the current picture.

### `/aof:add-diagram` takes a prototype ref
`aof:add-diagram <prototype> "<what to draw>"` writes a new `### <name>` brief, draws it and pastes its link under the brief. `aof:add-diagram <prototype>` draws every brief with no link, and `aof:add-diagram <prototype> <name>` redraws that one. The ADR path is unchanged.

## Gaps

### The pasted diagram block on a prototype
- **Status:** open-by-decision
- **Discharge condition:** a doctor lane that reads `PROTOTYPE.md` `## Diagrams` and checks each pasted link resolves to a file under `diagrams/`.
Nothing checks the link pasted under a prototype's diagram brief: the doctor's diagram lane reads `ARCHITECTURE.md` only (168/ADR-006 Consequences).
