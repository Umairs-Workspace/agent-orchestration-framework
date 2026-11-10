Feature: A test run trusts folders in its own claude home
  claude's folder trust is written into a claude config file. A test process writes it into a claude
  home of its own, so a run never reads or writes the operator's ~/.claude.json, and its cost does not
  grow with that file.

  @executable @cli @work @work-stream
  Scenario Outline: The trust writer chooses its home
    Given a trust write for a new folder with <home given> and AOF_TEST_CLAUDE_HOME <variable>
    When the folder is trusted
    Then the trust is written in <written in>

    Examples:
      | home given     | variable              | written in            |
      | a home option  | naming another folder | the home option       |
      | no home option | naming a test folder  | the test folder       |

  @executable @cli @work @work-stream
  Scenario: Every test process has a claude home of its own
    Given a test process started with AOF_TEST_CLAUDE_HOME unset
    When the test harness loads
    Then AOF_TEST_CLAUDE_HOME names a new folder under the system temporary directory
    And that folder is removed when the process exits

  @executable @cli @work @work-stream
  Scenario: Each unit of a sharded run has its own claude home
    Given the sharded runner starting a unit
    Then the unit's AOF_TEST_CLAUDE_HOME is the unit's own home, the same folder as its AOF_GLOBAL_HOME

  @manual
  Scenario: A whole-tree run leaves the operator's claude config alone
    Given the operator's ~/.claude.json and the number of its project entries
    When a whole-tree sharded run completes on the control node
    Then no project entry has been added for a test folder
