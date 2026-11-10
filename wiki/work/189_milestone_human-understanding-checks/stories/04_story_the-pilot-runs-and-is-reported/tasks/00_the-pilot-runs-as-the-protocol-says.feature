@uat @docs @planning
Feature: the pilot runs as the protocol says

  WHY. The sessions are the participant's, and the participant is the operator (189/04 Q1), so only
  they can run them. The protocol fixed the design before the first session (03); this task is that
  design carried out, with the coded observations on the sheet and nothing else kept.

  Rule: R1 · The pilot runs within the operator's budget

    Scenario: E1 · each build session is capped, and the total is recorded
      Given the protocol records one participant, the operator, and a $10 total model spend
      When each build session is started
      Then it is capped with `--max-budget-usd 5`
      And the sheet records each session's spend, and the total stays within $10

  Rule: R3 · A delayed item is run about a week later

    Scenario: E4 · each pack's delayed item is answered about a week later, without AI
      Given a pack's build session and immediate items are done
      When seven days have passed
      Then the participant answers that pack's delayed item with no AI assistant
      And the sheet records its result, help and minutes beside the immediate results

  Scenario: the order is drawn and recorded before the first session
    When the first session is about to start
    Then the order of the packs and arms has been drawn and is recorded in the sheet
    And the operator confirms they had not opened either pack's `FACILITATOR.md`, or records which items they had seen
