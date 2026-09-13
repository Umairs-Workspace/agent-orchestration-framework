@cli @work @work-stream
Feature: The loop's creation authority is exactly one type, in exactly one place
  In order that a bounded round loop does not become an unbounded work loop
  the promotion path must be unable to create anything but a top-level chore, and a finding needing
  new acceptance criteria must stop the machine and ask a human.

  # Contract, not restated: ADR-003's bounds. Why a nested story is refused: an item created UNDER
  # the milestone returns in the next readySet and is built and reviewed inside the pass that
  # spawned it. The structural sweep — including the bundled commands' closed routing set — is FF-7103.

  Background:
    Given a review close with surviving findings

  @executable
  Scenario: a finding needing new acceptance criteria stops the loop
    Given a surviving finding that needs criteria a .feature must state
    When the four questions are put to it
    Then no work item is created
    And no item folder is written
    And the hand-back names the story shape the operator would refine
    And it names the routing as one the operator owns

  @executable
  Scenario Outline: the promotion face offers no way to ask for another type or a parent
    Given a promotion invoked with <input>
    When it runs
    Then <outcome>

    Examples:
      | input                        | outcome                                                  |
      | no type input at all         | a top-level chore is created                             |
      | a type of "milestone"        | it is refused as an unknown input and creates nothing    |
      | a type of "story"            | it is refused as an unknown input and creates nothing    |
      | a type of "uat"              | it is refused as an unknown input and creates nothing    |
      | a type of "chore"            | it is refused as an unknown input and creates nothing    |
      | a parent to nest the item under | it is refused as an unknown input and creates nothing |

  @executable
  Scenario: every item the promotion path creates is a chore
    Given a review close that promoted several findings
    When the created items are listed
    Then every one of them has type "chore"
    And every one of them has no parent

  @executable
  Scenario: a created chore cannot re-enter the walk that created it
    Given a chore promoted during a milestone walk
    When the walk next asks "aof work next <NN> --through-review --json"
    Then the promoted chore is absent from the readySet
    And it is absent from the wave and from the heldSet
    And the walk's remaining members are unchanged

  @executable
  Scenario: the promoted chore is real work, visible where work is chosen
    Given a chore promoted during a milestone walk
    When the work stream is listed unscoped
    Then the promoted chore is present with its back-reference intact
    And it is offered as work only outside the walk that created it

  @manual
  Scenario: a real capped review pass leaves a legible queue
    When a story's review reaches its cap with surviving Important findings
    Then each promoted chore is listed by "aof work list" with its back-reference intact
    And the operator can name, for every surviving finding, where it went
    And no story and no milestone was created by that pass
