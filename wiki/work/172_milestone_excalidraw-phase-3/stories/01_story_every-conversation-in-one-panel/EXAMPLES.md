# 172/01 · Every conversation in one panel — example map

## R1 · Every note on the diagram is a thread in the panel
- E1 · The diagram holds a note on "Events route", two on "Architect session" and one on the whole diagram: the panel lists three threads under those subjects and one under "Whole diagram" [stated Q1]
- E2 · A note names a shape that was later deleted: its thread is listed under "Whole diagram", and no pin is drawn [proposed]
- E3 · A withdrawn note: no thread, no pin [proposed]
- E4 · A note whose last turn is the architect's reads "Answered"; one whose last turn is the operator's reads "Waiting for the architect"; one a proposal answers reads "A proposal answers this" [proposed]

## R2 · A thread is opened from its shape or from the panel, and only one is open
- E5 · The operator chooses the pin on "Events route": its thread opens at the top of the panel, expanded, and the thread that was open collapses [stated Q1]
- E6 · The panel is collapsed when the operator chooses a pin: the panel opens on that thread [stated Q1]
- E7 · The operator chooses "Show on canvas" in the "Architect session" thread: both its shapes are selected and scrolled into view [proposed]

## R3 · The panel's composer asks about the selection, or saves a note
- E8 · "Events route" is selected: the composer reads "Ask the architect · about Events route" [proposed]
- E9 · Nothing is selected: the composer reads "· about the whole diagram", and an Ask records a whole-diagram note [proposed]
- E10 · The operator types "Should a hidden tab stop the stream?" with "Editor" selected and chooses Save as note: the note is recorded and its thread reads "Waiting for the architect", and nothing is sent [proposed]

## R4 · A proposal is decided in the thread that asked for it
- E11 · The architect proposed relabelling the watch edge on the "Events route" thread: the thread shows the proposal card with Preview, Accept and Reject, and the Proposals tab counts 1 [proposed]
- E12 · The operator rejects it with the reason "keep the label short": the card reads "Rejected — keep the label short" in the thread and on the Proposals tab [proposed]

## R5 · A read-only diagram is read, never written
- E13 · The diagram belongs to a delivered item: threads and proposals read, with no composer, no reply field and no proposal actions [proposed]

## Questions
- Q1 · business · answered · Where should a note's conversation open: in one panel beside the canvas (the drafted design — long answers never cover the drawing, every conversation in one list), or in a popover beside its shape as 171 built it (the answer sits next to what it is about, but covers neighbouring shapes)? Answer (2026-10-27): "Panel beside canvas".
- Q2 · business · answered · The drafted mocks (mocks/conversation-streaming.png, conversation-ask.png, conversation-proposal.png, and the 768 drawer) become the design's source of truth once you accept them. Accept them, or will you supply your own mocks for any of these surfaces? Answer (2026-10-27): "Accept drafted mocks".
- Q3 · technical · defaulted DESIGN.md · Which thread is open when the editor loads? The thread the operator touched last in this tab, else none; the panel lists the rest collapsed, newest activity first.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-003 · Does "Save as note" stay beside Ask? Yes — the operator ruled at 171/00 Q1 that notes are added through the editor, and the panel's composer is the editor's.
