@manual @docs @work @work-stream
Feature: the guide shows the buttons

  WHY. An operator meets the buttons on a phone. The guide says which messages carry them, who can
  tap them, and what each tap does.

  Scenario: the guide has a buttons section
    When `wiki/architecture/discord-notifications.md` is read
    Then a section names the halt's `Resume` and `Open a session here` and the per-choice buttons on a question
    And it says buttons appear only when the channel has an allowlist, and that the allowlist decides who can tap
    And it says a question with more than five choices, or a free-text question, is answered by reply
