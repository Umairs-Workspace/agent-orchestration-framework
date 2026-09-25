# 11 · Slash commands — build plan

## Mechanism

Two halves meet at `work:loop`: the bot half in `src/discord/commands.mjs`, and a verb-plus-decider
half that owns `/loop resume`.

1. **The verb half first (task 04).** It works without Discord, so land it first.
   - In `stop-request.mjs`, beside the stop request, add `loopResumesDir`, `requestLoopResume`,
     `readResumeRequest` and `clearResumeRequest`. Reuse the stop request's write, read and
     filename guards. Do not share its record: a resume is five keys.
   - In `loop.mjs`, `handOff` lands in its three homes (the schema, `cli.spec.flags`, `argv`).
     `run` dispatches on it as it dispatches on `stop`: resolve the declaration (`stop.mjs`
     already has the latest-declaration read), refuse by value, or write.
   - The `--resume` branch at `:1130` clears the resume request beside the stop mark.
   - `decideSupervisedDeclarations` gets `resumeRequested`. Its skip on a honoured stop consults
     the set first, and a member of the set enters the relaunch path as though it were resumable,
     so the budget gate applies unchanged.
   - `supervisedDeclarations` builds the set the way `honouredStops` builds its set.
2. **The bot half (tasks 00–03).**
   - `commands.mjs` exports `COMMANDS`, `registerCommands(ctx)` and `handleInteraction(d, ctx)`.
   - `bot.mjs` adds `INTERACTION_CREATE` to its dispatch table, calls `registerCommands` on READY,
     and runs one hourly timer, cleared in `stop()`.
   - The handler's first act is the deferral. Everything after it is try-wrapped, and ends in
     exactly one `PATCH` of `@original`.
   - Workspace resolution is 10's served-workspace read plus a `channelId` match and an `allow`
     filter. Write it as one function that the four commands share.
3. **Renders (task 02).** These are pure functions over `work:list` rows and `form.mjs`. A clip
   helper cuts at a line boundary and appends `… and N more`.
4. **Register and guide (tasks 05, 06).** Append FF-13113 to 10's arch file and add
   `loop-resumes` to 130's single-home control. Probe both, drop `pending (11)`, and fill the
   guide's commands section.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the discord suite index, `work-loop-declarations`,
`loop-command-stops`, `acd-loop-stop-request-single-home` and 10's arch file through the
focused runner (`--only`).

Then run a hand probe in a temp project with a supervised declaration whose latest run is `done`:
1. `aof work loop <scope> --hand-off --json` answers `handedOff`.
2. `aof mesh status --declarations --json` lists the scope with `--resume` in its argv.
3. A real `aof work loop <scope> --resume` start clears the request.

A wrong build is a `/loop resume` that spawns anything, or a hand-off that the declarations read
does not list.

## Out of scope

- Buttons, `/answer`, global commands, and any command beyond the four.
- Changing the desktop supervisor's poll. It already relaunches whatever the declarations list.
- Resuming an unsupervised loop from Discord. The refusal names the terminal command.

## Known traps

- `mesh:status --declarations` reaches `declarations.mjs` only through a dynamic import
  (`72/FF-7205`), so keep the resume read inside that module and never in `identity.mjs`.
- `work:loop`'s read-only probe is pinned at ten keys (`FF-5304`). `handOff` must dispatch
  before the probe, as `stop` does, and never widen the probe's document.
- An interaction token expires 15 minutes after the deferral. The verbs are fast, but a
  `work:list` over a large mesh must still finish inside that window.
