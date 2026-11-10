Feature: Citation history is a lazy source
  Doctor, validate and tune resolve every citation on disk first, and read git history once, only
  when at least one citation is missing from the tree. Every finding stays what it was.

  @executable @cli @work @work-stream
  Scenario: Building the loader runs nothing
    Given the git spawns are counted
    When readRenameMap is called for a checkout
    Then no git process was started

  @executable @cli @work @work-stream
  Scenario: Loading twice reads history once
    Given a history loader for a checkout with one recorded rename
    When load() is called twice
    Then the two "log" walks and the "diff" each ran once
    And both calls answer the same map

  @executable @cli @work @work-stream
  Scenario Outline: A command over a stream whose citations all resolve spawns no git for history
    Given a fixture stream whose every citation names a file that exists
    And the git spawns are counted
    When "<command>" runs over it
    Then no "log" walk, no history "diff" and no "rev-parse HEAD" for the memo was spawned

    Examples:
      | command          |
      | aof work doctor  |
      | aof work validate |

  @executable @cli @work @work-stream
  Scenario: A citation of a renamed file still resolves through history
    Given a checkout where "src/old.mjs" was renamed to "src/new.mjs" in a commit
    And a story cites "src/old.mjs"
    When doctor runs
    Then history was read once
    And the citation resolves to "src/new.mjs" exactly as it did before this story

  @executable @cli @work @work-stream
  Scenario: A citation history cannot resolve reports as it did
    Given a story citing "src/never-existed.mjs" in a checkout with no such rename
    When validate runs
    Then the finding for that citation is byte-identical to the finding before this story

  @executable @cli @work @work-stream
  Scenario: A directory that is not a checkout still answers an empty map, and only on a miss
    Given a fixture stream outside any git checkout, citing one missing file
    When doctor runs
    Then the miss is reported as it was, and no error is raised

  @manual @cli @work @work-stream
  Scenario: The spawn counts on the control node
    When "aof work doctor 160", "aof work validate 160" and one loop-command-wave case are profiled before and after this story
    Then VERIFICATION records the git spawn counts, and the --json findings are identical
