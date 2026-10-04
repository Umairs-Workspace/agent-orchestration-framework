@executable @cli @work @validate
Feature: Nothing a user can see changes when the practice moves into its own package

  WHY. The move is a restructure (ADR-001 §5). With core composing the package into the seams, every
  command behaves exactly as it did under 134: the same doctor codes and messages, the same budget,
  the same refusal at the continue door, the same answer stamp at settle, and silence when the gate
  is off. 134's own suites pass from the new home with only their imports changed. These scenarios
  pin the user-visible half through the assembled application.

  Background:
    Given a project with "work.examples.enabled" set to true
    And a story "7/2" whose "EXAMPLES.md" holds an open business question "Q1" and a "confirmed" example "E2" no answer carries

  Scenario: the doctor reports the same example findings through the assembled application
    When "aof work doctor 7/2 --json" is run
    Then it reports "example-question-open" naming "Q1" at error
    And it reports "example-provenance-unanchored" naming "E2" and the token "7/2 E2" at error
    And each finding's path is the story's "EXAMPLES.md"

  Scenario: the map is still budgeted at one screen
    Given the story's "EXAMPLES.md" is 51 lines long
    When "aof work doctor 7/2 --json" is run
    Then it reports "doc-over-budget" for the story's "EXAMPLES.md" against a budget of 50 lines

  Scenario: the continue door still refuses the story
    When "aof work continue 7/2 --json" is run
    Then it is refused with code "examples-question-open" and status 409
    And the refusal's detail lists both findings

  Scenario: a person's tokened answer is still stamped onto the run at settle
    Given the story's open run has a transcript in which the person answered the question "7/2 Q1 · Does a reserved book count?"
    When the run is completed
    Then the run record's brief carries one answer with token "7/2 Q1"

  Scenario Outline: off is still today
    Given "work.examples" is <setting>
    When "aof work doctor 7/2 --json" and "aof work continue 7/2" are run
    Then the doctor reports no finding whose code starts with "example-"
    And the continue door does not refuse the story on its map

    Examples:
      | setting                  |
      | absent                   |
      | { "enabled": false }     |
      | { "enabled": "true" }    |
