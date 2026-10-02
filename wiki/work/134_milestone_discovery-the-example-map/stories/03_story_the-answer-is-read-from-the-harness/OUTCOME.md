# 03 · The answer is read from the harness — Outcome

## Delivered

### One reader of a person's answer
`packages/work/src/examples/answers.mjs` is the only module that reads the harness's `AskUserQuestion` result (`toolUseResult.answers`) from a session transcript, and it keeps only answers whose question opens with a map token (FF-13401).

### The answer is stamped onto the run record at settle
A settle writes each tokened answer to `brief.answers` as `{ token, question, answer, toolUseId, sessionId, at, entrypoint }`; a refused or untokened question writes nothing, and `collectAnswers(ref)` reads every stamped record for a story.

### Settle reads the real transcript store
A hand-run `aof work run-complete` resolves the transcript directory through `claudeProjectsDir` for a named workspace instead of the repository root, so it stamps spend and answers from any working directory (FF-13404).

## Assumptions

- **The run record carries the session id** — the join from a story to its transcript is the run's `sessionId`, so an answer given outside a started run is never stamped.

## Gaps

### Who answered
- **Status:** open
- **Discharge condition:** the harness records a person's identity, not only the channel.
A stamp names the channel (`sessionId`, `entrypoint`), not the person, and it records any reply on a token, including one that does not answer the question (134 F-134-02).
