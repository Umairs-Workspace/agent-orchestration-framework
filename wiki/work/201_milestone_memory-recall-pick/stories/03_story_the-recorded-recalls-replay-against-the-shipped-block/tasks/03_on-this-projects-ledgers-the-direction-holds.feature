@manual @cli @work @memory
Feature: On this project's ledgers, the direction holds

  WHY. This is the milestone's own claim, checked on its own evidence: the shipped block, replayed
  over recalls this project really made, hands over less noise and no fewer decision-changing
  records than the block it replaces (SPEC Objective). 177 measured 0.69 against 2.02 for noise
  and 1.67 against 1.31 for decision-changing records. The replay asks for the same direction, not
  the same figures: it is a different sample, a newer index and a rewritten instruction.

  Rule: R3 · A model judge grades every record either block showed, and the report names the direction

    Scenario: E12 · a replay of 40 recorded recalls shows the direction 177 measured
      Given this project's ledgers and memory index, and the real "claude", signed in
      When "node scripts/memory-recall-replay.mjs --sample 40 --seed 177" runs
      Then the report says "direction: holds"
      And fewer than 5 of the 40 recalls are degraded or ungraded
      And the report's overall row is recorded in the milestone's verification document

    Scenario: a person agrees with the judge on a sample of its grades
      Given the report of that run
      When a person grades 20 of the judge's records without seeing its grades
      Then the person and the judge agree on relevant against not relevant for at least 16 of the 20
