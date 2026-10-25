@uat @ui @work @design
Feature: A live architect answers a reply in the thread

  WHY. The smoke stands in for the architect, so a real model reading a thread and answering its
  latest turn is the part no check covers (170 RETROSPECTIVE R3). The operator runs it, because it
  starts a paid session.

  Rule: R2 · The architect's answer is a turn of the thread

    Scenario: the operator's reply is answered by the live architect, beside the shape
      Given the operator has the editor open on a real ADR's diagram, with the architect's session running in the dock
      When the operator adds a note on a box, reads the architect's answer in its thread, and replies with a follow-up
      Then the architect's answer to the follow-up appears in the same thread, beside the box, without a reload
      And the operator accepts it as answering the follow-up
