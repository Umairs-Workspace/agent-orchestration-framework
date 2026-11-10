Feature: Retrospective connects each new lesson to prior prevention

  Rule: R2 · Retrospective uses prior lessons and promotion metadata before indexing new evidence

    @manual @docs @work @memory
    Scenario: E4 · A new recurrence is stamped before ingest
      Given a disposable retrospective already has legacy lessons R1 through R3
      And the whole-index recurrence command matches the new incident to "45/R13"
      When the retrospective author appends R4
      Then the document establishes promotionFrom 4 before the append
      And R4 includes Recurs "45/R13" and an explicit Promoted to value
      And the new incident retains its own factual evidence and stable R4 identity
      And the prior lesson is not rewritten
      And ingest occurs after those fields have been authored

    @manual @docs @work @memory
    Scenario: E5 · A clean retrospective invents no lesson or historical promotion
      Given the retrospective evidence contains nothing worth a new lesson
      When the retrospective procedure completes its lesson pass
      Then it reports no new lesson
      And it leaves the existing R1 body byte-identical
      And it invents no recurrence or promotion to fill the page

    @manual @docs @work @memory
    Scenario: An unmatched lesson still carries an honest promotion answer
      Given a new lesson has no qualifying recurrence and no completed promotion
      When the author records it at the retrospective
      Then it has Promoted to "none"
      And it has no Recurs field
      And the author does not claim a planned control already exists

    @uat @cli @work @memory
    Scenario: An operator can trace a lesson from recall to repeated incident
      Given the demonstrated refine and build ledgers contain returned ids with explicit verdicts
      And a demonstrated retrospective contains a recurrence and a promotion target
      When an operator inspects the ledger and source evidence
      Then the operator can identify which advice was honoured and which later incident repeated it
      And the operator can identify the named prevention destination without interpreting internal storage code
      And the human response is recorded in VERIFICATION without substituting an agent's approval
