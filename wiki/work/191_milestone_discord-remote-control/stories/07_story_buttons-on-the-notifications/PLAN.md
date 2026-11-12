# 191/07 · Build brief

## Mechanism

**Choices.** In `observe.mjs`, `readPendingAsk` also answers `choices`: the option labels when the
recorded human-input call holds exactly one question with options, else `[]`. That is codex's rule.
`ask.mjs` passes `pending.choices` into `openAsk` and into the `session-needs-input` and parked
envelopes. `notify.mjs`'s field table gains `choices: true` for those two events.

**Render.** `renderDiscord` takes `{ replyable }` already. When it is true, it adds `components`:
for halts, one action row with `Resume` and `Open a session here`; for asks with 2–5 choices of at
most 80 characters each, one row per five buttons, `custom_id` from `buttonId`. The index write in
`notify.mjs` is extended to `loop-halted` and `loop-died`, with `scope` and `nodeId` added, and an
ask's record gains the `choices` that were rendered.

**Press.** `discord-buttons.mjs` exports `buttonId`, `parseButtonId` and
`createButtonHandler({ findMessage, reportDegrade })` returning `handleButton(interaction, context)`.
That function defers ephemerally, finds the record by `interaction.message.id`, loads the project,
checks `allow`, dispatches through `context.invoke`, edits the ephemeral reply, and on an answer or
an `ask-already-answered` patches the original message's components to disabled. `bot.mjs` routes
`INTERACTION_CREATE` with `type === 3` to it and leaves everything else with `handleInteraction`.

## Known traps

- The ask record is the loop's (FF-13101's single writer). `choices` enter only through `openAsk`'s
  own fields, never written beside it.
- `custom_id` carries no project, ref or scope. Everything comes from the index by message id.
- Disabling the buttons edits the bot's own message: `PATCH /channels/{c}/messages/{m}` through
  `discordRequest`, never a second door.

## Verification

The buttons suite runs on the shared fake gateway, notify-discord covers the rendered components,
and loop-command-stops covers the pending ask's choices. FF-19107's leg and its red probe. By hand:
force a halt on a scratch scope on this laptop and tap `Resume` from the phone.

## Out of scope

Slash commands (05, 06). Buttons on any other event.
