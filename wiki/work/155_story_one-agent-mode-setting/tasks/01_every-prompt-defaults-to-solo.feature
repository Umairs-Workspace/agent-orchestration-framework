@executable @cli @work @work-stream
Feature: R2 · every hand-run command defaults to solo, and says what the loop composes

  WHY. Each command prompt resolves its own execution mode from `work.agents.mode`, and today an
  unset key means something different per command: refine runs solo, while continue, review,
  assimilate-code and migrate run orchestrated (`packages/core/assets/commands/*.md`). The schema
  description of `work.agents.mode` repeats the split and says the loop never reads it. After this
  task every role-spawning command states the one default, solo, and the prompts and schema state
  the loop's chain from task 00.

  `--solo` and `--orchestrated` still override for one run. Verify is deliberately out (Q1): it
  reads no mode today and keeps spawning its QA, designer and developer roles. The mesh worker's
  directive stays flagless, so a worker's continue follows the prompt's default like a hand-run.

  This supersedes 140/00's "an unset `work.agents.mode` resolves to the command's own default".
  140's delivered feature stays untouched; the test cases that pin it are re-pointed here.

  Rule: R2 · A hand-run session takes work.agents.mode, then solo, for every command

    Background:
      Given the bundled command prompts under `packages/core/assets/commands/` after this task

    Scenario: E5 · an unset work.agents.mode runs a hand-typed continue solo
      When the `<config>` block of `continue.md` is read
      Then it states "An unset `work.agents.mode` resolves to solo"
      And it states that `work.agents.mode: "orchestrated"` resolves to orchestrated
      And it no longer states that an unset `work.agents.mode` resolves to orchestrated

    Scenario Outline: E6 · every other role-spawning command defaults to solo
      When the execution-mode statement of `<prompt>` is read
      Then it states that an unset `work.agents.mode` resolves to solo
      And it does not route an unset or unrecognised value to orchestrated

      Examples:
        | example | prompt             |
        | E6      | review.md          |
        | E6      | assimilate-code.md |
        |         | migrate.md         |
        |         | refine.md          |
        |         | autonomous.md      |

    Scenario: E7 · a flag still overrides the configured mode for one run
      When the `<config>` block of `continue.md` is read
      Then it states that `--orchestrated` overrides a solo config to orchestrated for this run
      And it states that `--solo` overrides an orchestrated config to solo for this run
      And it states that the two together are contradictory and stop before any role runs

    Scenario: E8 · the mesh worker's directive stays flagless
      When `assignmentDirectiveCommand("continue", "12/03")` is called
      Then it answers `/aof:continue 12/03`, with no mode flag

    Scenario: E11 · verify reads no mode and keeps spawning its roles
      When `verify.md` is read
      Then it names neither `work.agents.mode` nor `--solo` nor `--orchestrated`
      And its argument hint is unchanged by this story

    Scenario Outline: the loop-driven prompts name the chain and its home
      When the `<config>` block of `<prompt>` is read
      Then it states that the loop composes a flag on every <phase> it drives: `work.loop.agents.<phase>.mode` when set, else `work.agents.mode`, else `solo`
      And it names `packages/contracts/src/agent-mode.mjs` as the default's home
      And it no longer states that a loop-driven <phase> never reads `work.agents.mode`

      Examples:
        | prompt      | phase    |
        | refine.md   | refine   |
        | continue.md | continue |

    Scenario: the autonomous prompt names the chain beside the loop's other keys
      When the `<config>` paragraph of `autonomous.md` that names `work.loop.concurrency` is read
      Then it states that `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode` fall back to `work.agents.mode`, then to `solo`
      And it no longer states that they do not fall back to `work.agents.mode`
      And it still states that `work.loop.dispatch.concurrency` falls back to its workspace twin `work.dispatch.concurrency`
      And every `work.loop.*` key it names still resolves through `LOOP_BOUND_VALUE_RESOLVERS`

    Scenario: the schema describes one default and the chain
      When `schemas/aof.schema.json` is read
      Then the description of `work.agents.mode` states that an unset key resolves to solo for every command
      And it states that a loop-driven session uses `work.loop.agents.<phase>.mode` when set and this key otherwise
      And the descriptions of `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode` state that an unset key falls back to `work.agents.mode`

    Scenario: the renders, the manifest and the lock agree with the source
      When `aof work update --dry-run --json` runs in this repository
      Then it reports no created, updated, deleted or drifted file
      And each of the six changed prompts' Claude, Codex and OpenCode renders states that an unset `work.agents.mode` resolves to solo
      And `packages/core/assets/manifest.json` equals a freshly generated manifest
