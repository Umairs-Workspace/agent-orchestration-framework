@manual @cli @work @distribution
Feature: A worker that does not understand a loop directive wastes a deadline rather than doing the wrong work at the wrong level

  Control and worker deploy from one tree per node, so a skewed pair is a deploy state an operator can
  see, not a condition anything is designed for. What is contracted here is that the symptom of that
  state is bounded and observable: a worker that reads no launch and no command spawns its session with
  nothing typed into it and settles on the deadline it already had. Wasteful, and visible from outside.

  The thing it must never do is the thing that would look like kindness. Falling back to the whole-item
  cascade prompt, or sending the loop's argv as a command string so an old worker "still does
  something", both end the same way: a machine nobody is watching runs work at a level nobody granted,
  ordered by a model reading a sentence. An idle session costs a deadline. The fallback costs a branch
  full of work done at the wrong level, discovered later, on another machine.

  This lane is verified by hand because the other half of the pair is a deployment rather than a code
  path. A pre-63 worker does not exist in the tree that ships this story, and simulating one by
  stripping a field from a frame proves only that the simulation was written correctly. The cheapest
  honest pair is the local second node: one machine deployed from this story's payload as the control,
  one node deployed from a payload that predates it as the worker.

  How a wrong implementation slips past: it is not written by whoever builds this story. It is written
  three months later by someone who sees an idle session in the fleet view, reads it as a bug, and adds
  the one-line compatibility fallback this scenario exists to forbid. The record of *why* the session is
  idle is therefore part of the deliverable, not commentary on it.

  ADR-006 §5. FF-6306.

  Scenario: the pair is genuinely skewed before anything is concluded from it
    Given two mesh nodes, one acting as control and one as worker
    And the control deployed from the payload that carries this story
    And the worker deployed from a payload that predates it
    When the build stamp is read on each node, and again in each daemon's own startup line
    Then the two build ids differ, and the worker's is the older one
    And the worker is enrolled, present in the fleet view and eligible for dispatch
    And nothing below is concluded from a pair whose stamps have not been read this way

  Scenario Outline: what an operator observes for each combination of vintage and phase
    Given a <pair>
    And an item assigned to that worker on the <phase> phase
    When the directive is dispatched and the worker is watched until the assignment leaves the roster
    Then what is typed into the worker's session is <typed>
    And the assignment ends by <ending>

    Examples: both directions of skew, and the matched pair for comparison
      | pair                                   | phase                  | typed                                   | ending                                             |
      | new control with an old worker         | autonomous             | nothing at all                          | settling on the deadline it already had            |
      | new control with an old worker         | refine, continue or verify | the same command as before this story | finishing exactly as it did before this story      |
      | old control with a new worker          | autonomous             | the pre-existing cascade command        | finishing exactly as it did before this story      |
      | a matched pair, both carrying this story | autonomous           | nothing at all                          | halting on a stop the loop declares                |

  Scenario: the idle session is observable, and distinguishable from a worker that never answered
    Given a skewed pair with an autonomous assignment dispatched to the old worker
    When the operator reads the control's dispatch decision log for that assignment
    Then it records what was actually sent, including that a loop launch went out
    And the fleet view shows the assignment held by that worker rather than unassigned or stalled
    And the worker's own session is live, with an empty prompt and no output of its own
    And the three readings together say "the worker did not understand the directive", not "the worker is gone"

  Scenario: nothing anywhere substitutes the cascade for the launch it could not read
    Given the same skewed pair and the same autonomous assignment
    When the worker's session and the control's log for that assignment are read end to end
    Then no cascade command, and no command of any kind, appears in either
    And no loop argv appears as text typed into a session
    And nothing has been run on the worker's worktree: it holds no commits made after the dispatch

  Scenario: the waste is bounded by the deadline that already existed
    Given the idle session from the scenario above
    When it is left alone until it ends on its own
    Then it ends on the same deadline policy any session on that worker ends on
    And no new timeout, retry or watchdog was introduced to end it
    And the assignment is afterwards reclaimable and re-assignable exactly as any other terminal one
    And re-deploying that worker and re-assigning the item runs the loop, with nothing else changed
