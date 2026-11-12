@executable @cli @work @work-stream
Feature: a Claude question keeps its choices

  WHY. A button needs the choices as data. Today a Claude question's options are folded into its
  text as `- <label>` lines, and only codex asks keep them. The pending-ask reader answers them the
  way codex's profile does: for exactly one question with options (ADR-007 §2).

  Scenario Outline: the pending ask answers the labels for exactly one question
    Given a pending human-input call recorded with <questions>
    When `readPendingAsk` reads it
    Then it answers choices <choices>
    And its question text is unchanged from today's

    Examples:
      | questions                                                                 | choices                         |
      | one question with options "Yes, ship it" and "No, hold"                    | ["Yes, ship it", "No, hold"]    |
      | one question with no options                                              | []                              |
      | two questions, each with two options                                      | []                              |

  Scenario: the ask record carries the choices
    Given a driven session stops on a pending call with options "Yes, ship it" and "No, hold"
    When the loop opens the ask
    Then the ask file's `choices` is ["Yes, ship it", "No, hold"]
    And the `session-needs-input` envelope handed to `notify` carries the same choices

  Scenario: an ask with no pending call has no choices
    Given a driven session ended its turn with a question in words
    When the loop opens the ask
    Then the ask file's `choices` is absent or []
