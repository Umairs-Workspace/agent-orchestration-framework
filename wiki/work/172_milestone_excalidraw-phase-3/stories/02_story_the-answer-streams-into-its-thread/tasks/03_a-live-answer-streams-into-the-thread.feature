@uat @ui @work @design
Feature: A live architect's answer streams into the thread, and a reply's answer does too

  WHY. The milestone's outsider check (SPEC Objective): open a diagram, ask the architect about a
  shape, and watch the answer stream into that shape's thread with no terminal opened; reply, and see
  the next answer stream the same way. Only a real `claude` answering a real question shows it, and
  that starts a paid session, so the operator runs it (170 RETROSPECTIVE R3).

  Rule: R1 · Asking delivers the question to the architect's session, and its answer streams into the new thread

    Scenario: the operator watches a real answer stream into the shape's thread
      Given the operator has the deployed build open on a diagram of the test-bed, with no architect session running
      When the operator selects a shape and asks the architect a question about it
      Then the thread opens in the panel and the answer is written into it as the architect produces it
      And no terminal opens anywhere on the page
      And the operator accepts the answer as streamed into the shape's thread

  Rule: R2 · A reply continues the thread, and the next answer streams the same way

    Scenario: the operator replies and watches the next answer stream
      Given the architect has answered the operator's question in its thread
      When the operator replies in the same thread
      Then the architect's next answer is written into the same thread as it is produced
      And the operator accepts the reply's answer as streamed the same way
