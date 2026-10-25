# 00 · Ask the architect from the canvas — build plan

## Mechanism

**One overlay, one anchor, the existing ask.**

- `canvas-anchor.mjs` (pure): `anchorFor({ bounds, appState, viewport, size, gap })` takes scene
  bounds (`[x1, y1, x2, y2]`, from the SDK's `getCommonBounds` over the selected elements), the app
  state's `scrollX`, `scrollY`, `zoom.value`, `offsetLeft`, `offsetTop`, and the canvas viewport,
  and answers `{ x, y, placement: "above" | "below" } | null` — null when the bounds are out of
  view. It applies the SDK's own transform (`(sceneX + scrollX) * zoom`), so the editor never calls
  `sceneCoordsToViewportCoords` itself; FF-17102 is the grep that keeps it that way.
- `CanvasOverlay.tsx` is a child of `<Excalidraw>`, absolutely positioned over the canvas with
  `pointer-events: none` except on its own controls. It re-renders on `onChange` (selection and
  elements) and `onScrollChange`. It holds the action and, when open, the question field. It hides
  while a pointer drag is in progress (`appState.selectedElementsAreBeingDragged`) and when the
  diagram is read-only.
- `ExcalidrawEditor.tsx`: the bar's `ask()` is split so its core takes `(text, selectedIds)`; the
  bar and the overlay both call it. The overlay passes the ids of the selection it was drawn for.
  Story 05 adds pins to the same overlay.

FF-17102 (`acd-diagram-canvas-anchor-one-home`) lands with this story: no file in
`packages/diagrams-ui/src` but `canvas-anchor.mjs` names `sceneCoordsToViewportCoords`, nor
spells the scroll-and-zoom transform. Give it its red probe in VERIFICATION.md.

## Verification step

Smoke: select a box, check the action's bounding rect sits above the box's, ask, see the request
in the panel and the invocation handed to the dock; pan and zoom and check again. Read the
screenshots — the SDK draws floating panels the overlay must not cover. Then `yarn ui:build`.

## Out of scope

- An on-canvas Add note (the operator's ruling, 171/00 Q1).
- A keyboard shortcut.
- Pins and threads — story 05.
