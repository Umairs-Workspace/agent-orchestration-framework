@executable @cli @work @work-stream
Feature: The capture path has no menu, and cannot grow one

  A feedback loop that presents a menu collects selections from the menu. That is the entire reason
  for this rule, and it is why the guard is about what the capture path *offers* rather than what it
  *does with what it is given*: the harm happens at the moment the person is shown a list, before
  any code has run at all.

  The capture surface today takes free text and an actor and nothing else, which is exactly right.
  What it lacks is anything that would fail if someone added a severity flag next month for
  perfectly sensible reasons. This is a story about protecting behaviour that already works, and the
  observable outcome is a refusal that does not exist yet.

  ADR-005. FF-5507.

  Scenario: a classification argument is refused rather than accepted and ignored
    Given a capture invoked with a severity argument
    When it runs
    Then it is refused
    And nothing is recorded

  Scenario Outline: what the capture path accepts
    Given a capture invoked with <argument>
    When it runs
    Then it is <outcome>

    Examples: free text and attribution, and nothing that asks the person to choose
      | argument                | outcome  |
      | the feedback text       | accepted |
      | the actor who raised it | accepted |
      | a target item reference | accepted |
      | a severity              | refused  |
      | a type                  | refused  |
      | a category              | refused  |
      | a routing destination   | refused  |

  Scenario: the refusal explains where classification belongs
    Given a capture invoked with a classification argument
    When it is refused
    Then the message names the later step that classifies

  Scenario: the destination is chosen by the target's type, never by asking
    Given capture targets of different types
    When feedback is captured against each
    Then the destination is determined from the target's type
    And the person is not asked to choose one

  Scenario: capture never pauses for input
    Given a capture running without an interactive session
    When it runs
    Then it completes without prompting
