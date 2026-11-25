@cli @adapter @board
Feature: Observe Azure work item revisions between polls
  Rule: R4 · Change observations preserve feed position and item revisions
    @executable
    Scenario: E7 · Two revisions of the same item survive a feed page boundary
      Given the reporting feed after c17 contains item 410 revisions 9 and 10 on successive pages
      When the adapter consumes those pages
      Then it returns both observations in order and c18 as the continuation after revision 10
      And the next change read resumes from c18

    @executable
    Scenario: E8 · An expired cursor is distinguishable from a quiet board
      Given Azure rejects the saved continuation c17 as expired
      When the adapter reads changes from c17
      Then it reports loss of coverage and does not acknowledge an empty successful interval

    @executable
    Scenario Outline: Poll a quiet or changing board on the configured five-second cadence
      Given a completed change read and a controlled clock
      When five seconds elapse and the next recorded feed reply contains <entry>
      Then the caller observes <result> and can resume from the returned position

      Examples:
        | entry                         | result                          |
        | an empty valid page           | no changes                      |
        | a deletion of item 410        | deletion identifying item 410   |
        | a later tracked-field edit    | the changed ID and its revision |
