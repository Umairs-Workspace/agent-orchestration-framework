@executable @cli @work @validate
Feature: An agreed example resolves by its id, inside its rule, or the doctor names it

  WHY. A person confirms or states an example at discovery (134). Nothing checks that it reaches the
  contract, so an agent editing a feature can drop it silently. ADR-004 traces it by DECLARED id,
  never by matching values (54/ADR-006). A scenario carries `E<n>` when its name starts with
  `E<n> · `. An Examples row carries it when its cell under the column headed `example` is `E<n>`.
  The carrier must sit in a group naming the example's rule: the `Rule:` it is under, or its
  `Feature:` when it is under no rule (ADR-002 §2), titled `R<n> · …`. A miss is the sixth code of
  the examples lane, `example-untraced`, at error while the story is open and warn once it is done.

  THE FIXTURE BELOW: story "7/2" with the gate on. Its map has rule R1 holding E1 [proposed],
  E2 [confirmed] and E3 [stated Q1], with Q1 answered, and every claim is anchored by an answer
  record. Its one task feature holds "Rule: R1 · A member may hold at most five loans".

  Rule: R1 · An example a person agreed appears in the contract, under its own rule

    Scenario: E1 · a confirmed example carried by a headline scenario under its rule resolves
      Given the rule "R1 · …" holds the scenario "E2 · a sixth loan is refused while five are out"
      And an outline under the same rule has a row whose example cell is "E3"
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding

    Scenario: E2 · deleting the scenario that carries a confirmed example turns the doctor red and names it
      Given the rule "R1 · …" no longer holds any scenario or row carrying "E2"
      When "aof work doctor 7/2 --json" is run
      Then it reports "example-untraced" at error
      And its message names "7/2", "E2", its provenance "confirmed" and its rule "R1"
      And its path is the story's "EXAMPLES.md"
      And the doctor exits non-zero

    Scenario Outline: E3 · an agreed example resolves through either carrier, under its rule
      Given "<example>" is carried only by <carrier> under "Rule: R1 · …"
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding for "<example>"

      Examples:
        | example | carrier                                                     |
        | E2      | the scenario "E2 · a sixth loan is refused while five are out" |
        | E2      | an Examples row whose example cell is "E2"                  |
        | E3      | the scenario "E3 · a swap at the desk is issued"            |
        | E3      | an Examples row whose example cell is "E3"                  |

    Scenario Outline: E4 · an id only counts in its exact form and its own rule's group
      Given the only mention of "E2" in the story's task features is <mention>
      When "aof work doctor 7/2 --json" is run
      Then it reports "example-untraced" for "E2" with <message>

      Examples:
        | mention                                                             | message                                            |
        | the scenario "E2 · …" under "Rule: R2 · An overdue loan blocks …"   | a message saying it was found under rule R2        |
        | the scenario "E2 · …" under a rule titled with no rule id           | a message saying it was found outside rule R1      |
        | the scenario "Refuse E2 · …", where the id is not at the head        | the plain untraced message                         |
        | the scenario "E20 · …" under "Rule: R1 · …"                          | the plain untraced message                         |
        | an Examples row whose cell "E2" is in a column headed "case"         | the plain untraced message                         |
        | a step's text "Given example E2 holds" under "Rule: R1 · …"          | the plain untraced message                         |

    Scenario: in a feature-per-rule contract the feature is the group
      Given the story's task feature is titled "Feature: R1 · A member may hold at most five loans" and has no "Rule:" line
      And it holds the scenario "E2 · a sixth loan is refused while five are out"
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding for "E2"

    Scenario Outline: the finding follows the acceptance horizon
      Given "E2" is carried nowhere in the story's task features
      And the story's status is "<status>"
      When "aof work doctor 7/2 --json" is run
      Then it reports "example-untraced" for "E2" at <severity>

      Examples:
        | status      | severity |
        | in-progress | error    |
        | in-review   | error    |
        | done        | warn     |

  Rule: R2 · An example only the agent proposed may be left out

    Scenario: E5 · a proposed example carried nowhere is not reported
      Given "E1" is proposed and is carried nowhere in the story's task features
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding for "E1"

    Scenario: one finding per untraced agreed example, in map order
      Given neither "E2" nor "E3" is carried anywhere in the story's task features
      When "aof work doctor 7/2 --json" is run
      Then it reports exactly two "example-untraced" findings, for "E2" then "E3"
