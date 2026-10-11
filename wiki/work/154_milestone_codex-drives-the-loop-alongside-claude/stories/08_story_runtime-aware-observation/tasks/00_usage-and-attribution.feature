@cli @work @work-stream @executable
Feature: usage and attribution

  Rule: R1 · Runtime observation reports attributable facts and labels missing measurements

    Scenario: E1 · Repeated usage events are counted once
      Given Codex turn "turn-1" reports cumulative input 100 and output 20 twice
      When both events are ingested for its run
      Then reported totals are input 100 and output 20
      And the report retains the native thread and turn attribution
    
    Scenario: E2 · Missing cost remains unavailable
      Given a Codex run reports token usage but no monetary cost
      When spend is displayed or exported
      Then token usage is shown
      And monetary cost is null with an unavailable explanation
      And zero dollars is not inferred from subscription access
    
    Scenario Outline: Usage aggregation does not cross run boundaries
      Given "<events>"
      When run totals are computed
      Then the observation is "<outcome>"
    
      Examples:
        | events                                       | outcome                          |
        | cumulative 100 then 150 for one turn          | 150 tokens counted               |
        | replayed turn from an earlier settled run    | no new-run increment             |
        | two new turns with 100 and 50 tokens         | 150 tokens for their owning run  |
        | older counter after newer counter           | total does not double or decrease |
        | no usage event                              | usage unavailable                |
        | unknown usage fields                        | known fields retained honestly   |

