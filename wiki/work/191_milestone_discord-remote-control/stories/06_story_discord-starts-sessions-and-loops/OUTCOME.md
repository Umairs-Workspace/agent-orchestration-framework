# 191/06 · Discord starts sessions and loops — Outcome

## Delivered

### Sessions start, list and end from the channel
`/session start` starts Claude with Remote Control in the picked project and replies only to its caller, with the link or the session's name. `/session list` lists the channel's live sessions privately. `/session end` ends one and tells the channel who ended it.

### A loop starts from the channel
`/loop start` asks the supervisor for a fresh supervised loop on a scope, through `--hand-off-start`, and tells the channel who asked.

### Each option offers what it can address
`node` offers the live nodes, `item` the project's in-progress items, and `session` the live sessions in projects whose `allow` list holds the user.

### The bot's verb set grew by exactly the session verbs
The Discord command face invokes only `work:list`, `work:loop`, `work:answer`, the three session verbs and `mesh:status`, and starts no process (FF-19106 beside FF-13113).

## Assumptions

- **The loop's scope is a milestone, uat, spike or chore** — a parentless story is never offered by the readiness walk, so a start on one reports done without building (F-13, m65/F-65-C).
