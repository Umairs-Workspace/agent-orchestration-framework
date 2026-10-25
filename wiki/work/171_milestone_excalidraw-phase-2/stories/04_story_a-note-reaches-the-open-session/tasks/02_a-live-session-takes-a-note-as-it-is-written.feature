@uat @ui @work @design
Feature: A live architect session takes a note as it is written

  WHY. The headless suites stand the session in, so a real `claude` session queueing a typed
  invocation while it works, and answering it next, is the part no check covers (170 RETROSPECTIVE
  R3). The operator runs it, because it starts a paid session.

  Rule: R1 · With the architect's session running, a new note is typed into it

    Scenario: a note added mid-answer is answered next, in the same session
      Given the operator has asked the architect a question from the editor, and its session is answering in the dock
      When the operator adds a note on another shape before the answer finishes
      Then the session takes the note's review invocation after its current answer, without a new session
      And the note's answer appears in the editor
      And the operator accepts it as the note reaching the open session
