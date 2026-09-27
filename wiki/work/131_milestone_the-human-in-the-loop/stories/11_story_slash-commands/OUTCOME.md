
# 11 · Slash commands — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### Four guild commands registered by the bot
At every READY and hourly after it, the bot bulk-overwrites `/status`, `/asks`, `/loop stop <scope>` and `/loop resume <scope>` (each with an optional `workspace`) on the guild of every configured discord `channelId`, from one frozen table in `src/discord/commands.mjs`.

### Every interaction deferred before its dispatch
Each interaction gets its `type: 5` callback before any config read or dispatch (FF-13113) — ephemeral for `/status` and `/asks`, in-channel for `/loop` — and its final text is one `@original` PATCH capped at 2,000 characters.

### Commands reach only allowlisted workspaces
An interaction counts only the served workspaces whose discord channel is the interaction's channel and whose `allow` holds the user; with none it is refused `discord-command-not-allowed`; `/loop` with several and no matching `workspace` is refused `discord-scope-ambiguous`, listing them; a DM is refused.

### `/status` and `/asks` read `work:list`
`/status` renders each in-progress row (ref, execution state, node, and `waiting on you (<phase>, <elapsed>)` for an ask) through `form.mjs`, and `/asks` lists waiting and parked asks as account lines with a jump link to the ask's message when the index has one.

### `/loop stop` is 130's stop verb
`/loop stop` dispatches `work:loop { scope, stop: true }` in-process and reports the level reached (drain, then cancel) or the refusal as `/loop stop <scope> was refused (<code>): <message>`.

### `/loop resume` hands the loop to the supervisor
`work:loop --hand-off` (`handOff`) writes a durable resume request, `<meshRoot>/loop-resumes/<loopRunId>.json` in `src/loop/stop-request.mjs`, which `decideSupervisedDeclarations` turns into a relaunch row even over an honoured stop mark, and the `--resume` launch clears; it refuses `loop-hand-off-not-supervised`, `-running`, `-no-declaration`, `-not-local` and `-scope`, is exclusive with `--stop` and `--dry-run`, and starts no process.

### `src/discord/**` never spawns or reaches beyond two verbs
The discord family imports no `node:child_process`, and every `invoke(` in `commands.mjs` names `work:list` or `work:loop` (FF-13113).

## Assumptions

- **The desktop app supervises the loop** — `/loop resume` relaunches only a `--supervised` declaration on the supervisor's next poll; an unsupervised loop is refused with the terminal command.

## Gaps

### The commands in a live guild
- **Status:** open
- **Discharge condition:** 131/07's live run records each of the four commands answered in the operator's guild.
Registration and every dispatch are proven against fake REST and a real `work:loop` over a real declaration, never a live guild.
