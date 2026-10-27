# 172/00 · The architect answers in a headless session — example map

## R1 · The first delivery for an open diagram starts its one session
- E1 · No session runs for ADR-003-push-stream.excalidraw of item 171; the operator asks about "Events route" (request r7): one headless `claude` starts in the project root and is handed `/aof:diagram-review 171 ADR-003-push-stream.excalidraw r7` [proposed]
- E2 · Two editors are open on the same diagram and both asked: one session serves both, and both receive the same live turn [proposed]
- E3 · The same item's ADR-001 diagram is opened and asked about: it gets its own session, separate from ADR-003's [proposed]

## R2 · A session answers one turn at a time, in the order they were delivered
- E4 · While r7 is being answered the operator replies on r5: r5's invocation is written only after r7's turn ends, and the reply is told it is queued [proposed]
- E5 · Three deliveries arrive during one turn (r5, r8, then a batch review): they are answered r5, r8, batch, in that order [proposed]

## R3 · An idle session ends; an ended session is not resumed
- E6 · The last editor on the diagram closes with no turn in flight: the session ends 10 minutes later, and says so on the stream [stated Q1]
- E7 · An editor reconnects 4 minutes after the last one left: the session is still there and the idle clock stops [proposed]
- E8 · The `claude` process exits in the middle of r7's turn: the turn ends as failed, the session reads "ended", r7 stays open, and the next ask starts a fresh session [proposed]

## R4 · The architect can only do what the review needs
- E9 · The session is launched with `--permission-prompts none` and the allowed tools Read, Grep, Glob, Write and `Bash(aof diagram scene:*)`, never with `--dangerously-skip-permissions` [proposed]
- E10 · The architect tries to run `git status`: the call is denied in the turn, the turn's end names the denial, and the answer arrives without it [proposed]

## R5 · An editor that connects mid-answer catches up
- E11 · The architect has written 300 characters of r7's answer when a second editor opens the diagram: its first conversation event carries the session's state, r7, and those 300 characters [proposed]

## R6 · The board refuses what it cannot deliver
- E12 · An editor posts a request id the diagram does not hold: refused, and nothing is typed into any session [proposed]
- E13 · The server cannot find a `claude` to launch: the post answers 503 `architect-session-unavailable` with the reason, and the note stays open [proposed]

## Questions
- Q1 · business · answered · How long should the architect's session stay alive after the last editor on its diagram closes? While it lives, the next question is answered in about 12 s; a fresh start takes about 18 s and re-reads the diagram. A live but idle session costs nothing per minute on the subscription, but holds a process on this machine. Options: 10 minutes; 30 minutes; until the board's server stops. Answer (2026-10-27): "10 minutes".
- Q2 · technical · defaulted ARCHITECTURE.md#adr-001 · Which model and effort does the session use? The refine phase's session launch (`work.agents.session`), the phase the architect works in.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-002 · Which tools may the architect use? The command's own needs: Read, Grep, Glob, Write and `Bash(aof diagram scene:*)`, spelled once in `review-session.mjs`.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-001 · Does a new session resume the previous conversation? No: the `context` action already hands it the note's whole thread.
- Q5 · technical · defaulted ARCHITECTURE.md#adr-002 · Is the streamed text kept when the session dies before recording? No: only `respond` writes the thread; the note stays open.
