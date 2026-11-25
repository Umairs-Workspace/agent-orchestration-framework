@cli @work @board
Feature: Publish the refined item into its selected board
  Rule: R1 · Publication links a local item to a stable board identity
    @executable
    Scenario: E9 · Completing refinement first publishes draft 17
      Given 17 is a numbered local draft in a board-backed project
      When refinement pauses for an unanswered question
      Then the board has received no create for 17
      When refinement resumes and completes
      Then the board receives the first publication of 17 without a separate operator command

    @executable
    Scenario: E1 · The published board item and the draft appear as one item
      Given 17 has a SPEC and an architecture decision in its local folder
      When publication creates board item 410 and verifies its mapped fields and relations
      Then a fresh "aof work find 17 --json" returns one milestone with the expected title
      And its original documents remain readable and a subsequent tracked edit addresses 410

    @executable
    Scenario: E2 · A missing linked item is visible to the operator
      Given 17 was verified against board item 410
      When the board authoritatively reports 410 missing on the next record read
      Then the result identifies the fault for 17 and 410
      And the local decisions and desired tracking values remain available for recovery

    @executable
    Scenario Outline: The publication trigger distinguishes the phase, outcome and store
      Given a local draft and a fixture that counts remote creates
      When <event> occurs
      Then the number of remote creates is <creates>

      Examples:
        | event                                          | creates |
        | promotion into the numbered stream             | 0       |
        | a failed refine run in board mode              | 0       |
        | completed refinement in local file mode        | 0       |
        | completed loop-driven refinement in board mode | 1       |

    @executable
    Scenario: Identical numeric IDs in separate projects remain independent
      Given 17 in Orchard and 17 in Harbour are each linked to 410 on their selected boards
      When Orchard updates its linked item and both projects read 17 again
      Then only Orchard's board item and local acknowledgement reflect the update
