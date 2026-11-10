Feature: The git model merges a lane home
  The in-memory git model answers `merge --no-ff` exactly as real git does, so a loop case that ends
  in a merge home can run on the model. A case moves only when it passes there and its subject is
  not git's own behaviour.

  @executable @cli @work @work-stream
  Scenario Outline: A merge home answers and writes as real git
    Given a primary on "main" and a lane branch "<lane>" that <change>
    When "merge --no-ff <lane>" runs in the primary on real git and on the model
    Then both answer the same status and the same stdout
    And both leave the same files in the primary and the same parents on its new HEAD

    Examples:
      | lane       | change                                                   |
      | aof/53-00  | adds a file the primary does not have                    |
      | aof/53-01  | edits a file the primary has not changed since the base  |
      | aof/53-02  | deletes a file the primary has not changed since the base |
      | aof/53-03  | adds a file while the primary added a different file since the base |

  @executable @cli @work @work-stream
  Scenario Outline: A merge the model does not model is a thrown error, never an answer
    Given a primary on "main" and a lane branch "aof/53-04"
    And <situation>
    When the model is sent "<argv>"
    Then it throws an error naming "<argv>"<and the path>
    And the primary's HEAD and files are unchanged

    Examples:
      | situation                                                    | argv                     | and the path                     |
      | both sides changed "src/shared.mjs" since the base          | merge --no-ff aof/53-04  | , and naming "src/shared.mjs"    |
      | both sides changed "src/shared.mjs", in different regions   | merge --no-ff aof/53-04  | , and naming "src/shared.mjs"    |
      | nothing else                                                 | merge --squash aof/53-04 |                                  |

  @executable @cli @work @work-stream
  Scenario: The moved cases are pinned and still pass
    Given the loop suites' cases marked to run on the model
    When FF-16002's moved list is compared with the cases marked "git: \"fake\""
    Then the two lists are equal
    And every case on the list passes on the model

  @executable @cli @work @work-stream
  Scenario Outline: A case whose subject is git stays on real git
    Given a loop case whose assertion is about <subject>
    When the cases are sorted by ADR-002's rule
    Then it stays on real git

    Examples:
      | subject                                           |
      | the commit graph a merge home leaves              |
      | a worktree being reused or refused                |
      | the cleanup of a lane's branch and directory      |
      | git reached through a seam other than the loop's port |

  @manual @cli @work @work-stream
  Scenario: The loop suites' git calls on the control node
    Given AOF_GLOBAL_HOME isolated and a spawn-counting preload
    When "loop-command-wave", "loop-command-reconcile" and "loop-command-stops" are each run alone through the shard entry, before and after this story
    Then VERIFICATION records each suite's wall time and git call count, and every case passes in each run
