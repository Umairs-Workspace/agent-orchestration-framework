Feature: Workspace configuration selects a tracking provider

  Rule: R1 · Workspace configuration selects a tracking provider

    @executable @cli @work @work-stream
    Scenario: E1 · An existing workspace opens without a migration
      Given an existing orchard workspace with no work.store setting
      When the operator lists its items
      Then the file provider answers and the listing equals that of the same workspace configured with files

    @executable @cli @work @work-stream
    Scenario: E2 · An unsupported selection names the configuration error
      Given an orchard workspace with work.store set to typo
      When the operator requests its first tracking operation
      Then the request fails naming work.store, typo and files before any record changes

    @executable @cli @work @work-stream
    Scenario Outline: Selection handles missing and malformed input
      Given a fresh workspace and the fixture specified by the row
      When a tracking request opens a workspace with <setting>
      Then the request produces <outcome>

      Examples:
        | setting | outcome |
        | an object | an actionable configuration error |
        | a boolean | an actionable configuration error |
        | an empty string | an actionable configuration error |
        | the string FILES | an actionable configuration error |
