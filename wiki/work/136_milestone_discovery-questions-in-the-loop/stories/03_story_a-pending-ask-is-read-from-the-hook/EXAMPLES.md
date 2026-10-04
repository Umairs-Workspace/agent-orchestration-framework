---
doc: examples
---
# 136/03 · A pending ask is read from the hook — example map
<!--
Drafted at 136's verify, 2026-10-03, from the live run's measurement. No business question: what
an ask carries and who answers it are 131's and ADR-002's; this story only restores the read.
-->

## R1 · A question the session is waiting on is asked, though the transcript does not show it
- E1 · A driven refine calls AskUserQuestion; the hook records it; the transcript holds nothing of it → the run settles needs-input and the question is posted [proposed]
- E2 · The call already has a result in the transcript → it is not waiting, and nothing is asked [proposed]
- E3 · A record from before this drive began → history; the resumed session is not taken to be waiting [proposed]

## R2 · The answer reaches a session that never recorded its question
- E4 · The question came from the hook's record → the re-drive types "You asked:", the question, "The answer:", the answer [proposed]
- E5 · The question came from the transcript → the answer is typed verbatim, as 131/03 types it [proposed]

## R3 · The hook never gets in the session's way
- E6 · No run in the environment, or input it cannot read → it writes nothing and succeeds [proposed]

## Questions
- Q1 · technical · defaulted ADR-004 · Where does the record live? (`<item>/runs/.asks-pending.ndjson`, beside the heartbeat queue)
