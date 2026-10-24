# 170 · Excalidraw phase 1 — Outcome

## Delivered

### An ADR's diagram is a refinement loop between the operator and the architect
On a project with `work.diagrams` on, an ADR's figure opens in an editor where the operator draws, uses project libraries and leaves notes, and the architect answers or proposes edits that apply only on the operator's accept. Its parts are stated whole in the stories: the store and loop (m170/00), the package pair (m170/01), the opt-out (m170/02), the route (m170/03), the first draft (m170/04), notes (m170/05), the batch review (m170/06), one format (m170/08) and libraries (m170/09).

### The loop runs on the Windows control node
The editor, store and review records work on the platform the operator uses. They were verified there on payload `f43d5121`, with a real model, a real AWS library and a published figure (ADR-010's own diagram).

## Assumptions

- **A per-project board** — the editor is reached from the project's own board (Fleet → Open board), never the fleet origin.
- **Model-written Mermaid** — what a proposal changes depends on the architect's Mermaid. Live, it was proven for a first draft, a recolour and an edge to a library item, and for the rest through the smoke's stand-in.

## Gaps

### Operator affordances deferred at the UAT
- **Status:** open
- **Discharge condition:** a later milestone delivers contextual notes, library search and a push update, or drops each by decision.
Three gaps the operator deferred: contextual notes, library search, and an editor that updates when the architect finishes (m170/05, m170/09; VERIFICATION F-170-11..13).

### Phase 2 of the PRD
- **Status:** open-by-decision
- **Discharge condition:** a milestone takes phase 2 of `wiki/planning/PRD-excalidraw-refinement.md`.
In-diagram conversation and a push channel for review records are out of this milestone's scope.
