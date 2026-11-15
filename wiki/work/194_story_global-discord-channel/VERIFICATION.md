---
doc: verification
---
# 194 · Verification

## Contract and review

Solo review (`work.agents.mode: solo`), recorded in `STORY.md` `## Review`: no Blocker in the
structural or behavioural lane, and the one Important (strict global reads in `status` and a
project `disable`) was fixed at the close. No independent review is claimed. The story is
parentless and has no `ARCHITECTURE.md`, so it declares no `FF-NN` control. The suites it touches
are its fitness checks: the flat-layer budget and the application assembly. No `@uat` scenario
exists, so there is no human acceptance lane.

## Verification evidence

The story-scoped lane ran on 2026-11-14 on this MacBook, with each suite under a fresh
`AOF_GLOBAL_HOME`, through `scripts/test-shard.mjs <file>`:

| suite | cases | result |
|---|---|---|
| `test/notify/notify-global-channel.test.mjs` | 18 | green (verifies → tasks 00, 01, 02, the notifier and CLI side) |
| `test/discord/discord-global-channel.test.mjs` | 6 | green (verifies → tasks 00 E2–E4, 01 E6, 02 "a channel the bot cannot place") |
| `test/notify/notify-messaging.test.mjs` | 38 | green (the exact-shape `status` assertions amended at build) |
| `test/notify/notify-channels.test.mjs` | 33 | green (unchanged neighbours) |
| `test/discord/discord-replies.test.mjs` | 7 | green |
| `test/discord/discord-buttons.test.mjs` | 18 | green |
| `test/discord/discord-commands.test.mjs` | 45 | green |
| `test/arch/testing/acd-source-directory-budget.test.mjs` | 10 | green (the `test/discord` and `test/notify` rows name the new suites) |
| `test/command/application-assembly.test.mjs` | 8 | green (`command-inventory.json` and the `provideWork` wiring) |
| `packages/messaging/test/services.test.mjs` (`node --test`) | 4 | green (the factory's `readGlobalConfig` collaborator) |

### @manual · on this MacBook, a real project with no channel of its own posts to the real global channel

verifies → `tasks/02_the-global-channel-is-set-and-read-from-the-cli.feature`, the `@manual`
scenario. It ran from the npm-linked `aof`, which is this checkout's working tree.

1. Backed up `~/.aof/aof.config.json` (sha256 `d6a30e0e…bf82`; it holds `mesh` only, with no
   global channel).
2. `aof messaging enable discord --channel 1571198918107078736 --global` exited 0, printing
   "Enabled discord on channel 1571198918107078736 globally in ~/.aof/aof.config.json." (home path shortened here)
   The file then held its `mesh` block unchanged plus
   `work.notify.channels.discord = { type: "discord", channelId: "1571198918107078736" }`.
3. A scratch project was created whose `.aof/aof.config.json` is `{ "name": "manual-194" }`, with
   no `work.notify`. In it, `aof messaging status` printed
   `global: enabled (discord → 1571198918107078736)` and
   `this project: enabled (discord → 1571198918107078736, from the global config)`.
   `--json` gave `project.from: "global"` and `switchedOff: false`.
4. `aof messaging test discord` in that project exited 0: "Posted the Discord test message to
   discord → 1571198918107078736 (message 1571302910560571464)". The message id is Discord's own
   answer to the create, so the post exists in the operator's channel. The project's config was
   unchanged afterwards.
5. Restored the global config from the backup. Its sha256 matches step 1 again, and the scratch
   project was removed. The running daemons execute the installed payload, which predates this
   story and reads no global channel, so the temporary global channel never reached them.

### Gates

- `aof work validate 194`: PASS ("194 is well-formed").
- `aof work doctor 194`: no errors and no `control-unresolved` at either severity. Three
  stream-wide advisories: a numbering gap, the rubric join being unchecked, and `depends:` edge
  coverage.

## Verification limits

- `test/bundle/core-workspace.test.mjs` shows 3 reds of 11 cases: the relocated UI owner's assets,
  native resolution without root hoisting, and the boundary walker's planted edges. The review
  recorded these failing identically on a clean `HEAD` worktree (`/var` vs `/private/var`, and the
  walker's type-declaration case), so they come from the tree, not from this story. They were not
  re-bisected here.
- No whole-tree run is claimed. A standalone story is verified on its own lane, and the full suite
  must not run on this machine. A first attempt to run the lane through
  `node scripts/test.mjs <file>` started the WHOLE suite, because that runner needs `--only` and
  ignores a bare path. It was stopped within the minute, under an isolated `AOF_GLOBAL_HOME`, and
  produced no result that is used here.

## Accept decision

Accepted 2026-11-14. Every `@executable` scenario has a green case, the one `@manual` scenario
passed against the real Discord channel, validate passes, and doctor reports no unresolved control.
No blocker finding is open and no human sign-off is required. The `/loop status` wording in task 00
E2 and in task 02 is a contract amendment carried to the retrospective (the intended command is
`/status`, which is what the tests run). It is not a defect in the delivered behaviour.
