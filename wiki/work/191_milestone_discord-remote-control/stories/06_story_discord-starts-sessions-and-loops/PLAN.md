# 191/06 · Build brief

## Mechanism

`COMMANDS` gains a `session` command with three subcommands (`start`: `project` required, `node`
and `item` optional; `list`: `project` optional; `end`: `session` required), and `/loop` gains a
`start` subcommand (`scope` required, `project` optional). `node`, `item` and `session` carry
`autocomplete: true` and extend 05's autocomplete answer: `node` from `mesh:status`'s live nodes,
`item` from `work:list`'s `in-progress` rows in the chosen project, and `session` from
`mesh:session-list` over the kept projects, shown by name.

`answerCommand` dispatches the new names after the same counted/kept check:

- `session start` invokes `mesh:session-start` with `{ project: <workspaceId>, node, item, waitMs: 45000 }`.
- `session list` invokes `mesh:session-list`.
- `session end` invokes `mesh:session-end`, after checking that the session's project is a kept one.
- `loop start` reuses `answerLoop`'s project choice and invokes `work:loop` with
  `{ scope, startHandOff: true }`.

Deferral: `/session start` and `/session list` defer ephemerally. `/session end` and `/loop start`
defer in-channel. `ephemeral` in `handleInteraction` becomes a small table keyed by command and
subcommand, in place of the `!== "loop"` test.

## Known traps

- `/session start` waits up to 45 s inside a deferred interaction. That is within the token's 15
  minutes, but the edit must still go out on every path, including a throw.
- `session end` must refuse a session whose project the user is not allowed on, even though
  `mesh:session-end` itself would end it.
- FF-13113's `ALLOWED_VERBS` changes in this story only. Each name added must be invoked by a
  command here.

## Verification

The commands suite, on the shared fixture, covers each new command, its deferral kind, its
allowlist refusal and its replies. FF-19106 and its red probe. By hand from the phone on this
laptop: `/session start project:<this repo>` answers privately with a link or the name, the session
opens in the Claude app, `/session end` ends it, and `/loop start` on a scratch scope is started by
the desktop app.

## Out of scope

Buttons (07). Any change to the verbs themselves (02, 03, 04).
