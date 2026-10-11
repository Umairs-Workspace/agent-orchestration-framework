@cli @work @work-stream @executable
Feature: cancellation and requests

  Rule: R1 · Codex completion requires a valid phase result from a supported protocol

    Scenario Outline: Stops interrupt the owned Codex turn
      Given a Codex turn remains active
      When "<stop>" occurs
      Then the driver requests interruption and settles within the configured bound
      And the server process and pipes are released
      And no replacement assistant starts
    
      Examples:
        | stop                  |
        | operator cancellation |
        | start-to-close limit  |
        | parent abort signal   |
        | server stops replying |
    
    Scenario Outline: Permission requests cannot become business decisions
      Given the server requests "<permission>"
      When the adapter receives the request
      Then it declines the request and exposes the need for operator action
      And it sends no approval and changes no trust or sandbox settings
    
      Examples:
        | permission                  |
        | command execution approval  |
        | file change approval        |
        | broader session permissions |
    
    Scenario Outline: Blocking questions normalize without loss
      Given a blocking question arrives via "<source>"
      When the adapter reports needs-input
      Then the question text, token, choices and native thread identity are preserved
      And a question without native identity fails visibly
    
      Examples:
        | source                           |
        | native tool request for user input |
        | final structured needs_input result |

