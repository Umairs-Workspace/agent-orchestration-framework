@executable @cli @work @memory
Feature: The report shows what each block handed over

  WHY. 177's table is what the SPEC's numbers come from: records shown, per edge and overall, for
  each candidate. The replay's report has the same shape, so the two can be read side by side
  (ADR-007 §5). A replay that could not pick must say so, instead of reporting two identical
  blocks as "no difference".

  Background:
    Given a scratch project whose ledgers hold 60 recorded recalls across four edges
    And a memory index the recorded queries match

  Rule: R2 · The report shows, per edge and overall, what each block handed over

    Scenario: E6 · the report counts what each block showed
      Given a stand-in "claude" that picks 2 cards for half the recalls and none for the rest
      When "node scripts/memory-recall-replay.mjs --sample 40" runs
      Then the report has one row per edge replayed and one overall row
      And each row gives, for the lexical block and for the shipped block, the records shown per recall
      And each row gives the number of empty blocks for each
      And each row gives the number of degraded recalls for the shipped block

    Scenario: E7 · a node that cannot pick is told no direction can be read
      Given no "claude" resolves on PATH
      When "node scripts/memory-recall-replay.mjs --sample 40" runs
      Then the report counts all 40 recalls as degraded
      And it says "direction: unreadable", and that every shipped block was the lexical block
      And the exit code is not 0

    Scenario Outline: what a row reports
      Given the stand-in <behaviour> for an edge's 10 replayed recalls
      When the replay runs
      Then that edge's row shows <shipped shown> records per recall for the shipped block
      And <empty> empty shipped blocks and <degraded> degraded recalls

      Examples:
        | behaviour                              | shipped shown | empty | degraded |
        | picks 2 cards every time               | 2.00          | 0     | 0        |
        | answers "[]" every time                | 0.00          | 10    | 0        |
        | picks 3 cards for 5 and fails for 5    | 4.00          | 0     | 5        |
        | picks 5 cards for 4 and none for 6     | 2.00          | 6     | 0        |

    Scenario: the report says what it was run with
      When "node scripts/memory-recall-replay.mjs --sample 40 --seed 177" runs
      Then the report names the sample size, the seed, the pick's model, the judge's model and the date
      And it says how many recorded recalls the ledgers held and how many were replayed
      And it says the pick is not repeatable, so a second run may differ

    Scenario: the report is written where it is asked, and nowhere in the work tree by default
      When the replay runs with "--out <dir>"
      Then the report is written under that directory
      And with no "--out" it is written outside the work directory, and the path is printed
