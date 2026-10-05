@executable @docs @work @distribution
Feature: aof:code-review is removed, with the shipping it existed for

  WHY. The operator: a PR check command is too much, and it has never been used. `aof:code-review`
  committed, pushed, opened a PR, reviewed it and had a developer fix the findings. Its review half
  now lives in `aof:review`. Its shipping half goes, and with it `aof:autonomous --ship` and
  `work.codeReview.autoComplete`, which existed only to run it.

  Removal reaches other repositories through `aof work update`. The apply engine classifies a
  render whose member has left the bundle as `delete` against the lock, so no new pruning is
  written. The schema never declared `work.codeReview`, so the schema does not change.

  The bundle rows land in `packages/core/test/bundle.suite.mjs`. The autonomous rows land in
  `test/loop/autonomous-shell-out-prompt.test.mjs` and `test/arch/loop/acd-loop-cap-single-home.test.mjs`.

  Rule: R4 · aof:code-review is removed, with the shipping it existed for

    Scenario: E12 · an update deletes the code-review renders a repository already has
      Given a scratch repository whose lock records the three code-review renders from an earlier bundle
      When `aof work update --dry-run --json` runs there with this bundle
      Then `.claude/commands/aof/code-review.md`, `.codex/skills/aof-code-review/SKILL.md` and `.opencode/commands/aof/code-review.md` are each reported `delete`
      And `packages/core/assets/bundle.json` lists no `code-review` member, and lists `review`
      And `packages/core/assets/manifest.json` holds no entry for `code-review`
      And `packages/core/assets/commands/code-review.md` does not exist

    Scenario: E13 · aof:autonomous takes no --ship
      When the bundle member `autonomous` is loaded
      Then its argument hint is `<range — NN-MM or NN> [--max-attempts N] [--solo]`
      And its body names neither `--ship`, `aof:code-review` nor `work.codeReview.autoComplete`
      And the config keys its body names are `work.agents`, `work.agents.mode`, `work.dispatch.concurrency`, `work.loop.agents.continue.mode`, `work.loop.agents.refine.mode`, `work.loop.concurrency` and `work.loop.dispatch.concurrency`

    Scenario Outline: nothing in the repository still points at the removed command
      When `<file>` is read
      Then it names neither `aof:code-review` nor `codeReview`

      Examples:
        | file                                               |
        | packages/core/assets/commands/assimilate-code.md   |
        | packages/core/assets/commands/autonomous.md        |
        | README.md                                          |
        | docs/acd.md                                        |
        | .aof/aof.config.json                               |

    Scenario: assimilate-code hands its reviewed story to verify
      When `packages/core/assets/commands/assimilate-code.md` is read
      Then its closing next step names `aof:verify <ref>` where it named `aof:code-review`

    Scenario: the controls pinned on the removed command are retired with it
      When the controls that read bundle commands are run
      Then `acd-prompt-bounds-name-their-home` holds no row for `commands/code-review.md`
      And `story-context-contract` reads no `commands/code-review.md`
      And the learning-edge control holds no exclusion for `code-review.md`
      And the bundle source-tree id list holds `review` and no `code-review`
      And each passes
