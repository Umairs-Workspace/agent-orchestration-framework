Feature: A suite run starts the shard entry
  A test spawns the registry runner only when the runner is what it checks. A test that only needs
  one suite to run, and the Pages workflow's gate, start the shard entry instead.

  @executable @cli @work @work-stream
  Scenario: The Pages gate runs its control through the shard entry
    Given ".github/workflows/pages.yml"
    When its gate step is read
    Then it runs "node scripts/test-shard.mjs test/arch/loop/acd-loop-document-current.test.mjs" with an isolated AOF_GLOBAL_HOME
    And the step's exit status still decides the deploy job

  @executable @cli @work @work-stream
  Scenario: The site build's copy of the tree runs the gate as the workflow spells it
    Given the site-build suite's copy of the runnable tree
    When the gate command is run there exactly as the workflow spells it
    Then it exits 0 and runs every case of the control

  @executable @cli @work @work-stream
  Scenario Outline: A test that needs one suite run starts the shard entry
    Given the suite "<suite>"
    When it runs one suite to prove that suite runs
    Then the child it starts is "scripts/test-shard.mjs", not "scripts/test.mjs"

    Examples:
      | suite                               |
      | test/notify/notify-channels.test.mjs |
      | test/bundle/core-workspace.test.mjs  |

  @executable @cli @work @work-stream
  Scenario: Every spawn of the registry runner names its subject
    Given every suite file under "test/"
    When each spawn of "scripts/test.mjs" is found
    Then each one is on the allowlist, with the part of the runner it checks
    And the allowlist names no spawn that the tree no longer holds

  @executable @cli @work @work-stream
  Scenario: An unlisted spawn of the registry runner is caught
    Given a planted suite that spawns "node scripts/test.mjs --only" to run another suite
    When FF-16013 sweeps it
    Then it fails naming the planted file and line

  @manual @cli @work @work-stream
  Scenario: The three suites on the control node
    Given AOF_GLOBAL_HOME isolated
    When "site-build", "core-workspace" and "notify-channels" are each run alone through the shard entry, before and after this story
    Then VERIFICATION records each time, and every case passes in each run
