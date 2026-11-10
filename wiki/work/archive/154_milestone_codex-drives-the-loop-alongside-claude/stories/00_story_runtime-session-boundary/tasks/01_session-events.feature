@cli @work @work-stream @executable
Feature: session events

  Rule: R1 · Existing Claude execution remains available through the shared session boundary

    Scenario: Callbacks settle before the phase result becomes visible
      Given a session publishes identity "thread-154" and a question
      And persistence callbacks remain unresolved
      When the transport reaches its terminal event
      Then the caller receives no terminal result until the callbacks settle
      And the result carries the persisted identity
    
    Scenario Outline: Failed fact delivery cannot manufacture success
      Given "<callback>" rejects while the session is active
      When the driver settles the phase
      Then the caller receives a failed outcome naming the persistence failure
      And the owned process is cleaned up
    
      Examples:
        | callback |
        | identity |
        | question |
        | usage    |

