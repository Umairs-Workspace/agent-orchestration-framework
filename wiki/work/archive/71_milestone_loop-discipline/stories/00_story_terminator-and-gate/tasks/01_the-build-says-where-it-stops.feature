@docs @work @round-trip
Feature: The build phase states the terminator it stops at, including the one for a build that has stopped progressing
  In order that a stuck build is reported rather than ground at
  the continue prompt's build step must state its full stop condition — green, clean, passing — and
  the failure-to-progress stop that bounds a build which is no longer converging.

  # Contract, not restated: ADR-002. The bound's VALUE and its clamp live in src/loop-bounds.mjs, and
  # the check that a stated value equals its key's default is task 02's. This feature is the build
  # step's own behaviour at the end of a round.

  Background:
    Given the bundled command "src/bundle/commands/continue.md" as it ships

  @executable
  Scenario: the build step states every leg of its success terminator
    When the build step is read
    Then it states that every task's @executable scenarios are green
    And it states that typecheck and lint are clean
    And it states that the fitness functions pass

  @executable
  Scenario: the build step states the failure-to-progress stop
    When the build step is read
    Then it states that consecutive rounds with no reduction in the failing-scenario count stop the build
    And it names "work.loop.buildNoProgressRounds" as the bound's home

  @executable
  Scenario Outline: the build's end-of-round decision
    Given the round before left <previous> failing scenarios and this round leaves <failing>
    And <recorded> consecutive no-progress rounds have already been recorded
    When the build step's rule is applied
    Then the build <action>

    Examples:
      | previous     | failing | recorded         | action                                              |
      | no prior round | 0     | none             | is done and hands on                                |
      | no prior round | 4     | none             | starts another round                                |
      | 7            | 0       | none             | is done and hands on                                |
      | 7            | 0       | one short of the bound | is done and hands on                          |
      | 7            | 3       | none             | starts another round                                |
      | 7            | 3       | one short of the bound | starts another round, the no-progress count reset to zero |
      | 3            | 3       | none             | records a no-progress round and starts another      |
      | 3            | 5       | none             | records a no-progress round and starts another      |
      | 3            | 3       | one short of the bound | stops and hands back                          |
      | 3            | 5       | one short of the bound | stops and hands back                          |

  @executable
  Scenario: a build that stops for no progress hands back rather than starting another round
    Given the failure-to-progress stop is reached
    When the build step hands back
    Then it reports the round count and the failing scenarios by name
    And it names the bound that stopped it, so the operator can raise it
    And it does not start another round
    And it does not print the accept hand-off
    And it does not hand on to the gate ladder or the review lanes

  @executable
  Scenario: the build step is the only writer of the build's rules
    When "continue.md" and "code-review.md" are read
    Then each still contains the sentence "Three rounds is the hard cap"
    And the build step states no review-round rule
    And the review step states no build-round rule

  @manual
  Scenario: a real build that cannot converge stops itself and says so
    When a story whose failing count stops falling is driven by "aof:continue"
    Then the run stops at the failure-to-progress bound rather than at a wall-clock or a token limit
    And the hand-back names the failing scenarios and the bound that stopped it
    And no review lane was spawned for that attempt
