@executable @cli @work @validate
Feature: A model does not grade its own output, and every judge is visible

  Where a watcher's number comes from a model rather than from code, independence has one more
  failure mode and it is the best-documented one in this whole arc: LLM judges systematically prefer
  their own generations. A watcher that shares the maker's model and context is not a check, it is a
  second opinion from the same opinion.

  In this repository a model instance is spelled exactly one way — an agent definition cited as a
  prose authority. That makes the leg precise rather than heuristic: compare the watcher's prose
  authorities against the actuator list of the loop it watches, and where they intersect, the maker
  is grading itself.

  The second half of this task is the part that admits a limit honestly. Nothing can decide from a
  record whether a metric could have been computed deterministically, so nothing here demands that a
  judge be replaced. What it demands is that a judge can never be silent — the census of where this
  system still leans on a model's opinion is exactly the input the audit loop consumes.

  ADR-002. FF-5702.

  Scenario: a judging watcher whose authority also actuates the loop is named
    Given a loop actuated by an agent definition
    And a watcher watching it whose prose authority is that same agent definition
    When the checks are run
    Then the shared-actuator finding names the watcher
    And it names the agent definition they share

  Scenario: a judging watcher with a different authority is not flagged
    Given a loop actuated by one agent definition
    And a watcher watching it whose prose authority is a different agent definition
    When the checks are run
    Then no shared-actuator finding is raised

  Scenario: a deterministic watcher has no prose authority to share
    Given a loop actuated by an agent definition
    And a watcher watching it whose measurement is entirely pointer-backed
    When the checks are run
    Then no shared-actuator finding is raised

  Scenario: shared authority is judged per watcher-loop pair
    Given a judging watcher watching two loops whose actuator it shares with only one
    When the checks are run
    Then exactly one shared-actuator finding is raised
    And it names the loop whose actuator is shared

  Scenario: every judging watcher is reported, whether or not it is independent
    Given two judging watchers, one sharing the loop's actuator and one not
    When the checks are run
    Then both are reported as judges

  Scenario: the judge report does not gate
    Given a registry whose only finding is that a watcher judges
    When the validate run completes
    Then the run reports no errors
    And the judge is reported as a warning

  Scenario: a deterministic watcher is not reported as a judge
    Given a watcher declaring deterministic counting
    When the checks are run
    Then no judge report names it
