# 172/02 · The answer streams into its thread — example map

## R1 · Asking delivers the question to the architect's session, and its answer streams into the new thread
- E1 · The operator asks "Why does the route re-stamp?" about "Events route" and no session runs: the thread opens reading "Starting the architect…", then the answer's text grows in it as it is written, and no terminal opens [proposed]
- E2 · The notes r1 and r2 wait when the operator asks r7: r7 is answered first, then r1 and r2 by one batch review, each answer streaming into its own thread [proposed]
- E3 · The operator asks while the architect is answering another note: the new thread reads "Queued — the architect is answering another note" until its turn starts [proposed]

## R2 · A reply continues the thread, and the next answer streams the same way
- E4 · The operator replies "And if the watch cannot start?" in the answered "Events route" thread: the reply appears as their turn, then the architect's next answer streams under it [proposed]
- E5 · The session ended an hour ago when the operator replies: a new session starts, and the answer still streams into the same thread [proposed]

## R3 · Saving a note sends nothing; reviewing the waiting notes sends them all
- E6 · Save as note on "Editor": the note is recorded, its thread reads "Waiting for the architect", and nothing is posted to the session [proposed]
- E7 · Two notes wait and the operator chooses "Review with the architect": one batch review is delivered, and each note's thread streams its own answer [proposed]

## R4 · What the architect records replaces what streamed
- E8 · The architect records its answer with respond: the live turn's caret and activity list go, and the thread shows the recorded answer as its latest turn [proposed]
- E9 · The architect proposes a change instead: the live turn is replaced by the architect's turn holding the proposal card [proposed]
- E10 · The session exits before recording: the thread reads "The architect stopped before it answered" with Ask again, and the note stays open [proposed]

## R5 · The panel says what the architect's session is doing
- E11 · The chip reads "Not started" before the first ask, "Starting…" until the first text, "Answering" while text streams, "Idle" after the turn, and "Ended" when the session ends [proposed]
- E12 · The server has no `claude` to launch: the chip reads "Unavailable", and the composer shows `/aof:diagram-review 171 ADR-003-push-stream.excalidraw` with Copy [proposed]
- E13 · A tool the architect tried was denied: the thread shows "The architect was not allowed to run git status" [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-001 · How does the browser check stand the session in without a paid run? The server launches the executable `AOF_ARCHITECT_EXECUTABLE` names, a node script that speaks stream-json and records with the real scene command.
- Q2 · technical · defaulted DESIGN.md · Does the thread follow the growing answer? Yes, unless the operator scrolled up in it.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-002 · How does an editor that opens mid-answer show it? From the stream's first `conversation` event, the snapshot with the text so far.
