@manual @cli @work @work-stream
Feature: The deployed verb agrees with the ask files on the control node

  WHY. Green suites run against fixtures; the operator reads the verb against the live ask store.
  After the payload lands, the rows the real binary prints are checked against the files on disk.

  Scenario: the deployed verb agrees with the ask files on the control node
    Given the payload carrying this story is installed with "node scripts/install-local.mjs --skip-ui"
    And "~/.aof/bin/aof.exe --version" reports that payload's build id
    When "aof work questions --all --json" is run on the control node
    Then every row from this machine names by its runId a file under "~/.aof/mesh/loop-asks/" whose state is waiting or parked
    And every waiting or parked ask file that is the latest for its workspace and ref has a row
