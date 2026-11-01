# 188/01 · Build brief

## Mechanism

`createPhaseDoorCommands` gains `operatorModes = []`. Concatenate manual's built-in descriptor with
it and derive, per mode, an input property, a CLI flag, a usage token and the two refusal codes.
Exclusivity is one check after the backlog refusal: count the true mode inputs, and refuse at two or
more. The local answer reads the active descriptor's `command`.

`@aof/learning` starts small: `package.json`, `src/mode.mjs` exporting the frozen `teachMode`, and a
test index. Core's `bindings/commands/continue.mjs` imports it and passes `[teachMode]`, exactly as
it passes `refuseOpenExamples`. Add the workspace to the root `package.json` dependency list and core's
`package.json`, then `yarn install` (workspace entry only) and the supply-chain audit.

## Known traps

- `@aof/work` must not spell `teach` anywhere, comments included. Name the seam "operator-led modes".
- The 142 ledger and the `test/arch/command` budget row both move.
- `yarn-installation.test.mjs` pins every package's dependency list; add the learning row.

## Verification

`aof test --scope impacted --story 188/01` green, plus
`aof work continue <story> --teach --json` in a scratch workspace answering `/aof:teach <story>`.

## Out of scope

The `teach` command and its prompt (02); the practices registry (02).
