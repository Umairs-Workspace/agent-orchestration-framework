@executable @cli @work @work-stream
Feature: the break-down drive carries --autonomous

  `decideLoopPhase` decides `refine` for a milestone with no stories (the break-down drive). It takes
  the resolved refine mode as the input `refine`, the same way it takes `concurrency`. Under
  `whole-item` that one decision gains `autonomous: true`. The drive then composes
  `/aof:refine <ref> --solo --autonomous`: the mode flag first, then `--autonomous`. That prompt
  is the cascade `aof:refine --autonomous` already performs: break down, then every story's contract.

  Every other decision is unchanged, and so is every decision under `per-story`. If a cascade dies
  part-way, the stories it left without tasks are refined by the ordinary per-story refine decisions,
  so the mode needs no resume logic of its own (ADR-002 §4).

  Scenario Outline: only the break-down decision carries the flag, and only under whole-item
    Given the loop input has `refine` <mode> and `concurrency` <concurrency>
    And the head is <head>
    When `decideLoopPhase` decides
    Then it decides <decision>

    Examples:
      | mode         | concurrency    | head                                         | decision                                                       |
      | `whole-item` | `sequential`   | milestone 143 with no stories                | `drive 143 refine`, with `autonomous: true`                    |
      | `whole-item` | `refine_first` | milestone 143 with no stories                | `drive 143 refine`, with `autonomous: true`                    |
      | `per-story`  | `sequential`   | milestone 143 with no stories                | `drive 143 refine`, with no `autonomous` key, as today         |
      | absent       | `sequential`   | milestone 143 with no stories                | `drive 143 refine`, with no `autonomous` key, as today         |
      | `whole-item` | `sequential`   | story 143/02 with no tasks                   | `drive 143/02 refine`, with no `autonomous` key                |
      | `whole-item` | `refine_first` | milestone 143 with stories, `unrefined` [143/02] | `drive 143/02 refine`, with no `autonomous` key            |
      | `whole-item` | `sequential`   | milestone 143 whose stories are all done     | `drive 143 verify`, with no `autonomous` key                   |

  Scenario Outline: the drive composes the flag after the mode flag
    Given `work.loop.agents.refine.mode` is <mode>
    When `aof work drive refine 143 <flags> --dry-run --json` runs
    Then the answer's `command` is `<command>`

    Examples:
      | mode             | flags          | command                                   |
      | unset            | `--autonomous` | `/aof:refine 143 --solo --autonomous`         |
      | `"orchestrated"` | `--autonomous` | `/aof:refine 143 --orchestrated --autonomous` |
      | unset            |                | `/aof:refine 143 --solo`                      |

  Scenario: the flag is refused on any phase but refine
    When `aof work drive continue 143 --autonomous --json` runs
    Then it refuses with the code `drive-autonomous-refine-only` before any run is minted

  Scenario Outline: the flag crosses both drive seams
    Given the loop decided `drive 143 refine` with `autonomous: true`
    When the drive is run <seam>
    Then the composed prompt is `/aof:refine 143 --solo --autonomous`

    Examples:
      | seam                                                                              |
      | in-process, lent `ctx.loopDrive.autonomous: true`                                 |
      | as a child, whose argv from `spawnLaneDrive` carries `--autonomous`               |

  Scenario: a cascade that died part-way is finished story by story
    Given `--refine whole-item`, and a break-down drive on 143 that wrote stories 00 and 01, gave 00 its tasks, and died
    When the loop decides its next act
    Then it decides `drive 143/01 refine`, with no `autonomous` key
    And it never decides a second autonomous refine on 143
