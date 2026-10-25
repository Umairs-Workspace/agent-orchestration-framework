# 171/00 · Ask the architect from the canvas — example map

## R1 · A selection offers Ask architect where it sits, and nothing else
- E1 · The operator selects the box "Gateway": an "Ask architect" action appears just above Gateway's box, and no "Add note" action is on the canvas [stated Q1]
- E2 · The operator selects "Gateway" and "Cache" together: one action appears above the box that encloses both [proposed]
- E3 · Nothing is selected: no action is on the canvas, and the bar below the canvas still offers Add note and Ask architect [proposed]
- E4 · The diagram belongs to a delivered item, so it opens read-only: selecting "Gateway" shows no action [proposed]

## R2 · Asking from the canvas is the same ask as from the bar
- E5 · On "Gateway", the operator types "Why does this write to the database directly?" and presses Enter: a request naming `gateway` is recorded, and the architect is launched with `/aof:diagram-review 171 <file> <request id>`, exactly as the bar's Ask architect does [proposed]
- E6 · The canvas has an unsaved shape when the operator asks: the draft is saved first, then the request is recorded against the saved revision [proposed]
- E7 · The operator opens the field and presses Escape: nothing is recorded, nothing is launched, and the action returns [proposed]

## R3 · The action stays with its selection on screen
- E8 · The operator pans the canvas 200 px left: the action moves 200 px left with Gateway [proposed]
- E9 · Gateway sits against the top edge of the visible canvas: the action is drawn below the box instead of above it [proposed]
- E10 · The operator scrolls Gateway out of view: the action is not drawn [proposed]

## Questions
- Q1 · business · answered · When you select a shape, should the canvas offer only "Add note", or also "Ask architect", which records the note and starts (or feeds) the architect's session at once? Answer (2026-10-24): "Only ask architect. Adding notes should be through the editor".
- Q2 · technical · defaulted ARCHITECTURE.md#adr-001 · Is there a keyboard shortcut for Ask architect? Not in this story: a shortcut may sit beside the action, never replace it, and Excalidraw already binds most single keys.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · Where is the action positioned? Through `canvas-anchor.mjs` only, from the selection's common bounds and the app state's scroll and zoom.
