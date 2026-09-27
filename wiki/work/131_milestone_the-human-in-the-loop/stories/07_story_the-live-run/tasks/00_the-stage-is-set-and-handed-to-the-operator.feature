@manual @cli @work @work-stream
Feature: The stage is set and handed to the operator — the payload installed and read at the source, a fixture that asks three times and is stopped and resumed on the test-bed, the procedure in STATE.md, and NEEDS_INPUT

  WHY. The live run (task 01) needs a person at every leg. Only they may hold the bot token (stored
  once, machine-wide, with `aof messaging init discord`, ADR-007), invite the bot, name the channel
  and their own user id, restart the desktop app, see the Discord channel, and answer in their own
  words. An agent must not start a loop, a daemon or the desktop app
  (`.claude/rules/build-deploy-restart.md`). So this task is the agent's half, done in full and
  handed back. The builder installs, measures what it can at the source, lays down a fixture that
  will really ask, writes the procedure with its paste slots, and stops. It never moves the story to
  `in-review` on evidence it did not observe.

  A session asks only at a genuine judgment call (the threshold is out of scope for 131). So each
  asking story reserves one decision to the operator in its own task. The stories arrive refined,
  so every ask lands at BUILD, inside a lane: a refine-time ask holds the whole loop (ADR-004 §3),
  where "the other lanes keep building" cannot be shown. The fixture lives on the standing test-bed
  `C:\Source\umami\aof-test-repo`, never in this repository.

  The bot token is the credential (ADR-007 §1). The agent never reads it, prints it, writes it or
  asks for it, and never opens `~/.aof/messaging/discord.secret`. Its presence is checked only
  through `aof messaging status`. The channel id and the answer allowlist are not secrets (ADR-007
  §3, ADR-008 §3), but only the operator knows them, so they are the operator's precondition.

  RE-REFINED for the bot at `aof:verify 131` (2026-09-25), after 09–12 were accepted. It replaces
  the webhook-era contract of `3ba35a1`.

  Background:
    Given every `@executable` task of 131/01 to 131/06 and 131/08 to 131/12 is green and each of those stories is `done`
    And the builder works in the MAIN checkout `C:\Source\umami\aof`, never a dispatch worktree

  Scenario: the payload is installed from the main checkout and read at the source
    Given `src/` changed in 09 to 12, and neither `ui/`, the Rust app nor `scripts/sea-entry.mjs` changed since the last install
    When `node scripts/install-local.mjs --skip-ui` runs from the main checkout
    Then `~/.aof/bin/aof.exe --version` prints `0.1.0 (payload <buildId>)`, where `<buildId>` is the `buildId` in `~/.aof/bin/BUILD_ID.json`, and both are pasted
    And `aof work loop`'s usage line carries `[--hand-off]`, pasted
    And `~/.aof/bin/aof.exe messaging status`, run in the test-bed root, prints the bot's block (`env override AOF_DISCORD_BOT_TOKEN`), pasted
    And the desktop app is NOT restarted by the builder: STATE.md records "installed, restart pending (operator)"

  Scenario: the test-bed carries a fixture whose lanes ask three times and build once
    When the builder adds `03_story_bullet` to the test-bed's `03_milestone_ask-target`
    Then `03` holds four independent `not-started` stories, each one small helper with no `depends:` and one `@executable` task: `00_story_joiner`, `01_story_labeller`, `02_story_counter` and `03_story_bullet`
    And each story's `files:` names only its own `src/<helper>.mjs` and `test/<helper>.test.mjs`
    And `00_story_joiner` reserves the separator, `01_story_labeller` the case and `03_story_bullet` the marker to the operator, each in the words "recorded nowhere … ask the operator … before any code is written", while `02_story_counter` reserves nothing
    And `aof work validate 03` in the test-bed root prints `PASS`, pasted

  Scenario: the test-bed carries a supervised stop-and-resume target
    When the builder adds `04_milestone_resume-target` to the test-bed's stream
    Then it holds one refined `not-started` story, `00_story_reverser`, that reserves nothing
    And `aof work validate 04` prints `PASS`, and `aof work loop 04 --dry-run` names a drive of `04/00`, both pasted

  Scenario: the test-bed's config opens four lanes and keeps the discord channel for the operator to name
    When the builder sets `work.dispatch.concurrency` to 4 in the test-bed's `.aof/aof.config.json`
    Then `work.loop.concurrency` is `"refine_first"` and `aof work dispatch --list --json` answers `"bound": 4`, pasted
    And `work.notify.channels.discord` is `{ "type": "discord" }`, which `messaging status` reports as having no channel id, because the channel id is the operator's
    And the fixture and the config are committed on the test-bed's own branch, and `git status --short` in the test-bed is empty, pasted

  Scenario: the check stops for the operator with its procedure written down
    Given the four scenarios above are done and pasted
    When the builder reaches the end of this task
    Then the milestone `STATE.md` holds task 01's precondition and legs as a numbered procedure, with one empty paste slot per `Then` and `And` line of task 01, each slot naming the line it discharges
    And STATE.md names the loop scopes as `03` and `04` in the test-bed, never `00`
    And the builder's last line is `NEEDS_INPUT`, and 131/07 stays `in-progress` until every slot is filled
