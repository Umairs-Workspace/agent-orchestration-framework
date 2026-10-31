@cli @executable
Feature: Global issue capture
  Scenario: Log an issue outside a project and list it from another directory
    Given an isolated global AOF home and two directories without AOF configuration
    When I log an issue with a summary and details in the first directory
    Then listing issues from the second directory returns its ID, text, creation time and origin
  Scenario: List an unused store without creating it
    Given no issues store exists
    When I list issues
    Then the result is empty and the store remains absent
  Scenario: Concurrent logging preserves every issue
    Given multiple issue logs write at the same time
    When all writes finish
    Then every completed issue has a unique ID and is listed in deterministic newest-first order
  Scenario: Refuse empty summaries and report corrupt saved records
    Given a blank summary or a corrupt saved issue
    When I log the blank summary or list the corrupt store
    Then a coded error explains the problem without overwriting evidence
