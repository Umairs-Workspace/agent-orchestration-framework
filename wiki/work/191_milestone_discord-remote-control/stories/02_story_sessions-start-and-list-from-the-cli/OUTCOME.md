# 191/02 · Sessions start and list from the CLI — Outcome

## Delivered

### One start core for every face
`planSessionStart` (`session-start.mjs`) resolves the project, the node and the optional item, and answers the envelope every start face pushes. The fleet route, `mesh:session-start` and Discord's `/session start` all reach the dispatch through it, and no face builds the spawn frame itself (FF-19103).

### A start waits for the link, or names its refusal
`mesh:session-start` watches the relay for as long as its caller asks: `--wait <ms>` on the CLI, 0 by default and at most 10 minutes, and 45 seconds from Discord. It answers with the Remote Control link, with the session's name when no link arrives in that time, or with the coded refusal (`session-target-not-connected`, `session-item-unknown`, …). It never reports a start that did not happen.

### The live sessions are listed
`aof mesh session list` lists each live session with its name, its node and how long it has run, or when it was last seen.
