# 191/05 · Build brief

## Mechanism

In `discord-commands.mjs`, rename `WORKSPACE_OPTION` to `PROJECT_OPTION`
(`name: "project"`, `autocomplete: true`) and read `command.options.project` wherever
`.workspace` is read today. The table key changes, so the registrar overwrites each guild once.

`handleInteraction` gains a branch for `type === 4` (APPLICATION_COMMAND_AUTOCOMPLETE) before the
deferral. It finds the focused option, computes the kept workspaces with the same counted/kept
logic the commands use (refactor that logic into one function both paths call), filters and
answers `POST /interactions/{id}/{token}/callback` with `{ type: 8, data: { choices } }`. A DM,
an unserved channel or a user on no allowlist answers `choices: []`. Choices are
`{ name: <folder>, value: <workspaceId> }`, ranked by prefix match first, then by containment, at
most 25.

## Known traps

- Discord gives 3 s for autocomplete and allows no deferral. Load each served workspace once per
  interaction, never once per option.
- `value` is the workspace id, but a typed folder name must still resolve. Resolution stays "by id,
  then by folder", as today.
- The guide's table and its "Several projects in one channel" paragraph both say `workspace:`.

## Verification

The commands suite covers the renamed option on all four commands, the autocomplete answers and
their filtering, and an empty list for a stranger. FF-13113 stays green with its amended fixture
leg. By hand: after a daemon restart, typing `/loop stop project:` in the channel offers the
projects.

## Out of scope

New commands (06). Buttons (07).
