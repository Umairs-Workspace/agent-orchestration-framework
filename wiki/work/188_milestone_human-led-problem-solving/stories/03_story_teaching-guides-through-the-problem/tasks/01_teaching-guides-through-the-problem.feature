@executable @docs @work-stream
Feature: the teaching session asks the human to think first, and gives help only on request

  WHY. The SPEC asks the human to restate, predict and propose before anything is revealed, with
  help pulled one rung at a time, and with traps taught through the problem, never as labels on the
  person. This replaces the 149 guide's "order to take the tasks in" in teaching only (ADR-006 §4).
  Rows land in `packages/learning/test/teach-guide.suite.mjs`, read against `teach.md`.

  Rule: R1 · The human thinks first, and may skip

    Scenario: E1 · the session asks for a restatement before naming a file to change
      When `teach.md` is read
      Then it says the session asks the human to restate the problem in their own words before naming any file to change
      And it says the session then asks for a prediction of one example's outcome, and then for an approach

    Scenario: E2 · the human may skip a step
      When `teach.md` is read
      Then it says the human may skip any thinking-first step, and the session moves to the next one without arguing

  Rule: R2 · Help is pulled one rung at a time, and labelled

    Scenario: E3 · "I'm stuck" climbs one rung, labelled
      When `teach.md` is read
      Then it says the session offers the next rung only when the human asks or says they are stuck
      And it says each answer names the rung it comes from

    Scenario: E4 · the worked explanation is given on request, in the terminal
      When `teach.md` is read
      Then it says the human may ask for any rung directly, the worked explanation included
      And it says no rung writes a file

    Scenario: E5 · a declined question offers the next rung, not another question
      When `teach.md` is read
      Then it says that when the human declines a question, the session offers the next rung instead of asking another one
      And it says the session asks one question at a time and never dumps code the human did not ask for

    Scenario: E7 · each task starts at the first rung
      When `teach.md` is read
      Then it says each task starts at the diagnostic question, whatever rung the previous task reached

  Rule: R3 · A trap is taught through the current problem, never as a label on the human

    Scenario: E6 · a counterexample from the task, never a diagnosis
      When `teach.md` is read
      Then it says a trap is addressed through its control applied to the current task, such as a counterexample from the task's examples
      And it says the session never tells the human they fell into a trap, and never names a trap as a judgement of the person

  Scenario Outline: the guidance is grounded in the story's own record
    When `teach.md` is read
    Then it says the guidance draws on <source>

    Examples:
      | source                                                              |
      | the story's task features and their scenario names                  |
      | the confirmed and stated examples in the story's `EXAMPLES.md`       |
      | the ADR anchors in the story's `reads:`                              |
      | the `files:` entries and the test files among them                   |
      | the six problem-solving stages, named as a map and never as a sequence of approvals |

  Scenario: plain manual is unchanged
    When `packages/core/assets/commands/manual.md` is read
    Then it still names an order to take the tasks in, with the reason for it
    And it names no rung, stage or trap
