@executable @cli @work @validate
Feature: Only the human operator revises the criterion, and only at a boundary

  Two layers sit above the arithmetic that actually holds the line, and the point of writing them down
  is that each has a limit worth stating rather than implying. The first refuses a criterion revision
  that arrives away from a boundary, and names the open epoch and the boundary where it may be made
  instead — it binds what comes through it and nothing else. The second is a declared guard that keeps
  agents off the criterion record and the evidence ledger; it stops an agent, and only an agent.

  Neither is the enforcement. A permission cannot see a command writing through its own process, a
  script, a merge, or a human in an editor, and a single-layer answer here would report as enforced
  while being trivially walked past. What these two buy is that the ordinary path is honest and the
  guard is reviewable — which is worth having, as long as nobody mistakes it for the wall.

  The distinction worth arguing is where the guard lives. It is declared alongside this system's other
  guards rather than hand-wired, because a rule with a declared subject can be narrowed correctly,
  read in a diff and retracted by deleting a line. And the knob values are deliberately outside it:
  denying every edit to the file where they live would refuse legitimate work across the repository to
  protect three keys, and still not bind the framework's own writes.

  The revising actor is the human operator — this registry's only exogenous contact with reality,
  which is exactly what keeps the root reference outside the loop being tuned.

  ADR-004 §5. ADR-005 §2, §3, §5. FF-6105.

  Scenario Outline: who may revise the criterion, and when
    Given an epoch that is <moment>
    When <actor> revises the criterion
    Then the revision is <outcome>

    Examples: the boundary binds the operator; the guard binds an agent at every moment
      | moment        | actor        | outcome  |
      | open          | the operator | refused  |
      | at a boundary | the operator | accepted |
      | open          | an agent     | denied   |
      | at a boundary | an agent     | denied   |

  Scenario: a revision away from a boundary is told where it may be made
    Given an open epoch
    When the operator revises the criterion
    Then the revision is refused
    And the refusal names the epoch that is open
    And it names the boundary at which the revision may be made

  Scenario: a revision at a boundary takes effect for the span that follows it
    Given an epoch that has just closed
    When the operator revises the criterion
    Then the revision is accepted
    And the criterion in force for the next epoch is the revised one
    And the criterion under which the closed epoch was scored is unchanged

  Scenario: the guard is declared where this system's other guards are declared
    Given a workspace's declared guards
    When they are read
    Then one of them names the criterion record and the evidence ledger
    And it states what it protects and which enforcement point carries it
    And it is marked as the framework's to manage

  Scenario Outline: what the declared guard covers, and what it deliberately does not
    Given the guard installed in a workspace
    When an agent attempts to <operation> <subject>
    Then the attempt is <outcome>

    Examples: both operations over both acceptor records, and the one deliberate exclusion
      | operation | subject                   | outcome |
      | edit      | the criterion record      | denied  |
      | write     | the criterion record      | denied  |
      | edit      | the evidence ledger       | denied  |
      | write     | the evidence ledger       | denied  |
      | edit      | the project's knob values | allowed |

  Scenario: the guard arrives in a project by the same path the other guards arrive by
    Given a project brought up to the current framework
    When its declared guards are read
    Then the guard over the acceptor's records is among them
    And no other declared guard changed

  Scenario: the framework's own writes are not stopped by the guard, and that limit is stated
    Given the guard installed in a workspace
    When the framework itself writes the criterion at a boundary
    Then the write succeeds
    And the guard is described as binding agents rather than every writer

  Scenario: an ordinary configuration edit is not refused by any of this
    Given the guard installed in a workspace
    When a tunable knob's value is edited in the project's configuration
    Then the edit is not denied
    And no criterion refusal is raised
