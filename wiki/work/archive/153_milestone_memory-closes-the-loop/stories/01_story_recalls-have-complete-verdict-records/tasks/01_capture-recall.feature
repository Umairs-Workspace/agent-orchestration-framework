Feature: Completed recalls become append-only decision evidence

  Rule: R1 · A completed recall has one verdict for each distinct returned identity

    @executable @cli @work @memory
    Scenario: E1 · Two returned lessons retain their individual verdicts
      Given a local item "153" with an existing raw feedback row
      And the architect retained query "junction cleanup" with scope "area=architecture"
      And recall "c1" at "2026-10-10T12:00:00Z" returned lesson "45/R13" and lesson "68/R10"
      When the architect records "c1" through "aof work memory record-recall" with "45/R13=honoured" and "68/R10=departed"
      Then exactly one new row has kind "recall", id "c1", actor "architect" and edge "refine-architect"
      And its query, scope, capture instant, returned identities and verdicts equal the retained observation
      And the existing ledger bytes remain an unchanged prefix
      And recording the observation invokes no retrieval backend

    @executable @cli @work @memory
    Scenario: E2 · An empty recall remains an observable recall with memory off
      Given memory is off and item "153" is local
      And recall "c2" by the product owner at edge "refine-po" returned no records
      When the product owner records the completed observation with an empty records array
      Then one recall row is appended with its query, scope and empty records array
      And no verdict is fabricated and no index is created

    @executable @cli @work @memory
    Scenario: E3 · A missing verdict refuses the whole observation
      Given a completed observation contains lesson "45/R13" without a verdict
      When the observation is submitted to item "153"
      Then a coded invalid-observation result names the missing verdict
      And no ledger, STATE or publication event is written

    @executable @cli @work @memory
    Scenario Outline: Invalid observation shapes are rejected before mutation
      Given a valid two-record observation is changed to contain "<defect>"
      When it is submitted to a local item
      Then the result refuses the observation with a diagnostic identifying "<defect>"
      And all item files remain byte-identical

      Examples:
        | defect                     |
        | duplicate returned identity |
        | verdict accepted           |
        | blank actor                |
        | blank edge                 |
        | invalid capture instant    |
        | unknown top-level field    |
        | missing record type        |

    @executable @cli @work @memory
    Scenario Outline: The ledger owner is resolved exactly and locally
      Given the requested owner is "<owner>"
      When a valid completed observation is submitted
      Then the result is "<result>"
      And no other item's files are changed

      Examples:
        | owner                       | result                         |
        | existing local backlog spike | one recall row on that driver  |
        | existing local story         | one recall row on that story   |
        | unknown ref                  | ref-not-found refusal          |
        | remote-only item             | local-checkout refusal         |

  Rule: R2 · Retrying the same observation cannot duplicate or silently change it

    @executable @cli @work @memory
    Scenario: E4 · Concurrent identical retries leave one row
      Given a completed observation with id "c1" and an explicit capture instant
      When two same-item submissions of that exact observation run concurrently
      Then the ledger contains exactly one "c1" row
      And both callers identify the same recorded observation
      And replay emits no second capture event

    @executable @cli @work @memory
    Scenario: E5 · A conflicting retry cannot replace a verdict
      Given "c1" records lesson "45/R13" as "honoured"
      When "c1" is resubmitted with that verdict changed to "irrelevant"
      Then the result reports an id conflict
      And the ledger is byte-identical to its pre-submission content

    @executable @cli @work @memory
    Scenario: A separate recall of the same query is a separate observation
      Given "c1" already records query "junction cleanup"
      When a new completed recall "c3" records the same query and returned identities
      Then both recall ids remain in the ledger exactly once
