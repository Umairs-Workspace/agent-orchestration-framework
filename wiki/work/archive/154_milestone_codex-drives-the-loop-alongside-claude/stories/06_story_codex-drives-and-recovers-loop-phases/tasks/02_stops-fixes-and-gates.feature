@cli @work @work-stream @executable
Feature: stops fixes and gates

  Rule: R1 · Assistant choice changes execution without bypassing loop gates or durable questions

    Scenario Outline: Assistant completion cannot bypass a gate
      Given a Codex phase reports complete
      And "<gate>" fails
      When the loop processes the result
      Then the item is not accepted
      And the existing failure or bounded repair path is used
    
      Examples:
        | gate                    |
        | structural validation   |
        | executable task tests   |
        | independent review      |
        | behavioral verification |
        | required live evidence  |
    
    Scenario Outline: Stop and repair bounds remain authoritative
      Given a Codex loop reaches "<condition>"
      When the condition is handled
      Then the loop reports "<outcome>"
      And owned child processes settle without further phases starting
    
      Examples:
        | condition                 | outcome                         |
        | operator stop             | stopped                         |
        | start-to-close deadline   | bounded timeout                 |
        | schedule-to-close deadline | bounded timeout                |
        | maximum repair attempts   | lane halt with repair handover  |
    
    Scenario: A warm fix retains the runtime and native session
      Given a recoverable Codex build failure with an available thread
      When the bounded fix phase starts
      Then it resumes that thread using recorded continue settings
      And it receives the failure evidence and allowed scope
      And its success is still checked by the existing gates
    
    Scenario: A permitted cold fix remains explicit
      Given the previous Codex thread is unavailable and existing policy permits a cold fix
      When the fix starts
      Then a new Codex thread receives the original scope and repair evidence
      And the run records the new native identity and cold-start reason
      And this policy is not used to discard a pending unanswered question

