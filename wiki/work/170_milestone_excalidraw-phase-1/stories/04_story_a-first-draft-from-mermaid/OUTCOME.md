# 04 · A first draft from Mermaid — Outcome

## Delivered

### A first draft on request
An empty diagram offers "Request a first draft from the ADR". It records a request and opens the architect's dock session, and the architect proposes the whole diagram in the Mermaid profile.

### Drawn by Excalidraw's converter, in the drawing font
Accepting a first draft draws it with `@excalidraw/mermaid-to-excalidraw`, after loading the hand-drawn font for the proposal's text, so labels are measured and wrapped in the font that paints them.

## Assumptions

- **The default font family** — the font loaded before measuring is Excalifont. A first draft in another family would measure in the fallback font again.
