@cli @adapter @board
Feature: Hydrate the whole Azure stream and read individual items
  Rule: R2 · Reads cover the selected stream, its relations and the requested IDs
    @executable
    Scenario: E3 · Item 2505 and a dependency across detail batches survive hydration
      Given recorded WIQL selects 2505 IDs in the configured area and excludes a neighbouring area's item
      And item 2505 has a parent, a rank after 2504 and a predecessor in the first batch
      When I list the stream through the selected board and inspect the last item's mapped record
      Then all 2505 selected IDs occur once and the neighbouring item is absent
      And the parent, predecessor direction, title, status and relative rank match the board

    @executable
    Scenario: E4 · A targeted read accounts for a missing ID
      Given Azure can return 410 at revision 8 but cannot return 411
      When the adapter is asked to verify just IDs 410 and 411
      Then it returns 410 with revision 8 and identifies 411 as missing
      And the recorded transport receives no whole-stream query

    @executable
    Scenario Outline: Every work item type, legal state and membership survives mapping
      Given an Azure fixture for <type> with its declared <board type>
      When each legal AOF state and supported membership for that type is encoded and read back
      Then the decoded type, state and active, backlog or archived membership match the fixture

      Examples:
        | type      | board type     |
        | milestone | Feature        |
        | story     | User Story     |
        | task      | Task           |
        | chore     | inherited Chore |
        | spike     | inherited Spike |
        | uat       | inherited UAT   |
        | prototype | inherited Prototype |

    @executable
    Scenario: Unmapped state faults the affected record
      Given a linked User Story returns a state outside its configured mapping
      When I read that record
      Then the fault identifies the board item and state and no ordinary status is inferred
