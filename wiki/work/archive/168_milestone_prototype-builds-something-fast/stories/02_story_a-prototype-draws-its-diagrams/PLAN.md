# 02 · A prototype draws its diagrams — build plan

## Mechanism

**Dispatch on the item's type first.** Both `plan` and `export` already resolve the item before
anything else, and `plan` already branches once for the `loop` subject. Add a second branch
right beside it: `item.type === "prototype"` → a prototype path that never reaches
`assertAdrId`, `readArchitecture`, `--slug` or `diagram-item-delivered`. The subject still
arrives in the input key `adr`; on this path it is a diagram name.

**The layout leaf gains the prototype half** (FF-13302's one home): `readPrototypeBrief(markdown,
name)` reads the prose under `### <name>` inside `## Diagrams` (null when the heading is absent,
empty string when it has no prose), `assertSlug` validates the name, and the stem is the name
itself, so `diagramPaths(itemDir, name, …)` answers the three files unchanged.
`renderDiagramBlock` is reused with the name as both title and alt text. Extend the single-home
control's sweep to the new reader; do not add a second control.

**Redraw is the default**: the prototype path does no "already drawn" check, and export writes
over what is there. Nothing writes a dated copy.

**The command** (`add-diagram.md`) gains a prototype section after the ADR one, keyed on the
type `aof work find <ref> --json` answers. It tells a name from a description by matching the
argument against the `### ` headings under `## Diagrams`, picks a ≤ 4-word kebab name for a new
brief, pastes or replaces the block directly under the brief, and logs with
`aof work prototype <ref> --log "diagram <name> drawn|redrawn"`. Leave the ADR section's text
alone; mirror the section into the codex `workflow.md`.

## Verification step

In an isolated project with a prototype holding `### data-flow`: `aof diagram plan <ref>
data-flow --json` answers `diagrams/data-flow.*` paths and the brief. Hand-write
`diagrams/data-flow.html`, run export, then change the html and export again: the folder still
holds exactly three files and the svg changed. Run the same plan against the milestone 168 ADR
form and see the delivered `ADR-NNN-<slug>` paths — a prototype path that leaked into the ADR
branch shows up there first.

## Out of scope

- Showing prototype diagrams on the board — `diagramFile` keeps its `ADR-NNN-<slug>` grammar
  (ADR-006 §5).
- The doctor's diagram lane — it reads ARCHITECTURE.md, which a prototype lacks, so it is silent.
