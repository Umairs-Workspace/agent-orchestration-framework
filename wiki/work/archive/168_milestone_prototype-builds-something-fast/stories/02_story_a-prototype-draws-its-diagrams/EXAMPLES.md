# 168/02 · A prototype draws its diagrams — example map

## R1 · On a prototype, a diagram's subject is its name, and its brief is the prose under `### <name>`
- E1 · Prototype 169 has `### data-flow` under `## Diagrams`: `aof diagram plan 169 data-flow --json` answers paths `diagrams/data-flow.html|svg|png` and the brief is that prose [proposed]
- E2 · `aof diagram plan 169 screens` with no `### screens` heading: refused as `diagram-name-unknown`, naming the heading `### screens` it looked for [proposed]
- E3 · `aof diagram plan 169 ADR-001`: refused as `diagram-slug-invalid`; on a prototype the subject is a lowercase diagram name, never an ADR id [proposed]
- E4 · `aof diagram plan 168 ADR-001` on the milestone: the ADR path's answer, unchanged [proposed]

## R2 · `/aof:add-diagram` on a prototype adds, fills in or redraws
- E5 · `aof:add-diagram 169 "how a statement row becomes a ledger entry"`: a new `### <name>` brief is written under `## Diagrams`, drawn into `diagrams/`, and its block pasted under the brief [proposed]
- E6 · `aof:add-diagram 169` with two briefs, one already linked to `diagrams/`: only the unlinked one is drawn [proposed]
- E7 · `aof:add-diagram 169 data-flow` where `### data-flow` exists: that diagram is redrawn and its block replaced [proposed]

## R3 · A prototype diagram can be redrawn after it is drawn
- E8 · `aof diagram plan 169 data-flow` when `diagrams/data-flow.svg` already exists: planned again, never refused [proposed]
- E9 · `aof diagram export 169 data-flow` after the redraw: answers a block for the new files [proposed]
- E10 · Redrawing `data-flow`: `diagrams/` still holds exactly one `data-flow.html`, `.svg` and `.png`, the new ones, and no dated copy [stated Q1]

## Questions
- Q1 · business · answered · When a prototype diagram is redrawn, is the old picture kept? The Log already keeps every hand-off so a prototype stays auditable. (a) Overwrite: `diagrams/` holds only the current picture, and git history holds the old one once you commit. (b) Keep the old one as `diagrams/<name>.<date>.svg`/`.png` and link it from the Log. (b) keeps the history in the work tree, at the cost of more files. Answer (2026-10-22): (a) overwrite.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-006 · How does the command tell a name from a description? An argument that matches an existing `### <name>` heading is a redraw; anything else describes a new diagram.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-006 · How is a new diagram's name chosen? A kebab name of at most four words from the description, made unique among the existing headings.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-004 · Is a drawing logged? Yes, one `--log` line per diagram drawn or redrawn.
