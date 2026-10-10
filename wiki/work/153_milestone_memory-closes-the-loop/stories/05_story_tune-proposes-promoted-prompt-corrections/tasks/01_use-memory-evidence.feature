Feature: Tune accounts for observed verdicts and explicit recurrence

  Rule: R1 · Tune uses both verdict observations and explicit recurrence without inventing evidence

    @executable @cli @work @memory
    Scenario: E1 · The existing tune corpus carries both missing signals
      Given lesson "45/R13" has 3 surfaced, 1 honoured and 2 departed observations
      And a distinct later lesson explicitly recurs from "45/R13"
      And the scoped fixture meets tune's existing corpus and provenance floors
      When the operator runs work tune for that scope
      Then the candidate exposes surfaced 3, honoured 1, departed 2 and recurred 1
      And its evidence cites the ledger rows and both source lessons
      And no count is inferred merely from repeated wording in prose

    @executable @cli @work @memory
    Scenario: E2 · Extra observations do not counterfeit independent documents
      Given a candidate's repeated lesson mentions and recall rows all belong to one source document
      And its proposal evidence floor requires two distinct source documents
      When tune resolves the candidate's provenance
      Then it retains the insufficient-evidence finding
      And it does not count repeated observations as a second source document

    @executable @cli @work @memory
    Scenario: Missing and corrupt ledger evidence remain distinguishable
      Given one selected item has no ledger and another has an invalid recall row
      When tune assembles its evidence
      Then the absent ledger contributes zero observations
      And the invalid row is diagnosed with its source instead of silently contributing zero
      And unrelated valid evidence is not described as corrupted

    @executable @cli @work @memory
    Scenario: Scoped memory evidence does not leak unrelated incidents
      Given items "45" and "68" each have recall observations
      When tune is scoped to "68"
      Then only observations owned by the selected items contribute to its observation counts
      And referenced prior lessons can be resolved for provenance without importing unrelated ledger observations
      And the corpus report declares which source lane it read
