@executable @cli @work @memory
Feature: The replay runs each recorded recall twice

  WHY. The ledgers already hold the questions agents really asked, with the scope each was asked
  in. Replaying those, once as the lexical block and once as the shipped block, is how an outsider
  checks the pick on this project's own recalls (SPEC Objective; ADR-007). The replay must be
  repeatable in which recalls it takes, and must leave the evidence it reads untouched.

  Background:
    Given a scratch project whose ledgers hold 60 recorded recalls across four edges
    And a memory index the recorded queries match
    And a stand-in "claude" that answers every pick with "[1]"

  Rule: R1 · The replay runs each recorded block recall twice, as the lexical block and as the shipped block

    Scenario: E1 · a seeded sample is the same sample every time
      When "node scripts/memory-recall-replay.mjs --sample 40 --seed 177" runs twice
      Then each run replays 40 recalls
      And both runs replay the same 40, in the same order

    Scenario: E2 · a recall is replayed in the scope it was recorded with
      Given a recorded "verify-finding" recall whose scope is '{"kind":"finding"}'
      When the replay runs over it
      Then its lexical block and its shipped block hold only findings
      And both were asked with the recorded query, verbatim

    Scenario: E3 · one edge can be replayed on its own
      When "node scripts/memory-recall-replay.mjs --edge continue-developer" runs
      Then every replayed recall has the edge "continue-developer"

    Scenario: E4 · a whole-history recall is left out
      Given the ledgers also hold a "continue-episodic" recall and a "retrospective-evidence" recall
      When the replay runs with no "--edge"
      Then neither of those two is replayed
      And the report says how many recalls it left out, and why

    Scenario: E5 · the replay leaves what it reads untouched
      When the replay runs
      Then every "FEEDBACK.ndjson" is byte for byte what it was
      And the memory index is byte for byte what it was
      And the only file written is the report

    Scenario Outline: the sample and the seed, at their edges
      When "node scripts/memory-recall-replay.mjs <arguments>" runs
      Then it <outcome>

      Examples:
        | arguments                     | outcome                                                    |
        | "--sample 40 --seed 177"      | replays 40 recalls                                         |
        | "--sample 40 --seed 178"      | replays 40 recalls, not the same 40 as seed 177            |
        | "--sample 500"                | replays all 60, and says the sample was larger than the ledgers |
        | "--sample 0"                  | refuses, and names "--sample" as a positive whole number   |
        | "--edge no-such-edge"         | replays nothing, and says no recorded recall has that edge |
        | ""                            | replays 40 recalls with the seed 177                       |

    Scenario: each recall is replayed as both blocks
      When the replay runs over one recorded recall
      Then the lexical block is the 5 best-ranked records in scope, and no "claude" was started for it
      And the shipped block is what "aof memory recall … --block" prints for that query and scope

    Scenario: a recall recorded twice is replayed once
      Given the same recall id appears on two items' ledgers
      When the replay runs
      Then that recall is replayed once
