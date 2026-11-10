@executable @ui @board @design
Feature: The task card shows each rule as a heading over its scenarios

  WHY. On the board's story detail panel each task is a card listing its scenarios. A contract
  formulated from an example map has a shape (rules, each illustrated by key examples), and the
  card should show it (ADR-005 §2, DESIGN.md's binding checklist). A task written without rules must
  look exactly as it does today, so the change is invisible to the 1,291 delivered contracts.

  Rule: R1 · A task's scenarios show under the heading of the rule they sit in

    Scenario: E1 · two rules show as two headings in file order, each over its own scenarios
      Given the board shows a story whose task has rule "R1 · at most five loans" with scenarios "a" and "b", then rule "R2 · overdue blocks" with scenario "c"
      When the operator opens the story's detail panel
      Then the task card shows the heading "R1 · at most five loans" over "a" and "b"
      And then the heading "R2 · overdue blocks" over "c"
      And each scenario keeps its lane chip and its outline mark

    Scenario: E2 · scenarios outside any rule come first, with no heading
      Given the board shows a story whose task has scenario "loose" outside any rule, then rule "R1 · at most five loans" with scenario "a"
      When the operator opens the story's detail panel
      Then the task card lists "loose" first with no heading above it
      And then the heading "R1 · at most five loans" over "a"

  Rule: R2 · A task written without rules looks exactly as it does today

    Scenario: E3 · a task with no rule renders the same markup as before
      Given the board shows a story whose task has three scenarios and no rule
      When the operator opens the story's detail panel
      Then the task card's scenario list is identical to the list rendered before this story
      And it shows no rule heading

    Scenario Outline: a payload that carries no rule field reads as a task with no rule
      Given the tasks payload for a story's scenario carries <rule field>
      When the operator opens the story's detail panel
      Then the scenario shows in the flat list with no heading

      Examples:
        | rule field         |
        | "rule": null       |
        | no "rule" key      |
