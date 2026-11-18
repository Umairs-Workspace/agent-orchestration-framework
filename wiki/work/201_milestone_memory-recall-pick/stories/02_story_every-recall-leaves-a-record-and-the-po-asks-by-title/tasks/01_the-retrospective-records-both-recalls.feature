@executable @docs @assets @memory
Feature: The retrospective records both recalls

  WHY. The retrospective runs two recalls and records neither, so the ledger cannot show what they
  returned or whether any of it mattered (177, "Read paths"). Both become edges like the others
  (SPEC Scope, fifth bullet; ADR-006 §3). This supersedes one sentence of 157/ADR-004, which kept
  the evidence recall off the ledger.

  Background:
    Given the bundle's retrospective command, read as an agent is handed it

  Rule: R2 · The retrospective records both of its recalls, on the item it is written for

    Scenario: E4 · both recalls are captured, each under its own edge
      Then the recall before triage is captured with the edge "retrospective-domain" and the scope "{}"
      And the evidence recall is captured with the edge "retrospective-evidence" and the scope '{"item":"<ref>","area":"delivery"}'
      And both captures name the actor "product-owner"
      And each asks for one verdict per returned record, and says what each verdict means for that recall
      And each is submitted once, with "aof memory record-recall <ref> --input <file>", on the item the retrospective is for

    Scenario: E5 · a retrospective that writes no lesson still records both
      Then the step that writes no document for a clean item says both observations are still submitted

    Scenario: E6 · an empty recall is recorded as empty
      Then each capture says an empty result is submitted as '"records": []', with no verdict invented

    Scenario: the captures sit where the decisions are already made
      Then both captures come after the lessons are written
      And both come before the closing "aof memory ingest"
      And the command no longer says the evidence step records no recall observation
      And its output note admits the two ledger rows beside "RETROSPECTIVE.md"

    Scenario: two observations written the way the command says are accepted
      Given item 157 with an empty ledger
      And an observation with edge "retrospective-domain", scope "{}" and 4 lesson records, each with a verdict
      And an observation with edge "retrospective-evidence", scope '{"item":"157","area":"delivery"}' and 34 records, each with a verdict
      When each is submitted with "aof memory record-recall 157"
      Then item 157's ledger holds two rows of kind "recall", one per edge
      And submitting either one again changes nothing

    Scenario Outline: what the evidence step keeps from 157
      Then the retrospective command still <rule>

      Examples:
        | rule                                                                       |
        | refreshes observability before the evidence step                           |
        | runs "aof memory ingest" before the evidence recall                        |
        | gathers the evidence with one "--item <ref> --area delivery --all --json" recall |
        | forbids enumerating the raw ledgers as the evidence path                   |
        | reports unavailable evidence rather than reading raw files                 |
        | runs the recurrence match before each new lesson is written                |

    Scenario: recording the evidence does not inflate the raw-feedback count
      Given item 157's ledger holds 2 raw rows and the two retrospective recall rows
      When the finding-escape counter reads the ledger
      Then its raw-feedback denominator is 2
