@cli @work @board
Feature: A project-owned second board runs through the same entry point
  Rule: R2 · A project-owned second adapter works through the same entry point
    @executable
    Scenario: E3 · An alternate board under the project's own .aof replays the captures
      Given a test project selects an alternate board manifest and adapter under its own .aof
      When the work-stream captures run against it through the public CLI
      Then every case that is not an archive case matches its file-lane output, exit code and stream export
      And no file under packages/ was changed or rebuilt for the run

    @executable
    Scenario: The alternate adapter needs no provider code in AOF
      Given the alternate adapter exports only readItems, readChanges and applyChanges
      When the definition is validated and the first verb runs
      Then the board store loads it and the run imports nothing from .aof/boards/azure-devops
