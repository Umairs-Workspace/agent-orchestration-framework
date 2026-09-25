@manual @cli @work @work-stream
Feature: The stage is set and handed to the operator — the payload installed and read at the source, a fixture that asks on the test-bed, the procedure in STATE.md, and NEEDS_INPUT

  WHY. The live run (task 01) needs a person at every leg: a user env var only they may hold, a
  desktop restart only they may make, a Discord channel only they can see, and two answers in
  their own words. An agent must not start a loop, a daemon or the desktop app
  (`.claude/rules/build-deploy-restart.md`). So this task is the agent's half, done in full and
  then handed back. The builder installs, measures what it can at the source, lays down a fixture
  that will really ask, writes the procedure with its paste slots, and stops. It never moves the
  story to `in-review` on evidence it did not observe.

  A session asks only at a genuine judgment call (the threshold is out of scope for 131). So the
  fixture reserves one decision to the operator in each asking story's task, where the build
  session reads it before writing code. The stories arrive already refined, so every ask lands at
  BUILD, inside a lane. Under `refine_first`, REFINE runs in the primary one story at a time, and
  an ask there holds the whole loop until it is answered (ADR-004 §3). That is the one place where
  "the other lanes keep building" cannot be shown. The fixture lives on the standing test-bed
  `C:\Source\umami\aof-test-repo`, never in this repository: a loop there mutates items, opens
  lanes and commits.

  The webhook URL is the credential (ADR-005 §1). The agent never reads it, prints it, writes it
  or asks for it. Only its presence is ever checked.

  Background:
    Given every `@executable` task of 131/01 to 131/06 is green and each of those stories is `in-review` or `done`
    And the builder works in the MAIN checkout `C:\Source\umami\aof`, never a dispatch worktree, because a worktree has no `ui/node_modules`

  Scenario: the payload is installed from the main checkout and read at the source
    Given `ui/` changed in 05 and `src/` in 01 to 05, while neither the Rust app nor `scripts/sea-entry.mjs` changed
    When `node scripts/install-local.mjs` runs from the main checkout, with no `--skip-ui`, no `--desktop` and no `--sea`
    Then `~/.aof/bin/aof.exe --version` prints `0.1.0 (payload <buildId>)`, where `<buildId>` is the `buildId` in `~/.aof/bin/BUILD_ID.json`, and both are pasted
    And `aof work answer --help` prints the verb's usage with `[--as <actor>]`, and `aof work loop --help` prints `[--stop]`, both pasted
    And the desktop app is NOT restarted by the builder: STATE.md records "installed, restart pending (operator)"

  Scenario: the test-bed carries a refined fixture milestone whose lanes will ask twice and build once
    When the builder adds `03_milestone_ask-target` to the test-bed's stream
    Then it holds three independent `not-started` stories, each one small helper function with no `depends:`: `00_story_joiner`, `01_story_labeller` and `02_story_counter`
    And each story is already refined: one `@executable` task `.feature` under its `tasks/`, listed in its STORY.md `## Tasks`, so the loop's REFINE phase takes none of them and BUILD drives all three in lanes
    And each story's `files:` names only its own `src/<helper>.mjs` and `test/<helper>.test.mjs`, so no two stories share a declared file and one wave admits all three
    And the task of `00_story_joiner` states that the separator `joinWords` uses is the operator's decision, is recorded nowhere, and must be asked for before any code is written, and no scenario, example or note in the fixture spells a separator
    And the task of `01_story_labeller` reserves the label's case (upper, lower or title) to the operator in the same words, and nothing in the fixture spells a case
    And the task of `02_story_counter` reserves nothing, so the lane that drives it never asks
    And `aof work validate 03`, run in the test-bed root, reports no errors, and its output is pasted

  Scenario: the test-bed's config turns on the lanes and a Discord channel that names only the env var
    When the builder edits the test-bed's `.aof/aof.config.json`
    Then `work.loop.concurrency` is `"refine_first"`
    And neither `work.loop.dispatch.concurrency` nor `work.dispatch.concurrency` is set below 3, so the three lanes open together while two of them wait
    And `work.notify` is `{ "channels": { "discord": { "type": "discord" } } }`, so `urlEnv` takes its default `AOF_DISCORD_WEBHOOK_URL`, and no `url`, `webhook` or `token` key appears
    And the fixture and the config are committed on the test-bed's own branch, and `git status --short` in the test-bed is empty, pasted

  Scenario: no webhook URL is written anywhere
    When `git grep -n "discord.com/api/webhooks"` runs in the main checkout and in the test-bed
    Then both print nothing and exit 1, pasted
    And no transcript line, STATE.md line or command the builder ran contains the value of `AOF_DISCORD_WEBHOOK_URL`

  Scenario: the check stops for the operator with its procedure written down
    Given the four scenarios above are done and pasted
    When the builder reaches the end of this task
    Then the milestone `STATE.md` holds task 01's precondition and legs as a numbered procedure, with one empty paste slot per `Then` and `And` line of task 01, each slot naming the line it discharges
    And STATE.md names the loop scope as `03` in the test-bed, never `00`, whose items have no stories on disk
    And the builder's last line is `NEEDS_INPUT`, and 131/07 stays `in-progress` until every slot is filled
