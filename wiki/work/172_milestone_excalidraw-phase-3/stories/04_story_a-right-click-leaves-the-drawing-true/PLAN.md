# 04 · A right-click leaves the drawing true — build plan

## Mechanism

**Measure the canvas before and after each gesture; fix only what the measurement shows.**

- In the browser smoke, load a copy of 171's `ADR-003-push-stream.excalidraw` as the saved draft.
  For each gesture (E1–E4, plus right-click on an arrow body and on a frame if the scene holds one)
  take a canvas screenshot before the gesture and after the menu closes, with the selection cleared
  so its outline is not a difference, and compare the two: a skew shows as missing arrow segments
  or labels stacked, which a pixel diff over the canvas region catches. Read
  `api.getSceneElements()` too, and compare each arrow's points and each bound label's
  `containerId` and position with the saved scene — a scene-level difference and a render-only one
  point at different causes.
- If a gesture reproduces it: bisect by switching aof's layers off in the smoke (the overlay
  unmounted, the library sidebar unmounted, no review-stream re-render) to find whether aof's code
  triggers it. Fix in the layer that triggers it; a cause inside the SDK is recorded with its version
  and avoided rather than patched.
- If nothing reproduces it on the current tree, run the gestures again after story 01's panel lands,
  and record F-171-03 as ruled out with every gesture and its pair of screenshots.

## Verification step

The smoke's new `right-click:` checks, run on the current tree first (red when reproduced), then
after the fix or after the panel. The before/after screenshots are read, and the outcome is written
to VERIFICATION under F-171-03.

## Out of scope

- Any other render defect seen while measuring — record it as a finding, do not fold it in.
