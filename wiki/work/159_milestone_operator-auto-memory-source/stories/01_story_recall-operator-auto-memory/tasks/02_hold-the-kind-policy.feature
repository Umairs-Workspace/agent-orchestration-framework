Feature: R3 · Imported lessons have an explicit meaning in the held kind vocabulary

  @executable @cli @adapter @memory
  Scenario: E7 · Feedback uses the operator-approved near-miss mapping
    Given the enabled source contains the junction reminder with metadata.type "feedback"
    And the entry declares no AOF kind
    When I ingest and recall "junction" with kind "near-miss" and owner "operator"
    Then the lesson is returned with kind "near-miss" and tags ["feedback"]
    And its area, stage and status are empty strings

  @executable @cli @adapter @memory
  Scenario: E8 · Project facts use the same fixed mapping
    Given the enabled source contains the AOF CLI context with metadata.type "project"
    And the entry declares no AOF kind
    When I ingest and recall "AOF CLI" with kind "near-miss" and owner "operator"
    Then the lesson is returned with kind "near-miss" and tags ["project"]
    And its area, stage and status are empty strings

  @executable @cli @adapter @memory
  Scenario Outline: Source prose and unrelated metadata cannot reclassify the lesson
    Given the enabled source contains an entry of type "<type>"
    And the entry's prose calls the event "<word>"
    And unknown metadata declares kind "blocker", owner "developer" and stage "verify"
    When I ingest and recall that entry with kind "near-miss" and owner "operator"
    Then its kind remains "near-miss", owner remains "operator" and stage remains empty
    And its tags are ["<type>"]

    Examples:
      | type     | word             |
      | feedback | mistake          |
      | project  | misunderstanding |

  @executable @cli @adapter @memory
  Scenario: Existing hard filters still separate operator and work-item lessons
    Given an operator lesson and a work-item 45 lesson both match "junction"
    When I recall "junction" with owner "operator"
    Then only the operator lesson is returned
    When I recall "junction" with item "45"
    Then only the work-item lesson is returned
    When I recall "junction" with kind "mistake" and owner "operator"
    Then no operator lesson is returned

  @executable @cli @adapter @memory
  Scenario: Status reports blank source metadata honestly
    Given an otherwise conforming baseline corpus and two eligible operator entries
    When I ingest and inspect memory status
    Then lesson and procedural counts each increase by 2
    And the blank-area and blank-stage lesson counts each increase by 2
    And blank-kind, non-enum-kind and blank-owner counts do not increase
