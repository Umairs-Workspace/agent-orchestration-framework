Feature: A real-git fixture starts from a template
  A test whose subject is git keeps real git, but its fixture no longer initialises and configures
  a repository for every case. One template repository is built per process and copied, and the copy
  is held to an init-built repository.

  @executable @cli @work @work-stream
  Scenario: A template-built repository is indistinguishable from an init-built one
    Given one repository built by "init -b main" and the fixture identity
    And one repository copied from the process's template
    When the same files are added and committed in each
    Then "config --list --local", "symbolic-ref HEAD", "status --porcelain" and "ls-tree -r HEAD" answer the same in both

  @executable @cli @work @work-stream
  Scenario: The template is built once per process
    Given a spawn-counting git port
    When three repositories with one commit each are built through the template helper in one process
    Then "init" ran once and "config" ran only while the template was built
    And each repository cost exactly one "add" and one "commit"

  @executable @cli @work @work-stream
  Scenario: Two fixtures copied from one template share nothing
    Given two fixtures copied from the same template
    When a commit lands in the first
    Then the second's HEAD, branches and files are unchanged

  @executable @cli @work @work-stream
  Scenario Outline: Each real-git fixture builds from the template
    Given the fixture "<fixture>"
    When it builds its repository
    Then it copied the template and made no "init" and no "config" call of its own

    Examples:
      | fixture                                 |
      | test/support/loop/lane-fixture.mjs      |
      | test/support/dispatch-lane-fixture.mjs  |
      | test/support/gate-propagation-fixture.mjs |
      | test/support/mesh-assign-fixture.mjs    |

  @manual @cli @work @work-stream
  Scenario: The real-git suites' setup cost on the control node
    Given AOF_GLOBAL_HOME isolated and a spawn-counting preload
    When "work-dispatch-lanes", "gate-propagation-refusals-leave-branch" and "blocked-run-parking" are each run alone through the shard entry, before and after this story
    Then VERIFICATION records each suite's wall time and its init, config, add and commit counts, and every case passes in each run
