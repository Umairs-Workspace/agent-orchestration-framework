Feature: Local and projected records keep their provenance

  Rule: R2 · Local and projected records keep their provenance

    @executable @cli @work @work-stream
    Scenario: E3 · A checkout supplies its own newer status
      Given the local record for 11 is blocked and its earlier projection says not-started
      When the operator reads 11
      Then the local status wins with the existing local provenance and no file is overwritten

    @executable @cli @work @work-stream
    Scenario: E4 · A remote-only row remains visible without a local home
      Given the cache reports a story from another node with no local checkout
      When the operator lists the workspace
      Then the remote row appears with its existing reporting provenance and the reader does not invent a directory

    @executable @cli @work @work-stream
    Scenario Outline: Injected tracking rows reach every public read family
      Given a fresh workspace and the fixture specified by the row
      When only the injected snapshot contains <fact>
      Then <consumer> reports the fact through the normal application assembly

      Examples:
        | fact | consumer |
        | a ready nested story | next |
        | a duplicated driver number | doctor |
        | a missing creation date | validate |
        | a driver owning stories | the diagram planner |
