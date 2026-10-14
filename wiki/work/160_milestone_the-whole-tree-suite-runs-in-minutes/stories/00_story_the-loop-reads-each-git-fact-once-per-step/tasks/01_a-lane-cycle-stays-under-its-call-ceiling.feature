Feature: A lane cycle stays under its git call ceiling
  The wave tick is the step: it wraps the port once, and everything inside the tick shares the memo.
  A lane already at its base is left alone, and the loop's own commit asks for its tip once. Real
  git, real lanes, outcomes unchanged.

  @executable @cli @work @work-stream
  Scenario: A wave tick hands one memoised port to everything it calls
    Given the lane fixture's milestone with one ready story, on real git counted at the port
    When one wave tick opens the lane, settles it and merges it home
    Then no ref or topology read repeats in one tree between two writes
    And the tick's outcome, records and merged commit equal those of the same tick unmemoised

  @executable @cli @work @work-stream
  Scenario: The memo does not outlive its tick
    Given a wave tick that has finished, and a commit made in the primary between ticks
    When the next tick asks for the primary's HEAD
    Then it reads the new commit, not the tip the previous tick saw

  @executable @cli @work @work-stream
  Scenario: A lane already at its base is not advanced
    Given a lane whose tip is the base commit
    When advanceBranchToBase is asked to bring it to that base
    Then it answers "already-current" with the lane's tip
    And git was asked one question, and nothing was written

  @executable @cli @work @work-stream
  Scenario: A lane behind its base is still fast-forwarded
    Given a lane one commit behind its base
    When advanceBranchToBase is asked to bring it to that base
    Then it answers "fast-forwarded" and the lane's tip is the base

  @executable @cli @work @work-stream
  Scenario: The loop's own commit reads its tip once
    Given the loop has written its records under the milestone folder
    When commitOwnWrites commits them
    Then git saw one "add", one "commit" and no "rev-parse HEAD" after the commit
    And the answer names the commit that holds the records

  @executable @cli @work @work-stream
  Scenario: One lane cycle stays under the pinned ceiling
    Given the lane fixture's milestone with one ready story, on real git counted at the port
    When one lane runs from open to cleanup
    Then the git calls made are no more than the ceiling FF-16001 pins
    And the ceiling equals the count measured when the cut landed

  @manual @cli @work @work-stream
  Scenario: The measured cut on the control node
    Given three loop-command-wave cases run alone through the shard entry with the git profiler
    When they run before and after this story, with AOF_GLOBAL_HOME isolated
    Then VERIFICATION records both call counts by verb and both wall times
    And the case outcomes are identical
