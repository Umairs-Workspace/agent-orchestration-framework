@executable @cli @work @work-stream
Feature: aof work loop --thinking sets the effort of every session the loop drives

  The loop reaches a session three ways: the sequential child drive (`drivePhaseInChild`,
  `src/loop/cycle.mjs`), a wave lane's child (`src/loop/wave.mjs`) and the in-process drive
  (`ctx.loopDrive`, the tests' path). All three go through `spawnLaneDrive`
  (`src/loop/child-drive.mjs`) or `work:drive-<phase>`. After this task a `--thinking <level>`
  on the loop reaches every one of them, and it overrides every phase's configured effort for
  that run. With no flag the loop passes nothing, and each drive resolves its own phase's effort
  (task 00: config, else `high`).

  The level lands in the loop DECLARATION as its tenth key, `thinking`, following the rule
  level, cap and supervised already follow: an explicit flag wins on `--resume`, and an absent one
  inherits. That is what carries it through a supervisor relaunch, which always resumes. A
  declaration already on disk has no `thinking` key and stays usable: the usability rule stays at
  its five keys, and the missing key reads as no override.

  The flag lands in the three homes every loop flag lands in: the input schema, `cli.spec.flags`
  and `cli.argv`.

  Scenario: the flag reaches every drive the loop makes
    When `aof work loop 141 --thinking extra-high` drives a refine, a continue and a verify
    Then every child drive's argv carries `--thinking xhigh`
    And a wave lane's child drive argv carries `--thinking xhigh`
    And an in-process drive reads `ctx.loopDrive.thinking` as `xhigh`
    And no directive typed into a session carries a `--thinking` token

  Scenario: with no flag the loop passes nothing and each phase resolves its own
    Given `work.agents.session.effort.refine` is `"medium"`
    When `aof work loop 141` drives a refine and a continue
    Then no child drive's argv carries `--thinking`
    And the refine session launches at `--effort medium` and the continue session at `--effort high`

  Scenario Outline: the declaration carries the level, and a resume inherits it unless told otherwise
    Given the loop was launched with <launched>
    When it is resumed with <resumed>
    Then the resumed declaration's `thinking` is <declared>
    And each drive after the resume carries <argv>

    Examples:
      | launched                 | resumed                           | declared  | argv                 |
      | `--thinking extra-high`  | `--resume`                        | `"xhigh"` | `--thinking xhigh`   |
      | `--thinking extra-high`  | `--resume --thinking medium`      | `"medium"`| `--thinking medium`  |
      | no flag                  | `--resume`                        | `null`    | no `--thinking`      |
      | no flag                  | `--resume --thinking high`        | `"high"`  | `--thinking high`    |

  Scenario: a declaration written before this story resumes with no override
    Given a stored loop declaration with the nine keys and no `thinking`
    When `aof work loop 141 --resume` runs
    Then the declaration is usable and its recovered `thinking` is `null`
    And no drive carries `--thinking`

  Scenario: the loop says what effort it is driving at
    When `aof work loop 141 --thinking extra-high` starts
    Then before its first drive it narrates `Thinking: xhigh for every phase (--thinking).`
    And with no flag and `work.agents.session.effort.refine` set to `"medium"` it narrates `Thinking: refine medium (config), continue high (default), verify high (default).`

  Scenario: an unknown level refuses at the loop's door
    When `aof work loop 141 --thinking turbo` runs
    Then it refuses with the code `thinking-unknown-level` before any registered read
    And no declaration and no run record is written

  Scenario: the usage line names the flag
    When `aof work loop --help` is read
    Then the usage line carries `[--thinking LEVEL]`
    And the flag's description names `extra-high` as `xhigh` and says it overrides every phase for this run
