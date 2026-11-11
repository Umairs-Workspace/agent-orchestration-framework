@executable @ui @work @board
Feature: A prototype card sits in an existing lane, badged with its type and its own status word

  WHY. The board's lanes are keyed on the five governed statuses, and a card whose status has no
  lane is dropped without a word. A prototype's four words would make every active or paused
  prototype vanish. Each word maps to a lane, and the card's tag keeps the real word visible.

  Rule: R1 · A prototype card sits in an existing lane, mapped from its own status

    Scenario Outline: each prototype status has a lane
      Given the board's items hold prototype 169 at status "<status>"
      When the board is derived with focus "all"
      Then 169's card is in the "<lane>" lane

      Examples:
        | example | status    | lane        |
        | E1      | active    | in-progress |
        | E2      | paused    | not-started |
        | E3      | done      | done        |
        |         | abandoned | done        |

    Scenario: a prototype is placed beside spike and chore
      Given the board's items hold spike 120 at "in-progress", chore 121 at "done" and prototype 169 at "active"
      When the board is derived
      Then its other drivers are 120, 121 and 169

  Rule: R2 · The card says it is a prototype and shows its own status word

    Scenario Outline: the tag names the type and the prototype's own word
      Given the board's items hold prototype 169 at status "<status>"
      When the board is derived with focus "all"
      Then 169's card tag reads "<tag>"

      Examples:
        | example | status    | tag                   |
        |         | active    | prototype · active    |
        | E4      | paused    | prototype · paused    |
        | E5      | abandoned | prototype · abandoned |

    Scenario: a spike's tag is unchanged
      Given the board's items hold spike 120 at "in-progress"
      When the board is derived with focus "all"
      Then 120's card tag reads "spike"

  Rule: R3 · A prototype is never counted as milestone work

    Scenario: E6 · active prototypes do not raise the active-milestone count
      Given the board's items hold milestone 168 at "in-progress" and prototypes 169 and 170 at "active"
      When the board is derived
      Then the active-milestone count is 1
      And no milestone's story tally counts 169 or 170

    Scenario: E7 · a paused prototype is not a blocked gate
      Given the board's items hold prototype 169 at "paused" and no uat session
      When the board is derived
      Then the blocked-gate count is 0

    Scenario: a milestone focus shows no prototype
      Given the board's items hold milestone 168 with one story and prototype 169 at "active"
      When the board is derived with focus "168"
      Then no lane holds 169's card
