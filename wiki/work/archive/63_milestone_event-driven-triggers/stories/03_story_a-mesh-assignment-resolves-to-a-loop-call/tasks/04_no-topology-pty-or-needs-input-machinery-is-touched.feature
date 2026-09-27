@executable @cli @work @distribution
Feature: Everything above the launch behaves as it did, and a loop halts on a declared stop rather than on a sentinel

  Leasing, reclaim, presence, routing, the terminal spawn, the streaming of what it prints and the
  detection that it finished are all one machinery that operates on a program, its arguments and its
  environment. This story changes what those three values are for one kind of assignment and nothing
  above them. The claim is therefore symmetrical and is asserted that way: every one of those behaviours
  is driven twice, once on an assignment that is still a session and once on the one that is now a loop,
  and the two answers are the same answer.

  The halt is where the asymmetry is real and must be stated rather than discovered. A session announces
  that it needs a human by emitting a sentinel into its own output; a loop does not, and the absence is
  correct rather than missing. An unattended loop stops on a member of a vocabulary that was frozen
  before this story and is not widened by it — a human gate, an exhausted cap, an exhausted deadline, an
  inner session that itself needs input. That stop is the machine-readable halt the sentinel stands in
  for, which is why nothing new is invented to carry it.

  The failure mode worth naming is a wait. Something that expects a sentinel and does not get one leaves
  an assignment reported as running long after its process is gone, and a run that is finished but still
  held is indistinguishable from a hung worker until a reclaim clock notices. So the contract is not
  only "no sentinel is produced" but "nothing is waiting for one".

  How a wrong implementation slips past: it adds a thirteenth stop, or a new terminal state, or a second
  completion signal for "the loop kind", each of which is a parallel lifecycle inside the mesh's busiest
  module wearing a small name. The mesh gains a second execution path that way — one field, one state
  and one signal at a time — which is dispatch topology by another name and is out of scope by decision.

  ADR-006 §4. ADR-005 §2. FF-6306.

  Scenario Outline: the machinery around the launch gives the same answer for both kinds of launch
    Given <situation>
    When it occurs on a session-phase assignment, and again on an autonomous one
    Then <outcome>
    And the two runs answer identically, and identically to a delivered tree

    Examples: leasing, routing, presence, the worktree, the terminal and what it prints
      | situation                                                                  | outcome                                                                                  |
      | a target node already holding as many runs as the dispatch bound allows    | the row is left assigned and retried by a later tick, with no lease or queue state made  |
      | a target node that is not connected when the tick runs                     | nothing is dispatched, nothing is marked sent, and a later tick retries it               |
      | a second directive for an assignment this worker has already accepted      | it is ignored outright — no second acceptance, no second worktree, no second run         |
      | a worker that does not hold the workspace's repo                           | the run is refused with its code before any worktree is created                          |
      | the worktree preparation, its base branch and its base commit pin          | resolved exactly as they are for that phase in a delivered tree                          |
      | the terminal the run is spawned into                                       | spawned the same way, with the same environment scrubbing, and never as a prompt argument |
      | output produced by the run                                                 | chunked and streamed to the control as it is today, in the same shape                    |
      | a withdraw arriving while the run is live                                  | the holder is notified exactly once and the live child is ended                          |
      | a worker that goes silent mid-run                                          | reclaim applies the same policy on the same clock                                        |

  Scenario Outline: how a run ends, and what names the halt
    Given <run>
    When it reaches its end
    Then the needs-input sentinel is <sentinel>
    And the halt is named by <halt>

    Examples: the sentinel belongs to sessions, and the loop's stops were frozen before this story
      | run                                                    | sentinel                    | halt                        |
      | a session-phase run that exits on its own              | not observed                | the session's own exit      |
      | a session-phase run that emits the sentinel            | observed, exactly as today  | the sentinel, exactly as today |
      | a loop run that reaches a human gate                   | not produced, and not missing | `uat-gate`                |
      | a loop run that exhausts its cap                       | not produced, and not missing | `cap-exhausted`           |
      | a loop run that exhausts its deadline                  | not produced, and not missing | `deadline-exhausted`      |
      | a loop run whose own inner session needs a human       | not produced, and not missing | `session-needs-input`     |
      | a loop run the operator interrupts                     | not produced, and not missing | `operator-interrupt`      |

  Scenario: no stop, state or completion signal is added for the new kind of launch
    Given the halt vocabulary a loop can stop on, and the states an assignment can be in
    When both are read after this story lands
    Then the loop's stops are the same set, member for member, that was frozen before it
    And the assignment states are the same set, member for member
    And no signal exists that means "a loop finished" and does not already mean "a run finished"

  Scenario: nothing waits for a sentinel that a loop will never send
    Given an autonomous assignment whose loop halts on a declared stop
    When the assignment is watched from the control
    Then it leaves the roster on the same reporting path a session exit uses
    And it is not held running until a reclaim clock notices it
    And no timeout, poll or watchdog was introduced to notice the missing sentinel

  Scenario: the needs-input path itself is untouched
    Given a session-phase assignment whose session emits the sentinel
    When the control and the worker are both observed
    Then the assignment is reported exactly as it is reported today, with the same code
    And the parked session is resumable exactly as it is today
    And terminal input for that session is routed exactly as it is today
    And an autonomous assignment running beside it changes none of that
