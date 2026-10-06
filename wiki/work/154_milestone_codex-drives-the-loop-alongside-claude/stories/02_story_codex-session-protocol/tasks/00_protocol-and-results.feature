@cli @work @work-stream @executable
Feature: protocol and results

  Rule: R1 · Codex completion requires a valid phase result from a supported protocol

    Scenario: E1 · A Codex phase returns an attributable valid result
      Given a supported App Server fixture using a newly created native thread
      When continue is driven with item reference, procedure, arguments and bounded context
      Then the fixture receives all of that phase input
      And the result reports done only after a valid complete envelope
      And it carries the native thread identity published by the server
    
    Scenario: E2 · Transport completion is insufficient
      Given Codex completes a turn without the required result envelope
      When the driver settles the phase
      Then it reports failed with a result-validation diagnostic
      And it does not report the work item accepted
    
    Scenario Outline: Framing and correlation survive ordinary streaming variation
      Given protocol responses are delivered as "<delivery>"
      When the fixture completes its turn
      Then exactly one attributable phase result is returned
    
      Examples:
        | delivery                              |
        | one frame split across chunks         |
        | multiple frames in one chunk          |
        | notifications between matching replies |
        | harmless unknown notification         |
    
    Scenario Outline: Invalid protocol input fails within bounds
      Given the server emits "<input>"
      When the driver consumes it
      Then it reports an explicit bounded protocol failure and cleans up its process
      And diagnostic output contains no fixture credential sentinel
    
      Examples:
        | input                               |
        | malformed JSON                      |
        | an oversized frame                  |
        | an unmatched mandatory response     |
        | a failed initialization response    |
        | an unknown mandatory server request |
        | a terminal disconnect before result |

