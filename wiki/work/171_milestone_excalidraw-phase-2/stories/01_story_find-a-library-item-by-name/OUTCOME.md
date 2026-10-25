# 01 · Find a library item by name — Outcome

## Delivered

### Find in libraries
The editor's sidebar has a Find tab, beside the SDK's own, that filters every item of the global and project library roots by item or library name (a library in both roots is searched once, from the project) and inserts a clicked or dragged result through the SDK's own library drop, saved as an `aof:lib` node.

## Assumptions

- **The SDK's library drop is its one insertion** — Excalidraw 0.18 exports no insertion helper, so a click dispatches the drop at the visible canvas's centre, the point its own panel inserts a clicked item at.
