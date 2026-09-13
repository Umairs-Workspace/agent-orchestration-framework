@docs @work @validate
Feature: The story lane walks the free gate ladder before it spawns a reviewer
  In order to stop paying three review lanes to rediscover a red the free gate already knows about
  the continue prompt must run validate, then doctor, at the driven item's own scope, before any
  review lane is spawned — and stop on the first red rung.

  # Contract, not restated: ADR-001. Rung-set parity with `invokeGateLadder` and the order of the
  # rungs are FF-7105's structural claim; this feature is what the lane DOES with each rung's answer.

  Background:
    Given the bundled command "src/bundle/commands/continue.md" as it ships
    And a story whose build step has finished

  @executable
  Scenario: nothing expensive is reachable until the ladder has answered
    When the story lane's steps are read in order
    Then a gate step sits between the Build step and the Review step
    And no review lane is spawnable before the gate step has answered

  @executable
  Scenario: both rungs are scoped to the driven item, never to its parent
    When the gate step runs for a story the milestone lane is driving
    Then "aof work validate" is scoped to that story's own ref
    And "aof work doctor" is scoped to that same ref
    And neither rung is scoped to the milestone

  @executable
  Scenario Outline: what each rung's answer decides
    Given "work:validate" answers <validate> and "work:doctor" answers <doctor>
    When the gate ladder is walked
    Then <second-rung>
    And <reviewers>
    And the lane reports <reported>

    Examples:
      | validate | doctor                  | second-rung                 | reviewers                    | reported                                  |
      | findings | not reached             | "work:doctor" is not walked | no reviewer is spawned       | the validate rung and its findings        |
      | clean    | findings, all admitted  | "work:doctor" is walked     | no reviewer is spawned       | the doctor rung and its admitted findings |
      | clean    | findings, none admitted | "work:doctor" is walked     | the review lanes are spawned | a clean gate                              |
      | clean    | clean                   | "work:doctor" is walked     | the review lanes are spawned | a clean gate                              |

  @executable
  Scenario: a red gate is reported as its own outcome, never as a review verdict
    Given the gate ladder answered with findings
    When the lane hands back
    Then it names the rung that answered and the findings it returned
    And it does not print a review verdict
    And it does not print the accept hand-off
    And it does not move the item to "in-review"

  @executable
  Scenario: a fixed red rung is re-gated rather than assumed green
    Given a red gate rung whose findings have been fixed
    When the lane resumes
    Then the ladder is walked again from its first rung
    And the review lanes are spawned only once the ladder answers clean

  @executable
  Scenario: the ladder re-runs after a fix round, before any re-review is admitted
    Given a review round whose confirmed fixes have been applied
    When the lane prepares the next round
    Then the ladder is walked again before any lens is re-spawned
    And a re-review is admitted only once the ladder answers clean

  @executable
  Scenario Outline: a red ladder after a fix round does not consume a review round
    Given <rounds> review round(s) already consumed
    And the ladder answers <ladder> after the fix round
    When the lane continues
    Then the consumed round count is <after>
    And <spawned>

    Examples:
      | rounds | ladder   | after            | spawned                                  |
      | 1      | findings | 1 — unchanged    | no lens is re-spawned; the gate is reported |
      | 1      | clean    | 1 — unchanged    | the admitted lenses are re-spawned        |
      | 2      | findings | 2 — unchanged    | no lens is re-spawned; the gate is reported |

  @executable
  Scenario: a rung that throws is a red rung
    Given a gate rung that exits non-zero rather than answering with findings
    When the lane reads the result
    Then it is treated as a red rung and short-circuits
    And no reviewer is spawned
    And the refusal is reported rather than stepped past

  @manual
  Scenario: a real story's continue pays the gate once and skips the reviewers on red
    When a story with a known validate finding is driven by "aof:continue"
    Then the run records the gate rung that stopped it
    And no aof-architect, aof-qa or aof-designer session was spawned for that attempt
    And the attempt's cost is the two gate commands, not two agent lanes
