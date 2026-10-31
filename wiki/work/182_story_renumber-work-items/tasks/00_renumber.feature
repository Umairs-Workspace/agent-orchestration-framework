@cli @work @executable
Feature: Renumber one item into a vacant slot
  Scenario: Preview and apply preserve unrelated numbers and status
    Given a done story at 175 and a separate item at 176
    When I preview renumbering 175 to 181
    Then no file or memory store changes
    When I apply the renumber
    Then story 181 is done and item 176 is unchanged
  Scenario: Refuse unsafe targets and held items before mutation
    Given an occupied target, invalid ref, or held source item
    When I request a renumber
    Then the request fails with a coded refusal and no mutation
