@cli @work @work-stream @executable
Feature: durable question recovery

  Rule: R1 · Assistant choice changes execution without bypassing loop gates or durable questions

    Scenario: E2 · A parked question survives process restart
      Given Codex thread "thread-154" asks question "154/06 Q1" with three options
      When the question and native identity are persisted and the phase parks
      And the AOF process restarts before an authorized answer arrives
      Then the pending question and its options are still visible
      When that answer is supplied
      Then a new turn on "thread-154" receives the recorded question and answer
      And no response is sent to the obsolete protocol request id
    
    Scenario Outline: Answer delivery is durable at each crash boundary
      Given a crash occurs at "<checkpoint>"
      When the run recovers
      Then the answer state is "<outcome>"
      And ambiguous delivery never triggers blind duplicate submission
    
      Examples:
        | checkpoint                             | outcome                                    |
        | before pending question is persisted   | run failed without claiming it is parked   |
        | after question persistence before stop | one pending question recovered             |
        | after answer recorded before send      | recorded answer remains eligible for send  |
        | after send before acknowledgement      | reconcile native turn or halt for operator |
        | after acknowledged delivery            | no duplicate answer turn                   |
    
    Scenario Outline: Question identity prevents cross-run or conflicting delivery
      Given "<input>"
      When the ask service receives it
      Then it reports "<outcome>" without altering another run's question
    
      Examples:
        | input                             | outcome                       |
        | duplicate pending question token  | existing question reused      |
        | same token with different text    | visible conflict              |
        | answer naming a different run     | rejected answer               |
        | answer from unauthorized sender   | rejected answer               |
        | question without native session   | unrecoverable question halt   |
        | several distinct questions        | one pending question at a time |
    
    Scenario: A new question after resume keeps its own token
      Given the first recorded question was answered on the original thread
      When Codex asks a second blocking question
      Then only the second question is pending
      And both decisions remain attributable to the same run

