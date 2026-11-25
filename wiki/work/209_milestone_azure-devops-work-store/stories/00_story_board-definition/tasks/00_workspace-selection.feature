@cli @work @board
Feature: Workspace store selection
  Rule: R1 · Each workspace reads through the store it selects
    @executable
    Scenario: E1 · Existing projects can find their work without configuring a board
      Given local milestone 17 is titled Orchard
      And an unselected board module records every import
      When I run "aof work find 17 --json" with work.store omitted and again with "files"
      Then both commands return the same local milestone and the module records zero imports

    @executable
    Scenario: E2 · Workspaces in the same process read different boards
      Given two workspaces select different manifests with the same relative filename
      And their boards have different titles for ref 17
      When the assembled find command runs in the first, second and first workspace
      Then the returned titles are Orchard, Harbour and Orchard respectively

    @executable
    Scenario: Discovery does not execute project code
      Given a valid selected board module records each import and each operation
      When AOF discovers the workspace without requesting board data
      Then the module records zero imports and zero operations
      When the first public work read uses the selected store
      Then the selected module supplies the requested data
