@cli @work @executable
Feature: Renumber keeps references and memory usable
  Scenario: Rewrite current references and publish the remap
    Given dependencies, links and lesson citations to the old item
    When the item is renumbered
    Then current references name the new item and the stream reindex effects receive the exact remap
  Scenario: Historical recall remains honest and joins the current lesson
    Given a recorded recall of a lesson before renumbering
    When the item is renumbered and memory is rebuilt
    Then the lesson is recalled under the new ref
    And the original recall bytes are preserved while accounting follows the recorded migration
