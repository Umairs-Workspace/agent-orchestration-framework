@executable @cli @work @work-stream
Feature: the read-only doors never promote

  A promotion is a write: it mints a number and moves a folder. `--dry-run` is the loop's read-only
  probe. `--stop`, `--hand-off` and `--resume` act on a loop that is already running or was already
  declared. None of them may mint (ADR-001 §4). A backlog slug cannot name a running loop, because a
  loop runs at a number.

  Scenario: a dry run says it would promote, and writes nothing
    Given `widget-sync` is a backlog milestone
    When `aof work loop widget-sync --dry-run --json` runs
    Then the probe carries `wouldPromote` `"widget-sync"`
    And `widget-sync` is still in the backlog, the stream's numbering is unchanged, and no run record is written

  Scenario Outline: a door that acts on a running loop refuses a backlog slug
    Given `widget-sync` is a backlog milestone
    When `aof work loop widget-sync <flag> --json` runs
    Then it refuses with the code `loop-backlog-ref-not-running`
    And the message names `aof work loop widget-sync` as the way to start it
    And `widget-sync` is still in the backlog

    Examples:
      | flag       |
      | --stop     |
      | --hand-off |
      | --resume   |

  Scenario: after the promotion, the resume names the number
    Given `aof work loop widget-sync` promoted `widget-sync` to `144` and then halted
    When `aof work loop 144 --resume --json` runs
    Then it resumes the declaration whose `promotedFrom` is `"widget-sync"`
    And nothing is promoted again
