Feature: Public reads preserve identity, order and diagnostics

  Rule: R1 · Public reads preserve identity, order and diagnostics

    @executable @cli @work @work-stream
    Scenario: E1 · The archive stays resolvable without entering the live schedule
      Given archived chore 30 and live chore 11 depending on it
      When the operator lists the stream and finds 30
      Then the default listing omits 30, the all-items listing includes it and find resolves its archived identity

    @executable @cli @work @work-stream
    Scenario: E2 · The scope of a blocked sibling survives the migration
      Given story 10/01 depends on the unfinished sibling 00
      When the operator asks what is next for 10/01
      Then the JSON reply reports blocked and waits on 10/00

    @executable @cli @work @work-stream
    Scenario Outline: Read faces retain their observable results
      Given a fresh workspace and the fixture specified by the row
      When the operator runs <query> through the selected store
      Then both CLI faces retain <witness> and their recorded exit codes

      Examples:
        | query | witness |
        | find nonsense | text miss and JSON empty array |
        | doc 10 SPEC | the repository document body |
        | doctor --strict | the warning-only strict exit |
        | validate 999 | the unknown-scope diagnostic |
