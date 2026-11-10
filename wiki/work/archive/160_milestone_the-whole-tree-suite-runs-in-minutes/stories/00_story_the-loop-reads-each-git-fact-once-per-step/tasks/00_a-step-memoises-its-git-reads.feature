Feature: A step memoises its git reads at the exec port
  One loop step asks git each ref or topology question once. The memo sits on the port the loop
  already uses, keeps only answers that cannot change without a write, and forgets everything the
  moment anything writes.

  @executable @cli @work @work-stream
  Scenario: A repeated ref read in one step reaches git once
    Given a memoised port over a counting exec
    When the step asks "rev-parse HEAD" in the primary three times
    Then the counting exec saw "rev-parse HEAD" once
    And all three answers are the same envelope

  @executable @cli @work @work-stream
  Scenario Outline: Only the ref and topology verbs are kept
    Given a memoised port over a counting exec
    When the step asks "<argv>" in the primary twice
    Then the counting exec saw it <calls>

    Examples:
      | argv                              | calls |
      | rev-parse HEAD                    | once  |
      | symbolic-ref --quiet --short HEAD | once  |
      | merge-base HEAD main              | once  |
      | show-ref --verify refs/heads/main | once  |
      | rev-list --count main..HEAD       | once  |
      | worktree list --porcelain         | once  |
      | status --porcelain                | twice |
      | diff --cached --name-only         | twice |
      | log --format= -1                  | twice |
      | check-ignore -- .claude/x.mjs     | twice |

  @executable @cli @work @work-stream
  Scenario Outline: Any other verb clears the memo before it runs
    Given a memoised port that has answered "rev-parse HEAD" in the primary and in a lane
    When the step runs "<write>" in <where>
    And the step asks "rev-parse HEAD" in the primary and in the lane again
    Then the counting exec saw "rev-parse HEAD" twice in each tree

    Examples:
      | write                                         | where       |
      | add -A                                        | the lane    |
      | -c user.name=aof-mesh commit -q -m wave       | the lane    |
      | merge --ff-only lane                          | the primary |
      | worktree add -b aof/07-01 ../lane HEAD        | the primary |
      | reset -q -- wiki                              | the primary |
      | frobnicate --now                              | the lane    |

  @executable @cli @work @work-stream
  Scenario: A failed read is asked again
    Given a memoised port over an exec that answers "rev-parse HEAD" with status 128 once, then 0
    When the step asks "rev-parse HEAD" twice
    Then the first answer has status 128 and the second has status 0
    And the counting exec saw "rev-parse HEAD" twice

  @executable @cli @work @work-stream
  Scenario: The same argv in two trees is two facts
    Given a memoised port over a counting exec
    When the step asks "rev-parse HEAD" in the primary and in a lane
    Then the counting exec saw "rev-parse HEAD" once in each tree
