@executable @cli @work @distribution
Feature: A loop launch is watched as a process, not as a session that happens to write transcripts nearby

  The watch that finds a session is the wrong instrument for a program that is not one. Pointed at an
  unattended loop it does not fail to find anything — it finds the FIRST transcript the loop's own inner
  work writes, binds this run to it, sees that inner turn declare itself finished, and ends the run. The
  outcome is not "no completion detected"; it is a completion detected on the wrong subject, reported as
  success, on the one kind of run nobody is watching.

  What makes this worth a contract rather than a comment is that every symptom points away from the
  cause. The launch is correct, the argv is correct, the declaration admitted it, the PTY spawned, the
  exit was clean and the assignment settled `done`. Read from the fleet, a run that terminated after one
  rung is indistinguishable from a scope that only had one rung to walk.

  The scenario below therefore carries its own POSITIVE CONTROL, and that is the load-bearing part. A
  lane that only asserted "the loop's watch resolves nothing" would pass just as happily over a watch
  aimed at an empty directory, over a watch that never ran, and over a seam that was never wired — the
  three ways this could be green while holding nothing. So the session-shaped default is run first, over
  the same worktree, and must bind the planted inner transcript before anything is concluded from the
  loop-shaped one refusing to.

  The other half is what must NOT move. A session assignment is handed exactly what a delivered tree
  hands it — nothing — so the driver reaches its own default unchanged; and a caller that injects a watch
  keeps it, because a launch kind that silently disabled a supplied producer would be the defect class
  this milestone has already paid for once.

  ADR-013 §1, §3a. FF-6306.

  Scenario: the session-shaped default binds the loop's own inner session over the run's worktree
    Given a worker composing an unattended loop launch for an assignment
    And a transcript written into the projects directory for that run's own worktree, as an inner session of the loop writes one
    When the session-shaped default watch is run over that worktree
    Then it resolves the planted transcript's session id
    And nothing below is concluded from a watch that had nothing to find

  Scenario: the loop launch is handed a watch that binds nothing over that same directory
    Given the same worker, worktree and planted transcript
    When the seams the worker hands its spawn seam for the loop launch are read
    Then the session-id seam is not the session-shaped default
    And running it over that same worktree resolves no session id
    And running the completion seam over that same inner session settles nothing

  Scenario: a session assignment is handed exactly what a delivered tree hands it
    Given the same worker driving a session-phase directive rather than a loop launch
    When the seams it hands its spawn seam are read
    Then no session-id watch is supplied at all
    And no completion watch is supplied at all

  Scenario: an injected watch still wins over the loop shape
    Given a caller that supplies its own session-id and completion watches
    When an unattended loop launch is composed and driven through that caller
    Then the seams that reach the spawn seam are the caller's own
    And the answer given is the caller's answer
