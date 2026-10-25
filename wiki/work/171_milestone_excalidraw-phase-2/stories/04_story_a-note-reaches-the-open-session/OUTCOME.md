# 04 · A note reaches the open session — Outcome

## Delivered

### Delivery to the open session
A note or a question added while the architect's session runs in the dock is typed into that session and run after its current answer, as its own command; with no session running, Ask architect starts a keyed new one that takes the question and then the waiting notes, and a note otherwise waits for a review session — the surface's one `deliver` says which happened.

### What a live terminal session is typed
The dock types its command only once the TUI's own readiness holds (bracketed paste on, then something drawn), or at a 30 s cap, and every input — the command and each later input — goes through one serial outbox as one bracketed paste followed, after a 900 ms settle, by its Enter as a separate write.

### One home for the TUI input contract
`@aof/contracts/tui-ready` is the single home of the readiness gate and the paste framing, read by the loop's session driver and screen and by the browser's dock (FF-13801 re-homed there).

## Assumptions

- **claude announces its REPL by enabling bracketed paste and drawing its frame** — measured on 2.1.283 and live on 2.1.310 (171 VERIFICATION F-171-01); a program that never enables it is typed raw at the cap.
