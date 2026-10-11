@cli @work @work-stream @executable
Feature: claude compatibility

  Rule: R1 · Existing Claude execution remains available through the shared session boundary

    Scenario: E1 · Claude receives the same phase brief through the shared boundary
      Given a Claude continue phase for story "154/00" with a bounded brief and command arguments
      When the shared session entry drives it using the existing Claude fixture
      Then the launched procedure and brief equal the legacy call's input
      And the returned native session id and done outcome equal the legacy call's result
    
    Scenario: E2 · Unknown runtime refuses before spawn
      Given runtime "unknown-assistant"
      When a phase is requested
      Then the result identifies an unsupported runtime
      And no assistant process is started
    
    Scenario Outline: Existing Claude outcomes survive the new entry
      Given a Claude fixture ending with "<event>"
      When the same phase is driven through each entry
      Then both callers observe "<result>"
      And cancellation and cleanup complete within the configured deadline
    
      Examples:
        | event                  | result                      |
        | valid completion       | done with native identity   |
        | blocking question      | needs-input with question   |
        | process failure        | failed with original reason |
        | caller stop            | interrupted                 |
        | start deadline expires | timeout                     |

