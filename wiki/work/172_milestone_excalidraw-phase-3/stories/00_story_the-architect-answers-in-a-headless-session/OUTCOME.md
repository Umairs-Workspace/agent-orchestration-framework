
# 00 · The architect answers in a headless session — Outcome

## Delivered

### A headless conversation session in `@aof/execution`
`conversation-session.mjs` runs one stream-json `claude` per key, one turn at a time: a delivery during a turn is queued in order, a session with no subscriber and no turn in flight ends after ten minutes (stdin closed, then the tree), and one pure reader turns its stdout into `session`, `turn`, `text`, `activity` and `turn-end` events, each naming the request it answers.

### The launch never bypasses permissions
The session launches with `--permission-prompts none` and an explicit `--allowedTools` list, with an argument vector and no shell, at the refine phase's model and effort, and with the session-attachment keys scrubbed by the same predicate the loop's driver uses (FF-17201).

### The board delivers to the architect's session and streams its turn
`POST /api/diagram/conversation` (admitted like every board write) starts, sends to, or queues on the diagram's session; `/api/diagram/events` forwards each conversation event as an SSE `conversation` event, a snapshot first; with no `claude` to launch the route answers 503 `architect-session-unavailable`.

### One home for the architect's vocabulary
`packages/diagrams/src/review-session.mjs` is the only place the `/aof:diagram-review` invocation and the session's tools (`Read`, `Grep`, `Glob`, `Write`, `Bash(aof diagram scene:*)`) are spelled; `diagram:scene --action session` and the editor's copy-the-command fallback both read it (FF-17202).

## Assumptions

- **The board's server runs where `claude` is logged in** — the session runs on the subscription login of the process that launched the board; a resolvable but unauthenticated `claude` ends the turn as failed.

## Gaps

### A `Write` grant scoped to a scratch directory
- **Status:** open
- **Discharge condition:** the session's `Write` permission is path-scoped, so the architect can write only its input files and the review records.
The session's `Write` grant reaches any path the server's user can write, and a bare `mktemp -d` ran without a denial (VERIFICATION F-172-01).

### One owned-process tree kill
- **Status:** open
- **Discharge condition:** one `terminateProcessTree(child)` in an execution leaf, imported by `codex-app-server.mjs`, `session-driver.mjs` and `conversation-session.mjs`.
Execution holds three copies of the owned-process tree kill (STATE, 172/00 close, Q3).
