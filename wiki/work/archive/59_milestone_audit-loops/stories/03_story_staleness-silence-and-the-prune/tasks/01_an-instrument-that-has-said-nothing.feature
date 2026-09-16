@executable @cli @work @validate
Feature: An instrument that has produced no reading inside its own cadence is named

  A channel that has been silent for weeks looks exactly like a channel with nothing to report. The
  system cannot tell the difference by watching the channel; it can only tell by knowing how often the
  channel was supposed to speak — and every declared instrument in this registry already says that, in
  its own cadence.

  So there is one rule rather than one rule per channel. An instrument whose declared cadence says it
  should have produced a reading, and which has produced none inside that window, is reported as
  silent. A feedback channel, a watcher's counter and a loop's own measurement are all covered by the
  same sentence, and a channel added later needs no new check.

  An instrument that declares no cadence cannot be judged this way, and the report says that rather
  than guessing a window on its behalf.

  ADR-004 §2. FF-5907, FF-5908.

  Scenario: an instrument that has spoken inside its window is not reported
    Given an instrument whose declared cadence expects a reading within a window
    And a reading inside that window
    When silence is assessed
    Then the instrument is not reported as silent

  Scenario: an instrument that has produced nothing inside its window is reported as silent
    Given an instrument whose declared cadence expects a reading within a window
    And no reading inside that window
    When silence is assessed
    Then the instrument is reported as silent
    And the finding names the instrument, its declared cadence and how long it has been quiet

  Scenario: an instrument with an unknown cadence is reported as unjudgeable
    Given an instrument whose cadence is declared unknown
    When silence is assessed
    Then it is reported as having no window to judge against
    And no silence finding is raised for it

  Scenario Outline: the rule is the same whatever the instrument is
    Given a silent <instrument> with a declared cadence
    When silence is assessed
    Then it is reported as silent by the same rule

    Examples:
      | instrument                  |
      | loop measurement            |
      | watcher counter             |
      | feedback channel            |

  Scenario: an event cadence is judged by its own scope, not converted to a duration
    Given an instrument whose cadence is an event trigger rather than a period
    When silence is assessed
    Then it is judged against occurrences of that event
    And no duration is derived from the trigger

  Scenario: the assessment says how many instruments it considered
    Given a registry of instruments
    When silence is assessed
    Then the result reports the number of instruments it considered
    And an assessment that considered none is reported as having run on nothing
