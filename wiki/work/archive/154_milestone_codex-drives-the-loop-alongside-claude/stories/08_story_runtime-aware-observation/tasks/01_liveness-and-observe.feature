@cli @work @work-stream @executable
Feature: liveness and observe

  Rule: R1 · Runtime observation reports attributable facts and labels missing measurements

    Scenario: Codex observation joins the actual run session
      Given two runs share a Codex native thread and have distinct turns
      When each run is observed
      Then its activity and usage include only its attributed turns
      And unavailable transcript-derived metrics are named as unavailable
      And Claude cache-ratio thresholds produce no Codex warning
    
    Scenario Outline: Liveness is distinct from useful progress
      Given "<activity>" during an active Codex phase
      When the loop evaluates liveness and deadlines
      Then it reports "<observation>"
      And the original deadline is not extended merely by heartbeats
    
      Examples:
        | activity                            | observation                      |
        | server connected but no work event  | alive without productive progress |
        | normalized tool or text activity    | attributable recent activity      |
        | runtime hooks disabled              | driver-owned heartbeat continues  |
        | owned server process exits          | liveness ends with phase failure  |
    
    Scenario: Claude observation remains compatible
      Given an existing Claude transcript and run fixture
      When the normalized observation path is introduced
      Then existing Claude token, cost and cache measurements retain their documented values

