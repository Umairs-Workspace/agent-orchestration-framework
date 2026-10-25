# 171/02 · Review records are pushed — example map

## R1 · What the architect writes appears in the open editor without a reload
- E1 · The editor is open on ADR-003's diagram with one open note; the architect runs `--action respond` for it: within 2 seconds the panel shows the answer and the note as answered [proposed]
- E2 · The architect runs `--action propose` for a note: within 2 seconds the panel lists the pending proposal with Preview, Accept and Reject [proposed]
- E3 · Nothing is written for a minute: the panel makes no further request in that minute [proposed]

## R2 · The canvas follows a draft saved elsewhere, without losing unsaved work
- E4 · The canvas has no unsaved edits and the draft is saved in another window: the canvas shows the saved draft and the status says it was updated from the saved draft [proposed]
- E5 · The canvas has an unsaved shape and the draft is saved in another window: the canvas keeps the unsaved shape, a line says the saved draft changed, and Reload replaces the canvas with the saved draft [proposed]
- E6 · The operator saves in this editor: no "changed elsewhere" line appears [proposed]
- E7 · A proposal is accepted in this editor: the canvas shows the accepted change once, with no second reload [proposed]

## R3 · When the stream cannot run, the editor still updates
- E8 · The server answers 404 for the event stream: the panel refreshes every 5 seconds, as before [proposed]
- E9 · The server cannot watch the diagram's folder: an answer written by the architect still reaches the panel within 4 seconds [proposed]
- E10 · The tab is hidden: the stream is closed; when it is shown again, the panel is refreshed once and the stream reopens [proposed]

## R4 · The stream says what moved, never the records, and only for a diagram that exists
- E11 · A proposal is written: the event names `review` and carries a stamp, and no proposal text [proposed]
- E12 · The stream is asked for an item that does not exist: it answers 404 `ref-not-found` and opens no stream [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · How quickly must an event follow a write? Debounced by 150 ms behind a watch event; a 2 s tick when the watch cannot start; a 30 s safety re-stamp; a comment line every 25 s.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-003 · What happens to unsaved edits when the saved draft changes elsewhere? They are kept and a reload is offered, as ADR-003 decides.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-003 · Server-sent events or a WebSocket? Server-sent events; nothing flows from the browser.
