
# 04 · A right-click leaves the drawing true — Outcome

## Delivered

### A right-click is checked to leave the drawing as it was
The diagram editor's browser smoke drives six right-click gestures over 171's `ADR-003-push-stream` scene at device pixel ratio 2, asserts each opened its own element's menu, and compares the drawing and the saved scene after each; F-171-03 did not reproduce on the overhauled editor and is ruled out.

## Assumptions

- **Excalidraw SDK 0.18.0** — the gestures were measured on this pinned version; a right-click on a shape enables Undo because the SDK records its selection in history, with the scene unchanged.
