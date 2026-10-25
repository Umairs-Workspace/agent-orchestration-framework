# 171/04 · A note reaches the open session — example map

## R1 · With the architect's session running, a new note is typed into it
- E1 · The dock's session is running; the operator adds the note "Why is the cache here?" on `cache`: `/aof:diagram-review 171 ADR-003-push-stream.excalidraw <note id>` is typed into the session and submitted, and the editor says the note was sent to the architect [proposed]
- E2 · The dock is closed; the operator adds the same note: it is recorded, nothing is typed, and the editor says it waits for a review session, as in 170 [proposed]
- E3 · The dock is open but its session has exited: the note is recorded, nothing is typed, and the editor says the architect session is not running [proposed]

## R2 · Ask architect goes into the open session, and a new session also takes the waiting notes
- E4 · The dock's session is running and the operator chooses Ask architect with a new question: its invocation is typed into the running session [proposed]
- E5 · The dock is closed and the operator chooses Ask architect: the dock opens a new session typed the invocation, as in 170 [proposed]
- E9 · Two notes are waiting and the dock is closed; the operator asks "Is the queue needed?": the new session is typed the question's invocation, then the batch invocation `/aof:diagram-review 171 ADR-003-push-stream.excalidraw` for the waiting notes [stated Q1]
- E10 · No note is waiting and the dock is closed; the operator asks a question: the new session is typed the question's invocation only [proposed]

## R3 · Each note is typed exactly once, in the order written
- E6 · The operator adds two notes three seconds apart: two invocations are typed, the first note's first [proposed]
- E7 · The editor re-renders after a note was sent: nothing is typed again [proposed]
- E8 · The dock's pane accepts no input: nothing is typed, and the note waits [proposed]

## Questions
- Q1 · business · answered · When you start the architect session from the editor, should notes that are already waiting be sent to it straight away? Today Ask architect sends only the question you just typed, and waiting notes need "Review N notes". Sending them at once means one session covers everything open; leaving them means the session answers only what you asked it. Answer (2026-10-24): "Send waiting notes too".
- Q2 · technical · defaulted ARCHITECTURE.md#adr-005 · How is "the session is running" decided? The dock is open and its terminal socket is open.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-005 · How does the editor type into the session? Through one TerminalControl seam that types a later input once per sequence number on the raw path; the rule lives in `input-policy.mjs`.
