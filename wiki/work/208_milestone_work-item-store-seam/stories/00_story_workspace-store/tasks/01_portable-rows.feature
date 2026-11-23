Feature: A snapshot exposes item facts independently of folder parsing

  Rule: R2 · A snapshot exposes item facts independently of folder parsing

    @executable @cli @work @work-stream
    Scenario: E3 · A nested story retains its parent and its dependency
      Given the orchard seed with pack at 10/01 depending on sibling 00
      When a client requests the story from the selected store
      Then its title is pack, parent is 10, number is 01 and its recorded dependency remains 00

    @executable @cli @work @work-stream
    Scenario: E4 · A caller can read an identity without visiting a directory
      Given an injected store returns an item titled Pear from a workspace without tracking files
      When a client reads its logical identity and metadata
      Then the answer comes from the injected store and no tracking directory is opened

    @executable @cli @work @work-stream
    Scenario Outline: The snapshot preserves the distinctions in old streams
      Given a fresh workspace and the fixture specified by the row
      When the client inspects <item> in the orchard snapshot
      Then the item has <fact>

      Examples:
        | item | fact |
        | queued | an unnumbered backlog identity |
        | 30 | a numbered archived identity |
        | 14 | a standalone task with no record status |
        | 16 | a prototype with status paused |
