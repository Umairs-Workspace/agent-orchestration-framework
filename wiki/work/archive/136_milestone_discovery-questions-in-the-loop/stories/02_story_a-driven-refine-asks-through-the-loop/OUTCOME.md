# 02 · A driven refine asks through the loop — Outcome

## Delivered

### A driven refine asks each business question as its own tokened discovery question
In a session whose environment carries `AOF_RUN_ID`, `refine.md`'s discovery beat asks one question per `AskUserQuestion` call: its token first, the discovery marker, the rule and the example it settles, then 131's four lines, with the options as the tool's; a business question is never defaulted and never sent as the NEEDS_INPUT sentinel, and the answer is written into the map on resume.

### A driven cascade asks one question after another
The `--autonomous` block asks a driven session's open business questions one per call, each its own ask and wait; an interactive cascade still asks in batches of four.

## Assumptions

- **The session's question reaches the loop** — on Claude Code 2.1.288 that rests on 136/03's recorder hook being installed (`aof work update`).
