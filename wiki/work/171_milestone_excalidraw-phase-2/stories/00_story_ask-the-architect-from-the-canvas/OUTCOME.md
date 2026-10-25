# 00 · Ask the architect from the canvas — Outcome

## Delivered

### Ask architect at the selection
A selected shape, or several, shows an "Ask architect" action on the canvas above the box enclosing them, and a question asked there is recorded as a request naming the selection's ids and delivered exactly as the bar's ask is (`askArchitect` in `editor-state.mjs`).

### One placement home for on-canvas affordances
Every on-canvas affordance is a component of the one overlay layer (`CanvasOverlay.tsx`), placed only through `canvas-anchor.mjs`, the one module that converts scene coordinates to the screen (FF-17102).

## Assumptions

- **Excalidraw 0.18's change and scroll subscriptions** — the overlay follows a pan or zoom through `api.onChange` and `api.onScrollChange`, and re-places nothing else.
- **The overlay's fields keep their keys** — keydown and keyup are stopped at the field, because the SDK's document-level keyup clears the selection on a space and a cleared selection closes the field (171 VERIFICATION F-171-02).
