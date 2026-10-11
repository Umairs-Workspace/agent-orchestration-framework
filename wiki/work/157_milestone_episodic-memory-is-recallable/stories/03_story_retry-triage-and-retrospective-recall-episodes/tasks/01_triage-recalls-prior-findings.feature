Feature: Finding triage recalls the stream's prior findings

  WHY. A verifier triaging a finding cannot tell whether the stream has seen it before (157 SPEC).
  ADR-004 adds the "verify-finding" edge: refresh the index, recall prior findings across the whole
  stream, and judge each candidate by cause and evidence. A match is cited, never closed
  automatically; bare F ids do not identify a duplicate across items.

  Rule: R2 · A finding is triaged against the stream's prior findings

    @manual @cli @work @memory
    Scenario: E4 · a finding matching an earlier item's finding by cause is cited, not closed
      Given milestone "41" is being verified with a new finding "the loop cap is read from a stale config"
      And story "39/02" declares finding "F-01" with the same cause and evidence
      When verify triages the new finding
      Then it runs "aof work memory ingest" and then "aof work memory recall \"<the finding's text>\" --kind finding --block" with no item or stage filter
      And the triage cites "39/02" "F-01" as the prior occurrence
      And the new finding stays open for its owner to resolve
      And exactly one "verify-finding" observation by actor "verifier" is in item "41"'s ledger

    @manual @cli @work @memory
    Scenario: E5 · the finding being triaged is never its own duplicate
      Given the recall returns only the finding being triaged
      When verify triages it
      Then that identity is excluded as a candidate
      And the triage records a distinct incident
      And the observation still lists that returned record with an explicit verdict

    @manual @cli @work @memory
    Scenario: the same F id on another item is not a duplicate by id alone
      Given item "41"'s new finding is "F-01" and story "39/02" has an unrelated "F-01"
      When verify triages it
      Then the triage records a distinct incident and does not cite "39/02" "F-01"

    @executable @docs @work @memory
    Scenario: the authored and rendered verify procedure binds the triage edge
      Given the authored and rendered verify procedures
      When the registered edge control checks the "verify-finding" edge
      Then it finds the ingest-then-recall order and exactly one "--kind finding --block" recall with no "--item" or "--stage"
      And it finds one record-recall submission with edge "verify-finding" and actor "verifier"
      And removing that submission makes the control fail naming "verify-finding"
