@cli @executable
Feature: Remove an issue by ID
  Scenario: Remove one issue and retain the others
    Given two saved issues
    When I remove one by its exact ID
    Then only that issue is removed
  Scenario: Reject invalid and missing IDs
    Given an invalid path-like ID or a well-formed ID that does not exist
    When I request removal
    Then a coded refusal leaves unrelated files unchanged
