@cli @adapter @board
Feature: Read an Azure project using its configured inherited process
  Rule: R1 · Use the executing account to access a project that supports the declared mappings
    @executable
    Scenario: E1 · Feature 410 maps to an in-progress milestone
      Given the selected organization, project, inherited Agile process and area contain Feature 410 in Active
      When the selected Azure adapter reads it through the work store against recorded HTTP
      Then the item is a milestone with status in-progress and its board ID and revision are preserved

    @executable
    Scenario: E2 · Missing Blocked state identifies the process mismatch
      Given the project uses a process whose User Story lacks the mapped Blocked state
      When the adapter checks the project for use
      Then the result names the type and missing state
      And no work item or process has been changed

    @executable
    Scenario: E9 · A personal-account board read succeeds
      Given the executing account's az returns a fixture token and expiry
      And the recorded endpoint requires that bearer token and X-VSS-ForceMsaPassThrough set to true
      When the adapter reads the configured project
      Then the mapped item is returned and command output and diagnostics omit the token

    @executable
    Scenario Outline: Reuse credentials only while valid
      Given the first read acquired a token valid until 10:30 from the executing account
      When a second read starts at <time> with <broker>
      Then the adapter produces <result> and exposes no token in output or diagnostics

      Examples:
        | time  | broker                | result                                       |
        | 10:05 | the same sign-in      | a successful read using the cached token     |
        | 10:31 | a fresh token         | a successful read using the fresh token      |
        | 10:31 | an expired sign-in    | an authentication failure before board access |

    @manual
    Scenario: The example's setup guide can be followed before enabling board access
      Given a clean checkout and the shipped example and guide
      When I follow the guide up to the point that needs a project administrator
      Then I can identify the inherited types, states, fields and relations to configure
      And I can identify the separate admin step, the project and area selection, and the read that checks them
