@executable @cli @work @work-stream
Feature: each drive runs on its own phase's choice

  The loop reaches a session three ways: the in-process drive (`ctx.loopDrive`), the primary's child
  drive (`drivePhaseInChild`, `packages/work-loop/src/cycle.mjs`) and a wave lane's child
  (`packages/work-loop/src/wave.mjs`). Each drive is lent only the parts of ITS OWN phase's choice
  that came from a flag (ADR-004 §4). A child gets them as `--model <id>` and `--thinking <level>` on
  the argv built by `spawnLaneDrive`. A part resolved from config or the default is not lent. The
  drive resolves it from the same config, so 141's "with no flag the loop passes nothing" stays true.

  `aof work drive <phase> <ref>` gains a single-phase `--model <id>`. The drive resolves in this
  order: its own flag, then the loop's lend (`ctx.loopDrive.model` / `.thinking`), then
  `work.agents.session`, then the default. The spawned `claude` carries `--model` only when a model
  resolves, and `--effort` always.

  Scenario Outline: each phase's drive is lent its own flag parts and nothing else
    Given `work.agents.session.effort.continue` is `"medium"` and nothing else is configured
    When `aof work loop 143 --model refine=opus:xhigh --model verify=fable` drives a <phase>
    Then the child drive's argv carries <argv>
    And the spawned `claude` launches with <launch>

    Examples:
      | phase    | argv                                    | launch                              |
      | refine   | `--model opus --thinking xhigh`         | `--model opus --effort xhigh`       |
      | continue | neither `--model` nor `--thinking`      | no `--model`, and `--effort medium` |
      | verify   | `--model fable`, and no `--thinking`    | `--model fable --effort high`       |

  Scenario Outline: the lend reaches every seam
    Given `aof work loop 143 --model continue=sonnet:low` is running
    When a continue drive runs <seam>
    Then the session launches with `--model sonnet --effort low`

    Examples:
      | seam                                                                     |
      | in-process, reading `ctx.loopDrive.model` and `ctx.loopDrive.thinking`   |
      | as the primary's child drive                                             |
      | as a wave lane's child drive                                             |

  Scenario: with no session flag the loop lends nothing, as in 141
    Given `work.agents.session.models.refine` is `"opus"`
    When `aof work loop 143` drives a refine and a continue
    Then no child drive's argv carries `--model` or `--thinking`
    And the refine session launches with `--model opus` and the continue session with no `--model`

  Scenario Outline: the drive's own --model resolves over the lend and the config
    Given `work.agents.session.models.verify` is `"opus"`
    When `aof work drive verify 143 <flags> --dry-run --json` runs <lend>
    Then the answer's `model` is <model>

    Examples:
      | flags            | lend                                   | model                                    |
      |                  | with no lend                           | `{ "id": "opus", "source": "config" }`   |
      | `--model fable`  | with no lend                           | `{ "id": "fable", "source": "--model" }` |
      |                  | lent `ctx.loopDrive.model` `"sonnet"`  | `{ "id": "sonnet", "source": "--model" }` |
      | `--model fable`  | lent `ctx.loopDrive.model` `"sonnet"`  | `{ "id": "fable", "source": "--model" }` |

  Scenario: the drive's dry run reports no model when none resolves
    Given `work.agents.session.models` is unset
    When `aof work drive continue 143 --dry-run --json` runs
    Then the answer's `model` is `null`, and its `effort` is `{ "level": "high", "source": "default" }` as before
