@executable @cli @work @memory
Feature: A judge grades both blocks

  WHY. The ledger's own verdicts cannot grade a record the original recall never returned, and 177
  measured them agreeing with a judge only 73% of the time. So the replay grades the way 177 did:
  a model judge marks every record either block showed as 0 (not relevant), 1 (worth a glance) or
  2 (should change the decision), and the report reads the direction off those marks (the
  operator's answer to Q1, 2026-11-17).

  Background:
    Given a scratch project whose ledgers hold 60 recorded recalls across four edges
    And a memory index the recorded queries match
    And a stand-in "claude" that answers picks and judge requests as each scenario says

  Rule: R3 · A model judge grades every record either block showed, and the report names the direction

    Scenario: E8 · the judge is asked once per recall, about every record either block showed
      Given a recall whose lexical block shows 5 records and whose shipped block shows 2 of those 5
      When the replay runs over it
      Then the judge was asked once for that recall
      And it was asked about those 5 records, the query and the recall's edge
      And it was not told which block showed which record
      And each of the 5 records has a grade of 0, 1 or 2

    Scenario: E9 · less noise and no fewer decision-changing records is the direction holding
      Given the judge's grades average 2.0 records graded 0 and 1.3 graded 2 per recall for the lexical block
      And 0.7 graded 0 and 1.6 graded 2 per recall for the shipped block
      When the replay writes its report
      Then the report says "direction: holds"
      And the exit code is 0

    Scenario: E10 · fewer decision-changing records is the direction not holding, whatever the noise
      Given the judge's grades average 1.3 records graded 2 per recall for the lexical block
      And 0.4 graded 0 and 0.9 graded 2 per recall for the shipped block
      When the replay writes its report
      Then the report says "direction: does not hold"
      And it names the decision-changing records per recall as what fell, with both figures
      And the exit code is not 0

    Scenario: E11 · no model grades its own pick
      Given "memory.recall.pick.model" is "opus"
      When "node scripts/memory-recall-replay.mjs --judge-model opus" runs
      Then it refuses before any model is asked, and says the judge and the pick must differ

    Scenario Outline: the direction, at its edges
      Given the lexical block averages <lexical noise> noise and <lexical strong> decision-changing records per recall
      And the shipped block averages <shipped noise> noise and <shipped strong> decision-changing records per recall
      When the replay writes its report
      Then the report says <direction>

      Examples:
        | lexical noise | lexical strong | shipped noise | shipped strong | direction                   |
        | 2.00          | 1.30           | 0.70          | 1.30           | "direction: holds"          |
        | 2.00          | 1.30           | 2.00          | 1.60           | "direction: does not hold"  |
        | 2.00          | 1.30           | 2.10          | 1.60           | "direction: does not hold"  |
        | 2.00          | 1.30           | 0.00          | 0.00           | "direction: does not hold"  |
        | 0.00          | 1.30           | 0.00          | 1.30           | "direction: does not hold"  |

    Scenario: the report carries 177's columns for both blocks
      When the replay writes its report
      Then each row gives, for each block, the records graded 2, graded 1 or more, and graded 0, per recall
      And the recalls whose block held a record graded 2, out of those where either block held one

    Scenario Outline: a judge that cannot answer does not pass for a grade
      Given the judge <behaviour> for 3 of 40 recalls
      When the replay runs
      Then those 3 recalls are reported as ungraded and left out of every average
      And the report says 37 recalls were graded

      Examples:
        | behaviour                                   |
        | does not answer in time                     |
        | answers with no grades in it                |
        | grades only some of the records it was asked about |
        | gives a grade that is not 0, 1 or 2         |

    Scenario: a replay with nothing graded names no direction
      Given the judge does not answer for any recall
      When the replay runs
      Then the report says "direction: unreadable"
      And the exit code is not 0
