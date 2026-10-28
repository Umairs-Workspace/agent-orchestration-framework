# 172/04 · A right-click leaves the drawing true — example map

## R1 · After a right-click and the menu closing, the canvas draws the scene as it was
- E1 · On 171's ADR-003 diagram the operator right-clicks empty canvas and presses Escape: every arrow is drawn whole and every label sits on its own edge [proposed]
- E2 · The operator right-clicks the "propose" edge's label and presses Escape: the label stays on the architect-session → review-store edge, and no other label moves onto it [proposed]
- E3 · The operator right-clicks the "Review store" box, chooses Copy, then clicks empty canvas: nothing on the canvas moves [proposed]
- E4 · After a right-click and Escape the operator pans 100 px and zooms to 110%: the drawing pans and zooms whole [proposed]

## R2 · The skew is reproduced before anything is fixed, or ruled out on the record
- E5 · One of the gestures reproduces the skew on the current tree: the browser check fails there before any fix, and passes after it [proposed]
- E6 · No gesture reproduces it, before or after the panel lands: F-171-03 is closed as ruled out, the record naming each gesture tried and its screenshots [proposed]

## Questions
- Q1 · technical · defaulted wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-001 · If the cause is inside the Excalidraw SDK, is the SDK patched? No: the SDK is pinned and unpatched (m170/ADR-001); the cause and the version are recorded, and aof's layer avoids triggering it where it can.
