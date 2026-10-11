Feature: Recall evidence coexists with feedback and the declared CLI

  Rule: R3 · Recall evidence does not change raw feedback semantics

    @executable @cli @work @memory
    Scenario: E6 · Mixed ledgers keep raw counter and classification semantics
      Given an item ledger contains 2 raw, 1 classification and 3 recall rows
      When counters reads the item and later triage classifies one raw row
      Then the raw feedback denominator is 2
      And the new classification references its raw row
      And attempting to classify a recall id is refused as a non-raw reference
      And all existing rows remain an unchanged byte prefix

    @executable @cli @work @memory
    Scenario: The raw capture door continues to reject verdict payloads
      Given a caller supplies recall fields to the existing work feedback command
      When raw capture validates the input
      Then it returns "feedback-classification-deferred"
      And no ledger or STATE file changes

    @executable @cli @work @memory
    Scenario: A malformed existing row is not silently dropped
      Given a ledger contains a valid raw row followed by an unknown record kind
      When a completed recall observation is submitted
      Then the result identifies the invalid ledger line
      And the original ledger remains byte-identical

    @executable @cli @work @memory
    Scenario: Recall mutation participates in publication without a raw projection
      Given a local item with the normal publication cascade available
      When a completed recall is recorded through the memory command
      Then the document transition publishes the changed item through the existing cascade
      And it creates no raw feedback row or STATE feedback bullet
      And a publication failure is returned as a propagation warning rather than hidden

    @executable @cli @work @memory
    Scenario: E7 · Brief is retired while recall preserves its public shape
      Given the memory command is available through both its routed and in-process doors
      When each door is invoked with verb "brief"
      Then each returns the normal unknown-verb refusal before resolving a backend
      And help no longer advertises brief
      And an ordinary recall still emits a records array under JSON and the existing compact block under block output

    @manual @cli @work @memory
    Scenario: The mixed-consumer control can detect an omitted partition
      Given FF-15301 is registered in the runnable architecture suite
      When the verifier temporarily makes recall rows contribute to the raw counter
      Then the control fails with the observed incorrect denominator
      And VERIFICATION records the mutation and failure message before the mutation is restored
