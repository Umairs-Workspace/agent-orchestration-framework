# 08 · One format — Outcome

## Delivered

### The scene is the store, Mermaid the interface
The architect reads an ADR's diagram only as the aof Mermaid profile projected from the stored scene (`scene-view`), and a scene whose view the profile could not read back is refused at save, naming the node.

### Element-level accept
A proposal compiles in the editor into element operations. Accept refuses as stale, by Mermaid id, anything it touches that a person changed since, and refuses any update or addition outside what the proposal touches.

### Publish from the canvas
Publish writes the editor's SVG, and the PNG when `work.diagrams` owes one, where the ADR's block links them, and answers the block to paste.

## Gaps

### Re-layout after an accept
- **Status:** open-by-decision
- **Discharge condition:** an accept that grows a box moves its close neighbours apart.
A relabelled box grows about its centre and can crowd a close neighbour (ADR-012).
