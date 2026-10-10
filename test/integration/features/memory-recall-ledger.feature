Feature: Memory recall ledger — completed recalls become append-only decision evidence
  153/01 binds its two task features (01_capture-recall, 02_preserve-feedback-and-retire-brief) to
  the REAL CLI. `aof work memory record-recall <ref> --input <file>` appends one `recall` row to
  the owning item's existing FEEDBACK.ndjson ledger: one verdict per distinct returned identity,
  an identical replay a no-op, a changed replay refused, raw feedback and its classification
  semantics untouched. The task's Scenario Outlines are expanded here one row per scenario,
  because this runner has no Examples support. The @manual control scenario ("the mixed-consumer
  control can detect an omitted partition") is the verifier's, not this runner's: it is recorded
  with its red probe in the milestone VERIFICATION.

  Rule: R1 · A completed recall has one verdict for each distinct returned identity

  Scenario: E1 · Two returned lessons retain their individual verdicts
    Given a local item "153" with an existing raw feedback row
    And the architect retained recall "c1" at "2026-10-10T12:00:00Z" for query "junction cleanup" with scope "area=architecture" returning "45/R13=honoured" and "68/R10=departed"
    When the observation is submitted to item "153"
    Then the command should succeed
    And exactly one new row of kind "recall" with id "c1", actor "architect" and edge "refine-architect" was appended to item "153"
    And that row equals the retained observation
    And the existing ledger bytes of item "153" remain an unchanged prefix
    And no retrieval index exists anywhere

  Scenario: E2 · An empty recall remains an observable recall with memory off
    Given memory is off and item "153" is local
    And the product-owner retained recall "c2" at "2026-10-10T12:00:00Z" for query "nothing relevant" with scope "" returning nothing
    When the observation is submitted to item "153"
    Then the command should succeed
    And exactly one new row of kind "recall" with id "c2", actor "product-owner" and edge "refine-po" was appended to item "153"
    And that row has an empty records array
    And no retrieval index exists anywhere

  Scenario: E3 · A missing verdict refuses the whole observation
    Given a local item "153" with an existing raw feedback row
    And the architect retained recall "c1" at "2026-10-10T12:00:00Z" for query "junction cleanup" with scope "" returning "45/R13=" and "68/R10=departed"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "missing verdict for 45/R13"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · duplicate returned identity
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "duplicate returned identity"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "duplicate returned identity"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · verdict accepted
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "verdict accepted"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "verdict \"accepted\""
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · blank actor
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "blank actor"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "blank actor"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · blank edge
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "blank edge"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "blank edge"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · invalid capture instant
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "invalid capture instant"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "invalid capture instant"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · unknown top-level field
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "unknown top-level field"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "unknown top-level field"
    And no file under the work tree has changed

  Scenario: Invalid observation shapes are rejected before mutation · missing record type
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation is changed to contain "missing record type"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-observation"
    And the diagnostic mentions "missing record type"
    And no file under the work tree has changed

  Scenario: The ledger owner is resolved exactly and locally · existing local backlog spike
    Given a local backlog spike "probe"
    And a valid two-record observation "c1"
    When the observation is submitted to item "probe"
    Then the command should succeed
    And exactly one new row of kind "recall" with id "c1", actor "architect" and edge "refine-architect" was appended to item "probe"
    And no other item's files changed

  Scenario: The ledger owner is resolved exactly and locally · existing local story
    Given a local story "153/01"
    And a valid two-record observation "c1"
    When the observation is submitted to item "153/01"
    Then the command should succeed
    And exactly one new row of kind "recall" with id "c1", actor "architect" and edge "refine-architect" was appended to item "153/01"
    And no other item's files changed

  Scenario: The ledger owner is resolved exactly and locally · unknown ref
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation "c1"
    When the observation is submitted to item "999"
    Then the command should fail
    And the JSON error envelope should carry code "ref-not-found"
    And no file under the work tree has changed

  Rule: R2 · Retrying the same observation cannot duplicate or silently change it

  Scenario: E4 · Concurrent identical retries leave one row
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation "c1"
    When two same-item submissions of that exact observation run concurrently to item "153"
    Then both submissions succeed and name recall "c1"
    And the ledger of item "153" contains exactly one "c1" row
    And exactly one of the two submissions wrote and the other reported a replay

  Scenario: E5 · A conflicting retry cannot replace a verdict
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation "c1"
    And the observation is submitted to item "153"
    And the observation's verdict for "45/R13" is changed to "irrelevant"
    When the observation is submitted to item "153"
    Then the command should fail
    And the JSON error envelope should carry code "feedback-id-conflict"
    And the ledger is byte-identical to its content before this submission

  Scenario: A separate recall of the same query is a separate observation
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation "c1"
    And the observation is submitted to item "153"
    And a valid two-record observation "c3"
    When the observation is submitted to item "153"
    Then the command should succeed
    And the ledger of item "153" contains exactly one "c1" row
    And the ledger of item "153" contains exactly one "c3" row

  Rule: R3 · Recall evidence does not change raw feedback semantics

  Scenario: E6 · Mixed ledgers keep raw counter and classification semantics
    Given an accepted item "153" whose ledger holds 2 raw, 1 classification and 3 recall rows
    When counters reads item "153"
    Then the raw feedback denominator is 2
    And later triage classifies one raw row and the classification references it
    And classifying a recall id is refused as a non-raw reference
    And all earlier rows of item "153" remain an unchanged byte prefix

  Scenario: The raw capture door continues to reject verdict payloads
    Given a local item "153" with an existing raw feedback row
    When a caller supplies a verdict to the existing work feedback command for item "153"
    Then the command should fail
    And the diagnostic mentions "classification belongs to later triage"
    And no file under the work tree has changed

  Scenario: A malformed existing row is not silently dropped
    Given a local item "153" whose ledger holds a valid raw row followed by an unknown record kind
    And a valid two-record observation "c1"
    When the observation is submitted to item "153"
    Then the command should fail
    And the diagnostic mentions "line 2"
    And no file under the work tree has changed

  Scenario: Recall mutation participates in publication without a raw projection
    Given a local item "153" with an existing raw feedback row
    And a valid two-record observation "c1"
    When the observation is submitted to item "153"
    Then the command should succeed
    And the changed item was published through the existing cascade
    And item "153" has no STATE.md feedback bullet and no raw row from the recall

  Scenario: E7 · Brief is retired while recall preserves its public shape
    Given a local item "153" with an existing raw feedback row
    When I run `work memory brief --json`
    Then the command should fail
    And the JSON error envelope should carry code "unknown-verb"
    And help for the memory command no longer advertises "brief"
    And an ordinary recall still emits a records array under JSON
