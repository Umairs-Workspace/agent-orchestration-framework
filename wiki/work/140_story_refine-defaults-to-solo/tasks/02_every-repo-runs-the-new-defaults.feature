@manual @cli @work @distribution
Feature: every repository the operator names runs the new defaults — its pins removed, its prompts re-rendered

  A default only governs a repository that does not pin the old behaviour. This one pins it in
  `.aof/aof.config.json` (`work.agents.mode: "orchestrated"` and `work.loop.agents.refine.mode:
  "orchestrated"`), so neither task 00 nor task 01 changes what runs here until those keys are
  removed. The operator's other repositories may carry the same pins, and each one's rendered
  `refine` / `continue` prompts still state the old default until `aof work update` runs there.

  The operator names the repositories at build time; this repository is always the first. The
  sweep REMOVES the mode keys rather than setting them to the new values, so every repository
  follows the defaults from then on. `work.agents.mode` is removed whatever its value, because a
  `"solo"` pin would keep a hand-run continue solo, which the operator does not want.

  Evidence is recorded in this story's `VERIFICATION.md`: one row per repository with its path,
  each key removed with its prior value, and the `aof work update` summary. `.aof/` is reset by a
  lane's reconcile, so this repository's config change is committed by hand on the story branch.

  Background:
    Given tasks 00 and 01 are built and the `aof` on PATH renders from this tree

  Scenario: the operator approves the removals before anything is written
    Given the operator's list of repositories, this one first
    When each repository's `.aof/aof.config.json` is read
    Then the per-repository list of `work.agents.mode`, `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode` values is shown to the operator
    And no file is written until the operator approves that list

  Scenario: each repository's config carries no mode pin and nothing else changed
    When the approved removals have been applied
    Then each repository's `.aof/aof.config.json` carries none of the three mode keys
    And a key-by-key comparison against its prior content shows only those removals
    And an emptied `work.loop.agents` object is removed rather than left as `{}`
    And `aof project validate --json` in the repository reports no error

  Scenario: each repository's prompts are re-rendered
    When `aof work update` has run in the repository
    Then a following `aof work update --dry-run --json` reads `updated` 0 and `drift-warning` 0
    And its rendered `.claude/commands/aof/refine.md` states that an unset `work.agents.mode` resolves to solo

  Scenario: this repository's live drive composes solo for both phases
    When `aof work drive refine 140 --dry-run --json` and `aof work drive continue 140 --dry-run --json` run at this repository's root
    Then the first answers `/aof:refine 140 --solo` and the second `/aof:continue 140 --solo`
