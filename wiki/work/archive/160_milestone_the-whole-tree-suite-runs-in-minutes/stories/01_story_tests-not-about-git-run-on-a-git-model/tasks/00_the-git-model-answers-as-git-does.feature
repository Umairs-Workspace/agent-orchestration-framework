Feature: The git model answers as git does
  An in-memory repository behind the loop's exec port. It answers in git's envelope, makes git's
  filesystem effects, refuses what it does not model, and is held to real git by a parity control.

  @executable @cli @work @work-stream
  Scenario: A worktree added on the model holds the commit's files
    Given a model seeded from a fixture stream with one commit on "main"
    When the port runs "worktree add -b aof/07-01 <lane> HEAD" in the primary
    Then the lane directory holds every file of that commit, byte for byte
    And "worktree list --porcelain" names the primary first and the lane second

  @executable @cli @work @work-stream
  Scenario: Status reports what changed on disk since HEAD
    Given a lane added on the model
    When a story file in the lane is rewritten and a new file is created beside it
    Then "status --porcelain --untracked-files=all" in the lane lists the change as " M" and the new file as "??"

  @executable @cli @work @work-stream
  Scenario: A commit on a lane fast-forwards home
    Given a lane on the model with one committed change
    When the primary runs "merge --ff-only aof/07-01"
    Then "rev-parse HEAD" in the primary answers the lane's tip
    And the primary's directory holds the lane's change

  @executable @cli @work @work-stream
  Scenario Outline: Anything unmodelled is refused by name
    Given a model seeded from a fixture stream
    When the port runs "<argv>"
    Then it throws an error naming "<argv>" and saying the model does not answer it
    And nothing on disk changed

    Examples:
      | argv                     |
      | rebase main              |
      | stash push               |
      | log --graph --oneline    |
      | merge --no-ff aof/07-01  |

  @executable @cli @work @work-stream
  Scenario: The parity control holds the model to real git
    Given the parity script of init, commit, branch, worktree add, write, status, add, commit, merge-base, merge --ff-only and worktree remove
    When the script runs against real git in a temp directory and against the model
    Then after every step both answer the same status and the same stdout
    And both directories hold the same files with the same bytes

  @executable @cli @work @work-stream
  Scenario: Every verb the model answers has a parity row
    Given the verbs the model answers
    When the parity control lists the verbs its script exercises
    Then no verb the model answers is missing from the script
