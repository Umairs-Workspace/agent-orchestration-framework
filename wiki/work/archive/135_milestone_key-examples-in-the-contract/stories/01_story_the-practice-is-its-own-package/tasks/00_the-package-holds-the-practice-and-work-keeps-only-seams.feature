@executable @cli @work @validate
Feature: The package holds the practice, and @aof/work offers seams that work with nothing plugged in

  WHY. Specification by example moves out of `@aof/work` into `@aof/specification-by-example`
  (ADR-001). The package answers everything `@aof/work` used to export for the map. `@aof/work`
  keeps three seams that name no practice: a story probe on the doctor engine, injected rows on the
  budget lane, and a `beforeBuild` list on the phase doors. An engine with nothing plugged in reports
  no example finding and refuses no build. The one-way dependency and the single home of the
  grammar are structural, so they are held by FF-13501 and FF-13402 rather than by scenarios.

  Scenario: the package answers what @aof/work used to export for the map
    Given the package "@aof/specification-by-example" is installed in the workspace
    When a consumer imports "<export>" from it
    Then it receives "<members>"

    Examples:
      | export       | members                                                                  |
      | ./map        | EXAMPLES_DOC, PROVENANCE, QUESTION_STATES, QUESTION_CLASSES, parseExampleMap, mapToken, readMapToken |
      | ./answers    | createExampleAnswers                                                     |
      | ./doctor-lane | createDoctorExamples                                                    |
      | ./build-door | a factory for the continue door's examples check                         |
      | ./story-probe | a factory for the doctor snapshot's story probe                         |

  Scenario: @aof/work no longer exports the map
    When a consumer imports "<old export>" from "@aof/work"
    Then the import fails because the package does not export it

    Examples:
      | old export        |
      | ./examples/map    |
      | ./examples/answers |
      | ./doctor/examples |

  Scenario: a doctor engine with no story probe gives a story row no extensions
    Given a work stream with a story whose folder holds an "EXAMPLES.md" with an open business question
    And a doctor engine built with no story probe
    When the doctor snapshot is built with the examples gate on
    Then the story's row carries no extensions
    And the story's row has no size entry for "EXAMPLES.md"

  Scenario: a story probe's sizes and extensions land on the story row
    Given a doctor engine built with a story probe that answers sizes "NOTES.md" 12 lines and extension "probe" holding "seen"
    When the doctor snapshot is built
    Then every story row has a size entry for "NOTES.md" of 12 lines
    And every story row carries the extension "probe" holding "seen"
    And no milestone row carries the extension "probe"

  Scenario: an injected budget row is judged like a built-in one
    Given the budget lane is given the row "NOTES.md" of kind "notes" with a 10-line default
    And a story whose "NOTES.md" is 11 lines long
    When the doctor runs over the stream
    Then it reports "doc-over-budget" for that story's "NOTES.md"

  Scenario: the continue door runs each before-build check and stops at the first refusal
    Given the continue door is built with two before-build checks, the first refusing with code "first-refusal"
    When "aof work continue" is run on a story
    Then it is refused with code "first-refusal"
    And the second check was not run
    And no status moved and nothing was dispatched

  Scenario: the continue door with no before-build checks refuses no story
    Given the continue door is built with no before-build checks
    And a story whose "EXAMPLES.md" holds an open business question
    When "aof work continue" is run on that story with the examples gate on
    Then the door does not refuse it
