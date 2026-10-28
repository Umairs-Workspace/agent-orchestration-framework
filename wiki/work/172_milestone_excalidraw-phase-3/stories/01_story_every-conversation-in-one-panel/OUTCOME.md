
# 01 · Every conversation in one panel — Outcome

## Delivered

### One panel holds every conversation on a diagram
`ConversationPanel.tsx` beside the canvas is the one place a thread, its replies and its proposal are read; the review list, the note bar and the thread popover are gone, and a note pin or the canvas ask opens its thread in the panel.

### One pure model of threads
`conversation-model.mjs` (which absorbed `note-threads.mjs`) derives each thread, its subject, its state and the proposal it holds from the review records alone, with one `clockOf` time formatter.

## Assumptions

- **The committed mocks are the conformance baseline** — `mocks/conversation*.png`, accepted by the operator on 2026-10-27; the panel was read against them in a real browser at 1280 and 768 (VERIFICATION, 172/01 task 02).

## Gaps

### A proposal card that says what changed
- **Status:** open
- **Discharge condition:** a proposal record carries each change's kind, so the card reads "1 edge relabelled" as the mock does.
The card reads counts ("1 changed"), because a relabel and a restyle are both `changed` on the record (VERIFICATION F-172-09).
