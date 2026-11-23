Feature: Placement preserves number spaces and dependency targets

  Rule: R1 · Placement preserves number spaces and dependency targets

    @executable @cli @work @work-stream
    Scenario: E1 · A tail promotion rewrites the waiting edge
      Given queued is in the backlog and the highest archived number is 30
      When the operator promotes queued
      Then it becomes 31 and waiting now depends on 31

    @executable @cli @work @work-stream
    Scenario: E2 · Inserting a UAT preserves its dependency across a shift
      Given the operator supplies 12 as the dependency of a new UAT
      When the operator inserts trial at 11 with confirmation
      Then trial occupies 11 and depends on the spike now at 13

    @executable @cli @work @work-stream
    Scenario Outline: Each placement face retains its preflight result
      Given a fresh workspace and the fixture specified by the row
      When the operator attempts <operation> in a fresh stream
      Then the result is <result> with the same complete stream delta as the file baseline

      Examples:
        | operation | result |
        | insert story wash at 10/00 | two siblings shift and the parent checklist changes |
        | promote queued at archived slot 30 | promote-number-archived |
        | insert chore labels2 at 11 without confirmation | insert-confirm-required and no staged item |
        | promote waiting before queued | promote-depends-backlog |
